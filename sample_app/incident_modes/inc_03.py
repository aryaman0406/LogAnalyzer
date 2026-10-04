"""INC-03: access required payment configuration without startup validation."""
import os
def run() -> None:
    os.environ["PAYMENT_GATEWAY_URL"]
