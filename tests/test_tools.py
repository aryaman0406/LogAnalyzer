"""Security and behavior checks for the read-only agent tools."""
import pytest
from agent import tools

def test_read_file_blocks_traversal():
    with pytest.raises(ValueError): tools.read_file("../outside.txt")

def test_run_command_allowlist():
    with pytest.raises(ValueError): tools.run_command("python -c print(1)")
    with pytest.raises(ValueError): tools.run_command("pytest --rootdir=C:/")

def test_run_command_reads_repo_file():
    assert "Incident Agent V2" in tools.run_command("cat README.md")

def test_outputs_are_truncated():
    assert len(tools._clip("x"*10000)) <= tools.MAX_CHARS+20

def test_read_logs_bounds_limit():
    p=tools.ROOT/"data"/"test_logs_temporary.jsonl"
    p.write_text('{"level":"INFO","timestamp":"2026-01-01","message":"one"}\n')
    try:
        assert '"one"' in tools.read_logs("data/test_logs_temporary.jsonl",limit=0)
    finally:
        p.unlink(missing_ok=True)

def test_search_code_skips_excluded_folders_and_large_files():
    tok_ex = "EXCL_" + "SECRET_TOKEN_99999"
    tok_in = "INCL_" + "SECRET_TOKEN_99999"
    # 1. Unique token inside an excluded folder (.pytest_cache or data/)
    data_test_file = tools.ROOT / "data" / "search_code_test_excluded.txt"
    data_test_file.write_text(tok_ex, encoding="utf-8")
    
    # 2. Unique token inside a source folder (sample_app/)
    source_test_file = tools.ROOT / "sample_app" / "search_code_test_included.py"
    source_test_file.write_text(f"# {tok_in}", encoding="utf-8")
    
    try:
        excluded_hits = tools.search_code(tok_ex)
        assert excluded_hits == "No matches", f"Expected excluded folders to be skipped, got: {excluded_hits}"
        
        included_hits = tools.search_code(tok_in)
        assert "sample_app" in included_hits and "search_code_test_included.py" in included_hits
    finally:
        data_test_file.unlink(missing_ok=True)
        source_test_file.unlink(missing_ok=True)

def test_grep_logs_handles_invalid_regex():
    import json
    p = tools.ROOT / "data" / "test_grep_invalid_regex.log"
    p.write_text("2026-01-01 ERROR something failed\n", encoding="utf-8")
    try:
        out = json.loads(tools.grep_logs("data/test_grep_invalid_regex.log", "[unclosed"))
        assert out["error"] == "re.error"
    finally:
        p.unlink(missing_ok=True)

def test_read_logs_filters_plaintext_by_level():
    p = tools.ROOT / "data" / "test_plaintext_level.log"
    p.write_text("2026-01-01 INFO healthy\n2026-01-01 ERROR db timeout\n", encoding="utf-8")
    try:
        out = tools.read_logs("data/test_plaintext_level.log", level="ERROR")
        assert "db timeout" in out
        assert "healthy" not in out
    finally:
        p.unlink(missing_ok=True)

def test_log_stats_supports_plaintext_logs():
    import json
    p = tools.ROOT / "data" / "test_plaintext_stats.log"
    p.write_text("INFO booted\nERROR failed connection\nWARN slow query\n", encoding="utf-8")
    try:
        stats = json.loads(tools.log_stats("data/test_plaintext_stats.log"))
        assert stats["total_lines"] == 3
        assert stats["level_counts"]["ERROR"] == 1
        assert stats["level_counts"]["WARN"] == 1
        assert stats["level_counts"]["INFO"] == 1
    finally:
        p.unlink(missing_ok=True)

def test_log_stats_and_read_logs_detect_apache_and_ssh_security_threats():
    import json
    apache_p = tools.ROOT / "data" / "test_apache_access.log"
    apache_p.write_text(
        '203.0.113.24 - - [27/Nov/2026:09:01:15 +0530] "POST /api/login HTTP/1.1" 401 218\n'
        '203.0.113.24 - - [27/Nov/2026:09:01:18 +0530] "POST /api/login HTTP/1.1" 401 218\n'
        '198.51.100.19 - - [27/Nov/2026:09:05:31 +0530] "GET /reports/monthly HTTP/1.1" 500 301\n',
        encoding="utf-8",
    )
    ssh_p = tools.ROOT / "data" / "test_ssh_auth.log"
    ssh_p.write_text(
        "Nov 27 11:02:14 server sshd[1210]: Failed password for invalid user admin from 203.0.113.55 port 53301 ssh2\n"
        "Nov 27 11:02:18 server sshd[1211]: Failed password for invalid user admin from 203.0.113.55 port 53302 ssh2\n",
        encoding="utf-8",
    )
    try:
        apache_stats = json.loads(tools.log_stats("data/test_apache_access.log"))
        assert apache_stats["formats"]["apache_access"] == 3
        assert apache_stats["level_counts"]["ERROR"] == 1
        assert apache_stats["security_signals_count"] == 2
        assert apache_stats["repeated_security_ips"]["203.0.113.24"] == 2

        ssh_stats = json.loads(tools.log_stats("data/test_ssh_auth.log"))
        assert ssh_stats["formats"]["syslog"] == 2
        assert ssh_stats["security_signals_count"] == 2
        assert ssh_stats["repeated_security_ips"]["203.0.113.55"] == 2

        sec_lines = tools.read_logs("data/test_ssh_auth.log", level="SECURITY")
        assert "Failed password" in sec_lines
    finally:
        apache_p.unlink(missing_ok=True)
        ssh_p.unlink(missing_ok=True)

def test_validate_report_external_log_calibration_and_secondary_incidents():
    import json
    from agent.agent import validate_report

    log_text = (
        "2026-11-27T10:11:02.114Z ERROR [InventoryService] NullPointerException: product is null\n"
        "2026-11-27T10:11:02.115Z ERROR [InventoryService]     at getStock (InventoryService.java:84)\n"
        "2026-11-27T10:12:48.002Z FATAL [DatabasePool] Unable to acquire connection after 30000ms\n"
    )
    model_json = json.dumps({
        "root_cause": "NullPointerException in InventoryService.getStock",
        "confidence": 0.99,
        "severity": "critical",
        "affected_file": "InventoryService.java",
        "affected_function": "getStock",
        "evidence": [{"type": "log", "reference": "line 1", "detail": "product is null"}],
        "secondary_incidents": [
            {"title": "DB pool exhaustion", "severity": "critical", "root_cause": "Unable to acquire connection", "evidence_ref": "line 3", "suggested_fix": "Increase pool size"}
        ],
        "suggested_fix": "Add null check for product in getStock",
    })
    report = validate_report(model_json, log_text=log_text, is_internal_repo_log=False)
    assert report["hallucination_warnings"] == []
    assert report["source_scope"] == "external_log"
    assert report["confidence"] <= 0.85
    assert "external source unavailable" in report["confidence_basis"]
    assert len(report["secondary_incidents"]) == 1
    assert report["secondary_incidents"][0]["title"] == "DB pool exhaustion"

