"""INC-05: reject the demo order token as expired."""
def run() -> None:
    raise PermissionError("token expired")
