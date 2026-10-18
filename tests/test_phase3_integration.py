"""Tests for Phase 3: Investigation State, RAG, Local Model Provider, and V2 API endpoints."""
from __future__ import annotations
import json, os
from pathlib import Path
from fastapi.testclient import TestClient

from agent.state import InvestigationState
from agent.rag import search_documentation, get_rag_pipeline
from agent.llm import LocalIncidentModelProvider
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

def test_local_model_provider_initialization():
    """Verify LocalIncidentModelProvider reports clean status and handles tool turns."""
    provider = LocalIncidentModelProvider()
    info = provider.get_info()
    assert info["provider"] == "local"
    assert "base_model" in info
    assert "adapter_loaded" in info
    assert "status" in info

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
    """Verify end-to-end agent investigation using LocalIncidentModelProvider."""
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
    assert len(result["state"]["tools_used"]) > 0

def test_api_v2_models_and_endpoints():
    """Verify API endpoints: /models, /models/status, /models/anomaly/predict, /investigations."""
    client = TestClient(app)

    # Models list
    res = client.get("/api/models")
    assert res.status_code == 200
    providers = res.json()["providers"]
    assert any(p["id"] == "local" for p in providers)

    # Models status
    res = client.get("/api/models/status")
    assert res.status_code == 200
    status_data = res.json()
    assert "active_provider" in status_data
    assert "adapter_loaded" in status_data
    assert "hardware" in status_data

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
