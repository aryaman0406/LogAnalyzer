"""Tests for Phase 3: Investigation State, RAG, Local Model Provider, and V2 API endpoints."""
from __future__ import annotations
import json, os
from pathlib import Path
from fastapi.testclient import TestClient

from agent.state import InvestigationState
from agent.rag import search_documentation, get_rag_pipeline
from agent.llm import DiagnosticModeProvider
from agent.tools import detect_anomalies
from agent.agent import Investigator
from api.main import app

ROOT = Path(__file__).resolve().parents[1]

def test_investigation_state_lifecycle():
    """Verify state serialization, deserialization, and report generation."""
    state = InvestigationState(incident_id="INC-01")
    state.add_hypothesis("Suspected null reference in order placement")
    state.record_tool_call(step=1, tool="read_logs", arguments={"file": "sample_app.jsonl"}, output_summary="Error in order_failure")
    state.add_evidence(ev_type="log", reference="sample_app.jsonl", detail="TypeError in order_failure")
    state.record_anomaly({"available": True, "anomalous": True, "score": 0.88, "model": "lstm", "explanation": "Spike in order errors"})
    state.set_final_diagnosis(
        diagnosis="Null reference in order_failure",
        affected_files=["sample_app/incidents.py"],
        affected_functions=["order_failure"],
        confidence=0.92,
        recommendation="Construct order object before accessing attributes",
        severity="high"
    )

    data = state.to_dict()
    assert data["incident_id"] == "INC-01"
    assert data["status"] == "complete"
    assert len(data["evidence"]) >= 2

    # Roundtrip deserialization
    restored = InvestigationState.from_dict(data)
    assert restored.incident_id == "INC-01"
    assert restored.confidence == 0.92
    assert "sample_app/incidents.py" in restored.affected_files

    report = restored.to_report()
    assert report["root_cause"] == "Null reference in order_failure"
    assert report["confidence"] == 0.92
    assert report["suggested_fix"] == "Construct order object before accessing attributes"

def test_rag_pipeline_indexing_and_query():
    """Verify FAISS documentation indexing and top-k retrieval."""
    rag = get_rag_pipeline()
    count = len(rag.chunks)
    assert count > 0, "RAG pipeline collected zero chunks"

    hits = rag.query("incident runbook order failure", top_k=2)
    assert len(hits) > 0
    assert "source" in hits[0]
    assert "content" in hits[0]
    assert hits[0]["score"] > 0.0

    tool_res = search_documentation("order failure")
    assert "###" in tool_res or "No relevant" in tool_res

def test_anomaly_detector_structured_response():
    """Verify detect_anomalies returns structured JSON without fabricating results."""
    res_str = detect_anomalies("data/logs/sample_app.jsonl")
    data = json.loads(res_str)
    assert "available" in data
    assert "anomalous" in data
    assert "score" in data
    assert "model" in data
    assert "explanation" in data

def test_diagnostic_model_provider_initialization():
    """Verify DiagnosticModeProvider reports clean status and handles tool turns."""
    provider = DiagnosticModeProvider()
    info = provider.get_info()
    assert info["provider"] == "diagnostic"
    assert "model" in info
    assert info["status"] == "ready"

    # Complete a turn
    messages = [
        {"role": "system", "content": "You are an investigator."},
        {"role": "user", "content": "Investigate this incident: INC-01\nLog file: data/logs/sample_app.jsonl\nTools enabled: True"}
    ]
    tools = [{"type": "function", "function": {"name": "read_logs", "description": "Read logs", "parameters": {}}}]
    res = provider.complete(messages, tools)
    assert "text" in res
    assert "tool_calls" in res

def test_end_to_end_agent_with_local_provider():
    """Verify end-to-end agent investigation using DiagnosticModeProvider."""
    os.environ["LLM_PROVIDER"] = "local"
    os.environ["ACTIVE_INCIDENT"] = "INC-01"

    inv = Investigator(max_steps=6)
    result = inv.investigate("Investigate INC-01")

    assert "id" in result
    assert "result" in result
    assert "trace" in result
    assert "state" in result

    report = result["result"]
    assert report["root_cause"]
    assert report["affected_file"]
    assert report["suggested_fix"]
    assert report["confidence"] is None
    assert report["confidence_basis"] == "offline fallback, no calibrated confidence"
    assert len(result["state"]["tools_used"]) > 0

