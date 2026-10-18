"""Build incident fine-tuning dataset from ground-truth incidents, Git history, and logs."""
from __future__ import annotations
import argparse, json, random, subprocess, sys
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / "ml" / "incident" / "raw"
PROCESSED_DIR = ROOT / "ml" / "incident" / "processed"

GT_PATH = ROOT / "data" / "ground_truth.json"
CATALOG_PATH = ROOT / "sample_app" / "incidents_catalog.json"

INCIDENT_GIT_COMMITS = {
    "INC-01": ("0292b37", "sample_app/incident_modes/inc_01.py"),
    "INC-02": ("2282322", "sample_app/incident_modes/inc_02.py"),
    "INC-03": ("e9f0d59", "sample_app/incident_modes/inc_03.py"),
    "INC-04": ("52b6e2b", "sample_app/incident_modes/inc_04.py"),
    "INC-05": ("ad015c7", "sample_app/incident_modes/inc_05.py"),
    "INC-06": ("bf7c89f", "sample_app/incident_modes/inc_06.py"),
    "INC-07": ("c214d91", "sample_app/incident_modes/inc_07.py"),
    "INC-08": ("49ce794", "sample_app/incident_modes/inc_08.py"),
}

SEVERITY_MAP = {
    "INC-01": "high",
    "INC-02": "critical",
    "INC-03": "high",
    "INC-04": "medium",
    "INC-05": "high",
    "INC-06": "high",
    "INC-07": "medium",
    "INC-08": "high",
}

INSTRUCTION_VARIANTS = [
    "Investigate this production incident and identify the most likely root cause, affected files, affected functions, and remediation.",
    "Perform root-cause analysis on the reported service incident using the provided logs, anomalies, git history, and source evidence.",
    "Analyze the following incident telemetry, git commits, and code artifacts to diagnose the failure and recommend a safe fix.",
    "Investigate the reported system failure, correlate the log anomalies with recent code changes, and provide a structured diagnosis."
]

def get_git_diff(commit_hash: str) -> str:
    """Retrieve actual unified diff for a commit."""
    try:
        res = subprocess.run(["git", "show", "--format=short", "--no-ext-diff", commit_hash],
                             cwd=ROOT, capture_output=True, text=True, timeout=5)
        if res.returncode == 0:
            lines = res.stdout.splitlines()
            # Trim commit header to keep diff concise
            return "\n".join(lines[:60])
    except Exception:
        pass
    return f"commit {commit_hash}"

def get_git_log_snippet(commit_hash: str) -> str:
    """Retrieve git log snippet around the commit."""
    try:
        res = subprocess.run(["git", "log", "-n", "3", "--pretty=format:%h %ad %s", commit_hash],
                             cwd=ROOT, capture_output=True, text=True, timeout=5)
        if res.returncode == 0 and res.stdout:
            return res.stdout
    except Exception:
        pass
    return f"{commit_hash} reproduction commit"

def get_source_snippet(file_path: str) -> str:
    """Read source code from repository file."""
    path = ROOT / file_path
    if path.is_file():
        return path.read_text(encoding="utf-8", errors="replace")
    return ""

