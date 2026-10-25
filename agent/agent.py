"""Bounded ReAct-style investigation loop with explicit state machine and grounded evidence."""
from __future__ import annotations
import asyncio, json, logging, os, re, time, uuid
from api.services.ml_model_client import get_ml_model_client, MlResult
from agent.rag import get_rag_pipeline
from pathlib import Path
from typing import Any, Callable

logger = logging.getLogger(__name__)

from agent.llm import LLMClient
from agent.prompts import SYSTEM_PROMPT
from agent.state import InvestigationState
from agent.tools import TOOL_SCHEMAS, execute_tool, set_current_ml_result

ROOT = Path(__file__).resolve().parents[1]

def validate_report(text: str) -> dict[str, Any]:
    """Parse final JSON and flag references to missing files/functions."""
    match = re.search(r"\{[\s\S]*\}", text)
    if not match: raise ValueError("model response did not contain JSON")
    report = json.loads(match.group(0))

    # Normalize plural/singular fields and synonyms
    if "suggested_fix" not in report and "recommendation" in report:
        report["suggested_fix"] = report["recommendation"]
    if "affected_file" not in report and "affected_files" in report and report["affected_files"]:
        report["affected_file"] = report["affected_files"][0]
    if "affected_function" not in report and "affected_functions" in report and report["affected_functions"]:
        report["affected_function"] = report["affected_functions"][0]
    if "confidence" not in report:
        report["confidence"] = None
    if "evidence" not in report:
        report["evidence"] = []

    required = {"root_cause", "evidence", "suggested_fix", "affected_file", "affected_function"}
    if not required.issubset(report): raise ValueError(f"missing report fields: {sorted(required - set(report))}")
    if report.get("confidence") is not None:
        report["confidence"] = max(0.0, min(1.0, float(report["confidence"])))
    report["severity"] = report.get("severity", "high")
    report["affected_service"] = report.get("affected_service", "sample_app")
    
    # Normalize evidence list
    if not isinstance(report.get("evidence"), list):
        report["evidence"] = []
    normalized_evidence = []
    for ev in report["evidence"]:
        if isinstance(ev, dict):
            normalized_evidence.append(ev)
        elif isinstance(ev, str):
            normalized_evidence.append({"type": "log", "reference": "general", "detail": ev})
    report["evidence"] = normalized_evidence

    target = ROOT / str(report["affected_file"])
    hallucinations = []
    if not target.is_file():
        hallucinations.append(f"file does not exist: {report['affected_file']}")
    else:
        source = target.read_text(encoding="utf-8", errors="replace")
        func_name = report.get("affected_function")
        if func_name and not re.search(rf"\bdef\s+{re.escape(func_name)}\s*\(", source):
            # Check incident_modes
            found_in_modes = any(re.search(rf"\bdef\s+{re.escape(func_name)}\s*\(", p.read_text(encoding="utf-8", errors="replace"))
                                for p in (ROOT / "sample_app" / "incident_modes").glob("*.py"))
            if not found_in_modes:
                hallucinations.append(f"function does not exist in cited file: {func_name}")
    report["hallucination_warnings"] = hallucinations
    return report

