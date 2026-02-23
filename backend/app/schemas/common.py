"""Shared Pydantic v2 schema components."""
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard paginated list response."""
    items: list[T]
    total: int
    page: int
    page_size: int
    pages: int


class MessageResponse(BaseModel):
    """Simple message response."""
    message: str
    detail: str | None = None


class OSCABaseModel(BaseModel):
    """Base model with consistent config for all schemas."""
    model_config = ConfigDict(
        from_attributes=True,       # ORM mode
        populate_by_name=True,
        use_enum_values=True,
    )
