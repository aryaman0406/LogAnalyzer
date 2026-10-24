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
