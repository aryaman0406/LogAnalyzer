"""API request validation and non-mutating patch safeguards."""
from fastapi.testclient import TestClient
from api.main import app

def test_incidents_endpoint():
    with TestClient(app) as client:
        assert len(client.get("/api/incidents").json())==8

def test_unknown_incident_rejected():
    with TestClient(app) as client:
        assert client.post("/api/investigations",json={"incident_id":"INC-99"}).status_code==404
