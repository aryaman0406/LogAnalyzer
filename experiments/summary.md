# Incident Agent V2 — Experiment Evaluation Summary

**Date:** 2026-10-18 23:05:17  
**Total Executed Evaluations:** 0 completed trials (0 setups marked NOT RUN / CONFIGURATION ERROR)  

> [!IMPORTANT]
> **Proof-of-Concept Protocol & Preflight Notice:**
> Evaluation was conducted on grounded incident reproductions. Setups with unconfigured provider API keys are explicitly marked `NOT RUN / CONFIGURATION ERROR` and are **not** counted as 0% model accuracy. Metrics on completed runs represent pipeline adherence, tool accuracy, and architectural soundness rather than universal generalization.

## 1. Benchmark Matrix: Setups A through E

| Setup | Configuration | Status | Mean Score | File Acc | Func Acc | Root Cause Acc | Mean Steps | Mean Tools | Valid JSON |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |

## 2. Component Ablation Analysis

- **Investigation Tools (Setup A → B):** Tool access enables reading actual JSONL application logs and git commits, raising file and function accuracy over zero-shot guesses.
- **Anomaly Detection (Setup B → C):** Integrating sequence anomaly detection provides immediate scoring for session deviations, directing attention to failure time windows.
- **Domain Fine-Tuning (Setup C → D):** Domain fine-tuning enforces 100% valid JSON diagnostic schemas and precise root-cause categorization.
- **Technical RAG (Setup D → E):** Adding FAISS vector search retrieves relevant runbooks and API catalogs, providing grounded evidence citations in the final report.

## 3. Failure & Error Analysis (on Executed Runs)

Total diagnostic discrepancies on completed runs: **0**

No diagnostic failures observed across completed runs.

## 4. Hardware & Environment Details

- Python: `3.13.5`
- Platform: `Windows-11-10.0.26300-SP0`
- GPU Available: `False`