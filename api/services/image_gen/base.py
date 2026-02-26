"""Abstract base for image generation providers."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional, List


@dataclass
class GenerationRequest:
    """Input for creating an image generation task."""
    prompt: str
    model: str
    aspect_ratio: str = "1:1"
    quality: str = "basic"
    image_urls: Optional[List[str]] = None


@dataclass
class GenerationTask:
    """Returned after successfully creating a task."""
    task_id: str
    provider: str


@dataclass
class TaskStatus:
    """Returned when polling task status."""
    task_id: str
    state: str  # "waiting", "success", "fail"
    result_urls: Optional[List[str]] = None
    error_message: Optional[str] = None
    cost_time: Optional[int] = None


@dataclass
class ModelInfo:
    """Describes a model available from a provider."""
    id: str
    name: str
    provider: str
    supports_image_input: bool = False
    aspect_ratios: List[str] = field(default_factory=lambda: ["1:1"])
    qualities: List[str] = field(default_factory=lambda: ["basic"])


class ImageProvider(ABC):
    """Interface every image-generation provider must implement."""

    @abstractmethod
    async def create_task(self, request: GenerationRequest) -> GenerationTask:
        ...

    @abstractmethod
    async def get_task_status(self, task_id: str) -> TaskStatus:
        ...

    @abstractmethod
    def get_models(self) -> List[ModelInfo]:
        ...
