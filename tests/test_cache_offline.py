"""Tests for diagnosis cache and offline rule-based log analyser."""
from __future__ import annotations

import tempfile
from pathlib import Path

import pytest

from agent.cache import DiagnosisCache, analyze_log_offline, extract_error_signature


# ---------------------------------------------------------------------------
# extract_error_signature
# ---------------------------------------------------------------------------

def test_signature_stable_across_volatile_fields():
    """Same error pattern with different timestamps / IPs must yield same hash."""
    log_a = (
        "2024-01-01T10:00:00Z ERROR Failed password for root from 192.168.1.1 port 22\n"
        "2024-01-01T10:00:01Z ERROR Failed password for admin from 10.0.0.2 port 22\n"
    )
    log_b = (
        "2024-03-15T18:30:00Z ERROR Failed password for root from 203.0.113.5 port 22\n"
        "2024-03-15T18:30:02Z ERROR Failed password for admin from 198.51.100.7 port 22\n"
    )
    h_a, _ = extract_error_signature(log_a)
    h_b, _ = extract_error_signature(log_b)
    assert h_a == h_b, "signatures must be equal after volatile-field stripping"


def test_signature_empty_log():
    h, preview = extract_error_signature("")
    assert h == ""
    assert preview == ""


# ---------------------------------------------------------------------------
# DiagnosisCache put / get round-trip
# ---------------------------------------------------------------------------

@pytest.fixture()
def tmp_cache(tmp_path: Path) -> DiagnosisCache:
    return DiagnosisCache(db_path=tmp_path / "test_cache.sqlite3")


def test_cache_put_and_get(tmp_cache: DiagnosisCache):
    report = {
        "root_cause": "SSH brute-force attack",
        "severity": "critical",
        "affected_file": "/var/log/auth.log",
        "affected_function": "unknown",
        "affected_service": "sshd",
        "suggested_fix": "Block IPs with fail2ban",
        "secondary_incidents": [],
        "confidence": 0.92,
    }
    tmp_cache.put("abc123", "preview text", report)
    retrieved = tmp_cache.get("abc123")
    assert retrieved is not None
    assert retrieved["root_cause"] == "SSH brute-force attack"
    assert retrieved["severity"] == "critical"


def test_cache_miss_returns_none(tmp_cache: DiagnosisCache):
    assert tmp_cache.get("nonexistent_hash") is None


def test_cache_empty_hash_returns_none(tmp_cache: DiagnosisCache):
    assert tmp_cache.get("") is None


def test_cache_upsert_updates_existing(tmp_cache: DiagnosisCache):
    tmp_cache.put("h1", "preview", {"root_cause": "old", "severity": "low", "confidence": 0.5})
    tmp_cache.put("h1", "preview", {"root_cause": "new", "severity": "high", "confidence": 0.9})
    result = tmp_cache.get("h1")
    assert result["root_cause"] == "new"
    assert result["severity"] == "high"


# ---------------------------------------------------------------------------
# analyze_log_offline — SSH brute-force
# ---------------------------------------------------------------------------

SSH_LOG = """\
Jan 10 02:14:01 server sshd[1234]: Failed password for root from 203.0.113.42 port 51234 ssh2
Jan 10 02:14:03 server sshd[1235]: Failed password for admin from 203.0.113.42 port 51235 ssh2
Jan 10 02:14:05 server sshd[1236]: Invalid user ubuntu from 203.0.113.42 port 51236
Jan 10 02:14:07 server sshd[1237]: Failed password for invalid user test from 203.0.113.42 port 51237 ssh2
Jan 10 02:14:09 server sshd[1238]: Failed password for root from 203.0.113.42 port 51238 ssh2
"""


def test_offline_ssh_brute_force_primary():
    result = analyze_log_offline(SSH_LOG, log_file="auth.log")
    assert result["severity"] == "critical"
    assert "ssh" in result["root_cause"].lower() or "brute" in result["root_cause"].lower()
    assert result["affected_service"] == "sshd"
    assert len(result["evidence"]) >= 1
    assert result["evidence"][0]["reference"].startswith("line ")
    assert result["confidence"] >= 0.6
    assert result["confirmation_status"] in {"likely", "confirmed"}
    assert result["llm_fallback"]["used"] is True


# ---------------------------------------------------------------------------
# analyze_log_offline — NullPointerException (Java-style)
# ---------------------------------------------------------------------------

JAVA_LOG = """\
2024-01-15 12:00:00 ERROR com.example.OrderService - Uncaught exception in thread main
java.lang.NullPointerException: Cannot invoke method getId() on null object
    at com.example.OrderService.processOrder(OrderService.java:142)
    at com.example.Main.main(Main.java:30)
2024-01-15 12:00:01 WARN  com.example.DB - Connection pool exhausted, waiting...
2024-01-15 12:00:02 ERROR com.example.DB - OperationalError: too many connections
"""


def test_offline_null_pointer_primary():
    result = analyze_log_offline(JAVA_LOG, log_file="app.log")
    assert "null" in result["root_cause"].lower() or "nullpointer" in result["root_cause"].lower()
    assert result["severity"] in {"high", "critical"}
    # DB error should appear as secondary
    secondary_titles = [s["title"].lower() for s in result["secondary_incidents"]]
    assert any("db" in t or "database" in t or "connection" in t for t in secondary_titles), \
        f"Expected DB secondary incident, got: {secondary_titles}"


# ---------------------------------------------------------------------------
# analyze_log_offline — Multi-incident mixed log
# ---------------------------------------------------------------------------

MIXED_LOG = """\
2024-01-20 09:00:00 ERROR payment-service - POST /checkout HTTP 500 from stripe gateway
2024-01-20 09:00:01 ERROR payment-service - POST /checkout HTTP 503 upstream timeout
2024-01-20 09:00:05 ERROR mailer - SMTP connection timed out after 3 retries
2024-01-20 09:00:06 WARN  api-gateway - 429 Too Many Requests on /api/v2/orders
2024-01-20 09:00:07 ERROR auth-service - 401 Unauthorized: authentication failed for user@example.com
"""


def test_offline_multi_incident_has_secondary():
    result = analyze_log_offline(MIXED_LOG, log_file="mixed.log")
    # Must detect at least primary + 1 secondary
    assert len(result["secondary_incidents"]) >= 1
    all_services = {result["affected_service"]} | {s["affected_service"] for s in result["secondary_incidents"]}
    # Payment, email, rate-limit or auth should all show up across primary + secondaries
    keywords_expected = {"payment", "email", "api", "http"}
    matched = sum(1 for svc in all_services if any(k in svc for k in keywords_expected))
    assert matched >= 1, f"Expected at least one of payment/email/api/http in {all_services}"


# ---------------------------------------------------------------------------
# analyze_log_offline — unknown pattern falls back gracefully
# ---------------------------------------------------------------------------

UNKNOWN_LOG = """\
2024-01-01 10:00:00 INFO  scheduler - Job completed successfully
2024-01-01 10:00:01 INFO  scheduler - Next run scheduled in 3600s
"""


def test_offline_unknown_pattern_graceful():
    result = analyze_log_offline(UNKNOWN_LOG, log_file="scheduler.log")
    # Must return a valid structure even with no rule match
    assert isinstance(result["root_cause"], str)
    assert isinstance(result["evidence"], list)
    assert isinstance(result["secondary_incidents"], list)
    assert result["confidence"] <= 0.5  # low confidence for generic fallback
    assert result["llm_fallback"]["used"] is True
