"""Investigation State Machine tracking hypotheses, evidence, tool calls, and diagnoses."""
from __future__ import annotations
import time
from dataclasses import asdict, dataclass, field
from typing import Any

@dataclass
class EvidenceItem:
    type: str  # 'log' | 'git' | 'code' | 'anomaly' | 'rag'
    reference: str
    detail: str
    timestamp: float = field(default_factory=time.time)

@dataclass
class ToolCallRecord:
    step: int
    tool: str
    arguments: dict[str, Any]
    summary: str
    timestamp: float = field(default_factory=time.time)

@dataclass
class InvestigationState:
    incident_id: str | None = None
    status: str = "in_progress"  # "in_progress" | "complete" | "failed"
    hypotheses: list[str] = field(default_factory=list)
    evidence: list[dict[str, Any]] = field(default_factory=list)
    tools_used: list[str] = field(default_factory=list)
    tool_call_history: list[dict[str, Any]] = field(default_factory=list)
    anomaly_results: list[dict[str, Any]] = field(default_factory=list)
    custom_ml_results: list[dict[str, Any]] = field(default_factory=list)
    candidate_root_causes: list[str] = field(default_factory=list)
    affected_files: list[str] = field(default_factory=list)
    affected_functions: list[str] = field(default_factory=list)
    severity: str = "unknown"
    confidence: float | None = None
    confidence_basis: str | None = None
    final_diagnosis: str | None = None
    recommendation: str | None = None
    reasoning_summary: str | None = None
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)

    def add_hypothesis(self, hypothesis: str) -> None:
        """Add a candidate hypothesis if not already present."""
        if hypothesis and hypothesis not in self.hypotheses:
            self.hypotheses.append(hypothesis)
            self.updated_at = time.time()

    def add_evidence(self, ev_type: str, reference: str, detail: str, source: str | None = None) -> None:
        """Append grounded evidence to the investigation state."""
        item = {
            "type": ev_type,
            "source": source or ev_type.upper(),
            "reference": reference,
            "detail": detail[:500],
            "timestamp": time.time()
        }
        self.evidence.append(item)
        self.updated_at = time.time()

    def record_tool_call(self, step: int, tool: str, arguments: dict[str, Any], output_summary: str) -> None:
        """Record an executed tool action and update tools_used."""
        if tool not in self.tools_used:
            self.tools_used.append(tool)
        self.tool_call_history.append({
            "step": step,
            "tool": tool,
            "arguments": arguments,
            "summary": output_summary[:300],
            "timestamp": time.time()
        })
        self.updated_at = time.time()

    def record_anomaly(self, result: dict[str, Any]) -> None:
        """Record structured anomaly detector inference results."""
        self.anomaly_results.append(result)
        trained_on = result.get("trained_on", "HDFS log block sessions (LogHub)")
        is_applicable = result.get("applicable", True)
        if not is_applicable:
            # Do not record as positive anomaly evidence on non-HDFS logs
            return
        if result.get("anomalous"):
            score = result.get("score", 0.0)
            model = result.get("model", "unknown")
            self.add_evidence(
                ev_type="anomaly",
                reference=f"detector_{model}",
                detail=f"Anomaly score {score:.2f} flagged by {model} (trained on {trained_on}): {result.get('explanation', '')}"
            )
        self.updated_at = time.time()

    def record_ml_prediction(self, prediction: dict[str, Any]) -> None:
        """Record inference from the external custom ML model service."""
        self.custom_ml_results.append(prediction)
        if prediction.get("available") and not prediction.get("degraded"):
            top_lines = prediction.get("top_lines", [])
            if top_lines:
                top = top_lines[0]
                detail = f"Custom ML suspect line {top.get('line_no')} (score: {top.get('score', 0):.3f}): '{top.get('text', '').strip()}'"
            else:
                cat = prediction.get("predicted_category", "ranked_log_lines")
                detail = f"Custom ML model ({prediction.get('model_version', '1.0')}) analyzed log (category: {cat})"
            self.add_evidence(
                ev_type="custom_ml",
                reference="external_ml_service",
                detail=detail,
                source="Custom ML Model Service"
            )
            for f in prediction.get("suspected_files", []):
                self.add_hypothesis(f"Custom ML model suggests inspecting file: {f}")
        self.updated_at = time.time()

    def set_final_diagnosis(self, diagnosis: str, affected_files: list[str],
                            affected_functions: list[str], confidence: float | None,
                            recommendation: str, severity: str = "high",
                            reasoning_summary: str = "",
                            confidence_basis: str | None = None) -> None:
        """Update final state diagnosis and finalize status."""
        self.final_diagnosis = diagnosis
        self.affected_files = affected_files
        self.affected_functions = affected_functions
        self.confidence = max(0.0, min(1.0, float(confidence))) if confidence is not None else None
        self.confidence_basis = confidence_basis
        self.recommendation = recommendation
        self.severity = severity
        self.reasoning_summary = reasoning_summary
        self.status = "complete"
        self.updated_at = time.time()

    def to_report(self) -> dict[str, Any]:
        """Convert investigation state into the standard report dictionary."""
        report = {
            "incident_id": self.incident_id,
            "root_cause": self.final_diagnosis or "Undetermined root cause",
            "confidence": self.confidence,
            "severity": self.severity,
            "evidence": self.evidence,
            "suggested_fix": self.recommendation or "No remediation proposed",
            "affected_file": self.affected_files[0] if self.affected_files else "",
            "affected_files": self.affected_files,
            "affected_function": self.affected_functions[0] if self.affected_functions else "",
            "affected_functions": self.affected_functions,
            "tools_used": self.tools_used,
            "hypotheses": self.hypotheses,
            "anomaly_results": self.anomaly_results,
            "reasoning": self.reasoning_summary or "Grounded tool investigation completed.",
            "hallucination_warnings": []
        }
        if self.confidence_basis:
            report["confidence_basis"] = self.confidence_basis
        return report

    def to_dict(self) -> dict[str, Any]:
        """Serialize complete state dictionary."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> InvestigationState:
        """Deserialize state from dictionary."""
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})
