"""Admin configuration schemas."""
from pydantic import Field

from app.schemas.common import OSCABaseModel

# Absolute floor — anything below this is considered insecure
THRESHOLD_SECURITY_FLOOR = 0.70


class FRConfigRead(OSCABaseModel):
    """Current facial recognition runtime configuration."""
    similarity_threshold: float
    liveness_threshold: float
    liveness_enabled: bool


class FRConfigUpdate(OSCABaseModel):
    """
    Partial update for FR runtime configuration.
    Only supplied fields are written; omitted fields retain their current value.
    """
    similarity_threshold: float | None = Field(
        default=None,
        ge=0.50,
        le=1.0,
        description=(
            "Cosine similarity required for a successful face match. "
            "Default: 0.85. Values below 0.70 trigger a security warning."
        ),
    )
    liveness_threshold: float | None = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="MiniFASNet score above which a face is considered live. Default: 0.6.",
    )
    liveness_enabled: bool | None = Field(
        default=None,
        description="Toggle liveness detection on/off. Disabling reduces security — use only for testing.",
    )
