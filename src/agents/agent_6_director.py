from difflib import SequenceMatcher
from rich.console import Console
from src.state import OpenFrameState, get_agent_llm_kwargs
from src.models.schemas import ShotList
from src.utils import call_agent_model, load_prompt_best_practices
from src.ad_presets import get_ad_guidance, get_ad_config

console = Console()


SYSTEM_PROMPT = """You are the Film Editor and Director. You assemble commercial spots of varying lengths and styles.

Task: Create a scene sequence using the provided Context (Cast, Product, Env, Lighting).

SCENE COUNT: Create {scene_min} to {scene_max} scenes. Choose the exact count based on:
- The complexity of the concept (simple = fewer, story-driven = more).
- The pacing needed (fast/punchy = fewer, atmospheric/epic = more).
- The content type (social/UGC = 1-3 max, standard = 5-8, cinematic = 10-20).

AUDIO MODE — CRITICAL:
The default audio mode for this ad is "{default_audio_mode}". You MUST apply this default to EVERY scene unless you have a specific reason to override it.
Three modes exist:
- "silent" — no synced audio. Video only. Audio (VO/music) layered in post-production. Use for: atmospheric shots, B-roll, product beauty shots, cinematic sequences.
- "talking-head" — character speaks to camera. Requires separate audio + lip-sync. Use for: UGC, testimonials, direct-to-camera, any scene where a person talks.
- "audio-native" — video model generates video WITH built-in audio from prompt (e.g., Veo 3.1). Use for: scenes where ambient sound or speech is baked into the video generation.

RULES:
- If default is "talking-head": MOST scenes MUST be "talking-head". Only use "silent" for pure product close-ups or B-roll.
- If default is "silent": MOST scenes MUST be "silent". Only use "talking-head" if a scene explicitly has a character speaking to camera.
- If default is "audio-native": MOST scenes MUST be "audio-native". Only use "silent" for transition/montage scenes.
- When audio_mode is "talking-head" or "audio-native", you MUST provide "dialogue" (the spoken line) and "dialogue_speaker" (cast member name or "narrator"). These CANNOT be null.
- When audio_mode is "silent", set dialogue and dialogue_speaker to null.

Output per scene:
1. Scene Number & Type — choose from: Intro, Reveal, Interaction, Hook, Lifestyle, Action, Detail, Transition, Montage, Narrative, Closing.
2. Shot Type (e.g., Wide Shot, Medium Shot, Close-Up, Extreme Close-Up, Tracking Shot, Overhead, POV, Dolly, Pan, Tilt, Over-the-Shoulder).
3. Visual Type — the art / visual style. Choose from:
   - "Standard" — classic cinematic photography (DEFAULT for most scenes).
   - "Model Shot" — fashion editorial focus on the model / talent.
   - "Product Shot" — dedicated product hero close-up or beauty shot.
   - "B-Roll" — atmospheric filler footage (textures, environments, details).
   - "Glitch Art", "Liquid Chrome", "Surrealist Minimalism", "Kinetic Typography", "Mixed Media Collage", "Digital Brutalism", "Acid Graphics" — use ONLY when the creative concept calls for it.
4. Action: Specific movement instructions.
5. Start Image Prompt: Full text-to-image prompt for the START frame. MUST include Technical Specs.
6. End Image Prompt: Full text-to-image prompt for the END frame. MUST include Technical Specs.
7. Three Video Prompts — SHORT, SIMPLE single sentences like a director calling a shot:
   - start_video_prompt: Animate the START frame.
   - end_video_prompt: Animate the END frame.
   - combined_video_prompt: Start-to-end transition.
   CRITICAL for "audio-native": The video prompts MUST include the spoken dialogue woven naturally into the action description.
   Example: "Model turns to camera and says 'This changed everything' while gesturing toward product, slow dolly in"
   For "talking-head" and "silent": video prompts are visual-only camera directions (no dialogue in prompt).
8. audio_mode: "silent", "talking-head", or "audio-native".
9. dialogue: The spoken line (ONLY if audio_mode is NOT "silent"). null otherwise.
10. dialogue_speaker: Who speaks (cast member name or "narrator"). null if silent.
11. scene_voice_prompt: TTS voice style description for talking-head/audio-native (e.g., "warm female voice, mid-20s, conversational, genuine enthusiasm"). null if silent.

CRITICAL — NO URLs IN PROMPTS:
- NEVER include any URL, link, or web address inside start_image_prompt, end_image_prompt, or any video prompt.
- Reference images are passed SEPARATELY to the image generation API via image_input — NOT inside the prompt text.
- Prompts must contain ONLY visual descriptions. Zero URLs.
- Start each image prompt with the aspect ratio (e.g. "2:3." or "9:16.").
- End each image prompt with realism/quality keywords.

Ensure every scene re-states the lighting and style keywords for consistency.

IMPORTANT: Return valid JSON:
{{
  "scenes": [
    {{
      "scene_number": 1,
      "type": "Intro",
      "shot_type": "Wide Shot",
      "visual_type": "Standard",
      "visual_description": "Description...",
      "action_movement": "Action...",
      "start_image_prompt": "Full Prompt...",
      "end_image_prompt": "Full Prompt...",
      "start_video_prompt": "Slow dolly in, model lifts chin as wind catches the silk scarf",
      "end_video_prompt": "Camera holds steady, model gazes directly into lens with soft blink",
      "combined_video_prompt": "Tracking shot from wide to close-up, model walks toward camera",
      "active_cast": ["Hero Model"],
      "active_setting": "setting_a",
      "audio_mode": "{default_audio_mode}",
      "dialogue": "Write actual dialogue here if audio_mode is NOT silent, else null",
      "dialogue_speaker": "Cast member name or narrator if audio_mode is NOT silent, else null",
      "scene_voice_prompt": "TTS voice style if audio_mode is NOT silent (e.g. 'warm female voice, mid-20s, conversational'), else null"
    }}
  ]
}}"""


