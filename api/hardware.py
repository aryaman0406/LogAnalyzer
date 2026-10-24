"""Hardware and runtime diagnostic utilities for Incident Agent API."""
from __future__ import annotations
import platform, sys
from typing import Any

def get_system_ram_gb() -> float | None:
    """Attempt to detect system RAM in GB using psutil or os/sys."""
    try:
        import psutil
        return round(psutil.virtual_memory().total / (1024 ** 3), 2)
    except Exception:
        pass
    return None

def detect_hardware() -> dict[str, Any]:
    """Detect platform, CPU, RAM, and GPU capability without heavy model dependencies."""
    cuda_available = False
    device_count = 0
    gpu_name = "None"
    vram_gb = None

    try:
        import torch
        cuda_available = torch.cuda.is_available()
        if cuda_available:
            device_count = torch.cuda.device_count()
            gpu_name = torch.cuda.get_device_name(0) if device_count > 0 else "None"
            vram_bytes = torch.cuda.get_device_properties(0).total_memory
            vram_gb = round(vram_bytes / (1024 ** 3), 2)
    except Exception:
        pass

    return {
        "platform": platform.platform(),
        "python_version": sys.version.split()[0],
        "cpu": platform.processor() or "Unknown CPU",
        "system_ram_gb": get_system_ram_gb(),
        "cuda_available": cuda_available,
        "device_count": device_count,
        "gpu_name": gpu_name,
        "vram_gb": vram_gb,
        "selected_precision": "float16" if cuda_available else "float32"
    }
