"""Unit tests for Phase 2: LLM fine-tuning dry run, inference, and evaluation pipeline."""
from __future__ import annotations
import json
from pathlib import Path
from ml.incident.config import detect_hardware
from ml.incident.train_llm import main as train_llm_main
from ml.incident.inference import extract_json_response
from ml.incident.evaluate_llm import main as evaluate_llm_main

ROOT = Path(__file__).resolve().parents[1]
MODEL_DIR = ROOT / "ml" / "models" / "incident_llm"
RESULTS_DIR = ROOT / "ml" / "results"

def test_hardware_detection():
    """Verify hardware detection reports valid platform and device details."""
    hw = detect_hardware()
    assert "platform" in hw
    assert "cuda_available" in hw
    assert "selected_precision" in hw
    assert isinstance(hw["cuda_available"], bool)

def test_json_extraction():
    """Verify extraction of JSON from markdown fences and raw text."""
    # Markdown block
    text1 = "Here is the diagnosis:\n```json\n{\"root_cause\": \"Null pointer in order\", \"severity\": \"high\"}\n```"
    res1 = extract_json_response(text1)
    assert res1 is not None
    assert res1["root_cause"] == "Null pointer in order"

    # Raw JSON
    text2 = "{\"root_cause\": \"DB lock contention\", \"affected_files\": [\"sample_app/incidents.py\"]}"
    res2 = extract_json_response(text2)
    assert res2 is not None
    assert res2["affected_files"] == ["sample_app/incidents.py"]

    # Invalid string
    text3 = "No JSON here."
    res3 = extract_json_response(text3)
    assert res3 is None

def test_dry_run_training():
    """Verify CPU-safe dry run validates dataset and saves diagnostic config."""
    train_llm_main(["--dry-run"])

    config_file = MODEL_DIR / "training_config.json"
    report_file = MODEL_DIR / "dry_run_report.json"

    assert config_file.is_file()
    assert report_file.is_file()

    report = json.loads(report_file.read_text(encoding="utf-8"))
    assert report["status"] == "dry_run_passed"
    assert report["dataset_stats"]["total_count"] == 40
    assert report["dataset_stats"]["train_count"] == 30
    assert report["dataset_stats"]["val_count"] == 5
    assert report["dataset_stats"]["test_count"] == 5

def test_evaluation_pipeline():
    """Verify evaluation runs on held-out test split and writes result metrics."""
    evaluate_llm_main(["--split", "test"])

    eval_file = RESULTS_DIR / "llm_evaluation.json"
    assert eval_file.is_file()

    eval_data = json.loads(eval_file.read_text(encoding="utf-8"))
    assert eval_data["split"] == "test"
    assert "metrics" in eval_data
    assert eval_data["metrics"]["total_evaluated"] == 5
    assert "dataset_limitation_note" in eval_data
