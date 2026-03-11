"""Central registry that maps provider names → ImageProvider instances."""

from typing import Dict, List

from .base import ImageProvider, ModelInfo
from .seedream import SeedreamProvider
from .nano_banana import NanoBananaProvider
from .nano_banana_2 import NanoBanana2Provider
from .gpt_image import GptImageProvider
from .z_image import ZImageProvider
from .qwen_image_edit import QwenImageEditProvider
from .flux_kontext import FluxKontextProvider


class ProviderRegistry:
    _providers: Dict[str, ImageProvider] = {}

    @classmethod
    def register(cls, name: str, provider: ImageProvider) -> None:
        cls._providers[name] = provider

    @classmethod
    def get(cls, name: str) -> ImageProvider:
        if name not in cls._providers:
            raise ValueError(f"Unknown provider: {name}")
        return cls._providers[name]

    @classmethod
    def get_for_model(cls, model_id: str) -> ImageProvider:
        # Safety: re-initialize if registry is empty
        if not cls._providers:
            cls.initialize()
        for provider in cls._providers.values():
            for m in provider.get_models():
                if m.id == model_id:
                    return provider
        raise ValueError(f"No provider found for model: {model_id}")

    @classmethod
    def all_models(cls) -> List[ModelInfo]:
        models: List[ModelInfo] = []
        for provider in cls._providers.values():
            models.extend(provider.get_models())
        return models

    @classmethod
    def initialize(cls) -> None:
        cls.register("seedream", SeedreamProvider())
        cls.register("nano-banana", NanoBananaProvider())
        cls.register("nano-banana-2", NanoBanana2Provider())
        cls.register("gpt-image", GptImageProvider())
        cls.register("z-image", ZImageProvider())
        cls.register("qwen-image-edit", QwenImageEditProvider())
        cls.register("flux-kontext", FluxKontextProvider())


# Auto-initialize on import
ProviderRegistry.initialize()
