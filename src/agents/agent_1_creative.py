from rich.console import Console
from src.state import OpenFrameState, get_agent_llm_kwargs
from src.models.schemas import CreativeBrief
from src.utils import call_agent_model
from src.ad_presets import get_ad_guidance

console = Console()


REVISE_SYSTEM_PROMPT = """You are a world-class Creative Director revising your own work based on feedback from a Senior Strategist.

You have already produced a Creative Brief. A critique has been provided identifying misalignments with the original user request.

Your task: Revise the brief to address EVERY critique point. Do not add unnecessary new content — only refine and correct what was flagged.

Rules:
- Fix every issue raised in the critique.
- Stay faithful to the original user request above all else.
- Keep the same JSON output format as the original brief.
- Quality over quantity — tighten, don't bloat.

IMPORTANT: Return your response in valid JSON format with the following keys:
{{
  "campaign_title": "String",
  "concept_summary": "String",
  "mood_keywords": ["String", "String", ...],
  "tagline": "String"
}}"""


SYSTEM_PROMPT = """You are a world-class Creative Director who adapts to any advertising style — from high-fashion editorial to raw UGC social media.

Task: Analyze the input product/brand. Develop a brand narrative that matches the right tone for the product and context.

Adapt your creative approach to what the product NEEDS:
- Luxury/fashion products → abstract, elegant, aspirational. Think Vogue, Gucci, Loewe.
- Consumer/tech products → clean, benefit-driven, trustworthy. Think Apple, Glossier.
- Social/UGC content → raw, authentic, relatable. Think TikTok creator, honest review.
- Cinematic/brand films → story-driven, emotional, manifesto-style. Think Nike "Dream Crazy".
- If unclear, default to a modern, premium but accessible tone.

Output Requirements:
1. Campaign Title: Match the tone — abstract & elegant for luxury, punchy & clear for commercial, casual for UGC.
2. The Concept: A 2-sentence summary of the story.
3. The Mood: 5 adjectives describing the emotional resonance.
4. The Tagline: A short closing line that fits the chosen tone.

Do not discuss visuals yet. Focus purely on the philosophy and emotion of the campaign.

IMPORTANT: Return your response in valid JSON format with the following keys:
{{
  "campaign_title": "String",
  "concept_summary": "String",
  "mood_keywords": ["String", "String", ...],
  "tagline": "String"
}}
"""


def agent_1_creative(state: OpenFrameState) -> dict:
    console.print("[bold yellow]--- Creative Director (Agent 1) Running ---[/bold yellow]")

    user_input = state["user_input"]
    ad_guidance = get_ad_guidance(state.get("ad_type"), "creative_director")
    system = SYSTEM_PROMPT + (f"\n\n**AD TYPE GUIDANCE (you MUST follow this):**\n{ad_guidance}" if ad_guidance else "")

    result = call_agent_model(system, user_input, CreativeBrief, **get_agent_llm_kwargs(state, "creative_director"))

    console.print(f"    [green]Campaign Title:[/green] {result.campaign_title}")
    console.print(f"    [green]Tagline:[/green] {result.tagline}")  

    return {"creative_brief": result}


def agent_1_creative_revise(state: OpenFrameState) -> dict:
    console.print("[bold yellow]--- Creative Director REVISE (Agent 1 Reflect) Running ---[/bold yellow]")

    user_input = state["user_input"]
    brief = state["creative_brief"]
    critique = state["creative_critique"]

    ad_guidance = get_ad_guidance(state.get("ad_type"), "creative_director")
    system = REVISE_SYSTEM_PROMPT + (f"\n\n**AD TYPE GUIDANCE (you MUST follow this):**\n{ad_guidance}" if ad_guidance else "")

    user_content = f"""ORIGINAL USER REQUEST:
{user_input}

YOUR PREVIOUS BRIEF:
- Campaign Title: {brief.campaign_title}
- Concept Summary: {brief.concept_summary}
- Mood Keywords: {', '.join(brief.mood_keywords)}
- Tagline: {brief.tagline}

CRITIQUE (Alignment Score: {critique.alignment_score}/10):
Critique Points:
{chr(10).join(f'- {p}' for p in critique.critique_points)}

Revision Instructions:
{critique.revision_instructions}

Task: Revise the brief to address all critique points. Output the improved version."""

    result = call_agent_model(system, user_content, CreativeBrief, **get_agent_llm_kwargs(state, "creative_director"))

    console.print(f"    [green]Revised Title:[/green] {result.campaign_title}")
    console.print(f"    [green]Revised Tagline:[/green] {result.tagline}")

    return {"creative_brief": result}