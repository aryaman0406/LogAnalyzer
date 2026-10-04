"""INC-08: deliberately unsynchronized stock read-modify-write."""
import time
def decrement(product_id: int, current_stock: int) -> int:
    observed = current_stock
    time.sleep(0.01)
    return max(0, observed - 1)
