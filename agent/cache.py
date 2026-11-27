"""Persistent error-signature cache for reusing verified Gemini diagnoses when Gemini is unavailable."""
from __future__ import annotations

import hashlib
import json
import re
import sqlite3
import time
from pathlib import Path
from typing import Any

from agent.tools import normalize_log_line, log_stats

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = ROOT / "data" / "investigations.sqlite3"

_VOLATILE_PATTERNS = [
    (re.compile(r"\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b", re.I), "<UUID>"),
    (re.compile(r"\b\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\b"), "<TS>"),
    (re.compile(r"\b\d{1,3}(?:\.\d{1,3}){3}\b"), "<IP>"),
    (re.compile(r"\b(duration_ms|timeout_ms|port|user_id|order_id|job_id|pid)=\S+", re.I), r"\1=<VAL>"),
    (re.compile(r"\bport\s+\d+\b", re.I), "port <PORT>"),
    (re.compile(r"\b\d+\b"), "<N>"),
]


def extract_error_signature(log_text: str) -> tuple[str, str]:
    """Compute a stable SHA-256 signature for the error/security pattern of a log."""
    if not log_text or not log_text.strip():
        return ("", "")

    key_lines: list[str] = []
    warn_lines: list[str] = []
    for raw in log_text.splitlines():
        norm = normalize_log_line(raw)
        if norm["format"] == "empty":
            continue
        lvl = str(norm.get("level", "")).upper()
        if norm.get("security_signal") or lvl in {"CRITICAL", "FATAL", "ERROR"}:
            key_lines.append(f"{norm.get('format')}|{lvl}|{norm.get('service')}|{norm.get('message')}")
        elif lvl == "WARN":
            warn_lines.append(f"{norm.get('format')}|{lvl}|{norm.get('service')}|{norm.get('message')}")

    chosen = key_lines or warn_lines
    if not chosen:
        chosen = [line.strip() for line in log_text.splitlines() if line.strip()][:5]

    normalized: list[str] = []
    seen: set[str] = set()
    for item in chosen:
        s = item
        for rx, repl in _VOLATILE_PATTERNS:
            s = rx.sub(repl, s)
        if s not in seen:
            seen.add(s)
            normalized.append(s)

    canonical = "\n".join(normalized[:20])
    digest = hashlib.sha256(canonical.encode("utf-8")).hexdigest()
    return (digest, canonical[:400])


