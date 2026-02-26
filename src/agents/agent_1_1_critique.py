from rich.console import Console
from src.state import OpenFrameState, get_agent_llm_kwargs
from src.models.schemas import CreativeCritique
from src.utils import call_agent_model
from src.ad_presets import get_ad_guidance

console = Console()


SYSTEM_PROMPT = """You are a Senior Creative Strategist acting as a quality gate. Your ONLY job is to critique a Creative Brief against the original user request.

You are NOT creating new content. You are evaluating whether the brief faithfully represents what the user asked for.

Evaluation Criteria:
1. ALIGNMENT: Does the concept match the user's stated product, tone, and style?
2. SPECIFICITY: Is the brief concrete enough, or is it vague/generic?
3. TONE MATCH: Does the mood/tagline match what the user described (e.g., if user said "minimalist" but brief is "dramatic and surreal", that's a mismatch)?
4. COMPLETENESS: Are all user requirements reflected in the brief?
5. RESTRAINT: Did the brief add unnecessary complexity, symbolism, or abstraction that the user didn't ask for?

Rules:
- Be harsh but fair. If the brief is good, say so (score 8-10) with minor suggestions.
- If there's a clear mismatch between user intent and brief output, call it out explicitly.
- Critique points should be specific and actionable (not vague like "make it better").
- Revision instructions should tell the Creative Director exactly what to change.
- Do NOT add your own creative ideas. Only point out what needs to align better with the user's request.

IMPORTANT: Return your response in valid JSON format with the following keys:
{{
  "alignment_score": 8,
  "critique_points": ["Point 1", "Point 2"],
  "revision_instructions": "Clear instructions for revision..."
}}"""


def agent_1_1_critique(state: OpenFrameState) -> dict:
    console.print("[bold yellow]--- Creative Critique (Agent 1.1) Running ---[/bold yellow]")

    user_input = state["user_input"]
    brief = state["creative_brief"]

    ad_guidance = get_ad_guidance(state.get("ad_type"), "creative_director")
    ad_context = f"\nAD TYPE SELECTED: {state.get('ad_type', 'none')}\nAD TYPE GUIDANCE GIVEN TO CREATIVE DIRECTOR:\n{ad_guidance}" if ad_guidance else ""

    user_content = f"""ORIGINAL USER REQUEST:
{user_input}
{ad_context}

CREATIVE BRIEF PRODUCED:
- Campaign Title: {brief.campaign_title}
- Concept Summary: {brief.concept_summary}
- Mood Keywords: {', '.join(brief.mood_keywords)}
- Tagline: {brief.tagline}

Task: Evaluate this brief against the original user request. Score alignment (1-10), list specific critique points, and provide clear revision instructions."""

    result = call_agent_model(SYSTEM_PROMPT, user_content, CreativeCritique, **get_agent_llm_kwargs(state, "creative_director"))

    console.print(f"    [green]Alignment Score:[/green] {result.alignment_score}/10")
    for point in result.critique_points:
        console.print(f"    [yellow]- {point}[/yellow]")

    return {"creative_critique": result}
