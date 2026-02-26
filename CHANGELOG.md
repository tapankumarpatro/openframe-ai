# Changelog

All notable changes to OpenFrame AI will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-02-23

### Added

#### Multi-Agent AI Pipeline
- 7 specialized AI agents: Creative Director, Brand Stylist, Product Stylist, Casting Scout, Cinematographer, Director, Sound Designer
- Creative Director self-critique and revision loop (agent 1 → critic → revise)
- Fan-out parallelism: Brand Stylist triggers Product Stylist, Casting Scout, and Cinematographer simultaneously
- Fan-in synchronization: Director waits for all 3 parallel agents before generating shot list
- Per-agent LLM model selection (27 models across 7 providers via OpenRouter)
- Per-agent temperature control
- 5 ad-type presets: Fashion & Luxury, Commercial, Beauty, UGC, Cinematic Brand Film

#### Visual Canvas
- React Flow-based visual canvas for ad composition
- Asset nodes: character, environment, product, camera, voiceover, music, image, video
- Scene nodes: start/end frames with image generation, video generation, and audio
- Smart wire connections between assets and scenes
- Drag-and-drop canvas layout

#### Image Generation
- 4 image providers: Seedream, Nano Banana, GPT Image, Z Image (via kie.ai)
- Per-asset and per-frame model selection with quality controls
- Reference image support (connected assets auto-included)
- Image upload and history navigation
- Aspect ratio controls

#### Video Generation
- 15+ video models including Kling 3.0, Wan 2.1, Veo 3, Seedance 2
- Three audio modes per scene: silent, audio-native, talking-head
- Per-slot audio mode (separate start/end video audio)
- InfiniTalk integration for talking-head videos
- Video duration and resolution controls

#### Audio & Voice
- ElevenLabs text-to-speech for voiceovers
- Voice picker with stability, similarity, style, and speed controls
- AI music generation (Suno/Udio via kie.ai)
- Per-scene dialogue with speaker assignment
- SRT subtitle generation via Whisper

#### Project Management
- Project list with search, folders, and drag-to-organize
- 3D animated folder cards
- Project save/load with full state persistence
- Manual mode (build from scratch without AI agents)
- JSON import/export
- Project rename and delete

#### Infrastructure
- FastAPI backend with SSE real-time streaming
- SQLite database for API logs and auth
- Runtime API key management (set keys via UI, no restart needed)
- Docker Compose one-command deployment
- Cross-platform start scripts (PowerShell + Bash)
- User authentication (signup, signin, password reset)
- API cost tracking across all providers

---

_For older development history, see git log._
