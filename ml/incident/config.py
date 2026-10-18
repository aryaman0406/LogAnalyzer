"""Configuration and hardware detection for incident LLM fine-tuning."""
from __future__ import annotations
import os, platform, sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any
import torch

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MODEL_DIR = ROOT / "ml" / "models" / "incident_llm"
DEFAULT_RESULTS_DIR = ROOT / "ml" / "results"

@dataclass
class TrainingConfig:
    base_model: str = os.getenv("BASE_MODEL", "Qwen/Qwen2.5-Coder-1.5B-Instruct")
    output_model_dir: str = os.getenv("OUTPUT_MODEL_DIR", str(DEFAULT_MODEL_DIR))
    use_4bit: bool = os.getenv("USE_4BIT", "false").lower() in {"true", "1", "yes"}
    lora_r: int = int(os.getenv("LORA_R", "16"))
    lora_alpha: int = int(os.getenv("LORA_ALPHA", "32"))
    lora_dropout: float = float(os.getenv("LORA_DROPOUT", "0.05"))
    learning_rate: float = float(os.getenv("LEARNING_RATE", "2e-4"))
    num_epochs: int = int(os.getenv("NUM_EPOCHS", "3"))
    batch_size: int = int(os.getenv("BATCH_SIZE", "1"))
    grad_accumulation_steps: int = int(os.getenv("GRAD_ACCUMULATION_STEPS", "4"))
    max_seq_length: int = int(os.getenv("MAX_SEQ_LENGTH", "2048"))
    seed: int = int(os.getenv("SEED", "42"))
    target_modules: tuple[str, ...] = ("q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj")

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

def get_system_ram_gb() -> float | None:
    """Attempt to detect system RAM in GB."""
    try:
        import psutil
        return round(psutil.virtual_memory().total / (1024 ** 3), 2)
    except Exception:
        pass
    return None

def detect_hardware() -> dict[str, Any]:
    """Detect and report CPU, RAM, CUDA availability, GPU name, and VRAM."""
    cuda_available = torch.cuda.is_available()
    device_count = torch.cuda.device_count() if cuda_available else 0
    gpu_name = torch.cuda.get_device_name(0) if cuda_available and device_count > 0 else "None"
    
    vram_gb = None
    if cuda_available and device_count > 0:
        vram_bytes = torch.cuda.get_device_properties(0).total_memory
        vram_gb = round(vram_bytes / (1024 ** 3), 2)

    has_bitsandbytes = False
    try:
        import bitsandbytes # type: ignore
        has_bitsandbytes = True
    except (ImportError, Exception):
        has_bitsandbytes = False

    has_peft = False
    try:
        import peft # type: ignore
        has_peft = True
    except (ImportError, Exception):
        has_peft = False

    precision = "bfloat16" if (cuda_available and torch.cuda.is_bf16_supported()) else ("float16" if cuda_available else "float32")

    return {
        "platform": platform.platform(),
        "python_version": sys.version.split()[0],
        "cpu": platform.processor() or "Unknown CPU",
        "system_ram_gb": get_system_ram_gb(),
        "cuda_available": cuda_available,
        "device_count": device_count,
        "gpu_name": gpu_name,
        "vram_gb": vram_gb,
        "selected_precision": precision,
        "bitsandbytes_available": has_bitsandbytes,
        "peft_available": has_peft,
        "recommended_mode": "qlora_4bit" if (cuda_available and has_bitsandbytes and vram_gb and vram_gb >= 6) else ("lora_fp16" if (cuda_available and vram_gb and vram_gb >= 10) else "cpu_dry_run")
    }

def print_hardware_summary(hw: dict[str, Any] | None = None) -> None:
    """Display a clean, formatted hardware diagnostic summary."""
    if hw is None:
        hw = detect_hardware()
    print("=" * 60)
    print("Hardware & Environment Diagnostics:")
    print(f"  * Platform:         {hw['platform']}")
    print(f"  * Python:           {hw['python_version']}")
    print(f"  * CPU:              {hw['cpu']}")
    print(f"  * System RAM:       {hw['system_ram_gb']} GB" if hw['system_ram_gb'] else "  * System RAM:       Unknown")
    print(f"  * CUDA Available:   {hw['cuda_available']}")
    if hw['cuda_available']:
        print(f"  * GPU:              {hw['gpu_name']} ({hw['device_count']} device(s))")
        print(f"  * VRAM:             {hw['vram_gb']} GB")
    else:
        print("  * GPU:              None (CPU-only execution)")
    print(f"  * Precision:        {hw['selected_precision']}")
    print(f"  * bitsandbytes:     {hw['bitsandbytes_available']}")
    print(f"  * PEFT:             {hw['peft_available']}")
    print(f"  * Recommended Mode: {hw['recommended_mode']}")
    print("=" * 60)
