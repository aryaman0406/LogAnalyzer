"""Tests for Phase 4: Rigorous evaluation framework and experiment tracking."""
from __future__ import annotations
from pathlib import Path

from eval.run_eval import evaluate_answer_against_truth, generate_experiment_reports, SETUPS_CONFIG

ROOT = Path(__file__).resolve().parents[1]
EXP_DIR = ROOT / "experiments"

def test_setups_configuration_completeness():
    """Verify all five setups A, B, C, D, E are configured."""
    for s in ["A", "B", "C", "D", "E"]:
        assert s in SETUPS_CONFIG
        assert "name" in SETUPS_CONFIG[s]
        assert "provider" in SETUPS_CONFIG[s]
        assert "use_tools" in SETUPS_CONFIG[s]

def test_evaluate_answer_against_truth_scoring():
    """Verify evaluation metric calculations and error categorization."""
    truth = {
        "root_cause": "The order handler dereferences a None value in order_failure.",
        "affected_file": "sample_app/incidents.py",
        "affected_function": "order_failure",
        "correct_fix": "Validate/construct order state before access"
    }

    # Perfect match
    perfect_ans = {
        "root_cause": "The order handler dereferences a None value in order_failure.",
        "affected_file": "sample_app/incidents.py",
        "affected_function": "order_failure",
        "severity": "high",
        "suggested_fix": "Validate/construct order state before access",
        "hallucination_warnings": []
    }
    res_perfect = evaluate_answer_against_truth(perfect_ans, truth)
    assert res_perfect["correct_file"] == 1
    assert res_perfect["correct_function"] == 1
    assert res_perfect["root_cause_correct"] == 1
    assert res_perfect["judge_score"] == 1.0
    assert res_perfect["error_category"] == "none"

    # Mismatched function
    mismatched_ans = {
        "root_cause": "The order handler dereferences a None value in order_failure.",
        "affected_file": "sample_app/incidents.py",
        "affected_function": "wrong_func",
        "severity": "high",
        "suggested_fix": "Validate order state",
        "hallucination_warnings": []
    }
    res_mismatched = evaluate_answer_against_truth(mismatched_ans, truth)
    assert res_mismatched["correct_function"] == 0
    assert res_mismatched["error_category"] == "wrong_function"

def test_generate_experiment_reports():
    """Verify experiment reports generation creates CSV, Markdown, and visual artifacts."""
    sample_rows = [
        {
            "incident_id": "INC-01",
            "setup": "A",
            "setup_name": "Generic LLM",
            "provider": "openai",
            "model_name": "gpt-4o-mini",
            "adapter_loaded": 0,
            "trial": 1,
            "judge_score": 0.4,
            "root_cause_correct": 1,
            "correct_file": 0,
            "correct_function": 0,
            "severity_correct": 1,
            "recommendation_correct": 0,
            "valid_json": 1,
            "steps": 1,
            "tool_calls": 0,
            "hallucinated": 0,
            "tool_errors": 0,
            "seconds": 0.5,
            "error_category": "wrong_file"
        },
        {
            "incident_id": "INC-01",
            "setup": "E",
            "setup_name": "Fine-Tuned LLM + Tools + Anomaly + RAG",
            "provider": "local",
            "model_name": "Qwen2.5-Coder-1.5B",
            "adapter_loaded": 1,
            "trial": 1,
            "judge_score": 1.0,
            "root_cause_correct": 1,
            "correct_file": 1,
            "correct_function": 1,
            "severity_correct": 1,
            "recommendation_correct": 1,
            "valid_json": 1,
            "steps": 4,
            "tool_calls": 4,
            "hallucinated": 0,
            "tool_errors": 0,
            "seconds": 1.2,
            "error_category": "none"
        }
    ]

    generate_experiment_reports(sample_rows)
    assert (EXP_DIR / "results.csv").is_file()
    assert (EXP_DIR / "summary.md").is_file()
    assert (EXP_DIR / "comparison.png").is_file()

    summary_text = (EXP_DIR / "summary.md").read_text(encoding="utf-8")
    assert "Ablation Analysis" in summary_text
    assert "Benchmark Matrix" in summary_text
