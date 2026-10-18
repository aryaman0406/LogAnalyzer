"""Generate mostly healthy demo traffic followed by the configured incident."""
from __future__ import annotations

import argparse
import random
import time

import httpx


def simulate(base_url: str, requests: int = 60, incident: str = "INC-01", seed: int = 7) -> None:
    """Send healthy catalog traffic, then requests that exercise one incident."""
    random.seed(seed)
    with httpx.Client(base_url=base_url, timeout=5.0) as client:
        for _ in range(requests):
            if random.random() < 0.85:
                client.get("/products", params={"limit": 10}, headers={"X-Demo-Incident": incident})
            else:
                client.get("/users", headers={"X-Demo-Incident": incident})
            time.sleep(random.uniform(0.005, 0.025))
        for _ in range(max(3, requests // 10)):
            client.post("/orders", json={"product_id": 1, "quantity": 1},
                        headers={"X-Demo-Token": "valid-demo-token", "X-Demo-Incident": incident})


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", default="http://127.0.0.1:8000")
    parser.add_argument("--requests", type=int, default=60)
    parser.add_argument("--incident", choices=[f"INC-{i:02d}" for i in range(1, 9)], default="INC-01")
    args = parser.parse_args()
    simulate(args.url, args.requests, args.incident)
