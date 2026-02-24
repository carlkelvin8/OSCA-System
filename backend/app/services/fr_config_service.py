"""
FR Configuration Service.

Stores runtime facial recognition configuration in Redis so threshold
changes from the Admin panel take effect immediately without a server restart.

Falls back to static `settings` values when a Redis key is absent (e.g. first
boot before any admin has configured overrides).
"""
import redis.asyncio as aioredis

from app.config import settings

# Single Redis hash key that holds all FR runtime config fields
_FR_CONFIG_HASH = "fr_config"


class FRConfigService:
    """
    Reads and writes facial recognition runtime config from/to Redis.

    Usage (inside a FastAPI dependency or endpoint):
        config = FRConfigService(redis)
        threshold = await config.get_similarity_threshold()
    """

    def __init__(self, redis_client: aioredis.Redis) -> None:
        self._redis = redis_client

    # ── Getters ───────────────────────────────────────────────────────────────

    async def get_similarity_threshold(self) -> float:
        """Return current cosine similarity threshold (0.0–1.0)."""
        value = await self._redis.hget(_FR_CONFIG_HASH, "similarity_threshold")
        return float(value) if value is not None else settings.FACE_SIMILARITY_THRESHOLD

    async def get_liveness_threshold(self) -> float:
        """Return current MiniFASNet liveness score threshold."""
        value = await self._redis.hget(_FR_CONFIG_HASH, "liveness_threshold")
        return float(value) if value is not None else settings.FR_LIVENESS_THRESHOLD

    async def get_liveness_enabled(self) -> bool:
        """Return whether liveness detection is currently enabled."""
        value = await self._redis.hget(_FR_CONFIG_HASH, "liveness_enabled")
        if value is not None:
            return value.lower() == "true"
        return settings.FR_LIVENESS_ENABLED

    async def get_all(self) -> dict[str, float | bool]:
        """Return all FR config values as a dict."""
        return {
            "similarity_threshold": await self.get_similarity_threshold(),
            "liveness_threshold": await self.get_liveness_threshold(),
            "liveness_enabled": await self.get_liveness_enabled(),
        }

    # ── Setters ───────────────────────────────────────────────────────────────

    async def update(
        self,
        similarity_threshold: float | None = None,
        liveness_threshold: float | None = None,
        liveness_enabled: bool | None = None,
    ) -> None:
        """
        Persist one or more config values to Redis.
        Only fields that are not None are written.
        """
        mapping: dict[str, str] = {}
        if similarity_threshold is not None:
            mapping["similarity_threshold"] = str(similarity_threshold)
        if liveness_threshold is not None:
            mapping["liveness_threshold"] = str(liveness_threshold)
        if liveness_enabled is not None:
            mapping["liveness_enabled"] = str(liveness_enabled)
        if mapping:
            await self._redis.hset(_FR_CONFIG_HASH, mapping=mapping)
