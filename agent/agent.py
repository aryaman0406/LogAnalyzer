"""Bounded ReAct-style investigation loop with explicit state machine and grounded evidence."""
from __future__ import annotations
import json, os, re, time, uuid
from pathlib import Path
from typing import Any, Callable

from agent.llm import LLMClient
from agent.prompts import SYSTEM_PROMPT
from agent.state import InvestigationState
from agent.tools import TOOL_SCHEMAS, execute_tool

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
        report["confidence"] = 0.9
    if "evidence" not in report:
        report["evidence"] = []

    required = {"root_cause", "confidence", "evidence", "suggested_fix", "affected_file", "affected_function"}
    if not required.issubset(report): raise ValueError(f"missing report fields: {sorted(required - set(report))}")
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

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Investigate this incident: {query}\nLog file: {log_file}\nTools enabled: {use_tools}; anomaly detector enabled: {use_anomaly_detector}."}
        ]
        notes = ""

        for step in range(1, self.max_steps + 1):
            emit("thought", step, {"summary": f"Reviewing evidence (hypotheses: {len(state.hypotheses)}, evidence: {len(state.evidence)}) and choosing next investigation action."})
            result = client.complete(messages, schemas)
            calls = result["tool_calls"]

            if not calls:
                report = validate_report(result["text"])
                report["incident_id"] = incident_id
                
                # Combine accumulated grounded evidence into final report
                existing_refs = {e.get("reference") for e in report["evidence"] if isinstance(e, dict)}
                for ev in state.evidence:
                    if ev.get("reference") not in existing_refs:
                        report["evidence"].append(ev)
                        existing_refs.add(ev.get("reference"))

                report["tools_used"] = state.tools_used
                state.set_final_diagnosis(
                    diagnosis=report["root_cause"],
                    affected_files=[report["affected_file"]] if report.get("affected_file") else [],
                    affected_functions=[report["affected_function"]] if report.get("affected_function") else [],
                    confidence=report["confidence"],
                    recommendation=report["suggested_fix"],
                    severity=report.get("severity", "high")
                )

                emit("final", step, report)
                return {
                    "id": trace_id,
                    "result": report,
                    "trace": events,
                    "trace_file": str(trace_path.relative_to(ROOT)),
                    "state": state.to_dict()
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
                output = execute_tool(call["name"], args)
                summary = output[:260]
                emit("tool_result", step, {"name": call["name"], "preview": summary, "result": output})
                
                # Update Investigation State Machine with grounded evidence
                state.record_tool_call(step, call["name"], args, summary)
                if call["name"] in {"read_logs", "grep_logs"}:
                    for line in output.splitlines():
                        if "ERROR" in line or "error=" in line:
                            state.add_evidence("log", args.get("file", log_file), line[:200], source="Application Logs")
                            break
                elif call["name"] == "detect_anomalies":
                    try:
                        anom_data = json.loads(output)
                        state.record_anomaly(anom_data)
                        if anom_data.get("anomalous"):
                            state.add_evidence("anomaly", "Drain3/RF", summary[:200], source="ML Anomaly Detector")
                    except Exception:
                        pass
                elif call["name"] == "search_docs":
                    state.add_evidence("rag", args.get("query", "docs"), summary[:200], source="Technical RAG")
                elif call["name"] in {"git_log", "git_diff"}:
                    state.add_evidence("git", args.get("commit", args.get("path", "git")), summary[:200], source="Git History")
                elif call["name"] in {"search_code", "read_file"}:
                    state.add_evidence("code", args.get("path", "source"), summary[:200], source="Source AST")

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

        raise RuntimeError(f"agent reached max_steps={self.max_steps} without a final answer")
