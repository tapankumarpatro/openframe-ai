"""30+ distinct style archetypes for batch image generation.

Each archetype defines a fundamentally different creative direction —
setting, camera approach, composition, and ad type — so that batch
variations are never repetitive.

The pool is shuffled and sliced to match the requested batch size.
"""

import random
from typing import List, Dict

# ── Master archetype pool ──────────────────────────────────────────────
# Each entry is a creative *brief skeleton* that the LLM must follow.
# Fields: style_label, ad_type, setting_concept, camera_approach, composition_note

STYLE_ARCHETYPES: List[Dict[str, str]] = [
    # ── Luxury / Editorial ──
    {
        "style_label": "Royal Heritage",
        "ad_type": "luxury",
        "setting_concept": "Opulent Indian palace interior — marble arches, jali screens, gold accents, grand chandeliers",
        "camera_approach": "ARRI Alexa Mini, 85mm portrait lens, medium shot at eye level, shallow depth of field",
        "composition_note": "Symmetrical framing with the model centered under an archway",
    },
    {
        "style_label": "Minimalist Studio",
        "ad_type": "editorial",
        "setting_concept": "Clean white cyclorama studio with single-color backdrop, no props — product is the only focus",
        "camera_approach": "Phase One IQ4, 120mm macro lens, full-body shot, flat even lighting, catalog style",
        "composition_note": "Dead-center framing, lots of negative space, e-commerce hero shot",
    },
    {
        "style_label": "Museum Gallery",
        "ad_type": "luxury",
        "setting_concept": "Contemporary art gallery — white walls, a single abstract painting visible, polished concrete floor",
        "camera_approach": "Sony A7R V, 50mm prime, three-quarter shot from slight low angle",
        "composition_note": "Model positioned off-center using rule of thirds, gallery space as breathing room",
    },
    {
        "style_label": "Rooftop Golden Hour",
        "ad_type": "editorial",
        "setting_concept": "Urban rooftop terrace at golden hour — city skyline in background, warm string lights, potted plants",
        "camera_approach": "Canon R5, 35mm wide angle, environmental portrait, natural backlight with lens flare",
        "composition_note": "Wide environmental shot showing lifestyle context, model in lower-third",
    },
    {
        "style_label": "Vintage Haveli",
        "ad_type": "luxury",
        "setting_concept": "Restored heritage haveli courtyard — ornate doorways, faded frescoes, terracotta pots, dappled sunlight through carved stone",
        "camera_approach": "Leica SL2, 75mm Summilux, medium close-up, natural window light only",
        "composition_note": "Doorway framing — model framed within an ornate archway",
    },
    {
        "style_label": "Desert Dunes",
        "ad_type": "cinematic",
        "setting_concept": "Vast desert landscape — golden sand dunes, clear blue sky, single acacia tree in distance",
        "camera_approach": "RED V-Raptor, 24mm anamorphic lens, ultra-wide establishing shot, cinematic 2.39:1 crop feel",
        "composition_note": "Epic scale — small figure against vast landscape, Lawrence-of-Arabia energy",
    },
    # ── Commercial / Product-focused ──
    {
        "style_label": "Mannequin Display",
        "ad_type": "commercial",
        "setting_concept": "Professional studio mannequin shot — product displayed on a tailoring mannequin, no human model, clean background",
        "camera_approach": "Nikon Z8, 105mm macro, straight-on product shot, evenly lit softboxes from both sides",
        "composition_note": "Pure product focus — NO human model, ghost mannequin technique, e-commerce flat lay feel",
    },
    {
        "style_label": "Flat Lay Styling",
        "ad_type": "commercial",
        "setting_concept": "Overhead flat lay on textured surface — product neatly arranged with complementary accessories (watch, shoes, sunglasses)",
        "camera_approach": "Overhead bird's-eye shot, 50mm lens, perfectly perpendicular to surface, even diffused lighting",
        "composition_note": "No human model — product laid out flat with styling props, Instagram flat-lay aesthetic",
    },
    {
        "style_label": "Store Window",
        "ad_type": "commercial",
        "setting_concept": "Upscale boutique storefront window display — product on a mannequin behind glass, street reflections visible",
        "camera_approach": "Street photography style, 35mm lens, shot through glass with subtle reflections, Fujifilm X100V feel",
        "composition_note": "Through-glass composition with urban reflections layered over the product",
    },
    {
        "style_label": "Festive Wedding",
        "ad_type": "luxury",
        "setting_concept": "Traditional Indian wedding ceremony setup — marigold garlands, diyas, red and gold mandap, rose petals on floor",
        "camera_approach": "Canon EOS R3, 70-200mm f/2.8 at 135mm, candid wedding photographer style, shallow DOF",
        "composition_note": "Candid moment — model adjusting outfit or greeting someone, wedding reportage feel",
    },
    {
        "style_label": "Diwali Celebration",
        "ad_type": "commercial",
        "setting_concept": "Diwali night setting — hundreds of lit diyas, sparklers, rangoli on floor, warm amber glow everywhere",
        "camera_approach": "Sony A7 III, 85mm f/1.4, shallow depth of field, bokeh from diya flames",
        "composition_note": "Warm intimate close-up with beautiful diya bokeh in foreground and background",
    },
    # ── UGC / Social Media ──
    {
        "style_label": "Mirror Selfie",
        "ad_type": "ugc",
        "setting_concept": "Bedroom full-length mirror selfie — messy bed visible, warm lamp light, everyday lived-in apartment",
        "camera_approach": "Amateur iPhone 15 photo, slightly uneven framing, visible phone in mirror, warm auto-white-balance",
        "composition_note": "Authentic selfie — phone visible in reflection, casual pose, zero styling",
    },
    {
        "style_label": "Try-On Haul",
        "ad_type": "ugc",
        "setting_concept": "Store fitting room — harsh fluorescent overhead light, plain curtain background, shopping bags on floor",
        "camera_approach": "Vertical smartphone video screenshot, eye-level selfie angle, slightly grainy, TikTok try-on haul feel",
        "composition_note": "Tight vertical frame, model doing a casual spin or showing the outfit tag",
    },
    {
        "style_label": "Unboxing Moment",
        "ad_type": "ugc",
        "setting_concept": "Kitchen table unboxing — product half out of branded packaging, tissue paper visible, natural daylight from window",
        "camera_approach": "Overhead iPhone shot, slightly tilted, casual snapchat-story quality, warm tones",
        "composition_note": "Focus on the unboxing moment — hands pulling product from box, authentic excitement",
    },
    {
        "style_label": "Street Style OOTD",
        "ad_type": "ugc",
        "setting_concept": "Busy city sidewalk — graffiti wall, passing pedestrians blurred, urban energy, morning light",
        "camera_approach": "Friend-took-this iPhone photo, slightly off-center, natural daylight, Instagram story quality",
        "composition_note": "Casual street-style OOTD (outfit of the day) — model posing against wall, relaxed vibe",
    },
    {
        "style_label": "Car Selfie",
        "ad_type": "ugc",
        "setting_concept": "Inside a car — dashboard visible, natural daylight through windshield, seatbelt on, casual pre-event moment",
        "camera_approach": "Front-facing iPhone camera, slightly below eye level, warm natural tones, snapchat selfie feel",
        "composition_note": "Tight selfie crop — just head and torso, showing outfit before heading out",
    },
    {
        "style_label": "Reddit Review",
        "ad_type": "ugc",
        "setting_concept": "Plain bedroom or bathroom — fluorescent or mixed lighting, cluttered background partially visible, real apartment",
        "camera_approach": "Low-quality phone camera, slight motion blur, harsh flash, reddit-post authenticity",
        "composition_note": "Deliberately imperfect — like a real person posting a product review photo online",
    },
    # ── Cinematic / Story-driven ──
    {
        "style_label": "Monsoon Drama",
        "ad_type": "cinematic",
        "setting_concept": "Rain-soaked street at night — neon signs reflecting in puddles, steam rising, dramatic downpour",
        "camera_approach": "ARRI Alexa 35, 40mm Cooke anamorphic, low angle with puddle reflection, rain backlit by streetlights",
        "composition_note": "Noir mood — silhouette-forward, dramatic rim light, cinematic color grading",
    },
    {
        "style_label": "Train Journey",
        "ad_type": "cinematic",
        "setting_concept": "Indian railway compartment — window seat, countryside blurring past, warm afternoon light streaming in",
        "camera_approach": "Handheld RED Komodo, 50mm vintage lens, medium close-up, slight camera movement for realism",
        "composition_note": "Wes-Anderson-inspired symmetry — model centered in window frame, warm vintage tones",
    },
    {
        "style_label": "Noir Night Market",
        "ad_type": "cinematic",
        "setting_concept": "Crowded night bazaar — hanging fabric stalls, naked bulbs, smoke from street food, chaotic energy",
        "camera_approach": "Sony FX6, 35mm cine lens, tracking shot feel, shallow DOF isolating model from crowd",
        "composition_note": "Subject sharp against bokeh crowd — night market chaos as beautiful background blur",
    },
    {
        "style_label": "Sunrise Silhouette",
        "ad_type": "cinematic",
        "setting_concept": "Beach at sunrise — waves, wet sand reflecting sky colors, lone figure against vast horizon",
        "camera_approach": "DJI Inspire 3 drone, wide establishing shot transitioning to medium, golden backlight",
        "composition_note": "Silhouette into reveal — start dark against sunrise, product details emerge as light hits",
    },
    # ── Beauty / Close-up ──
    {
        "style_label": "Intimate Portrait",
        "ad_type": "beauty",
        "setting_concept": "Tight beauty close-up — only face and upper chest visible, neutral blurred background, skin is the canvas",
        "camera_approach": "Hasselblad X2D, 90mm portrait lens, extreme close-up, ring light with soft diffusion",
        "composition_note": "Skin-detail hero shot — every pore visible, fabric texture where it meets skin, dewy finish",
    },
    {
        "style_label": "Backstage Candid",
        "ad_type": "beauty",
        "setting_concept": "Fashion show backstage — vanity mirror with bulbs, makeup brushes scattered, chaos and glamour",
        "camera_approach": "Leica Q3, 28mm wide angle, candid reportage style, mixed tungsten and daylight",
        "composition_note": "Behind-the-scenes energy — model mid-prep, half in mirror reflection, editorial documentary",
    },
    # ── Advertising / Print ──
    {
        "style_label": "Newspaper Print Ad",
        "ad_type": "commercial",
        "setting_concept": "Classic newspaper advertisement layout — grainy halftone texture overlay, bold headline typography space, vintage print aesthetic",
        "camera_approach": "High-contrast B&W photography feel, 50mm lens, formal three-quarter pose, studio flash",
        "composition_note": "Leave space for headline text — model on one side, negative space for copy on other side",
    },
    {
        "style_label": "Magazine Cover",
        "ad_type": "editorial",
        "setting_concept": "High-fashion magazine cover setup — solid color backdrop, dramatic cross-lighting, model commands the frame",
        "camera_approach": "Medium format Hasselblad, 80mm lens, dead-center composition, strong key light from 45 degrees",
        "composition_note": "Space at top for masthead — model from waist up, confident direct-to-camera gaze",
    },
    {
        "style_label": "Billboard Hero",
        "ad_type": "commercial",
        "setting_concept": "Massive billboard-ready hero shot — ultra-clean background, product prominence maximized, aspirational scale",
        "camera_approach": "Phase One XT, 32mm tilt-shift lens, full-body hero shot, perfect sharpness edge-to-edge",
        "composition_note": "Landscape orientation, model on left third, right side empty for brand logo/tagline overlay",
    },
    {
        "style_label": "Catalog Page",
        "ad_type": "commercial",
        "setting_concept": "E-commerce catalog style — pure white background, zero distractions, multiple angles in one frame concept",
        "camera_approach": "Nikon D850, 85mm, even softbox lighting, straight-on full body, no shadows",
        "composition_note": "Clean product documentation — model standing naturally, arms slightly away, full garment visible",
    },
    # ── Lifestyle / Contextual ──
    {
        "style_label": "Café Morning",
        "ad_type": "editorial",
        "setting_concept": "Trendy café interior — exposed brick, steaming coffee cup, morning newspaper, warm ambient light",
        "camera_approach": "Fujifilm X-T5, 56mm f/1.2, environmental portrait, window light key, café bokeh background",
        "composition_note": "Lifestyle moment — model sipping coffee, outfit visible naturally in context",
    },
    {
        "style_label": "Garden Party",
        "ad_type": "luxury",
        "setting_concept": "Lush garden party — white linen tablecloths, floral centerpieces, champagne glasses, dappled tree shade",
        "camera_approach": "Canon R5, 100mm f/2, candid party moment, beautiful leaf-shadow patterns on fabric",
        "composition_note": "Social context — model interacting with environment, not posing directly for camera",
    },
    {
        "style_label": "Temple Steps",
        "ad_type": "cinematic",
        "setting_concept": "Ancient stone temple steps — weathered carvings, moss, morning mist, spiritual atmosphere",
        "camera_approach": "ARRI Alexa Mini LF, 32mm Panavision primo, wide shot with steps leading eye to model, fog machine haze",
        "composition_note": "Leading lines — stone steps draw eye upward to the model, epic scale and heritage",
    },
    {
        "style_label": "Hotel Lobby",
        "ad_type": "luxury",
        "setting_concept": "Five-star hotel lobby — crystal chandelier, marble floor, velvet furniture, grand staircase behind",
        "camera_approach": "Sony A1, 24-70mm at 35mm, wide environmental shot, available light from chandelier",
        "composition_note": "Aspirational lifestyle — model walking through lobby mid-stride, captured in motion",
    },
    {
        "style_label": "Holi Festival",
        "ad_type": "cinematic",
        "setting_concept": "Holi celebration — clouds of colored powder in air, joyful crowd, vibrant pinks/yellows/blues, pure chaos",
        "camera_approach": "Sony A9 III, 70-200mm, high-speed freeze-motion, powder particles frozen mid-air, backlit",
        "composition_note": "Action freeze-frame — powder explosion around model, garment staying pristine amid color chaos",
    },
    {
        "style_label": "Yacht Deck",
        "ad_type": "luxury",
        "setting_concept": "Private yacht deck — turquoise ocean, white teak deck, chrome railings, endless horizon",
        "camera_approach": "Leica SL2-S, 50mm APO-Summicron, three-quarter shot, polarized natural light, sea reflection fill",
        "composition_note": "Aspirational luxury — model leaning on railing, ocean stretching behind, wind in fabric",
    },
    {
        "style_label": "Co-Working Space",
        "ad_type": "commercial",
        "setting_concept": "Modern co-working office — standing desk, MacBook, indoor plants, clean Scandinavian design",
        "camera_approach": "Sony A7C, 40mm compact lens, casual lifestyle shot, overhead fluorescent + window mix",
        "composition_note": "Work-ready context — model in professional setting, outfit shown as versatile daily wear",
    },
    {
        "style_label": "Music Festival",
        "ad_type": "ugc",
        "setting_concept": "Outdoor music festival — stage lights in background, crowd energy, dust in air, sunset sky",
        "camera_approach": "GoPro wide angle or iPhone ultra-wide, slightly tilted, handheld concert energy, warm stage-light color cast",
        "composition_note": "Festival energy — model dancing or walking through crowd, authentic motion blur",
    },
    {
        "style_label": "Gym Flex",
        "ad_type": "ugc",
        "setting_concept": "Gym mirror selfie — weight rack background, harsh overhead lighting, sweaty post-workout glow",
        "camera_approach": "iPhone mirror selfie, phone visible, gym fluorescent lighting, slightly washed out",
        "composition_note": "Fitness context — showing outfit versatility, casual gym-selfie energy",
    },
]


