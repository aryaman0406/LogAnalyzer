"""Client for the incident-ml-service (contract v1.x).

Copy to api/services/ml_model_client.py and adapt the import paths if needed.
Design rules:
  * It never raises to the caller. A failure returns MlResult(available=False, reason=...), so the
    app can run in degraded mode and tell the user which component was missing.
  * It never puts log content or the API key into logs or reasons.
  * POST /predict has no side effects, so retrying it is safe, but only for transient failures
    (timeouts, connection errors, 429, 502, 503, 504). Other 4xx answers are never retried.

Environment:
  ML_MODEL_API_URL          base URL, e.g. https://incident-ml-service.onrender.com (unset = model disabled)
  ML_MODEL_API_KEY          sent as X-API-Key
  ML_MODEL_TIMEOUT_SECONDS  per attempt, default 60 (a sleeping Render free instance needs about a minute)
  ML_MODEL_MAX_RETRIES      extra attempts after the first, default 2
  ML_MODEL_MAX_LOG_CHARS    refuse to send larger logs, default 4000000
"""
from __future__ import annotations

import asyncio
import logging
import os
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)
SUPPORTED_MAJOR = "1."
RETRY_STATUS = {429, 502, 503, 504}


def _num(name: str, default: float) -> float:
    try:
        return float(os.environ.get(name, default))
    except ValueError:
        return default


@dataclass
class MlResult:
    available: bool
    reason: str = ""                       # why the model was not used (safe to show to users)
    model_version: str = ""
    top_lines: List[Dict[str, Any]] = field(default_factory=list)   # line_no, score, section, text
    warnings: List[str] = field(default_factory=list)
    n_lines: int = 0
    elapsed_ms: int = 0

    def as_prompt_block(self, max_lines: int = 10) -> str:
        """Evidence block for Gemini. Wording keeps the model's output as a hint, not a verdict."""
        if not self.available:
            return f"ML line ranking: UNAVAILABLE ({self.reason}). Do not infer anything from its absence."
        rows = "\n".join(f"  line {t['line_no']} (rank {i + 1}, score {t['score']:.3f}): {t['text']}"
                         for i, t in enumerate(self.top_lines[:max_lines]))
        note = ("These lines were ranked by a statistical model as most likely to belong to the failure "
                "explanation. This is a hint about where to look, not proof of the root cause. Scores are "
                "meaningful only for ordering within this one log. The model was trained on Travis CI logs only.")
        warn = ("\n  Model warnings: " + "; ".join(self.warnings)) if self.warnings else ""
        return f"ML line ranking (model {self.model_version}):\n{rows}\n{note}{warn}"


