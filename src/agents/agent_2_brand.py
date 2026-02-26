from rich.console import Console
from src.state import OpenFrameState, get_agent_llm_kwargs
from src.models.schemas import VisualIdentity
from src.utils import call_agent_model
from src.ad_presets import get_ad_guidance

console = Console()


SYSTEM_PROMPT = """You are a versatile Art Director who adapts visual language to any advertising context.

Task: Based on the provided Creative Director's Concept and Mood, define the visual identity.

Adapt your visual direction to match the concept's tone:
- Editorial/luxury → bold or moody palettes, rich textures, dramatic composition with negative space.
- Commercial/product → clean, bright, high-key. Product-focused, symmetrical, polished.
- Beauty/skincare → soft, luminous, intimate. Skin tones, dewy textures, close-up-heavy.
- UGC/social → natural, unfiltered. Real-world surfaces, casual imperfect framing.
- Cinematic/brand → cinematic grade, story-driven palette, tangible real-world textures.
- If the concept doesn't fit a category, infer the right visual language from the mood keywords.

Output Requirements:
1. Color Story: List 3-4 specific colors that match the concept tone.
2. Textures: What materials dominate?
3. Visual Style: Composition and framing approach.

Keep it strictly visual. No camera tech yet.

IMPORTANT: Return your response in valid JSON format with the following keys:
{{
  "color_palette": ["Color 1", "Color 2", "Color 3"],
  "textures_materials": "String description of textures",
  "composition_style": "String description of visual style"
}}"""


def agent_2_brand(state: OpenFrameState) -> dict:
    console.print("[bold blue]--- Brand Stylist (Agent 2) Running ---[/bold blue]")

    brief = state["creative_brief"]
    user_content = f"""CONCEPT SUMMARY: {brief.concept_summary}
MOOD KEYWORDS: {', '.join(brief.mood_keywords)}

Task: Define the visual identity — color palette, textures/materials, and composition style."""

    ad_guidance = get_ad_guidance(state.get("ad_type"), "brand_stylist")
    system = SYSTEM_PROMPT + (f"\n\n**AD TYPE GUIDANCE (you MUST follow this):**\n{ad_guidance}" if ad_guidance else "")

    result = call_agent_model(system, user_content, VisualIdentity, **get_agent_llm_kwargs(state, "brand_stylist"))

    console.print(f"    [green]Palette:[/green] {result.color_palette}")
    console.print(f"    [green]Composition:[/green] {result.composition_style}")

    return {"visual_identity": result}