def pick_archetypes(batch_size: int, seed: int | None = None) -> List[Dict[str, str]]:
    """Return `batch_size` distinct archetypes, randomly sampled.

    If batch_size > pool size, the pool is cycled with index suffixes to
    guarantee uniqueness (e.g. "Mirror Selfie #2").
    """
    pool = list(STYLE_ARCHETYPES)
    rng = random.Random(seed)
    rng.shuffle(pool)

    if batch_size <= len(pool):
        return pool[:batch_size]

    # Cycle for very large batches
    result: List[Dict[str, str]] = []
    cycle = 1
    while len(result) < batch_size:
        for arch in pool:
            if len(result) >= batch_size:
                break
            entry = dict(arch)
            if cycle > 1:
                entry["style_label"] = f"{entry['style_label']} #{cycle}"
            result.append(entry)
        cycle += 1
        rng.shuffle(pool)

    return result


def format_archetype_assignments(archetypes: List[Dict[str, str]]) -> str:
    """Format the selected archetypes as numbered assignments for the LLM."""
    lines = ["═══ ASSIGNED STYLE DIRECTIONS (you MUST follow these — one per variation) ═══"]
    for i, arch in enumerate(archetypes, 1):
        lines.append(
            f"\nVARIATION {i}:\n"
            f"  style_label: \"{arch['style_label']}\"\n"
            f"  ad_type: \"{arch['ad_type']}\"\n"
            f"  setting: {arch['setting_concept']}\n"
            f"  camera: {arch['camera_approach']}\n"
            f"  composition: {arch['composition_note']}"
        )
    lines.append("\n═══ END ASSIGNED STYLES ═══")
    lines.append(
        "\nCRITICAL: Use the EXACT style_label and ad_type from each assignment above. "
        "Follow the setting, camera, and composition directions closely — they are your creative brief. "
        "Do NOT substitute similar styles or merge two assignments into one. "
        "Each variation MUST feel fundamentally different from every other variation."
    )
    return "\n".join(lines)
