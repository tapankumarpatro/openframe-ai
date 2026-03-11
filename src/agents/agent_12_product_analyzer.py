"""Agent 12 — Product Image Analyzer (Vision).

Uses Gemini 2.5 Pro (or similar vision model) to analyze a product image
and return an extremely detailed description of the product itself —
material, color, texture, silhouette, construction details, etc.

This description is then used by Agent 11 (Batch Creator) to ensure
every variation features the EXACT same product.
"""

from rich.console import Console
from src.utils import call_vision_model

console = Console()


SYSTEM_PROMPT = """You are an expert fashion and product analyst with decades of experience in garment construction, textile science, and visual merchandising.

Your task: Analyze the product image provided and produce an EXHAUSTIVE visual description of the PRODUCT ONLY (the garment, accessory, or item being sold). This description will be used by an AI image generator to recreate this EXACT product in different settings.

CRITICAL RULES:
1. Focus ONLY on the product/garment itself — NOT the model, NOT the background, NOT the setting.
2. Be extremely specific about:
   - Garment type and category (kurta, dress shirt, evening gown, sneaker, handbag, etc.)
   - Exact color(s) — use precise color names (e.g., "cream ivory with subtle warm undertone", not just "white")
   - Fabric/material (cotton, silk, linen, leather, etc.) and how light interacts with it (matte, sheen, glossy)
   - Pattern/print details (geometric, floral, self-textured, embroidered, solid, etc.)
   - Construction details: stitching, seams, closures (buttons, zippers), collars, cuffs, hems
   - Silhouette and fit (slim, relaxed, A-line, structured, flowy, tailored)
   - Length and proportions
   - Any embellishments, logos, hardware, or distinctive features
   - Surface texture (smooth, ribbed, quilted, crinkled, woven pattern)
3. Write as a SINGLE dense paragraph — this will be injected directly into image generation prompts.
4. Be precise enough that an AI could recreate this EXACT product with no other reference.
5. Do NOT include subjective opinions, marketing language, or brand names.
6. Do NOT describe the model/person wearing it or the background.

Output ONLY the product description paragraph — no headers, no bullet points, no formatting."""


def agent_12_product_analyzer(
    product_image_url: str,
    product_label: str = "",
    existing_description: str = "",
) -> str:
    """Analyze a product image using a vision model and return a detailed description."""
    console.print(f"[bold cyan]--- Product Analyzer (Agent 12) Running — Vision Analysis ---[/bold cyan]")

    user_text_parts = ["Analyze the product in this image and provide an exhaustive visual description."]

    if product_label:
        user_text_parts.append(f"Product label: {product_label}")
    if existing_description:
        user_text_parts.append(f"Existing description (may be incomplete or AI-generated — verify against the image): {existing_description}")

    user_text_parts.append(
        "Return ONLY a single dense paragraph describing the product's visual appearance, "
        "materials, colors, construction, and distinctive features. "
        "This description must be precise enough to recreate this EXACT product in an AI image generator."
    )

    user_text = "\n\n".join(user_text_parts)

    result = call_vision_model(
        system_prompt=SYSTEM_PROMPT,
        user_text=user_text,
        image_urls=[product_image_url],
    )

    # Clean up — remove any markdown formatting the model might add
    cleaned = result.strip()
    if cleaned.startswith("```"):
        cleaned = cleaned.split("\n", 1)[-1]
    if cleaned.endswith("```"):
        cleaned = cleaned.rsplit("```", 1)[0]
    cleaned = cleaned.strip().strip('"').strip("'")

    console.print(f"    [green]Product analysis complete ({len(cleaned)} chars)[/green]")
    return cleaned
