from rich.console import Console
from src.state import OpenFrameState, get_agent_llm_kwargs
from src.models.schemas import ProductSpecs
from src.utils import call_agent_model
from src.ad_presets import get_ad_guidance

console = Console()


SYSTEM_PROMPT = """You are a versatile Product Stylist who adapts to any advertising context — from luxury editorial to casual UGC.

Task: Rewrite the provided Product Description so an AI image generator understands its material quality and placement.

Adapt your description to match the concept's tone:
- Luxury/editorial → emphasize material luxury: weight, texture, drape, sheen. Product as part of a lifestyle world.
- Commercial/product → exacting detail: packaging, surfaces, how light hits it. Product as hero on clean background.
- Beauty/skincare → texture of the product itself: cream consistency, gel clarity, serum viscosity.
- UGC/social → product looks real and casual. On someone's desk, in their hand, not styled on a pedestal.
- Cinematic/brand → product appears naturally within the story, not as a hard sell.
- If unclear, describe the product with professional precision and let the visual context guide placement.

Output Requirements:
1. Material Behavior: How does it move/feel/look?
2. Surface Detail: Micro-texture, finish, highlight behavior.
3. Integration: How is it worn/placed/shown?

IMPORTANT: Return your response in valid JSON format with the following keys:
{{
  "material_behavior": "String",
  "surface_detail": "String",
  "styling_integration": "String",
  "visual_product_description": "A single, cohesive paragraph combining the above for an image prompt."
}}"""


def agent_3_product(state: OpenFrameState) -> dict:
    console.print("[bold green]--- Product Stylist (Agent 3) Running ---[/bold green]")

    user_input = state["user_input"]
    identity = state["visual_identity"]

    has_ref_image = bool(state.get("product_image"))
    ref_note = "\nNOTE: The user has provided a reference photo of this product. Your description should match a real product — avoid inventing details not implied by the concept." if has_ref_image else ""

    user_content = f"""ORIGINAL PRODUCT: {user_input}
TEXTURES & MATERIALS FROM ART DIRECTOR: {identity.textures_materials}{ref_note}

Task: Rewrite the product description optimized for AI image generation, focusing on material behavior and surface detail."""

    ad_guidance = get_ad_guidance(state.get("ad_type"), "product_stylist")
    system = SYSTEM_PROMPT + (f"\n\n**AD TYPE GUIDANCE (you MUST follow this):**\n{ad_guidance}" if ad_guidance else "")

    result = call_agent_model(system, user_content, ProductSpecs, **get_agent_llm_kwargs(state, "product_stylist"))

    console.print(f"    [green]Material Behavior:[/green] {result.material_behavior}")

    return {"product_specs": result}
