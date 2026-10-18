# Incident Agent — Production Cleanup & Dead-Code Audit Report

**Date:** 2026-10-07  
**Scope:** Complete repository audit of `agent/`, `api/`, `ml/`, `sample_app/`, `eval/`, `tests/`, `frontend/`, root configurations, and documentation.  
**Audit Policy:** Preserve 100% of implemented V1–V2 functionality, test suites, dataset pipelines, local model execution, and benchmark evidence. Delete only verified-unused, temporary, or redundant artifacts.

---

## 1. Classification of Repository Files

| Category | Description & Paths | Action |
| :--- | :--- | :---: |
| **Required Core** | `agent/*.py`, `api/main.py`, `sample_app/**/*.py`, `ml/incident/*.py`, `eval/run_eval.py`, `tests/*.py`, `frontend/src/**/*.{tsx,ts,css}`, `requirements.txt`, `README.md` | **KEEP** |
| **Reproducibility Evidence** | `experiments/results.csv`, `experiments/summary.md`, `experiments/comparison.png`, `data/ground_truth.json`, `data/rag_index/chunks_metadata.json` | **KEEP** |
| **Temporary / Generated** | `tmp/api.err.log`, `tmp/api.out.log`, `tmp/ui.err.log`, `tmp/ui.out.log` | **DELETE** |
| **Unused Scratch Notebooks** | `ml/train_hdfs.ipynb` (14-line scratch notebook calling CLI training scripts) | **DELETE** |
| **Unused Frontend Wrappers** | `frontend/src/components/ui/select.tsx`, `frontend/src/components/ui/tooltip.tsx` | **DELETE** |
| **Obsolete / Stale Comments** | Stale V1 rules in `PROJECT_RULES.md` and `REPORT.md` | **CLEAN** |

---

## 2. Files Proposed for Deletion

### File 1: `tmp/api.err.log`
- **Path:** `tmp/api.err.log`
- **Reason:** Ephemeral stderr log from a prior local uvicorn background process.
- **Evidence:** Ignored in `.gitignore`; zero code or test references.
- **Classification:** Generated / temporary.

### File 2: `tmp/api.out.log`
- **Path:** `tmp/api.out.log`
- **Reason:** Ephemeral stdout log from a prior local uvicorn background process.
- **Evidence:** Ignored in `.gitignore`; zero code or test references.
- **Classification:** Generated / temporary.

### File 3: `tmp/ui.err.log`
- **Path:** `tmp/ui.err.log`
- **Reason:** Ephemeral stderr log from a prior Vite dev server process.
- **Evidence:** Ignored in `.gitignore`; zero code or test references.
- **Classification:** Generated / temporary.

### File 4: `tmp/ui.out.log`
- **Path:** `tmp/ui.out.log`
- **Reason:** Ephemeral stdout log from a prior Vite dev server process.
- **Evidence:** Ignored in `.gitignore`; zero code or test references.
- **Classification:** Generated / temporary.

### File 5: `ml/train_hdfs.ipynb`
- **Path:** `ml/train_hdfs.ipynb`
- **Reason:** Scratch exploratory Jupyter notebook created during early research; merely invokes `download_data`, `train`, and `train_sequence` via python imports.
- **Evidence:** 0 imports across the codebase; 0 CLI commands; 0 references in `README.md`, `tests/`, or `eval/`.
- **Classification:** Unused scratch notebook.

### File 6: `frontend/src/components/ui/select.tsx`
- **Path:** `frontend/src/components/ui/select.tsx`
- **Reason:** Radix UI primitive wrapper scaffolded during initial UI setup. The application exclusively uses native styled `<select>` elements (e.g., in `InvestigationControls.tsx`).
- **Evidence:** 0 imports across `frontend/src/` (`SelectTrigger`, `SelectContent`, `@/components/ui/select`).
- **Classification:** Unused component.

