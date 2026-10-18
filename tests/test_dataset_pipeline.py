"""Tests for the incident dataset generation, validation, and formatting pipeline."""
from __future__ import annotations
import json
from pathlib import Path
from ml.incident.build_dataset import main as build_dataset_main
from ml.incident.validate_dataset import validate_dataset, validate_example, validate_split_integrity
from ml.incident.format_dataset import format_all_splits

ROOT = Path(__file__).resolve().parents[1]
PROCESSED_DIR = ROOT / "ml" / "incident" / "processed"

def test_build_and_validate_dataset():
    """Verify end-to-end dataset generation, validation, and split integrity."""
    build_dataset_main([])
    
    assert (PROCESSED_DIR / "train.json").is_file()
    assert (PROCESSED_DIR / "val.json").is_file()
    assert (PROCESSED_DIR / "test.json").is_file()

    is_valid = validate_dataset(PROCESSED_DIR)
    assert is_valid is True

def test_leakage_detection():
    """Verify that validate_split_integrity detects incident leakage across splits."""
    leaked_splits = {
        "train": [{"id": "ex1", "incident_id": "INC-01"}],
        "test": [{"id": "ex2", "incident_id": "INC-01"}]
    }
    errors = validate_split_integrity(leaked_splits)
    assert len(errors) == 1
    assert "DATA LEAKAGE" in errors[0]

def test_missing_file_reference_validation():
    """Verify that validate_example catches non-existent files."""
    bad_example = {
        "id": "test-01",
        "incident_id": "INC-01",
        "provenance": "ground_truth_reproduction",
        "instruction": "Investigate",
        "context": {"incident": "inc", "logs": "logs", "anomalies": "", "git_history": "", "source_evidence": ""},
        "answer": {
            "root_cause": "Test cause",
            "affected_files": ["non_existent/path/file.py"],
            "affected_functions": ["some_func"],
            "severity": "high",
            "reasoning": "some reasoning",
            "recommendation": "some fix"
        }
    }
    errors = validate_example(bad_example, 0, "test")
    assert any("does not exist in repository" in e for e in errors)

def test_format_dataset():
    """Verify formatting converts examples to valid ChatML and Instruct structures."""
    format_all_splits(PROCESSED_DIR)
    
    chatml_file = PROCESSED_DIR / "train_chatml.jsonl"
    instruct_file = PROCESSED_DIR / "train_instruct.jsonl"

    assert chatml_file.is_file()
    assert instruct_file.is_file()

    first_line = json.loads(chatml_file.read_text(encoding="utf-8").splitlines()[0])
    assert "messages" in first_line
    assert len(first_line["messages"]) == 3
    assert first_line["messages"][0]["role"] == "system"
    assert first_line["messages"][1]["role"] == "user"
    assert first_line["messages"][2]["role"] == "assistant"
