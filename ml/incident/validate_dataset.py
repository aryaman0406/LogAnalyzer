"""Strict dataset validation and quality checking for incident fine-tuning."""
from __future__ import annotations
import argparse, json, re, sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
PROCESSED_DIR = ROOT / "ml" / "incident" / "processed"
RAW_DIR = ROOT / "ml" / "incident" / "raw"

REQUIRED_TOP_FIELDS = {"id", "incident_id", "provenance", "instruction", "context", "answer"}
REQUIRED_CONTEXT_FIELDS = {"incident", "logs", "anomalies", "git_history", "source_evidence"}
REQUIRED_ANSWER_FIELDS = {"root_cause", "affected_files", "affected_functions", "severity", "reasoning", "recommendation"}
VALID_SEVERITIES = {"critical", "high", "medium", "low", "info"}
MAX_CONTEXT_CHARS = 16000

class ValidationError(Exception):
    pass

def validate_example(example: dict[str, Any], example_index: int, split_name: str) -> list[str]:
    """Validate a single incident example against quality and schema rules."""
    errors = []
    prefix = f"[{split_name} #{example_index} (id={example.get('id', 'MISSING')})]"

    # Top level fields
    missing_top = REQUIRED_TOP_FIELDS - set(example.keys())
    if missing_top:
        errors.append(f"{prefix} Missing top-level fields: {sorted(missing_top)}")
        return errors  # Cannot continue if core structure missing

    # Context fields
    ctx = example.get("context", {})
    if not isinstance(ctx, dict):
        errors.append(f"{prefix} 'context' must be a dictionary")
    else:
        missing_ctx = REQUIRED_CONTEXT_FIELDS - set(ctx.keys())
        if missing_ctx:
            errors.append(f"{prefix} Missing context fields: {sorted(missing_ctx)}")
        
        # Check context bounds
        ctx_serialized = json.dumps(ctx)
        if len(ctx_serialized) > MAX_CONTEXT_CHARS:
            errors.append(f"{prefix} Context length {len(ctx_serialized)} exceeds limit of {MAX_CONTEXT_CHARS} characters")

    # Answer fields
    ans = example.get("answer", {})
    if not isinstance(ans, dict):
        errors.append(f"{prefix} 'answer' must be a dictionary")
    else:
        missing_ans = REQUIRED_ANSWER_FIELDS - set(ans.keys())
        if missing_ans:
            errors.append(f"{prefix} Missing answer fields: {sorted(missing_ans)}")
        
        # Severity validation
        sev = str(ans.get("severity", "")).lower()
        if sev not in VALID_SEVERITIES:
            errors.append(f"{prefix} Invalid severity '{sev}'; must be one of {sorted(VALID_SEVERITIES)}")

        # Root cause non-empty
        if not str(ans.get("root_cause", "")).strip():
            errors.append(f"{prefix} 'root_cause' cannot be empty")

        # Recommendation non-empty
        if not str(ans.get("recommendation", "")).strip():
            errors.append(f"{prefix} 'recommendation' cannot be empty")

        # Ground-truth file existence check
        affected_files = ans.get("affected_files", [])
        if not isinstance(affected_files, list) or not affected_files:
            errors.append(f"{prefix} 'affected_files' must be a non-empty list of paths")
        else:
            for file_ref in affected_files:
                target_file = ROOT / file_ref
                if not target_file.is_file():
                    errors.append(f"{prefix} Cited affected_file does not exist in repository: '{file_ref}'")
                else:
                    # Ground-truth function existence check in cited file
                    content = target_file.read_text(encoding="utf-8", errors="replace")
                    for func_ref in ans.get("affected_functions", []):
                        if func_ref and not re.search(rf"\bdef\s+{re.escape(func_ref)}\s*\(", content):
                            # Also check if function defined in incident_modes corresponding file
                            inc_modes_check = any(re.search(rf"\bdef\s+{re.escape(func_ref)}\s*\(", p.read_text(encoding="utf-8", errors="replace"))
                                                  for p in (ROOT / "sample_app" / "incident_modes").glob("*.py"))
                            if not inc_modes_check:
                                errors.append(f"{prefix} Cited affected_function '{func_ref}' not found in '{file_ref}'")

    return errors

