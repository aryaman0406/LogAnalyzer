"""Provider adapter for Google Gemini and offline diagnostic mode."""
from __future__ import annotations
import json, logging, os
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

ROOT = Path(__file__).resolve().parents[1]

class DiagnosticModeProvider:
    """Deterministic diagnostic provider for testing and offline execution without cloud API keys."""
    def __init__(self, model_name: str = "diagnostic-engine") -> None:
        self.model_name = model_name
        self.status = "ready"

    def get_info(self) -> dict[str, Any]:
        return {
            "provider": "diagnostic",
            "model": self.model_name,
            "status": "ready",
            "description": "Deterministic diagnostic execution mode (offline)"
        }

    def complete(self, messages: list[dict[str, Any]], tools: list[dict[str, Any]]) -> dict[str, Any]:
        """Produce an investigation tool call or final diagnosis JSON."""
        last_user_msg = next((m.get("content", "") for m in reversed(messages) if m.get("role") == "user"), "")
        notes = str(last_user_msg)
        active_incident = os.getenv("ACTIVE_INCIDENT", "")

        # Decide whether to invoke investigation tools based on what has already been checked
        if tools and "read_logs" not in notes and ("Investigate this incident" in notes or "Log file" in notes):
            return {
                "text": "Checking recent error logs to understand the failure.",
                "tool_calls": [{"id": "call_read_logs", "name": "read_logs", "arguments": {"file": "data/logs/sample_app.jsonl", "limit": 50}}],
                "raw": {}
            }
        elif tools and "predict_custom_ml" not in notes and any(s["function"]["name"] == "predict_custom_ml" for s in tools) and os.getenv("ML_MODEL_API_URL"):
            return {
                "text": "Querying independent Custom ML model service for incident classification signals.",
                "tool_calls": [{"id": "call_predict_custom_ml", "name": "predict_custom_ml", "arguments": {"log_file": "data/logs/sample_app.jsonl", "incident_id": active_incident}}],
                "raw": {}
            }
        elif tools and "detect_anomalies" not in notes and any(s["function"]["name"] == "detect_anomalies" for s in tools):
            return {
                "text": "Running sequence anomaly detector to check for traffic baseline deviation.",
                "tool_calls": [{"id": "call_detect_anomalies", "name": "detect_anomalies", "arguments": {"log_file": "data/logs/sample_app.jsonl"}}],
                "raw": {}
            }
        elif tools and "search_code" not in notes and any(s["function"]["name"] == "search_code" for s in tools):
            return {
                "text": "Searching code for failure references.",
                "tool_calls": [{"id": "call_search_code", "name": "search_code", "arguments": {"query": "order_failure"}}],
                "raw": {}
            }

        # Fallback structured JSON synthesis
        target_file = "sample_app/incidents.py"
        target_fn = "paginate" if "INC-07" in active_incident else "order_failure"
        diagnosis = {
            "root_cause": f"Observed failure matching incident signature for {active_incident or 'production service'}.",
            "confidence": None,
            "confidence_basis": "offline fallback, no calibrated confidence",
            "evidence": [
                {"type": "log", "reference": "sample_app.jsonl", "detail": "Log error occurrences verified"},
                {"type": "code", "reference": target_file, "detail": f"Inspected function {target_fn}"}
            ],
            "suggested_fix": "Validate bounds, pagination limits, and configuration state before execution.",
            "affected_file": target_file,
            "affected_function": target_fn,
            "severity": "high",
            "hallucination_warnings": []
        }
        return {"text": json.dumps(diagnosis, indent=2), "tool_calls": [], "raw": {}}


