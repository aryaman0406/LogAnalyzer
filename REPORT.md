# Design report: Incident Agent

## Problem

Incident responders need a fast way to connect an error spike with application code changes and supporting evidence. This project demonstrates a read-only agent workflow over structured logs, source files, and Git history, with a separately trained anomaly detector as an optional signal.

## Design decisions

- **LLM boundary:** Flexible adapter pattern supporting local fine-tuned models (Qwen2.5-Coder-1.5B with LoRA/QLoRA) and cloud providers (OpenAI, Anthropic, Gemini). Credentials are read from environment variables and excluded from Git.
- **Evidence before conclusion:** the system prompt leads with log statistics, then asks the agent to verify hypotheses against actual source and history. The final output uses a validated JSON shape and checks the cited file/function.
- **Constrained tools:** repository paths are resolved and checked against the project root, outputs are capped, and shell execution is allowlisted. Code changes are not applied automatically.
- **Reproducible failures:** eight incident modes are opt-in request-local simulations. Their introduction is represented by separate commits so history is available to investigation tools.
- **ML isolation:** HDFS sessions are split by block ID before feature vocabulary fitting. Random Forest imbalance handling and validation threshold selection are separate from final holdout evaluation.
- **Streaming UI:** the API stores investigation state in SQLite and emits agent events as Server-Sent Events. The React UI shows setup, timeline, and report together.

## Current limitations

The fine-tuning dataset is proof-of-concept scale (40 grounded examples across 8 incidents, 5 validation examples, 5 test examples on held-out INC-07). The 100% test score confirms pipeline and formatting adherence on this scenario but does not claim universal generalization. Cloud baseline evaluations (Setups A–C) are unexecuted pending provider API credentials and marked NOT RUN / CONFIGURATION ERROR. Automated patch application is intentionally guarded; human review is required before modifying code.

## Reproduction

Install `requirements.txt`, configure one provider key in `.env`, run the API and sample app as documented in `README.md`, generate traffic with `python -m sample_app.traffic`, then start the React app. Download and train HDFS_v1 before enabling setup C in the evaluation harness.