def agent_6_director(state: OpenFrameState) -> dict:
    console.print("[bold magenta]--- Director (Agent 6) Running ---[/bold magenta]")

    ad_cfg = get_ad_config(state.get("ad_type"))
    scene_min = ad_cfg["scene_count_min"]
    scene_max = ad_cfg["scene_count_max"]
    default_audio = ad_cfg["default_audio_mode"]

    # Pull context from state (guaranteed to exist by graph logic)
    context_concept = state["creative_brief"].concept_summary
    context_product = state["product_specs"].visual_product_description
    cast_members = state["casting_brief"].cast_members
    context_cast = "\n".join(
        f"  - {m.name} ({m.driver_type}): {m.visual_prompt}"
        for m in cast_members
    )
    context_setting_a = state["casting_brief"].setting_a_description
    context_setting_b = state["casting_brief"].setting_b_description
    context_tech = state["camera_specs"].technical_prompt_block

    user_content = f"""CONCEPT: {context_concept}
PRODUCT: {context_product}
KEY DRIVERS:
{context_cast}
SETTING A: {context_setting_a}
SETTING B: {context_setting_b}
TECHNICAL SPECS: {context_tech}

Task: Generate the shot-by-shot list ({scene_min}-{scene_max} scenes). For each scene, decide the audio_mode and include dialogue if needed. Each scene must include the full image prompt with technical specs appended."""

    # Inject structural values into the system prompt template
    system = SYSTEM_PROMPT.format(
        scene_min=scene_min,
        scene_max=scene_max,
        default_audio_mode=default_audio,
    )

    ad_guidance = get_ad_guidance(state.get("ad_type"), "director")
    if ad_guidance:
        system += f"\n\n**AD TYPE GUIDANCE (you MUST follow this):**\n{ad_guidance}"

    best_practices = load_prompt_best_practices()
    if best_practices:
        system += f"\n\n═══ PROMPT BEST PRACTICES REFERENCE (follow these guidelines for image & video prompts) ═══\n{best_practices}\n═══ END BEST PRACTICES ═══"

    result = call_agent_model(system, user_content, ShotList, **get_agent_llm_kwargs(state, "director"))

    audio_modes_before = [s.audio_mode for s in result.scenes]
    console.print(f"    [dim]LLM audio_modes (raw): {audio_modes_before}[/dim]")

    # ── Post-processing: enforce audio modes based on ad type ──────────
    ad_type = state.get("ad_type") or ""
    first_cast = cast_members[0].name if cast_members else "narrator"

    for scene in result.scenes:
        _enforce_audio_mode(scene, ad_type, str(default_audio), first_cast)

    audio_modes_after = [s.audio_mode for s in result.scenes]
    console.print(f"    [green]Generated {len(result.scenes)} scenes[/green]  audio_modes={audio_modes_after}")

    # ── Post-processing: validate cast/setting connections ──────────
    _validate_connections(result, cast_members)

    return {"shot_list": result}


