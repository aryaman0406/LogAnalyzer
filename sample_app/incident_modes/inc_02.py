"""INC-02: hold an exclusive SQLite lock long enough for peer writes to time out."""
import os
import sqlite3
import time
from pathlib import Path
def run() -> None:
    db_path = Path(os.getenv("SAMPLE_DB", Path(__file__).resolve().parents[2] / "data" / "sample_app.db"))
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path, timeout=.1)
    try:
        conn.execute("BEGIN EXCLUSIVE")
        time.sleep(2.0)
        conn.rollback()
    finally:
        conn.close()