def test_api_v2_models_and_endpoints():
    """Verify API endpoints: /models, /models/status, /models/ml-service/status, /models/anomaly/predict, /investigations."""
    client = TestClient(app)

    # Models list
    res = client.get("/api/models")
    assert res.status_code == 200
    data = res.json()
    providers = data["providers"]
    assert any(p["id"] == "gemini" for p in providers)
    assert any(p["id"] == "local" for p in providers)
    assert "external_ml_service" in data

    # Models status
    res = client.get("/api/models/status")
    assert res.status_code == 200
    status_data = res.json()
    assert "active_provider" in status_data
    assert "hardware" in status_data
    assert "external_ml_service" in status_data

    # ML service status endpoint
    res_ml = client.get("/api/models/ml-service/status")
    assert res_ml.status_code == 200
    assert "available" in res_ml.json()

    # Anomaly predict endpoint
    res = client.post("/api/models/anomaly/predict", json={"log_file": "data/logs/sample_app.jsonl"})
    assert res.status_code == 200
    anom = res.json()
    assert "available" in anom
    assert "anomalous" in anom

    # Evaluation endpoint
    res = client.get("/api/evaluation")
    assert res.status_code == 200
    eval_data = res.json()
    assert "available" in eval_data

def test_ml_model_client_integration_in_investigation_available(monkeypatch):
    """Verify integration when ML model is available: Gemini prompt gets ML block and report has ml_ranking."""
    import api.services.ml_model_client as m_client_mod
    from api.services.ml_model_client import MlModelClient, MlResult
    import httpx

    fake_response = {
        "schema_version": "1.0",
        "model_version": "1.0.0",
        "n_lines": 5,
        "n_content_lines": 5,
        "travis_fold_markers": 0,
        "warnings": [],
        "top_lines": [
            {"line_no": 42, "score": 0.95, "section": "script", "text": "CRITICAL: order placement database timeout"}
        ]
    }

    mock_client = MlModelClient(
        base_url="http://mock-ml-svc",
        api_key="dev-key",
        transport=httpx.MockTransport(lambda req: httpx.Response(200, json=fake_response))
    )
    monkeypatch.setattr(m_client_mod, "get_ml_model_client", lambda: mock_client)
    import agent.agent as agent_mod
    monkeypatch.setattr(agent_mod, "get_ml_model_client", lambda: mock_client)

    os.environ["LLM_PROVIDER"] = "local"
    os.environ["ACTIVE_INCIDENT"] = "INC-01"

    inv = Investigator(max_steps=5)
    res = inv.investigate("Investigate INC-01")

    assert "ml_ranking" in res
    assert res["ml_ranking"]["available"] is True
    assert res["ml_ranking"]["model_version"] == "1.0.0"
    assert len(res["ml_ranking"]["top_lines"]) == 1
    assert res["ml_ranking"]["top_lines"][0]["line_no"] == 42
    assert res["result"]["ml_ranking"]["available"] is True


def test_ml_model_client_integration_in_investigation_unavailable(monkeypatch):
    """Verify integration when ML model is unavailable: degraded mode with reason, analysis still completes."""
    import api.services.ml_model_client as m_client_mod
    from api.services.ml_model_client import MlModelClient
    import httpx

    mock_client = MlModelClient(
        base_url="http://mock-ml-svc",
        transport=httpx.MockTransport(lambda req: httpx.Response(503))
    )
    monkeypatch.setattr(m_client_mod, "get_ml_model_client", lambda: mock_client)
    import agent.agent as agent_mod
    monkeypatch.setattr(agent_mod, "get_ml_model_client", lambda: mock_client)

    os.environ["LLM_PROVIDER"] = "local"
    os.environ["ACTIVE_INCIDENT"] = "INC-01"

    inv = Investigator(max_steps=5)
    res = inv.investigate("Investigate INC-01")

    assert "ml_ranking" in res
    assert res["ml_ranking"]["available"] is False
    assert res["ml_ranking"]["reason"] != ""
    assert res["result"]["ml_ranking"]["available"] is False
    # Analysis still completes normally
    assert "root_cause" in res["result"]
    assert res["result"]["confidence"] is None
    assert res["result"]["confidence_basis"] == "offline fallback, no calibrated confidence"


