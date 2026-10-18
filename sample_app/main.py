"""Small e-commerce API with structured logs and reproducible incident switches."""
from __future__ import annotations

import json
import logging
import os
import sqlite3
import time
import uuid
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Query, Request
from pydantic import BaseModel, Field

from sample_app.incidents import active_incident, decrement_stock, order_failure, paginate, reset_request_incident, set_request_incident

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = Path(os.getenv("SAMPLE_DB", ROOT / "data" / "sample_app.db"))
LOG_PATH = Path(os.getenv("LOG_FILE", ROOT / "data" / "logs" / "sample_app.jsonl"))
DB_PATH.parent.mkdir(parents=True, exist_ok=True)
LOG_PATH.parent.mkdir(parents=True, exist_ok=True)


class JsonFormatter(logging.Formatter):
    """Serialize log records using the prompt pack's structured fields."""
    def format(self, record: logging.LogRecord) -> str:
        return json.dumps({"timestamp": self.formatTime(record), "level": record.levelname,
                           "service": "sample-app", "request_id": getattr(record, "request_id", "system"),
                           "message": record.getMessage()}, ensure_ascii=False)


logger = logging.getLogger("sample_app")
logger.setLevel(logging.INFO)
if not logger.handlers:
    handler = logging.FileHandler(LOG_PATH, encoding="utf-8")
    handler.setFormatter(JsonFormatter())
    logger.addHandler(handler)


def connect() -> sqlite3.Connection:
    """Create a short-lived SQLite connection with a bounded lock wait."""
    conn = sqlite3.connect(DB_PATH, timeout=0.25)
    conn.row_factory = sqlite3.Row
    return conn


def initialize_database() -> None:
    """Create the sample schema and deterministic starter catalog."""
    with connect() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL);
            CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY, name TEXT NOT NULL, price REAL NOT NULL, stock INTEGER NOT NULL);
            CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, product_id INTEGER NOT NULL, quantity INTEGER NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
        """)
        conn.execute("INSERT OR IGNORE INTO users VALUES(1, 'demo@example.com')")
        conn.executemany("INSERT OR IGNORE INTO products VALUES(?,?,?,?)", [
            (1, "Keyboard", 79.0, 8), (2, "Mouse", 29.0, 15), (3, "Monitor", 249.0, 4)])


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    yield


app = FastAPI(title="Incident Sample Shop", version="0.1.0", lifespan=lifespan)


@app.middleware("http")
async def request_logging(request: Request, call_next):
    request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    incident_token = set_request_incident(request.headers.get("x-demo-incident"))
    started = time.monotonic()
    try:
        response = await call_next(request)
        logger.info("%s %s status=%s duration_ms=%.1f", request.method, request.url.path,
                    response.status_code, (time.monotonic() - started) * 1000,
                    extra={"request_id": request_id})
        response.headers["X-Request-ID"] = request_id
        return response
    except Exception:
        logger.exception("request failed", extra={"request_id": request_id})
        raise
    finally:
        reset_request_incident(incident_token)


class OrderRequest(BaseModel):
    user_id: int = 1
    product_id: int
    quantity: int = Field(gt=0, le=100)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/users")
def users() -> list[dict[str, Any]]:
    with connect() as conn:
        return [dict(row) for row in conn.execute("SELECT * FROM users")]


@app.get("/products")
def products(offset: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100)) -> list[dict[str, Any]]:
    with connect() as conn:
        rows = [dict(row) for row in conn.execute("SELECT * FROM products ORDER BY id")]
    return paginate(rows, offset, limit)


@app.post("/orders", status_code=201)
def create_order(order: OrderRequest, x_demo_token: str | None = Header(None)) -> dict[str, Any]:
    incident = active_incident()
    if incident == "INC-05" and x_demo_token != "valid-demo-token":
        raise HTTPException(status_code=401, detail="invalid or expired token")
    try:
        order_failure()
    except PermissionError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc
    with connect() as conn:
        product = conn.execute("SELECT * FROM products WHERE id=?", (order.product_id,)).fetchone()
        if product is None:
            raise HTTPException(status_code=404, detail="product not found")
        if product["stock"] < order.quantity:
            raise HTTPException(status_code=409, detail="insufficient stock")
        new_stock = decrement_stock(order.product_id, product["stock"])
        conn.execute("UPDATE products SET stock=? WHERE id=?", (new_stock, order.product_id))
        cursor = conn.execute("INSERT INTO orders(user_id, product_id, quantity) VALUES(?,?,?)",
                              (order.user_id, order.product_id, order.quantity))
        return {"id": cursor.lastrowid, "user_id": order.user_id,
                "product_id": order.product_id, "quantity": order.quantity}


@app.get("/debug/incident")
def debug_incident() -> dict[str, str | None]:
    """Expose only the locally configured demo mode for reproducibility."""
    return {"active_incident": active_incident()}
