"""Nano Banana Pro provider via kie.ai API — text-to-image + image editing."""

from typing import List

from .base import (
    ImageProvider,
    GenerationRequest,
    GenerationTask,
    TaskStatus,
    ModelInfo,
)
from .kie_common import kie_create_task, kie_get_task_status

# Map quality field to Nano Banana Pro resolution values
_QUALITY_TO_RESOLUTION = {
    "1K": "1K",
    "2K": "2K",
    "4K": "4K",
    # Friendly aliases
    "basic": "1K",
    "high": "2K",
    "ultra": "4K",
}


class NanoBananaProvider(ImageProvider):
    """kie.ai wrapper for Nano Banana Pro."""

    async def create_task(self, request: GenerationRequest) -> GenerationTask:
        resolution = _QUALITY_TO_RESOLUTION.get(request.quality, "1K")

        payload: dict = {
            "model": "nano-banana-pro",
            "input": {
                "prompt": request.prompt,
                "aspect_ratio": request.aspect_ratio,
                "resolution": resolution,
                "output_format": "png",
            },
        }

        # image_input for editing / reference
        if request.image_urls:
            payload["input"]["image_input"] = request.image_urls

        return await kie_create_task(payload, "nano-banana")

    async def get_task_status(self, task_id: str) -> TaskStatus:
        return await kie_get_task_status(task_id)

    def get_models(self) -> List[ModelInfo]:
        return [
            ModelInfo(
                id="nano-banana/pro",
                name="Nano Banana Pro",
                provider="nano-banana",
                supports_image_input=True,
                aspect_ratios=["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"],
                qualities=["1K", "2K", "4K"],
            ),
        ]