class DiagnosisCache:
    """SQLite-backed cache mapping normalized error signatures to verified Gemini reports."""

    def __init__(self, db_path: Path = DEFAULT_DB) -> None:
        self.db_path = db_path
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        with self._conn() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS diagnosis_cache (
                    signature_hash TEXT PRIMARY KEY,
                    signature_preview TEXT,
                    report_json TEXT NOT NULL,
                    created_at REAL NOT NULL,
                    hit_count INTEGER NOT NULL DEFAULT 0
                )
                """
            )

    def _conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        return conn

    def get(self, signature_hash: str) -> dict[str, Any] | None:
        if not signature_hash:
            return None
        try:
            with self._conn() as conn:
                row = conn.execute(
                    "SELECT report_json FROM diagnosis_cache WHERE signature_hash = ?",
                    (signature_hash,),
                ).fetchone()
                if not row:
                    return None
                conn.execute(
                    "UPDATE diagnosis_cache SET hit_count = hit_count + 1 WHERE signature_hash = ?",
                    (signature_hash,),
                )
                return json.loads(row["report_json"])
        except Exception:
            return None

    def put(self, signature_hash: str, signature_preview: str, report: dict[str, Any]) -> None:
        if not signature_hash:
            return
        cacheable = {
            "root_cause": report.get("root_cause"),
            "severity": report.get("severity", "high"),
            "affected_file": report.get("affected_file", "unknown"),
            "affected_function": report.get("affected_function", "unknown"),
            "affected_service": report.get("affected_service", "external_service"),
            "suggested_fix": report.get("suggested_fix", ""),
            "secondary_incidents": report.get("secondary_incidents", []),
            "confidence": report.get("confidence"),
        }
        try:
            with self._conn() as conn:
                conn.execute(
                    """
                    INSERT INTO diagnosis_cache (signature_hash, signature_preview, report_json, created_at, hit_count)
                    VALUES (?, ?, ?, ?, 0)
                    ON CONFLICT(signature_hash) DO UPDATE SET
                        signature_preview = excluded.signature_preview,
                        report_json = excluded.report_json,
                        created_at = excluded.created_at
                    """,
                    (signature_hash, signature_preview, json.dumps(cacheable), time.time()),
                )
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Offline deterministic log analyser — fires when Gemini is unavailable and
# the error pattern is NOT yet in the cache.
# ---------------------------------------------------------------------------

_RULES: list[dict[str, Any]] = [
    {
        "id": "ssh_brute_force",
        "title": "SSH brute-force / credential stuffing attack",
        "keywords": ["failed password", "invalid user", "authentication failure"],
        "severity": "critical",
        "affected_service": "sshd",
        "fix": "Block offending IPs with fail2ban / ufw. Rotate all SSH credentials. Enforce key-only auth (`PasswordAuthentication no` in sshd_config). Enable MFA.",
    },
    {
        "id": "http_401_spike",
        "title": "HTTP 401 Unauthorized spike — possible credential stuffing or token expiry",
        "keywords": ["401", "unauthorized", "authentication failed"],
        "severity": "high",
        "affected_service": "http",
        "fix": "Check for token expiry or missing Authorization header. Rate-limit 401 responses. Rotate API keys or JWT signing secrets if attack suspected.",
    },
    {
        "id": "signing_key_failure",
        "title": "Cryptographic signing key failure",
        "keywords": ["signing key", "signature verification", "invalid signature", "keypair"],
        "severity": "critical",
        "affected_service": "auth",
        "fix": "Rotate the signing key immediately. Re-issue all active JWTs/tokens signed with the compromised key. Audit key rotation runbook.",
    },
    {
        "id": "null_pointer",
        "title": "NullPointerException / AttributeError — uninitialized object dereference",
        "keywords": ["nullpointerexception", "attributeerror", "nonetype", "null pointer", "nullref"],
        "severity": "high",
        "affected_service": "application",
        "fix": "Add null-guard before dereferencing the object. Check the stack trace to find where the None value originates and add defensive initialization.",
    },
    {
        "id": "db_error",
        "title": "Database connectivity or query failure",
        "keywords": ["connection refused", "db error", "sqlexception", "operationalerror", "deadlock", "connection pool", "too many connections"],
        "severity": "high",
        "affected_service": "database",
        "fix": "Check DB server health and connection limits. Increase pool size or add retry with exponential back-off. Review slow-query log for lock contention.",
    },
    {
        "id": "payment_5xx",
        "title": "Payment gateway 5xx — upstream service failure",
        "keywords": ["payment", "500", "502", "503", "gateway", "stripe", "paypal", "checkout"],
        "severity": "high",
        "affected_service": "payment",
        "fix": "Check upstream payment provider status page. Add circuit-breaker pattern. Queue failed transactions for retry. Alert on-call SRE.",
    },
    {
        "id": "smtp_retry",
        "title": "SMTP delivery exhaustion — email sending repeatedly failing",
        "keywords": ["smtp", "mail", "sendmail", "retry", "connection timed out", "failed to send"],
        "severity": "medium",
        "affected_service": "email",
        "fix": "Check SMTP server connectivity and credentials. Verify SPF/DKIM/DMARC records. Switch to a transactional email provider (SendGrid, SES) with built-in retry.",
    },
    {
        "id": "rate_limit",
        "title": "Rate limit / throttling breach",
        "keywords": ["rate limit", "too many requests", "429", "throttle", "quota exceeded"],
        "severity": "medium",
        "affected_service": "api",
        "fix": "Implement exponential back-off with jitter on the client side. Cache repeated identical requests. Request a quota increase from the upstream API provider.",
    },
    {
        "id": "parse_error",
        "title": "JSON/XML/data parse error",
        "keywords": ["jsondecodeerror", "parse error", "invalid json", "malformed", "unexpected token", "xml parse"],
        "severity": "medium",
        "affected_service": "application",
        "fix": "Validate the payload schema before parsing. Add a try/except around the parse call and log the raw body for debugging. Check for encoding mismatches (UTF-8 vs Latin-1).",
    },
]


def _match_rule(text_lower: str, rule: dict[str, Any]) -> bool:
    return any(kw in text_lower for kw in rule["keywords"])


def analyze_log_offline(log_text: str, log_file: str = "") -> dict[str, Any]:
    """Deterministic rule-based log analysis — returns a structured diagnosis without Gemini.

    Returns a dict with the same keys as a Gemini-produced report so the frontend renders it
    identically:  root_cause, severity, affected_file, affected_function, affected_service,
    suggested_fix, evidence (list with line references), secondary_incidents, confidence,
    confirmation_status, confidence_basis, llm_fallback.
    """
    lines = log_text.splitlines()
    text_lower = log_text.lower()

    # Match every rule and collect the lines that triggered it
    matches: list[dict[str, Any]] = []
    for rule in _RULES:
        if not _match_rule(text_lower, rule):
            continue
        evidence_lines: list[dict[str, Any]] = []
        for i, raw in enumerate(lines, start=1):
            norm = normalize_log_line(raw)
            msg = str(norm.get("message", raw)).lower()
            if any(kw in msg for kw in rule["keywords"]):
                evidence_lines.append({
                    "type": "log",
                    "reference": f"line {i}",
                    "detail": raw.strip()[:200],
                    "source": "Offline Rule Engine",
                })
                if len(evidence_lines) >= 5:
                    break
        if evidence_lines:
            matches.append({"rule": rule, "evidence": evidence_lines})

    if not matches:
        # Generic fallback: surface first ERROR/CRITICAL lines
        generic_evidence: list[dict[str, Any]] = []
        for i, raw in enumerate(lines, start=1):
            norm = normalize_log_line(raw)
            if norm.get("level") in {"ERROR", "CRITICAL", "FATAL"} or norm.get("security_signal"):
                generic_evidence.append({
                    "type": "log",
                    "reference": f"line {i}",
                    "detail": raw.strip()[:200],
                    "source": "Offline Rule Engine",
                })
                if len(generic_evidence) >= 5:
                    break
        return {
            "root_cause": "Could not identify a specific pattern. See highlighted log lines for manual review.",
            "severity": "medium",
            "affected_file": log_file or "unknown",
            "affected_function": "unknown",
            "affected_service": "unknown",
            "suggested_fix": "Review the ERROR/CRITICAL lines above. Enable Gemini API for detailed AI-powered diagnosis.",
            "evidence": generic_evidence,
            "secondary_incidents": [],
            "confidence": 0.3,
            "confirmation_status": "inferred",
            "confidence_basis": "offline generic scan — no matching rule found",
            "llm_fallback": {
                "used": True,
                "reason": "Gemini API unavailable; offline rule engine found no matching pattern",
                "cached": False,
            },
        }

    # Primary = highest-severity match
    _sev_order = {"critical": 3, "high": 2, "medium": 1, "low": 0}
    matches.sort(key=lambda m: _sev_order.get(m["rule"]["severity"], 0), reverse=True)

    primary = matches[0]
    secondary_incidents: list[dict[str, Any]] = []
    for m in matches[1:]:
        r = m["rule"]
        secondary_incidents.append({
            "title": r["title"],
            "severity": r["severity"],
            "affected_service": r["affected_service"],
            "summary": f"Detected via keywords: {', '.join(r['keywords'][:3])}",
            "suggested_fix": r["fix"],
            "evidence": m["evidence"][:2],
        })

    pr = primary["rule"]
    return {
        "root_cause": pr["title"],
        "severity": pr["severity"],
        "affected_file": log_file or "unknown",
        "affected_function": "unknown",
        "affected_service": pr["affected_service"],
        "suggested_fix": pr["fix"],
        "evidence": primary["evidence"],
        "secondary_incidents": secondary_incidents,
        "confidence": 0.65,
        "confirmation_status": "likely",
        "confidence_basis": "offline deterministic rule-based log analysis",
        "llm_fallback": {
            "used": True,
            "reason": "Gemini API unavailable; offline rule engine used",
            "cached": False,
        },
    }

