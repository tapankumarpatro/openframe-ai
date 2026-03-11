from rich.console import Console
from src.models.schemas import BatchPrompts
from src.utils import call_agent_model, load_prompt_best_practices

console = Console()


SYSTEM_PROMPT = """You are an expert AI Art Director and Creative Strategist for advertising photography.

YOUR FIRST JOB — INTENT ANALYSIS:
Before generating any prompts, you MUST analyze the user's instructions to determine:
1. **SHOOT TYPE** — What kind of shoot is this?
   - PRODUCT SHOOT: Focus on the product — it's the hero. Models may appear but product is prominent.
   - MODEL SHOOT: Focus on the model/person — outfit changes, poses, editorial fashion.
   - PRODUCT + MODEL: Both matter — the model wears/uses/holds the product. Product identity locked, model identity locked.
   - CAMPAIGN: Brand-level ads — may include product-only shots, model shots, lifestyle shots, flat lays, etc.
2. **WHAT IS LOCKED vs WHAT VARIES** — Based on what's provided:
   - If a PRODUCT description is provided → product appearance is LOCKED (copy VERBATIM in every prompt that includes it).
   - If a CAST/MODEL description is provided → model's physical identity is LOCKED (face, skin, body, hair — copy VERBATIM).
   - If NEITHER is provided → you invent appropriate subjects based on the instructions.
   - If the user says "men clothing brand" → you create a male model. "women's fashion" → female model. Etc.
3. **VARIATION AXIS** — What changes between prompts:
   - Product shoot: environment, model/cast, pose, lighting, mood, camera angle, ad format.
   - Model shoot: OUTFIT (primary), pose, setting, lighting, mood, camera.
   - Combined: setting, pose, lighting, mood, camera — but product AND model identity stay locked.
   - Campaign: mix of ad formats (UGC, editorial, flat lay, lifestyle, billboard, etc.)

IDENTITY RULES:
- If a PRODUCT DESCRIPTION is provided: Copy it VERBATIM into every prompt that features the product. Same garment, same color, same fabric, same everything. ZERO changes.
- If a CAST DESCRIPTION is provided: Copy the model's physical description VERBATIM. Same face, skin, body, hair. Only change their outfit, pose, and context.
- If BOTH are provided: Lock both. The model wears/displays the product. Vary only: pose, setting, lighting, camera, mood.
- If NEITHER is provided: Invent appropriate subjects from the user's instructions. Be specific and consistent.

OUTFIT/WARDROBE (when model is the focus or no product is locked):
- Each variation MUST have a COMPLETELY DIFFERENT outfit.
- Be extremely specific: fabric type, color, cut, fit, pattern, accessories, shoes, jewelry.
- Think like a fashion stylist: evening gown → streetwear → traditional wear → sporty → minimalist → avant-garde.

REFERENCE IMAGE & FACE PRESERVATION (CRITICAL FOR CONSISTENCY):
- When a cast/model reference image is provided, it will be passed as image_input to the AI image generator.
- You MUST include this directive in EVERY prompt that features the model: "Using input image 1 for face and identity reference. Keep the facial features, face shape, skin tone, and hair exactly consistent with the uploaded image."
- If BOTH cast image and product image are provided: "Using input image 1 for face/identity reference. Using input image 2 for product identity. Preserve both exactly."
- If ONLY product image: "Using input image 1 for product identity. Preserve product appearance exactly as in reference."
- The face, jawline, nose, eyes, eyebrows, lips, skin texture, and hair of the model must be IDENTICAL across all variations — this is non-negotiable.
- Do NOT invent new facial features. The reference image IS the ground truth for the model's face.

CRITICAL — NO URLs IN PROMPTS:
- NEVER include any URL or link inside a prompt. Reference images are passed separately via the image_input parameter.

PROMPT STRUCTURE — EVERY prompt must be a SINGLE dense paragraph with ALL these elements in order:
1. ASPECT RATIO — Start with ratio (e.g. "2:3." or "9:16.").
2. SUBJECT — Product description and/or model description (VERBATIM if provided).
3. CHARACTER/MODEL — Age, gender, ethnicity, specific physical features.
4. OUTFIT/WARDROBE — Detailed clothing description.
5. POSE & ACTION — What the character is doing.
6. SETTING/ENVIRONMENT — Where the scene takes place with specific details.
7. LIGHTING — Specific setup (e.g. "soft golden hour sunlight, warm amber key light from left, contrast ratio 3:1").
8. CAMERA — MANDATORY. Specific camera/lens:
   - UGC/social: "amateur iPhone photo, slightly uneven framing"
   - Luxury/editorial: "ARRI Alexa Mini, 85mm portrait lens, shallow depth of field"
   - Always specify: shot type, angle, lens.
9. SKIN & TEXTURE — "natural skin texture with visible pores, subtle grain, fine peach fuzz, not airbrushed".
10. COLOR GRADING & MOOD — e.g. "warm amber grading, elegant mood".
11. STYLE KEYWORDS — "photorealistic, high detail, skin texture".
12. NEGATIVE CONSTRAINTS — "no geometric distortion, no extra fingers, no airbrushed skin, no watermarks".

UNIQUENESS RULES:
- NO two variations may share the same setting.
- NO two variations may share the same camera approach.
- NO two variations may share the same pose.
- Each style_label must clearly describe the unique creative direction.
- Mix ad_types across variations: luxury, commercial, ugc, editorial, cinematic, beauty.

Return valid JSON:
{{
  "items": [
    {{ "style_label": "Short Style Name", "ad_type": "luxury", "prompt": "Full image prompt..." }},
    ...
  ]
}}"""


