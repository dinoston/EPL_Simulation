import time
from typing import Any, Optional


class TTLCache:
    def __init__(self):
        self._store: dict[str, tuple[Any, float]] = {}

    def get(self, key: str) -> Optional[Any]:
        if key in self._store:
            value, expires_at = self._store[key]
            if time.time() < expires_at:
                return value
            del self._store[key]
        return None

    def set(self, key: str, value: Any, ttl_seconds: int):
        self._store[key] = (value, time.time() + ttl_seconds)

    def delete(self, key: str):
        self._store.pop(key, None)

    def clear(self):
        self._store.clear()


# 앱 전체에서 공유하는 싱글턴 캐시
cache = TTLCache()