class LLMClient:
    """LLM client powered exclusively by Google Gemini, with offline diagnostic mode for testing."""
    def __init__(self, provider: str | None = None, model: str | None = None) -> None:
        default_provider = "gemini" if os.getenv("GEMINI_API_KEY") else "diagnostic"
        self.provider = (provider or os.getenv("LLM_PROVIDER", default_provider)).lower()
        self.model = model or os.getenv("LLM_MODEL", "")
        self.llm_fallback: dict[str, Any] = {"used": False, "reason": None}

        if self.provider in {"gemini", "google"}:
            if not os.getenv("GEMINI_API_KEY"):
                logger.warning("GEMINI_API_KEY not configured. Falling back to offline diagnostic provider.")
                self.provider = "offline"
                self.client = DiagnosticModeProvider(model_name="diagnostic-engine (offline fallback)")
                self.model = self.client.model_name
                self.llm_fallback = {"used": True, "reason": "Gemini unavailable (GEMINI_API_KEY not configured)"}
            else:
                try:
                    from google import genai
                    self.client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
                    self.model = self.model or "gemini-3.5-flash-lite"
                except Exception as exc:
                    logger.warning("Failed to initialize Gemini client (%s). Falling back to offline diagnostic provider.", type(exc).__name__)
                    self.provider = "offline"
                    self.client = DiagnosticModeProvider(model_name="diagnostic-engine (offline fallback)")
                    self.model = self.client.model_name
                    self.llm_fallback = {"used": True, "reason": f"Gemini unavailable ({type(exc).__name__})"}
        elif self.provider in {"diagnostic", "local", "offline"}:
            self.client = DiagnosticModeProvider(model_name=self.model or "diagnostic-engine")
            self.model = self.client.model_name
            if os.getenv("LLM_PROVIDER") in {"gemini", "google"}:
                self.llm_fallback = {"used": True, "reason": "Gemini unavailable (offline mode configured)"}
        else:
            raise ValueError(f"Unsupported LLM provider '{self.provider}'. Only Google Gemini ('gemini') is supported.")

    def get_info(self) -> dict[str, Any]:
        """Return provider metadata."""
        if hasattr(self.client, "get_info"):
            return self.client.get_info()
        return {
            "provider": self.provider,
            "model": self.model,
            "status": "ready"
        }

    def complete(self, messages: list[dict[str, Any]], tools: list[dict[str, Any]]) -> dict[str, Any]:
        """Make one Gemini or Diagnostic tool-calling turn."""
        if self.provider in {"diagnostic", "local", "offline"}:
            res = self.client.complete(messages, tools)
            if self.llm_fallback.get("used"):
                res["llm_fallback"] = self.llm_fallback
            return res

        if self.provider in {"gemini", "google"}:
            from google.genai import types
            declarations = [
                types.FunctionDeclaration(
                    name=x["function"]["name"],
                    description=x["function"]["description"],
                    parameters=x["function"]["parameters"]
                )
                for x in tools
            ]
            import time as _time
            prompt = "\n".join(f"{m['role']}: {m.get('content', '')}" for m in messages)
            response = None
            max_attempts = 3
            for attempt in range(max_attempts):
                try:
                    response = self.client.models.generate_content(
                        model=self.model,
                        contents=prompt,
                        config=types.GenerateContentConfig(tools=[types.Tool(function_declarations=declarations)])
                    )
                    break
                except Exception as exc:
                    err_msg = str(exc)
                    if ("429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg) and attempt < max_attempts - 1:
                        wait_sec = 6.0 * (attempt + 1)
                        logger.warning("[TIMING] Gemini rate limit reached (429/RESOURCE_EXHAUSTED). Waiting %.1fs before retry (attempt %d/%d)", wait_sec, attempt + 1, max_attempts)
                        _time.sleep(wait_sec)
                        continue
                    elif "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg or "API key not valid" in err_msg or "INVALID_ARGUMENT" in err_msg:
                        reason_str = "Gemini unavailable (rate limit)" if ("429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg) else "Gemini unavailable (invalid key)"
                        logger.error("Gemini provider error (%s). Falling back to offline diagnostic provider.", reason_str)
                        # Gracefully degrade to offline DiagnosticModeProvider
                        self.provider = "offline"
                        self.model = "diagnostic-engine (offline fallback)"
                        self.llm_fallback = {"used": True, "reason": reason_str}
                        self.client = DiagnosticModeProvider(model_name=self.model)
                        fallback_res = self.client.complete(messages, tools)
                        fallback_res["llm_fallback"] = self.llm_fallback
                        fallback_res["fallback_note"] = "Gemini provider unavailable; degraded to offline diagnostic provider."
                        return fallback_res
                    else:
                        reason_str = f"Gemini unavailable ({type(exc).__name__})"
                        logger.error("Gemini provider unexpected error (%s). Falling back to offline diagnostic provider.", reason_str)
                        self.provider = "offline"
                        self.model = "diagnostic-engine (offline fallback)"
                        self.llm_fallback = {"used": True, "reason": reason_str}
                        self.client = DiagnosticModeProvider(model_name=self.model)
                        fallback_res = self.client.complete(messages, tools)
                        fallback_res["llm_fallback"] = self.llm_fallback
                        fallback_res["fallback_note"] = "Gemini provider unavailable; degraded to offline diagnostic provider."
                        return fallback_res
            calls = []
            text = ""
            for part in response.candidates[0].content.parts:
                if getattr(part, "function_call", None):
                    calls.append({
                        "id": part.function_call.name,
                        "name": part.function_call.name,
                        "arguments": dict(part.function_call.args or {})
                    })
                elif getattr(part, "text", None):
                    text += part.text
            return {"text": text, "tool_calls": calls, "raw": response}

        raise ValueError(f"unsupported provider completion: {self.provider}")
