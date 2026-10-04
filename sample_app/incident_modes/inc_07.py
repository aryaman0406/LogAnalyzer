"""INC-07: off-by-one page boundary regression."""
def paginate(items: list[dict], offset: int, limit: int) -> list[dict]:
    end = offset + limit
    if end < len(items):
        end -= 1
    return items[offset:end]
