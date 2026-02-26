from rich.console import Console
from src.state import OpenFrameState, get_agent_llm_kwargs
from src.models.schemas import CastingBrief
from src.utils import call_agent_model
from src.ad_presets import get_ad_guidance

console = Console()


SYSTEM_PROMPT = """You are the Casting Director and Location Scout who adapts to any advertising style.

Task: Define the 'Key Drivers' of the ad based on the concept and visual style.

Adapt cast size and style to the concept:
- Luxury/editorial → 2-4 striking, aspirational models + symbolic non-human drivers. Curated locations.
- Commercial/product → 0-2 relatable, trustworthy subjects. Clean, minimal settings.
- Beauty/skincare → 1-2 subjects with flawless skin. Soft, bright, minimal environments.
- UGC/social → 1 person MAXIMUM. Real, relatable appearance. Real-world locations (bedroom, kitchen, outdoors).
- Cinematic/brand → 2-5 characters that feel like film protagonists. Cinematic, story-significant locations.
- If unclear, match the cast to the concept's mood — the drivers should embody the concept's feeling.

Output Requirements:
1. The Cast: Define the subject(s) with full visual descriptions.
2. Non-Human Drivers: Objects, animals, elements that appear in the ad (if appropriate).
3. The Environment: Define 2 distinct settings that fit the mood.

IMPORTANT: Return your response in valid JSON format with the following structure:
{{
  "cast_members": [
    {{
      "name": "Hero Model",
      "driver_type": "human",
      "visual_prompt": "Full detailed visual description..."
    }},
    {{
      "name": "Bengal Cat",
      "driver_type": "animal",
      "visual_prompt": "Full detailed visual description..."
    }}
  ],
  "setting_a_description": "Primary environment description",
  "setting_b_description": "Secondary environment description"
}}"""


def agent_4_casting(state: OpenFrameState) -> dict:
    console.print("[bold red]--- Casting & Scout (Agent 4) Running ---[/bold red]")

    brief = state["creative_brief"]
    identity = state["visual_identity"]

    user_content = f"""CONCEPT SUMMARY: {brief.concept_summary}
MOOD KEYWORDS: {', '.join(brief.mood_keywords)}
COMPOSITION STYLE: {identity.composition_style}
TEXTURES/MATERIALS: {identity.textures_materials}

Task: Identify every key driver (human, animal, plant, object, shape, etc.) and create individual visual prompts for each. Also define two distinct settings.
REMINDER: Do NOT include the advertised product itself as a cast member. The product is handled separately."""

    ad_guidance = get_ad_guidance(state.get("ad_type"), "casting_scout")
    system = SYSTEM_PROMPT + (f"\n\n**AD TYPE GUIDANCE (you MUST follow this):**\n{ad_guidance}" if ad_guidance else "")

    result = call_agent_model(system, user_content, CastingBrief, **get_agent_llm_kwargs(state, "casting_scout"))

    console.print(f"    [green]Cast Members:[/green] {len(result.cast_members)} drivers")
    for m in result.cast_members:
        console.print(f"      - {m.name} ({m.driver_type}): {m.visual_prompt[:60]}...")
    console.print(f"    [green]Setting A:[/green] {result.setting_a_description[:80]}...")

    return {"casting_brief": result}
