import os

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

DISABLE_RATE_LIMIT = os.getenv("DISABLE_RATE_LIMIT", "").lower() in ("1", "true", "yes")


def rate_limit(limit_value: str):
    """Apply slowapi limit unless DISABLE_RATE_LIMIT is set (useful for bulk_test)."""
    def decorator(func):
        if DISABLE_RATE_LIMIT:
            return func
        return limiter.limit(limit_value)(func)
    return decorator
