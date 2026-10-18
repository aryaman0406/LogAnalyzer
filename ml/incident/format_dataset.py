"""Format processed incident dataset into ChatML and Instruction-tuning formats for Hugging Face."""
from __future__ import annotations
import argparse, json
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[2]
PROCESSED_DIR = ROOT / "ml" / "incident" / "processed"

SYSTEM_PROMPT = (
    "You are an autonomous production incident investigation and root-cause analysis AI agent. "
    "Given an incident alert, application logs, anomaly detector scores, Git commits, diffs, and source code, "
    "you must analyze the evidence and output a precise JSON diagnosis with root_cause, affected_files, "
    "affected_functions, severity, reasoning, and recommendation."
)

def format_context_block(context: dict[str, Any]) -> str:
    """Serialize context components into a readable prompt block."""
    sections = [
        f"### Incident Details\n{context.get('incident', '')}",
        f"### Application Logs\n{context.get('logs', '')}",
    ]
    if context.get("log_statistics"):
        sections.append(f"### Log Statistics\n{context.get('log_statistics', '')}")
    if context.get("anomalies"):
        sections.append(f"### Anomaly Detection Results\n{context.get('anomalies', '')}")
    if context.get("git_history"):
        sections.append(f"### Git History & Commits\n{context.get('git_history', '')}")
    if context.get("git_diff"):
        sections.append(f"### Git Diff\n{context.get('git_diff', '')}")
    if context.get("source_evidence"):
        sections.append(f"### Source Code Evidence\n{context.get('source_evidence', '')}")

    return "\n\n".join(sections)

def convert_to_chatml(example: dict[str, Any]) -> dict[str, Any]:
    """Convert an incident example to Hugging Face ChatML message list."""
    context_str = format_context_block(example.get("context", {}))
    user_prompt = f"{example.get('instruction', '')}\n\n{context_str}"
    assistant_response = json.dumps(example.get("answer", {}), indent=2, ensure_ascii=False)

    return {
        "id": example.get("id"),
        "incident_id": example.get("incident_id"),
        "provenance": example.get("provenance"),
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
            {"role": "assistant", "content": assistant_response},
        ],
    }

def convert_to_instruct(example: dict[str, Any]) -> dict[str, Any]:
    """Convert an incident example to Alpaca instruction format."""
    context_str = format_context_block(example.get("context", {}))
    assistant_response = json.dumps(example.get("answer", {}), indent=2, ensure_ascii=False)

    return {
        "id": example.get("id"),
        "incident_id": example.get("incident_id"),
        "instruction": example.get("instruction", ""),
        "input": context_str,
        "output": assistant_response,
    }

def format_all_splits(data_dir: Path = PROCESSED_DIR) -> None:
    """Read processed json files and write out formatted jsonl files."""
    for split_name in ["train", "val", "test"]:
        input_file = data_dir / f"{split_name}.json"
        if not input_file.is_file():
            print(f"Skipping {split_name}: {input_file} not found")
            continue

        raw_examples: list[dict] = json.loads(input_file.read_text(encoding="utf-8"))
        chatml_examples = [convert_to_chatml(ex) for ex in raw_examples]
        instruct_examples = [convert_to_instruct(ex) for ex in raw_examples]

        # Write ChatML JSONL
        chatml_file = data_dir / f"{split_name}_chatml.jsonl"
        with chatml_file.open("w", encoding="utf-8") as f:
            for item in chatml_examples:
                f.write(json.dumps(item, ensure_ascii=False) + "\n")

        # Write Instruct JSONL
        instruct_file = data_dir / f"{split_name}_instruct.jsonl"
        with instruct_file.open("w", encoding="utf-8") as f:
            for item in instruct_examples:
                f.write(json.dumps(item, ensure_ascii=False) + "\n")

        print(f"Formatted {split_name}: {len(raw_examples)} examples -> {chatml_file.name} & {instruct_file.name}")

def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Format incident dataset into ChatML and instruction formats")
    parser.add_argument("--data-dir", type=Path, default=PROCESSED_DIR, help="Directory with train.json, val.json, test.json")
    args = parser.parse_args(argv)

    format_all_splits(args.data_dir)
    print("Dataset formatting complete.")

if __name__ == "__main__":
    main()