def validate_split_integrity(splits: dict[str, list[dict]]) -> list[str]:
    """Verify that there is strict separation and NO leakage of incidents across splits."""
    errors = []
    seen_ids: dict[str, str] = {}
    incident_to_splits: dict[str, set[str]] = {}

    for split_name, examples in splits.items():
        for ex in examples:
            ex_id = ex.get("id")
            inc_id = ex.get("incident_id")

            # Duplicate ID check
            if ex_id in seen_ids:
                errors.append(f"Duplicate example ID '{ex_id}' found in both '{seen_ids[ex_id]}' and '{split_name}'")
            else:
                seen_ids[ex_id] = split_name

            # Incident tracking
            if inc_id:
                incident_to_splits.setdefault(inc_id, set()).add(split_name)

    # Incident leakage check: No single incident should appear in multiple splits (e.g. both train and test)
    for inc_id, splits_found in incident_to_splits.items():
        if len(splits_found) > 1:
            errors.append(f"DATA LEAKAGE: Incident '{inc_id}' appears in multiple splits: {sorted(splits_found)}")

    return errors

def validate_dataset(data_dir: Path = PROCESSED_DIR) -> bool:
    """Run full validation across all dataset files."""
    print("=" * 60)
    print(f"Starting Dataset Validation on {data_dir.resolve()}...")
    print("=" * 60)

    split_files = {
        "train": data_dir / "train.json",
        "val": data_dir / "val.json",
        "test": data_dir / "test.json",
    }

    splits_data: dict[str, list[dict]] = {}
    all_errors: list[str] = []

    # Check file presence and load JSON
    for split_name, file_path in split_files.items():
        if not file_path.is_file():
            all_errors.append(f"Missing required dataset file: {file_path}")
            continue
        try:
            data = json.loads(file_path.read_text(encoding="utf-8"))
            if not isinstance(data, list):
                all_errors.append(f"File {file_path.name} must contain a JSON array of examples")
                continue
            splits_data[split_name] = data
        except json.JSONDecodeError as exc:
            all_errors.append(f"Invalid JSON in {file_path.name}: {exc}")

    if all_errors:
        print("\n".join(f"[ERROR] {e}" for e in all_errors))
        return False

    # Validate individual examples
    for split_name, examples in splits_data.items():
        print(f"Validating '{split_name}' split ({len(examples)} examples)...")
        for i, ex in enumerate(examples):
            ex_errors = validate_example(ex, i, split_name)
            all_errors.extend(ex_errors)

    # Validate split isolation & no data leakage
    print("Checking split integrity and leakage prevention...")
    leakage_errors = validate_split_integrity(splits_data)
    all_errors.extend(leakage_errors)

    # Print summary statistics
    total_examples = sum(len(exs) for exs in splits_data.values())
    print("-" * 60)
    print("Validation Statistics:")
    for split_name, exs in splits_data.items():
        incidents = sorted(list({ex["incident_id"] for ex in exs if "incident_id" in ex}))
        provenances = sorted(list(set(ex.get("provenance", "unknown") for ex in exs)))
        print(f"  * Split '{split_name}': {len(exs)} examples across {len(incidents)} incidents ({', '.join(incidents)})")
        print(f"    Provenances: {', '.join(provenances)}")

    print(f"\nTotal validated examples: {total_examples}")

    if all_errors:
        print(f"\n[FAIL] Validation FAILED with {len(all_errors)} errors:")
        for err in all_errors[:20]:
            print(f"  - {err}")
        if len(all_errors) > 20:
            print(f"  ... and {len(all_errors) - 20} more errors.")
        print("=" * 60)
        return False

    print("\n[PASS] Dataset Validation PASSED! Zero errors, zero leakage, all references verified.")
    print("=" * 60)
    return True

def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Validate incident fine-tuning dataset quality and integrity")
    parser.add_argument("--data-dir", type=Path, default=PROCESSED_DIR, help="Directory containing train.json, val.json, test.json")
    args = parser.parse_args(argv)

    success = validate_dataset(args.data_dir)
    if argv is None:
        sys.exit(0 if success else 1)
    return success

if __name__ == "__main__":
    main()
