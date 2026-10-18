# Incident LLM Dataset & Fine-Tuning Pipeline

This directory contains the dataset construction, validation, formatting, LoRA/QLoRA fine-tuning, and evaluation pipeline for training small open-source language models on autonomous production incident investigation.

> [!IMPORTANT]
> **Proof-of-Concept Notice & Limitation:**
> This is a proof-of-concept domain fine-tuning experiment using a small grounded incident dataset (40 examples: 30 train, 5 validation, 5 test). It is designed to validate the end-to-end architecture, tool format adherence, and pipeline integrity. **40 examples are not claimed to provide broad generalization across unobserved production architectures.**

---

## 1. Directory Structure

```text
ml/incident/
├── raw/
│   └── dataset_raw.json           # Complete collection of all generated incident scenarios
├── processed/
│   ├── train.json                 # Training split (JSON array, 30 examples)
│   ├── val.json                   # Validation split (JSON array, 5 examples from INC-03)
│   ├── test.json                  # Test split (JSON array, 5 examples from INC-07)
│   ├── train_chatml.jsonl         # ChatML formatted training data for Hugging Face
│   ├── val_chatml.jsonl           # ChatML formatted validation data
│   ├── test_chatml.jsonl          # ChatML formatted test data
│   ├── train_instruct.jsonl       # Alpaca instruction formatted training data
│   ├── val_instruct.jsonl         # Alpaca instruction formatted validation data
│   └── test_instruct.jsonl        # Alpaca instruction formatted test data
├── config.py                      # Centralized configuration and hardware diagnostics
├── build_dataset.py               # Generates grounded multi-modal incident examples
├── validate_dataset.py            # Quality verification, leak detection, reference checking
├── format_dataset.py              # Transforms examples to ChatML and Instruct JSONL formats
├── train_llm.py                   # LoRA/QLoRA fine-tuning with CPU dry-run support
├── inference.py                   # Local model inference adapter with JSON extraction
├── evaluate_llm.py                # Evaluates Base vs Fine-Tuned models on held-out incidents
└── README.md                      # Pipeline documentation
```

---

## 2. Base Model & Training Method

- **Default Base Model:** `Qwen/Qwen2.5-Coder-1.5B-Instruct`
  *(Pretrained on code, repo structures, diffs, and structured tool-calling)*
- **Fine-Tuning Method:** Parameter-Efficient Fine-Tuning (PEFT) with **LoRA / QLoRA**
- **Target Modules:** `q_proj`, `k_proj`, `v_proj`, `o_proj`, `gate_proj`, `up_proj`, `down_proj`

### Hyperparameters (Configurable via Environment Variables)

| Variable | Default | Description |
| :--- | :--- | :--- |
| `BASE_MODEL` | `Qwen/Qwen2.5-Coder-1.5B-Instruct` | Base instruction-tuned model |
| `OUTPUT_MODEL_DIR` | `ml/models/incident_llm` | Output checkpoint / adapter directory |
| `USE_4BIT` | `false` | Enable 4-bit QLoRA quantization (requires CUDA + bitsandbytes) |
| `LORA_R` | `16` | LoRA attention dimension / rank |
| `LORA_ALPHA` | `32` | LoRA scaling parameter |
| `LORA_DROPOUT` | `0.05` | Dropout probability for LoRA layers |
| `LEARNING_RATE` | `2e-4` | AdamW optimizer initial learning rate |
| `NUM_EPOCHS` | `3` | Number of training epochs |
| `BATCH_SIZE` | `1` | Per-device training batch size |
| `GRAD_ACCUMULATION_STEPS` | `4` | Gradient accumulation steps |
| `MAX_SEQ_LENGTH` | `2048` | Maximum sequence length |
| `SEED` | `42` | Random seed for reproducibility |

---

## 3. Split Strategy (Zero Data Leakage)

Data is split **strictly by `incident_id`**:
- **Train split** (6 incidents): `INC-01`, `INC-02`, `INC-04`, `INC-05`, `INC-06`, `INC-08` (30 examples)
- **Validation split** (1 incident): `INC-03` (5 examples)
- **Test split** (1 incident): `INC-07` (5 examples)

Incidents in the validation (`INC-03`) and test (`INC-07`) sets are completely held out and never seen during training or prompt construction.

---

## 4. Hardware Detection & Modes

At startup, the pipeline inspects CPU, RAM, CUDA availability, GPU name, VRAM, and installed PEFT/bitsandbytes packages:
- **CUDA GPU Mode:** Runs full LoRA / QLoRA fine-tuning in `bfloat16` or `float16`.
- **CPU Dry-Run Mode (`--dry-run`):** Validates imports, datasets, tokenizer compatibility, LoRA configs, and output directories without GPU training cost.

---

## 5. Pipeline Commands

### 1. Build and Format Dataset
```powershell
python -m ml.incident.build_dataset
python -m ml.incident.validate_dataset
python -m ml.incident.format_dataset
```

### 2. Run Safe Diagnostic Dry Run (CPU-Safe)
```powershell
python -m ml.incident.train_llm --dry-run
```

### 3. Run LoRA Fine-Tuning (Requires CUDA GPU)
```powershell
python -m ml.incident.train_llm
```

### 4. Evaluate Base vs Fine-Tuned Model on Held-out Incident
```powershell
python -m ml.incident.evaluate_llm --split test
```

### 5. Run Test Suite
```powershell
python -m pytest -q
```

---

## 6. Evaluation Metrics on Held-out Test Incident (`INC-07`)

The evaluation script reports:
- **Valid JSON Rate:** Percentage of responses parsing as valid JSON.
- **Affected File Accuracy:** Exact match against ground truth (`sample_app/incidents.py`).
- **Affected Function Accuracy:** Exact match against ground truth (`paginate`).
- **Severity Accuracy:** Match against ground-truth severity.
- **Root Cause Accuracy:** Semantic keyword overlap against ground-truth explanation.
- **Composite Score:** Combined multi-criteria score.

Reports are saved to `ml/results/llm_evaluation.json` and `experiments/finetuned/eval_summary.md`.