def generate_synthetic_logs_for_incident(incident_id: str, count: int = 15, base_time: datetime | None = None) -> list[dict]:
    """Generate realistic structured log lines for the given incident."""
    if base_time is None:
        base_time = datetime(2026, 10, 5, 14, 0, 0)
    
    logs = []
    # Healthy baseline requests
    for i in range(5):
        t = (base_time + timedelta(seconds=i * 2)).strftime("%Y-%m-%d %H:%M:%S,%f")[:-3]
        logs.append({
            "timestamp": t,
            "level": "INFO",
            "service": "sample-app",
            "request_id": f"req-health-{i:03d}",
            "message": "GET /health status=200 duration_ms=0.8"
        })
    
    # Incident-specific failures
    for i in range(count):
        t = (base_time + timedelta(seconds=12 + i * 2)).strftime("%Y-%m-%d %H:%M:%S,%f")[:-3]
        req_id = f"req-{incident_id.lower()}-{i:03d}"
        if incident_id == "INC-01":
            logs.append({"timestamp": t, "level": "ERROR", "service": "sample-app", "request_id": req_id,
                         "message": "POST /orders status=500 duration_ms=2.1 error='TypeError: 'NoneType' object is not subscriptable' in order_failure"})
        elif incident_id == "INC-02":
            logs.append({"timestamp": t, "level": "ERROR", "service": "sample-app", "request_id": req_id,
                         "message": "POST /orders status=500 duration_ms=2100.5 error='sqlite3.OperationalError: database is locked' in order_failure"})
        elif incident_id == "INC-03":
            logs.append({"timestamp": t, "level": "ERROR", "service": "sample-app", "request_id": req_id,
                         "message": "POST /orders status=500 duration_ms=1.4 error='KeyError: 'PAYMENT_GATEWAY_URL'' in order_failure"})
        elif incident_id == "INC-04":
            logs.append({"timestamp": t, "level": "WARN", "service": "sample-app", "request_id": req_id,
                         "message": f"POST /orders status=200 duration_ms=14.2 memory_retained_items={1000 * (i + 1)} memory_usage_mb={45.2 + i * 1.5:.1f}"})
        elif incident_id == "INC-05":
            logs.append({"timestamp": t, "level": "ERROR", "service": "sample-app", "request_id": req_id,
                         "message": "POST /orders status=401 duration_ms=1.1 error='PermissionError: token expired' in order_failure"})
        elif incident_id == "INC-06":
            logs.append({"timestamp": t, "level": "WARN", "service": "sample-app", "request_id": req_id,
                         "message": "POST /orders status=504 duration_ms=3002.8 error='TimeoutError: external payment gateway timed out after 3000ms'"})
        elif incident_id == "INC-07":
            logs.append({"timestamp": t, "level": "WARN", "service": "sample-app", "request_id": req_id,
                         "message": f"GET /products?offset={i * 10}&limit=10 status=200 returned_count=9 expected_count=10 in paginate"})
        elif incident_id == "INC-08":
            logs.append({"timestamp": t, "level": "ERROR", "service": "sample-app", "request_id": req_id,
                         "message": "POST /orders status=409 duration_ms=12.5 error='StockRaceCondition: lost update on product_id=101 stock_mismatch' in decrement_stock"})
    return logs

