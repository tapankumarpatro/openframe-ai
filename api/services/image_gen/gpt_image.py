"""GPT Image 1.5 Image-to-Image provider via kie.ai API — image editing only."""

from typing import List

from .base import (
    ImageProvider,
    GenerationRequest,
    GenerationTask,
    TaskStatus,
    ModelInfo,
)
from .kie_common import kie_create_task, kie_get_task_status


class GptImageProvider(ImageProvider):
    """kie.ai wrapper for GPT Image 1.5 Image-to-Image."""

    async def create_task(self, request: GenerationRequest) -> GenerationTask:
        if not request.image_urls:
            raise ValueError("GPT Image 1.5 i2i requires at least one input image")

        payload: dict = {
            "model": "gpt-image/1.5-image-to-image",
            "input": {
                "input_urls": request.image_urls,
                "prompt": request.prompt,
                "aspect_ratio": request.aspect_ratio,
                "quality": request.quality if request.quality in ("medium", "high") else "medium",
            },
        }

        return await kie_create_task(payload, "gpt-image")

    async def get_task_status(self, task_id: str) -> TaskStatus:
        return await kie_get_task_status(task_id)

    def get_models(self) -> List[ModelInfo]:
        return [
            ModelInfo(
                id="gpt-image/1.5-i2i",
                name="GPT Image 1.5 i2i",
                provider="gpt-image",
                supports_image_input=True,
                aspect_ratios=["1:1", "2:3", "3:2"],
                qualities=["medium", "high"],
            ),
        ]
