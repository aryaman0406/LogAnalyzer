"""Client module for calling the independent Custom ML Model inference service."""
from __future__ import annotations
import logging, os, time
from dataclasses import asdict, dataclass, field
from typing import Any
import httpx

logger = logging.getLogger("incident_agent.ml_client")

@dataclass
class MLPredictionResult:
    available: bool
    degraded: bool = False
    model_version: str = "unknown"
    predicted_category: str = "unknown"
    confidence: float = 0.0
    suspected_files: list[str] = field(default_factory=list)
    suspected_functions: list[str] = field(default_factory=list)
    severity: str = "medium"
    anomaly_score: float = 0.0
    features_extracted: dict[str, Any] = field(default_factory=dict)
    error_message: str | None = None
    response_time_ms: float = 0.0

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

class MLModelClient:
    """Client for external Custom ML Model API hosted on Render or locally."""
    def __init__(
        self,
        base_url: str | None = None,
        api_key: str | None = None,
        timeout: float | None = None,
        max_retries: int = 2
    ) -> None:
        raw_url = base_url or os.getenv("ML_MODEL_API_URL", "")
        self.base_url = raw_url.rstrip("/") if raw_url else ""
        self.api_key = api_key or os.getenv("ML_MODEL_API_KEY", "")
        timeout_env = os.getenv("ML_MODEL_TIMEOUT", "5.0")
        try:
            self.timeout = float(timeout if timeout is not None else timeout_env)
        except ValueError:
            self.timeout = 5.0
        self.max_retries = max(0, min(max_retries, 5))

    @property
    def is_configured(self) -> bool:
        """Check if a remote service endpoint is configured."""
        return bool(self.base_url)

    def _headers(self) -> dict[str, str]:
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "IncidentAgentV2-Backend/2.0"
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    def check_health(self) -> dict[str, Any]:
        """Query /health endpoint on external model service."""
        if not self.is_configured:
            return {
                "available": False,
                "status": "NOT_CONFIGURED",
                "detail": "ML_MODEL_API_URL is not configured; running in native diagnostics mode."
            }
        url = f"{self.base_url}/health"
        start = time.perf_counter()
        try:
            with httpx.Client(timeout=self.timeout) as client:
                res = client.get(url, headers=self._headers())
                duration = round((time.perf_counter() - start) * 1000, 2)
                if res.status_code == 200:
                    data = res.json()
                    return {
                        "available": True,
                        "status": "HEALTHY",
                        "response_time_ms": duration,
                        "data": data
                    }
                return {
                    "available": False,
                    "status": f"HTTP_{res.status_code}",
                    "response_time_ms": duration,
                    "detail": "Model service returned non-200 health status."
                }
        except httpx.TimeoutException:
            return {
                "available": False,
                "status": "TIMEOUT",
                "detail": f"Health check timed out after {self.timeout}s."
            }
        except Exception as exc:
            return {
                "available": False,
                "status": "CONNECTION_FAILED",
                "detail": f"Unable to reach model service: {type(exc).__name__}"
            }

    def predict(
        self,
        log_entries: list[dict[str, Any]],
        incident_id: str | None = None,
        features: dict[str, Any] | None = None
    ) -> MLPredictionResult:
        """Send logs to external ML model service with safe error handling and transient retries."""
        if not self.is_configured:
            return MLPredictionResult(
                available=False,
                degraded=True,
                error_message="External ML model service is not configured (ML_MODEL_API_URL unset). Running in degraded mode."
            )

        endpoint = f"{self.base_url}/predict"
        payload = {
            "incident_id": incident_id,
            "log_entries": [
                {
                    "timestamp": str(e.get("timestamp", "")),
                    "level": str(e.get("level", "INFO")),
                    "message": str(e.get("message", "")),
                    "source": str(e.get("source", ""))
                }
                for e in log_entries
            ],
            "features": features or {}
        }

        # Transient error retry loop (retries only on 502, 503, 504, ConnectionError)
        last_error = ""
        for attempt in range(self.max_retries + 1):
            start = time.perf_counter()
            try:
                with httpx.Client(timeout=self.timeout) as client:
                    resp = client.post(endpoint, json=payload, headers=self._headers())
                    duration = round((time.perf_counter() - start) * 1000, 2)

                    if resp.status_code == 200:
                        try:
                            data = resp.json()
                            return MLPredictionResult(
                                available=True,
                                degraded=False,
                                model_version=str(data.get("model_version", "1.0.0")),
                                predicted_category=str(data.get("predicted_category", "unknown")),
                                confidence=float(data.get("confidence", 0.0)),
                                suspected_files=[str(f) for f in data.get("suspected_files", [])],
                                suspected_functions=[str(fn) for fn in data.get("suspected_functions", [])],
                                severity=str(data.get("severity", "medium")),
                                anomaly_score=float(data.get("anomaly_score", 0.0)),
                                features_extracted=dict(data.get("features_extracted", {})),
                                response_time_ms=duration
                            )
                        except (ValueError, KeyError) as parse_err:
                            return MLPredictionResult(
                                available=False,
                                degraded=True,
                                error_message=f"Model service returned malformed JSON: {type(parse_err).__name__}",
                                response_time_ms=duration
                            )

                    # Non-transient client errors (4xx): do not retry
                    if 400 <= resp.status_code < 500:
                        return MLPredictionResult(
                            available=False,
                            degraded=True,
                            error_message=f"Model service rejected request (HTTP {resp.status_code}).",
                            response_time_ms=duration
                        )

                    # Transient server errors (502/503/504): candidate for retry
                    last_error = f"Model service transient error (HTTP {resp.status_code})"

            except (httpx.ConnectError, httpx.ReadTimeout, httpx.RemoteProtocolError) as net_err:
                last_error = f"Network failure connecting to model service: {type(net_err).__name__}"
            except httpx.TimeoutException:
                last_error = f"Model service request timed out after {self.timeout}s"
                # Timeouts might not be idempotent on slow compute; break without repeated hammering
                break
            except Exception as exc:
                last_error = f"Unexpected failure calling model service: {type(exc).__name__}"
                break

            if attempt < self.max_retries:
                time.sleep(0.3 * (2 ** attempt))

        return MLPredictionResult(
            available=False,
            degraded=True,
            error_message=last_error or "Model service unavailable.",
            response_time_ms=0.0
        )

# Module singleton
_CLIENT_INSTANCE: MLModelClient | None = None

def get_ml_model_client() -> MLModelClient:
    """Retrieve shared MLModelClient singleton configured from environment."""
    global _CLIENT_INSTANCE
    if _CLIENT_INSTANCE is None:
        _CLIENT_INSTANCE = MLModelClient()
    return _CLIENT_INSTANCE