def build_incident_examples(incident_id: str, gt: dict, cat: dict, seed: int = 42) -> list[dict]:
    """Construct diverse, high-quality, grounded investigation training examples for an incident."""
    rng = random.Random(seed + int(incident_id.split("-")[1]))
    commit_hash, mode_file = INCIDENT_GIT_COMMITS[incident_id]
    git_diff_text = get_git_diff(commit_hash)
    git_log_text = get_git_log_snippet(commit_hash)
    main_incidents_source = get_source_snippet(gt["affected_file"])
    mode_source = get_source_snippet(mode_file)
    
    examples = []
    
    # 1. Full Evidence Example
    logs_1 = generate_synthetic_logs_for_incident(incident_id, count=8, base_time=datetime(2026, 10, 5, 10, 0, 0))
    ex1 = {
        "id": f"{incident_id}-FULL-001",
        "incident_id": incident_id,
        "provenance": "ground_truth_reproduction",
        "variation_type": "full_evidence",
        "instruction": INSTRUCTION_VARIANTS[0],
        "context": {
            "incident": f"{incident_id}: {cat['title']} - {cat['description']}",
            "logs": "\n".join(json.dumps(l) for l in logs_1),
            "log_statistics": json.dumps({"ERROR": sum(1 for l in logs_1 if l["level"]=="ERROR"), "WARN": sum(1 for l in logs_1 if l["level"]=="WARN"), "INFO": 5}),
            "anomalies": json.dumps({"anomalous": True, "score": 0.92, "model": "lstm", "explanation": f"Elevated anomaly score detected in {cat['title']} flow"}),
            "git_history": git_log_text,
            "git_diff": git_diff_text,
            "source_evidence": f"// File: {gt['affected_file']}\n{main_incidents_source}\n\n// File: {mode_file}\n{mode_source}"
        },
        "answer": {
            "root_cause": gt["root_cause"],
            "affected_files": [gt["affected_file"]],
            "affected_functions": [gt["affected_function"]],
            "severity": SEVERITY_MAP.get(incident_id, "high"),
            "reasoning": f"Analysis of logs shows errors occurring in {gt['affected_function']}. Correlating with commit {commit_hash} ({git_log_text.splitlines()[0] if git_log_text else ''}) confirms that the root cause is: {gt['root_cause']}",
            "recommendation": gt["correct_fix"]
        }
    }
    examples.append(ex1)
    
    # 2. Git Regression & Diff Focus
    logs_2 = generate_synthetic_logs_for_incident(incident_id, count=12, base_time=datetime(2026, 10, 5, 12, 30, 0))
    ex2 = {
        "id": f"{incident_id}-GIT-002",
        "incident_id": incident_id,
        "provenance": "git_regression_analysis",
        "variation_type": "git_diff_investigation",
        "instruction": INSTRUCTION_VARIANTS[1],
        "context": {
            "incident": f"Alert: Elevated error rate detected for service sample-app ({incident_id})",
            "logs": "\n".join(json.dumps(l) for l in logs_2[3:9]),
            "log_statistics": json.dumps({"ERROR": sum(1 for l in logs_2 if l["level"]=="ERROR"), "INFO": 5}),
            "anomalies": json.dumps({"anomalous": True, "score": 0.88, "model": "random_forest"}),
            "git_history": git_log_text,
            "git_diff": git_diff_text,
            "source_evidence": f"// File: {gt['affected_file']}\n{main_incidents_source}"
        },
        "answer": {
            "root_cause": gt["root_cause"],
            "affected_files": [gt["affected_file"]],
            "affected_functions": [gt["affected_function"]],
            "severity": SEVERITY_MAP.get(incident_id, "high"),
            "reasoning": f"Recent commit {commit_hash} introduced a change in the {gt['affected_function']} path. Log timestamps match the deployment of this commit.",
            "recommendation": gt["correct_fix"]
        }
    }
    examples.append(ex2)

    # 3. Log & Anomaly Detector Focus
    logs_3 = generate_synthetic_logs_for_incident(incident_id, count=15, base_time=datetime(2026, 10, 5, 16, 0, 0))
    ex3 = {
        "id": f"{incident_id}-ANOM-003",
        "incident_id": incident_id,
        "provenance": "anomaly_detector_correlation",
        "variation_type": "telemetry_and_anomaly",
        "instruction": INSTRUCTION_VARIANTS[2],
        "context": {
            "incident": f"Incident Report: {cat['title']}",
            "logs": "\n".join(json.dumps(l) for l in logs_3),
            "log_statistics": json.dumps({"ERROR": sum(1 for l in logs_3 if l["level"]=="ERROR"), "WARN": sum(1 for l in logs_3 if l["level"]=="WARN")}),
            "anomalies": json.dumps({"anomalous": True, "score": 0.95, "model": "lstm", "pattern": f"Unusual event sequence in {gt['affected_function']}"}),
            "git_history": git_log_text,
            "git_diff": "",
            "source_evidence": f"// File: {gt['affected_file']}\n{main_incidents_source}"
        },
        "answer": {
            "root_cause": gt["root_cause"],
            "affected_files": [gt["affected_file"]],
            "affected_functions": [gt["affected_function"]],
            "severity": SEVERITY_MAP.get(incident_id, "high"),
            "reasoning": f"Anomaly detection flagged high severity sequence deviations corresponding to {gt['affected_function']}. Log error messages pinpoint: {gt['root_cause']}",
            "recommendation": gt["correct_fix"]
        }
    }
    examples.append(ex3)

    # 4. Source & Code Diagnostics Focus
    logs_4 = generate_synthetic_logs_for_incident(incident_id, count=6, base_time=datetime(2026, 10, 5, 18, 45, 0))
    ex4 = {
        "id": f"{incident_id}-SRC-004",
        "incident_id": incident_id,
        "provenance": "code_level_diagnostics",
        "variation_type": "source_code_diagnosis",
        "instruction": INSTRUCTION_VARIANTS[3],
        "context": {
            "incident": f"Service Alert: {incident_id} - {cat['description']}",
            "logs": "\n".join(json.dumps(l) for l in logs_4),
            "log_statistics": json.dumps({"ERROR": sum(1 for l in logs_4 if l["level"]=="ERROR"), "INFO": 5}),
            "anomalies": json.dumps({"anomalous": True, "score": 0.85, "model": "transformer"}),
            "git_history": f"{commit_hash} {cat['title']}",
            "git_diff": git_diff_text,
            "source_evidence": f"// File: {gt['affected_file']}\n{main_incidents_source}\n\n// File: {mode_file}\n{mode_source}"
        },
        "answer": {
            "root_cause": gt["root_cause"],
            "affected_files": [gt["affected_file"]],
            "affected_functions": [gt["affected_function"]],
            "severity": SEVERITY_MAP.get(incident_id, "high"),
            "reasoning": f"Code analysis of {gt['affected_file']} in function {gt['affected_function']} reveals the flaw: {gt['root_cause']}",
            "recommendation": gt["correct_fix"]
        }
    }
    examples.append(ex4)

    # 5. Varied Traffic Volume Scenario
    logs_5 = generate_synthetic_logs_for_incident(incident_id, count=20, base_time=datetime(2026, 10, 5, 21, 15, 0))
    ex5 = {
        "id": f"{incident_id}-VAR-005",
        "incident_id": incident_id,
        "provenance": "synthetic_traffic_variation",
        "variation_type": "traffic_surge",
        "instruction": INSTRUCTION_VARIANTS[0],
        "context": {
            "incident": f"High Priority Incident: {cat['title']}",
            "logs": "\n".join(json.dumps(l) for l in logs_5[::2]),
            "log_statistics": json.dumps({"total_events": len(logs_5), "errors": sum(1 for l in logs_5 if l["level"]=="ERROR")}),
            "anomalies": json.dumps({"anomalous": True, "score": 0.93, "model": "lstm"}),
            "git_history": git_log_text,
            "git_diff": git_diff_text,
            "source_evidence": f"// File: {gt['affected_file']}\n{main_incidents_source}"
        },
        "answer": {
            "root_cause": gt["root_cause"],
            "affected_files": [gt["affected_file"]],
            "affected_functions": [gt["affected_function"]],
            "severity": SEVERITY_MAP.get(incident_id, "high"),
            "reasoning": f"Under simulated traffic surge, {gt['affected_function']} consistently triggers {gt['root_cause']}.",
            "recommendation": gt["correct_fix"]
        }
    }
    examples.append(ex5)

    return examples