### File 7: `frontend/src/components/ui/tooltip.tsx`
- **Path:** `frontend/src/components/ui/tooltip.tsx`
- **Reason:** Radix UI Tooltip wrapper scaffolded during initial UI setup. Tooltips in the application are rendered via Recharts `<Tooltip>` in charts or native title attributes.
- **Evidence:** 0 imports across `frontend/src/` (`TooltipProvider`, `@/components/ui/tooltip`).
- **Classification:** Unused component.

---

## 3. Code Proposed for Removal (Dead Imports & Redundant Logic)

### Python Backend Cleanups

| File | Item | Reason | References Searched |
| :--- | :--- | :--- | :--- |
| `agent/llm.py` | `import re` | Unused import; regex matching is handled inside tools and agent validators. | Full AST usage scan |
| `agent/state.py` | `import json` | Unused import; state serialization uses dictionary mapping or callers use json. | Full AST usage scan |
| `api/main.py` | `from typing import Any` | Unused type import. | Full AST usage scan |
| `api/main.py` | `csv_path = ROOT / "eval" / "results.csv"` | Mirror path redundancy; point directly to authoritative `experiments/results.csv` with fallback. | API eval routes |
| `ml/incident/build_dataset.py` | `from typing import Any` | Unused type import. | Full AST usage scan |
| `ml/incident/inference.py` | `import os` | Unused import; paths use `pathlib.Path`. | Full AST usage scan |
| `ml/incident/train_llm.py` | `import os` | Unused import; paths use `pathlib.Path` and config. | Full AST usage scan |
| `sample_app/traffic.py` | `import os` | Unused import; configuration passed via CLI args. | Full AST usage scan |
| `tests/test_dataset_pipeline.py` | `import pytest`, `convert_to_instruct`, `convert_to_chatml` | Unused test imports; pipeline tests invoke CLI/functions directly. | Test file scan |
| `tests/test_evaluation_framework.py` | `import pytest`, `import json` | Unused test imports. | Test file scan |
| `tests/test_llm_training_and_eval.py` | `import pytest`, `LocalIncidentLLM`, `TrainingConfig`, `evaluate_predictions` | Unused test imports. | Test file scan |
| `tests/test_phase3_integration.py` | `import pytest`, `LLMClient`, `TechnicalDocumentationRAG` | Unused test imports. | Test file scan |

---

## 4. Dependencies Audit

### `requirements.txt`
All 15 packages in `requirements.txt` are actively used:
- `fastapi`, `uvicorn`, `pydantic`: Web API services
- `python-dotenv`: Environment configuration loading
- `httpx`: Async API clients and test fixtures
- `pytest`, `pytest-cov`: Test suite and coverage
- `drain3`: Log template clustering
- `pandas`, `scikit-learn`, `matplotlib`: ML modeling and evaluation charting
- `torch`: PyTorch inference engine
- `openai`, `anthropic`, `google-genai`: Cloud model adapters

**Recommendation:** Retain all 15 dependencies.

---

## 5. Documentation Cleanup

1. **`PROJECT_RULES.md`**: Update rule line 8 from `"Never train or fine-tune an LLM"` (obsolete V1 rule) to accurately reflect V2 architecture: `"Train and fine-tune local open-weights LLMs with PEFT/LoRA on grounded incident datasets; call configured provider adapters (Local, OpenAI, Anthropic, Gemini) for language reasoning."`
2. **`REPORT.md`**: Update the limitations section to distinguish between V1 initial prototype constraints and the active V2 implementation (domain fine-tuning, RAG, and state machine).

---

## 6. Verification Plan Post-Cleanup

1. Execute Python dataset generation: `python -m ml.incident.build_dataset`
2. Validate dataset schema: `python -m ml.incident.validate_dataset`
3. Format dataset: `python -m ml.incident.format_dataset`
4. Run fine-tuning dry run: `python -m ml.incident.train_llm --dry-run`
5. Run test split evaluation: `python -m ml.incident.evaluate_llm`
6. Run full pytest suite: `python -m pytest -q`
7. Run frontend production build: `cd frontend && npm run build`
8. Run local end-to-end incident investigation