def agent_11_batch_creator(
    reference_description: str = "",
    user_instructions: str = "",
    batch_size: int = 5,
    concept: str = "",
    technical_specs: str = "",
    reference_image_url: str = "",
    product_description: str = "",
    generation_mode: str = "auto",
    cast_description: str = "",
    cast_image_url: str = "",
) -> BatchPrompts:
    """On-demand agent: generates N distinct image prompt variations for batch creation.
    
    The agent intelligently determines the shoot type from the user's instructions
    and what assets are connected (product, cast, both, or neither).
    """
    has_product = bool(product_description.strip())
    has_cast = bool(cast_description.strip())

    # Auto-detect context for logging
    if has_product and has_cast:
        ctx = "product + model"
    elif has_cast:
        ctx = "model-focused"
    elif has_product:
        ctx = "product-focused"
    else:
        ctx = "instructions-only"

    console.print(f"[bold cyan]--- Batch Creator (Agent 11) Running — {batch_size} variations, context={ctx} ---[/bold cyan]")

    parts = [f"BATCH SIZE: {batch_size} (produce exactly this many variations)"]

    # ── What assets are available ──
    has_cast_image = bool(cast_image_url and cast_image_url.strip())
    has_product_image = bool(product_description.strip())  # product image comes with description
    has_ref_image = bool(reference_image_url and reference_image_url.strip())

    available = []
    if has_product:
        available.append("PRODUCT (description + image)")
    if has_cast:
        available.append("CAST/MODEL (description" + (" + reference photo" if has_cast_image else "") + ")")
    if not available:
        available.append("NONE (invent from instructions)")
    parts.append(f"CONNECTED ASSETS: {', '.join(available)}")

    # ── Reference image mapping (tells the agent which image_input slot is which) ──
    img_slots = []
    if has_cast_image:
        img_slots.append("image 1 = CAST/MODEL face reference photo")
    if has_product_image and has_cast_image:
        img_slots.append("image 2 = PRODUCT reference photo")
    elif has_product_image:
        img_slots.append("image 1 = PRODUCT reference photo")
    if img_slots:
        parts.append(
            f"═══ REFERENCE IMAGES BEING PASSED TO IMAGE GENERATOR ═══\n"
            f"{chr(10).join(img_slots)}\n"
            f"You MUST include the corresponding 'Using input image N for...' directive in EVERY prompt.\n"
            + (f"FACE CONSISTENCY IS CRITICAL: The cast member's reference photo is being passed. "
               f"Every prompt MUST include: 'Using input image 1 for face and identity reference. "
               f"Keep the facial features, face shape, skin tone, and hair exactly consistent with the uploaded image.'\n"
               if has_cast_image else "")
            + f"═══ END REFERENCE IMAGES ═══"
        )

    # ── Cast / Model info ──
    if has_cast:
        parts.append(
            f"═══ MODEL / CAST MEMBER (LOCKED identity — copy VERBATIM) ═══\n"
            f"{cast_description}\n"
            f"═══ END CAST DESCRIPTION ═══"
        )

    # ── Product info ──
    if has_product:
        parts.append(
            f"═══ PRODUCT VISUAL ANALYSIS (LOCKED product — copy VERBATIM) ═══\n"
            f"{product_description}\n"
            f"═══ END PRODUCT ANALYSIS ═══"
        )

    if concept:
        parts.append(f"CAMPAIGN CONCEPT: {concept}")
    if technical_specs:
        parts.append(f"TECHNICAL SPECS (camera/lighting defaults): {technical_specs}")
    if reference_description:
        parts.append(f"ADDITIONAL CONTEXT:\n{reference_description}")

    # ── User instructions (the PRIMARY signal for intent) ──
    parts.append(
        f"═══ USER INSTRUCTIONS (READ CAREFULLY — this is your PRIMARY brief) ═══\n"
        f"{user_instructions}\n"
        f"═══ END INSTRUCTIONS ═══\n\n"
        f"IMPORTANT: Analyze the instructions above to determine:\n"
        f"- What type of shoot is this? (product ad, model photoshoot, campaign, lookbook, etc.)\n"
        f"- Who is the target audience?\n"
        f"- What should be locked vs varied?\n"
        f"- If instructions mention models/people but no cast is connected, INVENT detailed model descriptions.\n"
        f"- If instructions mention specific styles/settings, follow them closely.\n"
        f"- The instructions override any default assumptions."
    )

    parts.append(
        f"Task: Create exactly {batch_size} distinct image-generation prompts based on your analysis.\n"
        f"Each prompt must follow the PROMPT STRUCTURE exactly.\n"
        f"Each variation must be genuinely unique — different setting, camera, pose, mood."
    )

    user_content = "\n\n".join(parts)

    console.print(f"    [dim]Assets: product={'yes' if has_product else 'no'}, cast={'yes' if has_cast else 'no'}[/dim]")
    console.print(f"    [dim]Instructions: {user_instructions[:80]}{'...' if len(user_instructions) > 80 else ''}[/dim]")

    system = SYSTEM_PROMPT
    best_practices = load_prompt_best_practices()
    if best_practices:
        system += f"\n\n═══ PROMPT BEST PRACTICES REFERENCE (follow these guidelines) ═══\n{best_practices}\n═══ END BEST PRACTICES ═══"

    result = call_agent_model(system, user_content, BatchPrompts)

    items = result.items[:batch_size]
    console.print(f"    [green]Generated {len(items)} prompt variations[/green]")

    return BatchPrompts(items=items)