def _enforce_audio_mode(scene, ad_type: str, default_audio: str, fallback_speaker: str):
    """Deterministically enforce audio mode rules per ad type. Runs after LLM output."""

    # ── UGC: ALL scenes MUST be audio-native, no exceptions ──
    if ad_type == "ugc_social":
        scene.audio_mode = "audio-native"

    # ── Commercial: Hook (scene 1) + Closing/CTA scenes → audio-native ──
    elif ad_type == "commercial_product":
        stype = (scene.type or "").lower()
        if scene.scene_number == 1 or stype in ("hook", "closing", "cta", "intro"):
            if scene.audio_mode == "silent":
                scene.audio_mode = "audio-native"

    # ── Beauty: Application + Result scenes → audio-native ──
    elif ad_type == "beauty_skincare":
        stype = (scene.type or "").lower()
        if stype in ("interaction", "action", "reveal", "closing", "result", "lifestyle"):
            if scene.audio_mode == "silent":
                scene.audio_mode = "audio-native"

    # ── Cinematic: Dialogue/narrative/closing scenes → audio-native ──
    elif ad_type == "cinematic_brand":
        stype = (scene.type or "").lower()
        if stype in ("narrative", "interaction", "closing", "hook", "intro"):
            if scene.audio_mode == "silent":
                scene.audio_mode = "audio-native"

    # ── Fashion: Closing scene → audio-native (whispered tagline) ──
    elif ad_type == "fashion_luxury":
        stype = (scene.type or "").lower()
        if stype in ("closing",):
            if scene.audio_mode == "silent":
                scene.audio_mode = "audio-native"

    # ── Ensure dialogue consistency ──
    if scene.audio_mode in ("audio-native", "talking-head"):
        # Non-silent scenes MUST have dialogue + speaker
        if not scene.dialogue:
            scene.dialogue = scene.visual_description[:80] if scene.visual_description else "..."
        if not scene.dialogue_speaker:
            scene.dialogue_speaker = fallback_speaker
        if not scene.scene_voice_prompt:
            scene.scene_voice_prompt = "natural, conversational tone"
        # For audio-native: weave dialogue into combined_video_prompt if not already there
        if scene.audio_mode == "audio-native" and scene.dialogue:
            cprompt = scene.combined_video_prompt or ""
            if scene.dialogue.lower() not in cprompt.lower() and "says" not in cprompt.lower():
                speaker = scene.dialogue_speaker or fallback_speaker
                scene.combined_video_prompt = f"{cprompt}, {speaker} says \"{scene.dialogue}\"".strip(", ")
    else:
        # Silent scenes MUST NOT have dialogue
        scene.dialogue = None
        scene.dialogue_speaker = None
        scene.scene_voice_prompt = None


