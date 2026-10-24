"""Tests for external Custom ML Model Client, health checks, retries, and degraded mode."""
from __future__ import annotations
import json
import httpx
import pytest

from api.services.ml_model_client import MLModelClient, MLPredictionResult
from agent.tools import predict_custom_ml
from agent.state import InvestigationState

def test_client_unconfigured_graceful_degradation():
    """Verify that when ML_MODEL_API_URL is unset, client operates cleanly in degraded mode."""
    client = MLModelClient(base_url="")
    assert not client.is_configured

    health = client.check_health()
    assert health["available"] is False
    assert health["status"] == "NOT_CONFIGURED"

    pred = client.predict(log_entries=[{"message": "error occurred"}])
    assert pred.available is False
    assert pred.degraded is True
    assert "not configured" in pred.error_message.lower()

def test_client_successful_prediction_mock(monkeypatch):
    """Verify that a successful 200 response parses all fields into MLPredictionResult."""
    mock_payload = {
        "model_version": "1.2.0",
        "predicted_category": "pagination_boundary_error",
        "confidence": 0.96,
        "suspected_files": ["sample_app/incidents.py"],
        "suspected_functions": ["paginate"],
        "severity": "high",
        "anomaly_score": 0.89,
        "features_extracted": {"error_count": 5}
    }

    def mock_post(self, url, **kwargs):
        req = httpx.Request("POST", url)
        return httpx.Response(status_code=200, json=mock_payload, request=req)

    monkeypatch.setattr(httpx.Client, "post", mock_post)

    client = MLModelClient(base_url="https://mock-ml-service.onrender.com")
    res = client.predict(
        log_entries=[{"message": "IndexError: list index out of range"}],
        incident_id="INC-07"
    )

    assert res.available is True
    assert res.degraded is False
    assert res.model_version == "1.2.0"
    assert res.predicted_category == "pagination_boundary_error"
    assert res.confidence == 0.96
    assert "sample_app/incidents.py" in res.suspected_files
    assert "paginate" in res.suspected_functions

def test_client_http_500_failure_handling(monkeypatch):
    """Verify that an HTTP 500 error from the model service triggers retries and returns degraded result."""
    call_count = 0

    def mock_post(self, url, **kwargs):
        nonlocal call_count
        call_count += 1
        req = httpx.Request("POST", url)
        return httpx.Response(status_code=500, json={"detail": "Inference failed"}, request=req)

    monkeypatch.setattr(httpx.Client, "post", mock_post)

    client = MLModelClient(base_url="https://mock-ml-service.onrender.com", max_retries=1)
    res = client.predict(log_entries=[{"message": "some log line"}])

    assert res.available is False
    assert res.degraded is True
    assert "error" in res.error_message.lower()
    assert call_count >= 1

def test_client_timeout_handling(monkeypatch):
    """Verify timeout exception triggers degraded mode without crashing."""
    def mock_post(self, url, **kwargs):
        raise httpx.TimeoutException("Read timed out")

    monkeypatch.setattr(httpx.Client, "post", mock_post)

    client = MLModelClient(base_url="https://mock-ml-service.onrender.com", timeout=1.0)
    res = client.predict(log_entries=[{"message": "some log"}])

    assert res.available is False
    assert res.degraded is True
    assert "timed out" in res.error_message.lower()

def test_client_malformed_json_handling(monkeypatch):
    """Verify malformed JSON response is handled safely without crashing."""
    def mock_post(self, url, **kwargs):
        req = httpx.Request("POST", url)
        return httpx.Response(status_code=200, text="not-valid-json", request=req)

    monkeypatch.setattr(httpx.Client, "post", mock_post)

    client = MLModelClient(base_url="https://mock-ml-service.onrender.com")
    res = client.predict(log_entries=[{"message": "log"}])

    assert res.available is False
    assert res.degraded is True
    assert "malformed json" in res.error_message.lower()

def test_predict_custom_ml_tool_unconfigured(monkeypatch):
    """Verify predict_custom_ml diagnostic tool reports degraded state when unconfigured."""
    monkeypatch.delenv("ML_MODEL_API_URL", raising=False)
    # Reset singleton to pick up environment
    import api.services.ml_model_client as client_mod
    client_mod._CLIENT_INSTANCE = None

    tool_output = predict_custom_ml("data/logs/sample_app.jsonl")
    data = json.loads(tool_output)
    assert data["available"] is False
    assert data["degraded"] is True

def test_state_machine_records_custom_ml():
    """Verify InvestigationState properly records external ML predictions as evidence."""
    state = InvestigationState(incident_id="INC-07")
    mock_prediction = {
        "available": True,
        "degraded": False,
        "model_version": "1.0.0",
        "predicted_category": "pagination_boundary_error",
        "confidence": 0.95,
        "suspected_files": ["sample_app/incidents.py"]
    }
    state.record_ml_prediction(mock_prediction)

    assert len(state.custom_ml_results) == 1
    assert any(e["type"] == "custom_ml" for e in state.evidence)
    assert any("sample_app/incidents.py" in h for h in state.hypotheses)
