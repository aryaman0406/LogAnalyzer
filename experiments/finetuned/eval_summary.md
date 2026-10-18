# Incident LLM Evaluation Summary

- **Evaluation Date:** 2026-10-18 23:05:17
- **Dataset Split:** `test` (5 examples)
- **Model:** `Qwen/Qwen2.5-Coder-1.5B-Instruct` (Adapter: `Base/Diagnostic`)

## Metrics on Held-out Incident (INC-07)

| Metric | Score |
| :--- | :--- |
| **Valid JSON Rate** | `100.0%` |
| **Affected File Accuracy** | `100.0%` |
| **Affected Function Accuracy** | `100.0%` |
| **Severity Accuracy** | `100.0%` |
| **Root Cause Accuracy** | `100.0%` |
| **Composite Accuracy** | `100.0%` |

> [!IMPORTANT]
> **Dataset Provenance & Limitation:**
> This is a proof-of-concept domain fine-tuning experiment using a small grounded incident dataset (40 examples). Evaluation tests generalization to held-out incident INC-07 (test) and INC-03 (val). Results validate architectural soundness and tool-calling format adherence.
