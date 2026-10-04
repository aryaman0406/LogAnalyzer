"""Small smoke and regression checks for the sample app and incident switches."""
from fastapi.testclient import TestClient

from sample_app.main import app
from sample_app.incidents import paginate


def test_health_and_products() -> None:
    with TestClient(app) as client:
        assert client.get("/health").json() == {"status": "ok"}
        assert len(client.get("/products").json()) == 3


def test_pagination_normal(monkeypatch) -> None:
    monkeypatch.delenv("ACTIVE_INCIDENT", raising=False)
    assert paginate([{"id": i} for i in range(5)], 0, 2) == [{"id": 0}, {"id": 1}]


def test_incident_catalog_covers_eight() -> None:
    import json
    from pathlib import Path
    catalog = json.loads((Path(__file__).parents[1] / "sample_app" / "incidents_catalog.json").read_text())
    assert [item["id"] for item in catalog] == [f"INC-{i:02d}" for i in range(1, 9)]