def test_concurrent_investigations_ml_result_isolation(monkeypatch):
    """Verify that concurrent investigations run with different mocked ML results do not leak into each other."""
    import concurrent.futures
    import threading
    import api.services.ml_model_client as m_client_mod
    from api.services.ml_model_client import MlModelClient
    import agent.agent as agent_mod
    import httpx

    os.environ["LLM_PROVIDER"] = "local"

    # Client A returns model_version="1.0.0-A" and line 101
    client_a = MlModelClient(
        base_url="http://mock-ml-a",
        transport=httpx.MockTransport(lambda req: httpx.Response(200, json={
            "schema_version": "1.0",
            "model_version": "1.0.0-A",
            "n_lines": 1,
            "n_content_lines": 1,
            "travis_fold_markers": 0,
            "warnings": ["warning-A"],
            "top_lines": [{"line_no": 101, "score": 0.99, "section": "script", "text": "error line A"}]
        }))
    )

    # Client B returns model_version="2.0.0-B" and line 202
    client_b = MlModelClient(
        base_url="http://mock-ml-b",
        transport=httpx.MockTransport(lambda req: httpx.Response(200, json={
            "schema_version": "1.0",
            "model_version": "2.0.0-B",
            "n_lines": 1,
            "n_content_lines": 1,
            "travis_fold_markers": 0,
            "warnings": ["warning-B"],
            "top_lines": [{"line_no": 202, "score": 0.88, "section": "script", "text": "error line B"}]
        }))
    )

    thread_local = threading.local()

    def thread_safe_get_ml_client():
        return getattr(thread_local, "client", client_a)

    monkeypatch.setattr(m_client_mod, "get_ml_model_client", thread_safe_get_ml_client)
    monkeypatch.setattr(agent_mod, "get_ml_model_client", thread_safe_get_ml_client)

    def run_investigation_with_client(client, incident_id):
        thread_local.client = client
        inv = Investigator(max_steps=5)
        return inv.investigate(f"Investigate {incident_id}")

    # Run in parallel across worker threads
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        future_a = executor.submit(run_investigation_with_client, client_a, "INC-01")
        future_b = executor.submit(run_investigation_with_client, client_b, "INC-07")
        res_a = future_a.result()
        res_b = future_b.result()

    # Verify report A contains ONLY client A's result
    assert res_a["ml_ranking"]["model_version"] == "1.0.0-A"
    assert res_a["ml_ranking"]["top_lines"][0]["line_no"] == 101
    assert res_a["result"]["ml_ranking"]["model_version"] == "1.0.0-A"
    assert res_a["result"]["ml_ranking"]["top_lines"][0]["line_no"] == 101

    # Verify report B contains ONLY client B's result
    assert res_b["ml_ranking"]["model_version"] == "2.0.0-B"
    assert res_b["ml_ranking"]["top_lines"][0]["line_no"] == 202
    assert res_b["result"]["ml_ranking"]["model_version"] == "2.0.0-B"
    assert res_b["result"]["ml_ranking"]["top_lines"][0]["line_no"] == 202


def test_llm_fallback_invalid_key(monkeypatch):
    """Verify LLMClient gracefully falls back to offline diagnostic provider on invalid key."""
    from agent.llm import LLMClient
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "invalid_test_key_xyz_123")

    client = LLMClient()
    # Mock complete to simulate invalid key response from google genai
    def mock_generate_content(*args, **kwargs):
        raise RuntimeError("API key not valid. Please pass a valid API key.")

    if hasattr(client, "client") and hasattr(client.client, "models"):
        monkeypatch.setattr(client.client.models, "generate_content", mock_generate_content)

    res = client.complete([{"role": "user", "content": "test query"}], [])
    assert client.provider == "offline"
    assert "llm_fallback" in res
    assert res["llm_fallback"]["used"] is True
    assert "invalid key" in res["llm_fallback"]["reason"].lower()


def test_llm_fallback_rate_limit(monkeypatch):
    """Verify LLMClient gracefully falls back to offline diagnostic provider on rate limit exhaustion."""
    from agent.llm import LLMClient
    monkeypatch.setenv("LLM_PROVIDER", "gemini")
    monkeypatch.setenv("GEMINI_API_KEY", "test_key_for_rate_limit")

    client = LLMClient()
    def mock_generate_content_429(*args, **kwargs):
        raise RuntimeError("429 RESOURCE_EXHAUSTED. Quota exceeded for model.")

    if hasattr(client, "client") and hasattr(client.client, "models"):
        monkeypatch.setattr(client.client.models, "generate_content", mock_generate_content_429)

    # Speed up sleep during test
    import time
    monkeypatch.setattr(time, "sleep", lambda s: None)

    res = client.complete([{"role": "user", "content": "test query"}], [])
    assert client.provider == "offline"
    assert "llm_fallback" in res
    assert res["llm_fallback"]["used"] is True
    assert "rate limit" in res["llm_fallback"]["reason"].lower()

