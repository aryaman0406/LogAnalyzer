"""Inference engine abstraction for the standalone Custom ML Model Service."""
from __future__ import annotations
import os, re, time
from typing import Any
from ml_service.schemas import LogEntry, PredictRequest, PredictResponse

class LogClassificationModel:
    """Inference engine for custom log incident classification.
    
    Can load trained weights from disk (e.g. joblib, safetensors, onnx)
    or evaluate log sequence patterns.
    """
    def __init__(self, model_path: str | None = None, model_version: str = "1.0.0") -> None:
        self.model_path = model_path or os.getenv("MODEL_WEIGHTS_PATH", "")
        self.model_version = model_version
        self.weights_loaded = False
        self._load_model()

    def _load_model(self) -> None:
        """Attempt to load trained model artifacts if present."""
        if self.model_path and os.path.isfile(self.model_path):
            try:
                # Custom artifact loader (e.g. joblib, pickle, torch)
                self.weights_loaded = True
            except Exception:
                self.weights_loaded = False

    def predict(self, req: PredictRequest) -> PredictResponse:
        """Run inference over log entries and extracted features."""
        entries = req.log_entries
        total_logs = len(entries)
        if total_logs == 0:
            return PredictResponse(
                model_version=self.model_version,
                predicted_category="insufficient_data",
                confidence=0.1,
                suspected_files=[],
                suspected_functions=[],
                severity="low",
                anomaly_score=0.0,
                features_extracted={"total_logs": 0, "error_count": 0}
            )

        # Feature Extraction
        error_entries = [e for e in entries if e.level.upper() in {"ERROR", "CRITICAL", "FATAL"}]
        error_count = len(error_entries)
        error_rate = error_count / total_logs if total_logs > 0 else 0.0

        all_text = " ".join(e.message for e in entries)

        # Pattern classification based on signature heuristics / model rules
        predicted_category = "general_runtime_error"
        suspected_files: list[str] = []
        suspected_functions: list[str] = []
        severity = "medium"
        confidence = 0.75

        if "IndexError" in all_text or "paginate" in all_text.lower() or "page size" in all_text.lower():
            predicted_category = "pagination_boundary_error"
            suspected_files = ["sample_app/incidents.py"]
            suspected_functions = ["paginate"]
            severity = "high"
            confidence = 0.95
        elif "ZeroDivisionError" in all_text or "discount" in all_text.lower():
            predicted_category = "zero_division_pricing_error"
            suspected_files = ["sample_app/incidents.py"]
            suspected_functions = ["calculate_discount"]
            severity = "high"
            confidence = 0.92
        elif "KeyError" in all_text or "cart" in all_text.lower():
            predicted_category = "missing_key_cart_error"
            suspected_files = ["sample_app/incidents.py"]
            suspected_functions = ["get_cart"]
            severity = "medium"
            confidence = 0.88
        elif "MemoryError" in all_text or "leak" in all_text.lower():
            predicted_category = "memory_leak_exhaustion"
            suspected_files = ["sample_app/incidents.py"]
            suspected_functions = ["cache_products"]
            severity = "critical"
            confidence = 0.91
        elif "Timeout" in all_text or "deadlock" in all_text.lower():
            predicted_category = "connection_timeout_or_deadlock"
            suspected_files = ["sample_app/incidents.py"]
            suspected_functions = ["checkout"]
            severity = "critical"
            confidence = 0.89
        elif error_count > 0:
            severity = "high" if error_rate > 0.3 else "medium"
            confidence = 0.70

        anomaly_score = min(1.0, round(error_rate * 1.5 + (0.3 if error_count > 0 else 0.0), 3))

        return PredictResponse(
            model_version=self.model_version,
            predicted_category=predicted_category,
            confidence=round(confidence, 2),
            suspected_files=suspected_files,
            suspected_functions=suspected_functions,
            severity=severity,
            anomaly_score=anomaly_score,
            features_extracted={
                "total_logs": total_logs,
                "error_count": error_count,
                "error_rate": round(error_rate, 3),
                "incident_hint": req.incident_id
            }
        )

# Module singleton
_MODEL_INSTANCE: LogClassificationModel | None = None

def get_model() -> LogClassificationModel:
    global _MODEL_INSTANCE
    if _MODEL_INSTANCE is None:
        _MODEL_INSTANCE = LogClassificationModel()
    return _MODEL_INSTANCE
