"""INC-01: intentional null dereference in the order path."""
def run() -> None:
    missing_order = None
    _ = missing_order["id"]