class Investigator:
    """Run evidence-driven investigation loop with explicit state tracking and streaming."""
    def __init__(self, max_steps: int = 15):
        self.max_steps = max(1, min(max_steps, 30))

    def investigate(self, query: str, *, log_file: str = "data/logs/sample_app.jsonl", use_tools: bool = True,
                    use_anomaly_detector: bool = True, on_event: Callable[[dict], None] | None = None) -> dict[str, Any]:
        trace_id = str(uuid.uuid4())
        trace_dir = ROOT / "data" / "traces"
        trace_dir.mkdir(parents=True, exist_ok=True)
        trace_path = trace_dir / f"{trace_id}.jsonl"
        events = []
        investigation_start_time = time.perf_counter()

        incident_id = os.getenv("ACTIVE_INCIDENT", None)
        if not incident_id and "INC-" in query:
            inc_match = re.search(r"INC-\d{2}", query)
            if inc_match: incident_id = inc_match.group(0)

        # Initialize explicit investigation state machine
        state = InvestigationState(incident_id=incident_id)
        state.add_hypothesis(f"Investigating root cause for {incident_id or 'incident'}")

        def emit(kind: str, step: int, content: Any):
            event = {"type": kind, "step": step, "timestamp": time.time(), "content": content}
            events.append(event)
            with trace_path.open("a", encoding="utf-8") as out:
                out.write(json.dumps(event, ensure_ascii=False) + "\n")
            if on_event:
                on_event(event)

        try:
            client = LLMClient()
        except Exception as exc:
            emit("error", 0, {"message": str(exc)})
            state.status = "failed"
            raise

        schemas = TOOL_SCHEMAS if use_tools else []
        if not use_anomaly_detector:
            schemas = [s for s in schemas if s["function"]["name"] != "detect_anomalies"]

        # Single call to ML Model Client for the incident log
        log_text = ""
        resolved_log_path = (ROOT / log_file).resolve()
        if resolved_log_path.is_file():
            try:
                log_text = resolved_log_path.read_text(encoding="utf-8", errors="replace")
            except Exception:
                log_text = ""

        ml_client = get_ml_model_client()
        t_ml_start = time.perf_counter()
        try:
            try:
                running_loop = asyncio.get_running_loop()
            except RuntimeError:
                running_loop = None

            if running_loop and running_loop.is_running():
                import concurrent.futures
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                    ml_result = pool.submit(lambda: asyncio.run(ml_client.predict(log_text, top_k=10))).result()
            else:
                ml_result = asyncio.run(ml_client.predict(log_text, top_k=10))
        except Exception as exc:
            ml_result = MlResult(available=False, reason=f"client execution error: {type(exc).__name__}")
        set_current_ml_result(ml_result)
        ml_duration = time.perf_counter() - t_ml_start
        logger.info("[TIMING] Phase: ML call | duration=%.3fs | available=%s", ml_duration, ml_result.available)

        # Retrieve RAG context if available
        rag_block = ""
        t_rag_start = time.perf_counter()
        rag_hits = []
        try:
            rag_pipeline = get_rag_pipeline()
            rag_hits = rag_pipeline.query(query, top_k=2)
            if rag_hits:
                formatted_hits = "\n".join(f"- [{h.get('source', 'doc')}]: {h.get('content', '')[:300]}" for h in rag_hits)
                rag_block = f"Retrieved Technical Documentation (RAG):\n{formatted_hits}"
        except Exception:
            rag_block = ""
        rag_duration = time.perf_counter() - t_rag_start
        logger.info("[TIMING] Phase: RAG retrieval | duration=%.3fs | hits=%d", rag_duration, len(rag_hits))

        ml_prompt_block = ml_result.as_prompt_block(max_lines=10)
        context_parts = []
        if rag_block:
            context_parts.append(rag_block)
        if ml_prompt_block:
            context_parts.append(ml_prompt_block)

        context_prompt = ("\n\nContext:\n" + "\n\n".join(context_parts)) if context_parts else ""

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Investigate this incident: {query}\nLog file: {log_file}\nTools enabled: {use_tools}; anomaly detector enabled: {use_anomaly_detector}.{context_prompt}"}
        ]
        notes = ""

        # Cap steps at 5 if ML ranking is available and provides clear suspect lines
        effective_max_steps = self.max_steps
        if ml_result.available and ml_result.top_lines:
            effective_max_steps = min(self.max_steps, 5)

        for step in range(1, effective_max_steps + 1):
            t_turn_start = time.perf_counter()
            emit("thought", step, {"summary": f"Reviewing evidence (hypotheses: {len(state.hypotheses)}, evidence: {len(state.evidence)}) and choosing next investigation action."})
            
            # If on the final allowed step, prompt the model to synthesize the final JSON report rather than calling more tools
            current_schemas = schemas
            if step == effective_max_steps:
                current_schemas = []
                messages.append({"role": "user", "content": "You have gathered sufficient evidence or reached the step limit. Conclude the investigation now and output ONLY the final JSON report following the Output Format."})

            t_llm_start = time.perf_counter()
            result = client.complete(messages, current_schemas)
            llm_duration = time.perf_counter() - t_llm_start
            logger.info("[TIMING] Phase: LLM call | step=%d | provider=%s | duration=%.3fs", step, client.provider, llm_duration)
            calls = result["tool_calls"]

            if not calls:
                report = validate_report(result["text"])
                report["incident_id"] = incident_id
                if "confidence_basis" not in report:
                    if client.provider in {"diagnostic", "local", "offline"}:
                        report["confidence_basis"] = "offline fallback, no calibrated confidence"
                    elif client.provider in {"gemini", "google"}:
                        report["confidence_basis"] = "LLM self-assessed confidence"

                # Merge duplicate evidence that points to the same line into one item listing both sources
                import re as _re
                def _extract_line_no(ev_item: dict) -> int | None:
                    ref_val = str(ev_item.get("reference", ""))
                    det_val = str(ev_item.get("detail", ""))
                    # Check reference or detail for line numbers
                    for s in (ref_val, det_val):
                        m = _re.search(r"(?:line\s*|L|:)(\d+)", s, _re.IGNORECASE)
                        if m:
                            try:
                                return int(m.group(1))
                            except ValueError:
                                pass
                    return None

                merged_evidence = []
                seen_custom_ml = False
                seen_anomaly = False
                existing_items = list(report.get("evidence", [])) + list(state.evidence)
                is_internal_repo_log = ("sample_app" in log_file or "INC-" in (incident_id or "") or "sample" in log_file)

                merged_by_line: dict[int, dict] = {}
                non_line_evidence: list[dict] = []

                for ev in existing_items:
                    if not isinstance(ev, dict):
                        continue
                    ev_type = ev.get("type")
                    ref = str(ev.get("reference", ""))
                    detail = str(ev.get("detail", ""))

                    # Drop git evidence if the log does not belong to this repo
                    if ev_type == "git" and not is_internal_repo_log:
                        continue

                    # Drop vague code items without concrete file and line
                    if ev_type == "code":
                        if ref in {"source", "git", "README.md"} or not (":" in ref and any(c.isdigit() for c in ref.split(":")[-1])):
                            continue

                    # Deduplicate custom_ml without line number into at most one item
                    if ev_type == "custom_ml":
                        if seen_custom_ml:
                            continue
                        seen_custom_ml = True

                    # Deduplicate anomaly into at most one item (and verify applicable)
                    if ev_type == "anomaly":
                        if seen_anomaly or "not applicable" in detail.casefold():
                            continue
                        seen_anomaly = True

                    line_num = _extract_line_no(ev)
                    if line_num is not None and line_num > 0 and ev_type in {"log", "custom_ml", "log + ML rank"}:
                        source_label = "ML rank" if "ml" in ev_type.lower() else "log"
                        if line_num not in merged_by_line:
                            merged_by_line[line_num] = {
                                "type": "log + ML rank" if source_label == "ML rank" else "log",
                                "reference": f"line {line_num}",
                                "detail": detail,
                                "sources": [source_label],
                                "timestamp": ev.get("timestamp", time.time())
                            }
                        else:
                            existing_merge = merged_by_line[line_num]
                            if source_label not in existing_merge.get("sources", []):
                                existing_merge.setdefault("sources", []).append(source_label)
                            existing_merge["type"] = "log + ML rank"
                            existing_merge["source"] = " + ".join(sorted(existing_merge["sources"]))
                            if len(detail) > len(existing_merge.get("detail", "")):
                                existing_merge["detail"] = detail
                    else:
                        if not any(e.get("reference") == ref for e in non_line_evidence):
                            non_line_evidence.append(ev)

                for item in merged_by_line.values():
                    if "sources" in item:
                        item["source"] = " + ".join(item["sources"])
                    merged_evidence.append(item)

                for item in non_line_evidence:
                    if not any(e.get("reference") == item.get("reference") for e in merged_evidence):
                        merged_evidence.append(item)

                report["evidence"] = merged_evidence
                llm_fallback_info = getattr(client, "llm_fallback", {"used": False, "reason": None})
                if result.get("llm_fallback"):
                    llm_fallback_info = result["llm_fallback"]
                report["llm_fallback"] = llm_fallback_info

                report["tools_used"] = state.tools_used
                state.set_final_diagnosis(
                    diagnosis=report["root_cause"],
                    affected_files=[report["affected_file"]] if report.get("affected_file") else [],
                    affected_functions=[report["affected_function"]] if report.get("affected_function") else [],
                    confidence=report.get("confidence"),
                    confidence_basis=report.get("confidence_basis"),
                    recommendation=report["suggested_fix"],
                    severity=report.get("severity", "high")
                )

                ml_ranking_dict = {
                    "available": ml_result.available,
                    "model_version": ml_result.model_version,
                    "top_lines": ml_result.top_lines,
                    "reason": ml_result.reason,
                    "warnings": ml_result.warnings
                }
                report["ml_ranking"] = ml_ranking_dict

                turn_duration = time.perf_counter() - t_turn_start
                total_duration = time.perf_counter() - investigation_start_time
                logger.info("[TIMING] Phase: Agent turn | step=%d (final synthesis) | duration=%.3fs", step, turn_duration)
                logger.info("[TIMING] Investigation complete | total_duration=%.3fs", total_duration)

                emit("final", step, report)
                return {
                    "id": trace_id,
                    "result": report,
                    "trace": events,
                    "trace_file": str(trace_path.relative_to(ROOT)),
                    "state": state.to_dict(),
                    "ml_ranking": ml_ranking_dict,
                    "llm_fallback": llm_fallback_info
                }

            if not use_tools:
                raise ValueError("provider requested tools while tool access is disabled")

            if client.provider == "openai":
                messages.append({
                    "role": "assistant",
                    "content": result["raw"].choices[0].message.content,
                    "tool_calls": [{"id": c.id, "type": "function", "function": {"name": c.function.name, "arguments": c.function.arguments}} for c in result["raw"].choices[0].message.tool_calls]
                })
            elif client.provider == "anthropic":
                messages.append({
                    "role": "assistant",
                    "content": [{"type": "tool_use", "id": b.id, "name": b.name, "input": b.input} for b in result["raw"].content if b.type == "tool_use"]
                })

            tool_results = []
            for call in calls:
                args = call["arguments"]
                emit("tool_call", step, {"name": call["name"], "arguments": args})
                output = execute_tool(call["name"], args, ml_result=ml_result)
                summary = output[:260]
                emit("tool_result", step, {"name": call["name"], "preview": summary, "result": output})
                
                # Update Investigation State Machine with grounded evidence
                state.record_tool_call(step, call["name"], args, summary)
                is_internal_repo_log = ("sample_app" in log_file or "INC-" in (incident_id or "") or "sample" in log_file)
                if call["name"] in {"read_logs", "grep_logs"}:
                    for line in output.splitlines():
                        if "ERROR" in line or "error=" in line or "error occurred" in line.casefold() or "error occured" in line.casefold() or "exited with 1" in line.casefold():
                            state.add_evidence("log", args.get("file", log_file), line[:200], source="Application Logs")
                            break
                elif call["name"] == "detect_anomalies":
                    try:
                        anom_data = json.loads(output)
                        state.record_anomaly(anom_data)
                    except Exception:
                        pass
                elif call["name"] == "predict_custom_ml":
                    try:
                        ml_data = json.loads(output)
                        state.record_ml_prediction(ml_data)
                    except Exception:
                        pass
                elif call["name"] == "search_docs":
                    state.add_evidence("rag", args.get("query", "docs"), summary[:200], source="Technical RAG")
                elif call["name"] in {"git_log", "git_diff"}:
                    if is_internal_repo_log:
                        state.add_evidence("git", args.get("commit", args.get("path", "git")), summary[:200], source="Git History")
                elif call["name"] == "read_file":
                    p = args.get("path", "")
                    s_line = args.get("start_line", 1)
                    if p and p != "source":
                        state.add_evidence("code", f"{p}:{s_line}", summary[:200], source="Source Code")
                elif call["name"] == "search_code":
                    # Only add if hits contain concrete file and line
                    for line in output.splitlines():
                        if ":" in line and not line.startswith("No matches"):
                            parts = line.split(":", 2)
                            if len(parts) >= 2 and parts[1].strip().isdigit():
                                state.add_evidence("code", f"{parts[0].strip()}:{parts[1].strip()}", line[:200], source="Source Code")
                                break

                notes = (notes + f"\n{call['name']}: {summary}")[-3000:]
                if client.provider == "openai":
                    messages.append({"role": "tool", "tool_call_id": call["id"], "content": output})
                elif client.provider == "anthropic":
                    tool_results.append({"type": "tool_result", "tool_use_id": call["id"], "content": output})
                else:
                    tool_results.append(f"Tool {call['name']} result: {output}")

            if client.provider == "anthropic":
                messages.append({"role": "user", "content": tool_results})
            elif client.provider in {"gemini", "google"}:
                messages.append({"role": "user", "content": "\n".join(tool_results)})
            messages.append({"role": "user", "content": f"Investigation notes so far (evidence summaries):{notes}"})

            turn_duration = time.perf_counter() - t_turn_start
            logger.info("[TIMING] Phase: Agent turn | step=%d | tool_calls=%d | duration=%.3fs", step, len(calls), turn_duration)

        raise RuntimeError(f"agent reached max_steps={effective_max_steps} without a final answer")