def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Build incident LLM dataset from ground truth and logs")
    parser.add_argument("--train-incidents", nargs="+", default=["INC-01", "INC-02", "INC-04", "INC-05", "INC-06", "INC-08"],
                        help="Incidents to assign to training set")
    parser.add_argument("--val-incidents", nargs="+", default=["INC-03"],
                        help="Incidents to assign to validation set")
    parser.add_argument("--test-incidents", nargs="+", default=["INC-07"],
                        help="Incidents to assign to test set")
    parser.add_argument("--seed", type=int, default=42, help="Random seed for reproducibility")
    args = parser.parse_args(sys.argv[1:] if argv is None else argv)

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

    gt_data: dict[str, dict] = json.loads(GT_PATH.read_text(encoding="utf-8"))
    catalog_list: list[dict] = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    catalog_map = {item["id"]: item for item in catalog_list}

    all_examples: list[dict] = []
    train_examples: list[dict] = []
    val_examples: list[dict] = []
    test_examples: list[dict] = []

    # Verify no overlap in incident assignments
    train_set = set(args.train_incidents)
    val_set = set(args.val_incidents)
    test_set = set(args.test_incidents)
    assert not (train_set & val_set), f"Train/Val overlap on incidents: {train_set & val_set}"
    assert not (train_set & test_set), f"Train/Test overlap on incidents: {train_set & test_set}"
    assert not (val_set & test_set), f"Val/Test overlap on incidents: {val_set & test_set}"

    for inc_id in sorted(gt_data.keys()):
        gt = gt_data[inc_id]
        cat = catalog_map.get(inc_id, {"title": inc_id, "description": "Production incident"})
        inc_examples = build_incident_examples(inc_id, gt, cat, seed=args.seed)
        all_examples.extend(inc_examples)

        if inc_id in train_set:
            train_examples.extend(inc_examples)
        elif inc_id in val_set:
            val_examples.extend(inc_examples)
        elif inc_id in test_set:
            test_examples.extend(inc_examples)

    # Save raw and processed datasets
    (RAW_DIR / "dataset_raw.json").write_text(json.dumps(all_examples, indent=2, ensure_ascii=False), encoding="utf-8")
    (PROCESSED_DIR / "train.json").write_text(json.dumps(train_examples, indent=2, ensure_ascii=False), encoding="utf-8")
    (PROCESSED_DIR / "val.json").write_text(json.dumps(val_examples, indent=2, ensure_ascii=False), encoding="utf-8")
    (PROCESSED_DIR / "test.json").write_text(json.dumps(test_examples, indent=2, ensure_ascii=False), encoding="utf-8")

    print("=" * 60)
    print("Dataset Generation Summary:")
    print(f"Total examples generated: {len(all_examples)}")
    print(f"Train examples ({len(args.train_incidents)} incidents: {', '.join(args.train_incidents)}): {len(train_examples)}")
    print(f"Val examples ({len(args.val_incidents)} incidents: {', '.join(args.val_incidents)}): {len(val_examples)}")
    print(f"Test examples ({len(args.test_incidents)} incidents: {', '.join(args.test_incidents)}): {len(test_examples)}")
    print(f"Saved raw dataset: {RAW_DIR / 'dataset_raw.json'}")
    print(f"Saved processed train: {PROCESSED_DIR / 'train.json'}")
    print(f"Saved processed val: {PROCESSED_DIR / 'val.json'}")
    print(f"Saved processed test: {PROCESSED_DIR / 'test.json'}")
    print("=" * 60)

if __name__ == "__main__":
    main()
