"""INC-04: retain unbounded request data globally."""
_retained: list[str] = []
def run() -> None:
    _retained.extend(["retained-request-state"] * 1000)
