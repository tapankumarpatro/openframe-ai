"""Qwen Image Edit provider via kie.ai API — image editing with text prompts."""

from typing import List

from .base import (
    ImageProvider,
    GenerationRequest,
    GenerationTask,
    TaskStatus,
    ModelInfo,
)
from .kie_common import kie_create_task, kie_get_task_status

# Map aspect_ratio strings to Qwen's image_size enum
_AR_TO_IMAGE_SIZE = {
    "1:1": "square",
    "4:3": "landscape_4_3",
    "3:4": "portrait_4_3",
    "16:9": "landscape_16_9",
    "9:16": "portrait_16_9",
    "3:2": "landscape_4_3",   # closest match
    "2:3": "portrait_4_3",    # closest match
    "21:9": "landscape_16_9", # closest match
}


class QwenImageEditProvider(ImageProvider):
    """kie.ai wrapper for Qwen Image Edit."""

    async def create_task(self, request: GenerationRequest) -> GenerationTask:
        image_size = _AR_TO_IMAGE_SIZE.get(request.aspect_ratio, "landscape_4_3")

        payload: dict = {
            "model": "qwen/image-edit",
            "input": {
                "prompt": request.prompt,
                "image_size": image_size,
                "output_format": "png",
                "num_inference_steps": 25,
                "guidance_scale": 4,
                "negative_prompt": "blurry, ugly, distorted, extra fingers, extra limbs, watermark",
            },
        }

        # image_url for reference / editing (Qwen uses single image_url, not array)
        if request.image_urls and len(request.image_urls) > 0:
            payload["input"]["image_url"] = request.image_urls[0]

        return await kie_create_task(payload, "qwen-image-edit")

    async def get_task_status(self, task_id: str) -> TaskStatus:
        return await kie_get_task_status(task_id)

    def get_models(self) -> List[ModelInfo]:
        return [
            ModelInfo(
                id="qwen/image-edit",
                name="Qwen Image Edit",
                provider="qwen-image-edit",
                supports_image_input=True,
                aspect_ratios=["1:1", "4:3", "3:4", "16:9", "9:16"],
                qualities=["basic"],
            ),
        ]
