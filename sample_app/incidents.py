"""Select one intentionally faulty incident module using ACTIVE_INCIDENT."""
from __future__ import annotations
import importlib
import os

INCIDENT_IDS = tuple(f"INC-{i:02d}" for i in range(1, 9))

def active_incident() -> str | None:
    """Return the configured incident ID, if it is recognized."""
    value = os.getenv("ACTIVE_INCIDENT", "").upper()
    return value if value in INCIDENT_IDS else None

def _mode():
    incident = active_incident()
    return importlib.import_module(f"sample_app.incident_modes.{incident.lower().replace('-', '_')}") if incident else None

def order_failure() -> None:
    """Run the configured order-path incident, when one is active."""
    mode = _mode()
    if mode and hasattr(mode, "run"):
        mode.run()

def paginate(items: list[dict], offset: int, limit: int) -> list[dict]:
    """Return a page of products using standard offset pagination."""
    mode = _mode()
    if mode and hasattr(mode, "paginate"):
        return mode.paginate(items, offset, limit)
    return items[offset:offset + limit]

def decrement_stock(product_id: int, current_stock: int) -> int:
    """Decrement stock; incident module simulates a lost update."""
    mode = _mode()
    if mode and hasattr(mode, "decrement"):
        return mode.decrement(product_id, current_stock)
    return max(0, current_stock - 1)
