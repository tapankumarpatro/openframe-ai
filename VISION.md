# OpenFrame AI — Vision & Roadmap

> The open-source AI ad creation engine.

---

## Why OpenFrame AI?

Creating video ads traditionally requires a team of specialists — creative directors, stylists, cinematographers, editors, sound designers — and weeks of production time. AI can now handle the creative heavy-lifting, but the tools are scattered across dozens of disconnected services.

**OpenFrame AI brings the entire ad creation pipeline into one open-source platform:**

1. Describe your product or brand
2. AI agents collaborate to build the creative concept
3. You refine and generate every visual, video, and audio asset
4. Export a complete ad — ready to publish

---

## Design Philosophy

### Local-First
- Runs on your machine. No cloud dependency beyond the AI APIs you choose.
- Your projects, API keys, and creative work never leave your device.
- SQLite for storage, JSON files for projects — no external database needed.

### Modular Agents
- Each AI agent has a single, well-defined job (casting, lighting, directing, etc.)
- Agents can use different LLM models — pick the best model for each task
- The pipeline is a LangGraph DAG — easy to add, remove, or reorder agents

### Visual Canvas
- The React Flow canvas is the primary workspace after agents run
- Every asset and scene is a node you can inspect, edit, and regenerate
- Connections (wires) define which assets influence which scenes
- No black boxes — you see and control every prompt

### Provider Agnostic
- LLM: 27+ models via OpenRouter (Claude, GPT, Gemini, Llama, DeepSeek, etc.)
- Images: Seedream, Nano Banana, GPT Image, Z Image (via kie.ai)
- Video: 15+ models including Kling, Wan, Veo, Seedance (via kie.ai)
- Audio: ElevenLabs TTS, Suno/Udio music generation
- Easy to add new providers — plugin pattern for image/video/audio

### Simplest Possible Setup
- 3 steps: clone, install, run
- Docker one-liner for zero-config deployment
- API keys can be set via `.env` OR the in-app Settings panel (no restart needed)

---

## Roadmap

### v1.0 — Initial Release (Current)
- [x] 7-agent AI pipeline with LangGraph
- [x] Visual canvas with React Flow
- [x] Image generation (4 providers)
- [x] Video generation (15+ models)
- [x] Audio generation (voiceover + music)
- [x] Project management (save, load, folders, import/export)
- [x] Per-agent LLM model selection
- [x] 5 ad-type presets
- [x] Docker support
- [x] Authentication system

### v1.1 — Polish & Stability
- [ ] Timeline editor for scene sequencing
- [ ] Batch generation (generate all frames at once)
- [ ] Prompt templates library
- [ ] Undo/redo on canvas
- [ ] Keyboard shortcuts

### v1.2 — Export & Post-Production
- [ ] Video stitching (combine scenes into final video)
- [ ] Audio mixing (voiceover + music + SFX layering)
- [ ] Subtitle overlay on exported video
- [ ] Resolution upscaling
- [ ] Watermark controls

### v1.3 — Collaboration & Sharing
- [ ] Multi-user support (team workspaces)
- [ ] Project sharing via link
- [ ] Comment/annotation on canvas nodes
- [ ] Version history per project

### v2.0 — Advanced AI
- [ ] Custom agent creation (user-defined agents with custom prompts)
- [ ] Agent marketplace (community-shared agent configs)
- [ ] Fine-tuned style models (train on brand guidelines)
- [ ] Auto-iteration (agent reviews and improves its own output)
- [ ] Real-time preview (stream video generation progress)

### Future Ideas
- [ ] Mobile companion app
- [ ] Figma/Canva plugin integration
- [ ] Direct publish to social platforms (Instagram, TikTok, YouTube)
- [ ] A/B variant generation (multiple creative directions from one brief)
- [ ] Analytics integration (track ad performance)

---

## Non-Goals

Things we intentionally do NOT plan to build:

- **Multi-tenant SaaS** — OpenFrame is local-first, not a hosted platform
- **Payment/billing** — no paywalls; Pro keys are free, Enterprise is for teams needing custom support
- **Built-in LLM hosting** — we rely on OpenRouter/external APIs by design
- **Video editing NLE** — we're an ad creation tool, not a replacement for Premiere/DaVinci

---

## Contributing to the Vision

Have ideas? Open a [Feature Request](https://github.com/tapankumarpatro/openframe-ai/issues/new?template=feature_request.md) or start a [Discussion](https://github.com/tapankumarpatro/openframe-ai/discussions).

The roadmap is a living document. Community feedback shapes priorities.
