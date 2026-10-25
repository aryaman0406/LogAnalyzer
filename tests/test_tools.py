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

