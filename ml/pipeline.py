"""Shared Drain3 template parsing and HDFS block-session grouping."""
from __future__ import annotations
import re
from collections import Counter, defaultdict
from pathlib import Path

BLOCK = re.compile(r"blk_-?\d+")

def _fallback_template(line: str) -> str:
    """Normalize variable values without learning from held-out sessions."""
    template = re.sub(r"blk_-?\d+|\b\d+(?:\.\d+)?\b|[0-9a-f]{8,}", "<*> ", line)
    return " ".join(template.split())

def make_miner():
    """Create a Drain3 parser with deterministic configuration."""
    from drain3 import TemplateMiner
    from drain3.template_miner_config import TemplateMinerConfig
    config = TemplateMinerConfig()
    config.drain_sim_th = 0.4
    return TemplateMiner(config=config)

def parse_line(line: str, miner=None, learn: bool=False) -> tuple[str | None, str]:
    """Return HDFS block ID and a template; held-out parsing never learns clusters."""
    block = BLOCK.search(line)
    try:
        if miner is None:
            template = _fallback_template(line)
        elif learn:
            template = miner.add_log_message(line).get("template_mined", "")
        else:
            cluster = miner.match(line, full_search_strategy="fallback")
            template = cluster.get_template() if cluster else "UNSEEN " + _fallback_template(line)
    except ImportError:
        template = _fallback_template(line)
    return (block.group(0) if block else None, template)

def group_sessions(log_path: Path, train_ids: set[str] | None=None) -> tuple[dict[str, Counter[str]], object | None]:
    """Fit Drain3 only on training blocks, then freeze it for all other sessions."""
    miner = None
    if train_ids:
        try:
            miner = make_miner()
            with log_path.open(encoding="utf-8", errors="replace") as source:
                for line in source:
                    block_id = BLOCK.search(line)
                    if block_id and block_id.group(0) in train_ids:
                        parse_line(line, miner, learn=True)
        except ImportError:
            miner = None
    sessions: dict[str, Counter[str]] = defaultdict(Counter)
    with log_path.open(encoding="utf-8", errors="replace") as source:
        for line in source:
            block_id, template = parse_line(line, miner)
            if block_id:
                sessions[block_id][template] += 1
    return dict(sessions), miner