def _validate_connections(shot_list, cast_members):
    """Hidden Director Validator — ensures every scene has valid active_cast and active_setting.

    Fixes:
    1. Fuzzy-match misspelled cast names to actual CastMember.name values
    2. Ensure active_setting is 'setting_a' or 'setting_b' (fix variants)
    3. Scenes with no active_cast get the most relevant cast member assigned
    4. Every cast member must appear in at least one scene
    """
    valid_names = [m.name for m in cast_members]
    valid_names_lower = {n.lower().strip(): n for n in valid_names}
    VALID_SETTINGS = {"setting_a", "setting_b"}
    fixes = []

    def _best_match(name: str) -> str | None:
        """Find closest cast member name using fuzzy matching."""
        nl = name.lower().strip()
        # Exact match (case-insensitive)
        if nl in valid_names_lower:
            return valid_names_lower[nl]
        # Try without underscores/hyphens
        for variant in [nl.replace("_", " "), nl.replace("-", " ")]:
            if variant in valid_names_lower:
                return valid_names_lower[variant]
        # Fuzzy match (>= 0.6 similarity)
        best, best_score = None, 0.0
        for canon_lower, canon in valid_names_lower.items():
            score = SequenceMatcher(None, nl, canon_lower).ratio()
            if score > best_score:
                best_score = score
                best = canon
        return best if best_score >= 0.6 else None

    # ── Fix active_cast names in each scene ──
    for scene in shot_list.scenes:
        if scene.active_cast:
            fixed_cast = []
            for name in scene.active_cast:
                matched = _best_match(name)
                if matched:
                    fixed_cast.append(matched)
                    if matched != name:
                        fixes.append(f"  Scene {scene.scene_number}: cast '{name}' → '{matched}'")
                else:
                    fixes.append(f"  Scene {scene.scene_number}: unknown cast '{name}' dropped")
            scene.active_cast = fixed_cast
        # Scenes with empty active_cast after fixing: assign first cast member
        if not scene.active_cast and valid_names:
            scene.active_cast = [valid_names[0]]
            fixes.append(f"  Scene {scene.scene_number}: no cast → assigned '{valid_names[0]}'")

    # ── Fix active_setting values ──
    setting_aliases = {
        "a": "setting_a", "setting a": "setting_a", "setting-a": "setting_a",
        "settinga": "setting_a", "env-a": "setting_a", "env_a": "setting_a",
        "b": "setting_b", "setting b": "setting_b", "setting-b": "setting_b",
        "settingb": "setting_b", "env-b": "setting_b", "env_b": "setting_b",
    }
    for scene in shot_list.scenes:
        raw = (scene.active_setting or "").lower().strip()
        if raw in VALID_SETTINGS:
            continue  # Already valid
        resolved = setting_aliases.get(raw)
        if resolved:
            if scene.active_setting != resolved:
                fixes.append(f"  Scene {scene.scene_number}: setting '{scene.active_setting}' → '{resolved}'")
            scene.active_setting = resolved
        elif not raw:
            # No setting assigned — alternate between a and b
            scene.active_setting = "setting_a" if scene.scene_number % 2 == 1 else "setting_b"
            fixes.append(f"  Scene {scene.scene_number}: no setting → assigned '{scene.active_setting}'")
        else:
            # Unknown value — default to setting_a
            fixes.append(f"  Scene {scene.scene_number}: unknown setting '{scene.active_setting}' → 'setting_a'")
            scene.active_setting = "setting_a"

    # ── Ensure every cast member appears in at least one scene ──
    used_cast = set()
    for scene in shot_list.scenes:
        used_cast.update(scene.active_cast or [])
    unused = [n for n in valid_names if n not in used_cast]
    if unused and shot_list.scenes:
        # Add unused cast to the scene that best matches (by checking image prompts for their name)
        for name in unused:
            nl = name.lower()
            assigned = False
            for scene in shot_list.scenes:
                prompt_text = (scene.start_image_prompt + " " + scene.end_image_prompt).lower()
                if nl in prompt_text:
                    scene.active_cast.append(name)
                    fixes.append(f"  Scene {scene.scene_number}: added unused cast '{name}' (found in prompt)")
                    assigned = True
                    break
            if not assigned:
                # Add to the middle scene as a reasonable default
                mid = len(shot_list.scenes) // 2
                shot_list.scenes[mid].active_cast.append(name)
                fixes.append(f"  Scene {shot_list.scenes[mid].scene_number}: added unused cast '{name}' (default)")

    if fixes:
        console.print(f"    [cyan]Director Validator fixes ({len(fixes)}):[/cyan]")
        for f in fixes:
            console.print(f"    [dim]{f}[/dim]")
    else:
        console.print("    [green]Director Validator: all connections valid ✓[/green]")