class MlModelClient:
    def __init__(self, base_url: Optional[str] = None, api_key: Optional[str] = None,
                 timeout: Optional[float] = None, max_retries: Optional[int] = None,
                 max_log_chars: Optional[int] = None, transport: Optional[httpx.AsyncBaseTransport] = None):
        self.base_url = (base_url if base_url is not None else os.environ.get("ML_MODEL_API_URL", "")).rstrip("/")
        self.api_key = api_key if api_key is not None else os.environ.get("ML_MODEL_API_KEY", "")
        self.timeout = timeout if timeout is not None else _num("ML_MODEL_TIMEOUT_SECONDS", 60)
        self.max_retries = int(max_retries if max_retries is not None else _num("ML_MODEL_MAX_RETRIES", 2))
        self.max_log_chars = int(max_log_chars if max_log_chars is not None else _num("ML_MODEL_MAX_LOG_CHARS", 4_000_000))
        self._transport = transport
        self._cache: Dict[int, MlResult] = {}                      # avoids duplicate calls for the same log

    @property
    def enabled(self) -> bool:
        return bool(self.base_url)

    @property
    def is_configured(self) -> bool:
        return self.enabled

    def check_health(self) -> Dict[str, Any]:
        if not self.enabled:
            return {
                "available": False,
                "status": "NOT_CONFIGURED",
                "detail": "ML_MODEL_API_URL is not configured; running in native diagnostics mode."
            }
        try:
            with httpx.Client(timeout=min(self.timeout, 5.0)) as c:
                r = c.get(f"{self.base_url}/health")
            if r.status_code == 200:
                return {
                    "available": True,
                    "status": "HEALTHY",
                    "data": r.json()
                }
            return {
                "available": False,
                "status": f"HTTP_{r.status_code}",
                "detail": "Model service returned non-200 health status."
            }
        except Exception as exc:
            return {
                "available": False,
                "status": "CONNECTION_FAILED",
                "detail": f"Unable to reach model service: {type(exc).__name__}"
            }


    def _client(self) -> httpx.AsyncClient:
        return httpx.AsyncClient(timeout=self.timeout, transport=self._transport)

    async def warm_up(self) -> bool:
        """Wake a sleeping instance. Call it in the background at app start or when an incident page opens."""
        if not self.enabled:
            return False
        try:
            async with self._client() as c:
                r = await c.get(f"{self.base_url}/health")
            return r.status_code == 200
        except httpx.HTTPError:
            return False

    async def predict(self, log_text: str, top_k: int = 10) -> MlResult:
        if not self.enabled:
            return MlResult(False, "model service not configured")
        if not log_text or not log_text.strip():
            return MlResult(False, "empty log")
        if len(log_text) > self.max_log_chars:
            return MlResult(False, "log too large for the model service")
        key = hash((log_text, top_k))
        if key in self._cache:
            return self._cache[key]
        result = await self._call(log_text, top_k)
        if result.available:
            if len(self._cache) >= 64:
                self._cache.pop(next(iter(self._cache)))
            self._cache[key] = result
        return result

    async def _call(self, log_text: str, top_k: int) -> MlResult:
        headers = {"X-API-Key": self.api_key} if self.api_key else {}
        body = {"schema_version": "1.0", "log_text": log_text, "top_k": top_k}
        reason, t0 = "unknown error", asyncio.get_event_loop().time()
        async with self._client() as c:
            for attempt in range(self.max_retries + 1):
                delay = 2.0 * (attempt + 1)
                try:
                    r = await c.post(f"{self.base_url}/predict", json=body, headers=headers)
                except (httpx.TimeoutException, httpx.TransportError) as e:
                    reason = f"model service unreachable ({type(e).__name__})"
                else:
                    if r.status_code == 200:
                        return self._parse(r, t0)
                    if r.status_code not in RETRY_STATUS:
                        reason = {401: "model service rejected the API key", 413: "log too large for the model service",
                                  422: "model service rejected the request"}.get(r.status_code, f"model service error {r.status_code}")
                        break
                    reason = f"model service busy or starting (HTTP {r.status_code})"
                    try:
                        delay = min(float(r.headers.get("Retry-After", delay)), 15.0)
                    except ValueError:
                        pass
                if attempt < self.max_retries:
                    await asyncio.sleep(delay)
        logger.warning("ml model unavailable: %s", reason)
        return MlResult(False, reason)

    def _parse(self, r: httpx.Response, t0: float) -> MlResult:
        try:
            d = r.json()
            if not str(d.get("schema_version", "")).startswith(SUPPORTED_MAJOR):
                return MlResult(False, "model service uses an unsupported schema version")
            lines = [{"line_no": int(t["line_no"]), "score": float(t["score"]),
                      "section": str(t.get("section", "")), "text": str(t["text"])} for t in d["top_lines"]]
            return MlResult(True, model_version=str(d.get("model_version", "")), top_lines=lines,
                            warnings=[str(w) for w in d.get("warnings", [])], n_lines=int(d.get("n_lines", 0)),
                            elapsed_ms=int((asyncio.get_event_loop().time() - t0) * 1000))
        except (ValueError, KeyError, TypeError):
            return MlResult(False, "model service returned an unexpected response")

_SHARED_ML_MODEL_CLIENT: MlModelClient | None = None

def get_ml_model_client() -> MlModelClient:
    global _SHARED_ML_MODEL_CLIENT
    if _SHARED_ML_MODEL_CLIENT is None:
        _SHARED_ML_MODEL_CLIENT = MlModelClient()
    return _SHARED_ML_MODEL_CLIENT
