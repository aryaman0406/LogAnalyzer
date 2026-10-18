"""Load the trained detector and score log sessions; no model is fabricated."""
from __future__ import annotations
from collections import Counter, defaultdict
from pathlib import Path
import joblib
from ml.pipeline import parse_line

MODEL = Path(__file__).resolve().parent / "models" / "hdfs_rf.joblib"
PARSER = Path(__file__).resolve().parent / "models" / "drain3_parser.joblib"

def predict(log_lines: list[str]) -> list[dict]:
    """Return anomaly scores by extracted block/session ID."""
    if not MODEL.exists():
        return []
    sessions: dict[str, Counter] = defaultdict(Counter)
    miner = joblib.load(PARSER) if PARSER.exists() else None
    for line in log_lines:
        session_id, template = parse_line(line, miner)
        sessions[session_id or "unassigned"][template] += 1
    bundle = joblib.load(MODEL)
    matrix = bundle["vectorizer"].transform(list(sessions.values()))
    scores = bundle["model"].predict_proba(matrix)[:, 1]
    threshold = bundle["threshold"]
    return [{"session_id": sid, "score": float(score), "is_anomalous": bool(score >= threshold)}
            for sid, score in zip(sessions, scores)]

def predict_file(log_file: str | Path) -> list[dict]:
    """Score all sessions in a text log file."""
    return predict(Path(log_file).read_text(encoding="utf-8", errors="replace").splitlines())
