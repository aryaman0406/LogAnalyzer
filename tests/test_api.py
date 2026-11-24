"""API request validation and non-mutating patch safeguards."""
from fastapi.testclient import TestClient
from api.main import app

def test_incidents_endpoint():
    with TestClient(app) as client:
        assert len(client.get("/api/incidents").json())==8

def test_unknown_incident_rejected():
    with TestClient(app) as client:
        assert client.post("/api/investigations",json={"incident_id":"INC-99"}).status_code==404

def test_image_analysis_requires_gemini_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    with TestClient(app) as client:
        response = client.post(
            "/api/images/analyze",
            content=b"\x89PNG\r\n\x1a\nimage",
            headers={"content-type": "image/png"},
        )
    assert response.status_code == 503

def test_image_analysis_returns_structured_gemini_diagnosis(monkeypatch):
    import json

    diagnosis = {
        "error_detected": True,
        "summary": "The screenshot shows a database connection timeout.",
        "detected_errors": ["Connection timed out"],
        "likely_cause": "The database did not respond before the client timeout.",
        "suggested_fix": "Check database availability and connection settings.",
        "extracted_text": "Connection timed out",
        "confidence": 0.9,
    }

    class FakeGeminiClient:
        provider = "gemini"
        llm_fallback = {"used": False, "reason": None}

        def analyze_image(self, image_bytes, mime_type):
            assert image_bytes.startswith(b"\x89PNG\r\n\x1a\n")
            assert mime_type == "image/png"
            return json.dumps(diagnosis)

    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    monkeypatch.setattr("api.main.LLMClient", lambda provider: FakeGeminiClient())
    with TestClient(app) as client:
        response = client.post(
            "/api/images/analyze",
            content=b"\x89PNG\r\n\x1a\nimage",
            headers={"content-type": "image/png"},
        )

    assert response.status_code == 200
    assert response.json() == diagnosis

def test_image_analysis_rejects_mismatched_image_content(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    with TestClient(app) as client:
        response = client.post(
            "/api/images/analyze",
            content=b"not an image",
            headers={"content-type": "image/png"},
        )
    assert response.status_code == 415

def test_uploaded_log_content_is_used_and_removed(monkeypatch):
    from pathlib import Path
    import api.main as api_module

    observed = {}

    class FakeInvestigator:
        def investigate(self, query, **kwargs):
            uploaded_log = api_module.ROOT / kwargs["log_file"]
            observed["content"] = uploaded_log.read_text(encoding="utf-8")
            observed["path"] = uploaded_log
            return {"state": {}, "result": {}, "trace": []}

    monkeypatch.setattr("api.main.Investigator", FakeInvestigator)
    with TestClient(app) as client:
        response = client.post(
            "/api/investigations",
            json={
                "incident_id": None,
                "log_content": "ERROR database connection timed out",
                "use_tools": False,
                "use_anomaly_detector": False,
            },
        )

    assert response.status_code == 202
    assert observed["content"] == "ERROR database connection timed out"
    assert isinstance(observed["path"], Path)
    assert not observed["path"].exists()
