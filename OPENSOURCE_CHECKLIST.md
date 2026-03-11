# OpenFrame AI — Open Source Release Checklist

> Master checklist for publishing OpenFrame AI as an open-source project.
> Go through every item before making the repository public.

---

## 1. Security & Secrets

- [x] **`.gitignore` created** — excludes `.env`, `settings.json`, `venv/`, `data/`, `__pycache__/`, `node_modules/`, `.next/`, `output/`, `uploads/`, `video_files/`
- [x] **`.env` never committed** — real API keys (OpenRouter, kie.ai, ImgBB) are in `.env` which is gitignored
- [x] **`.env.example` documented** — all variables listed with descriptions, links to get keys, and required/optional labels
- [x] **No hardcoded secrets in source** — grep confirmed: no API keys in `.py`, `.ts`, `.tsx`, `.json` files
- [x] **`settings.json` gitignored** — runtime key storage file excluded
- [ ] **Git history audit** — before first push, verify no secrets in any previous commits (`git log -p | grep -i "sk-or\|api_key"`)
- [ ] **Rotate all API keys** — after first public push, rotate OpenRouter, kie.ai, ImgBB, and ElevenLabs keys

---

## 2. Documentation

- [x] **Root `README.md`** — project overview, quick start (3 steps), Docker guide, API reference, tech stack, features list
- [x] **Frontend `ui/README.md`** — tech stack, project structure, environment vars, scripts, Docker build
- [x] **`.env.example`** — complete with REQUIRED / RECOMMENDED / OPTIONAL sections and "get a key" links
- [x] **`CONTRIBUTING.md`** — dev setup, branch naming, commit style, PR process, how to add providers/agents
- [x] **`LICENSE`** — Sustainable Use License
- [x] **`requirements.txt`** — all Python deps categorized (core, AI, database, auth, HTTP, optional whisper)
- [ ] **Architecture diagram** — consider adding a visual diagram of the agent pipeline flow
- [ ] **Screenshots / GIF demo** — add 2-3 screenshots of the UI (projects page, canvas, generated ad) to README

---

## 3. Code Quality

- [x] **Frontend builds clean** — `npm run build` passes with zero errors
- [x] **Debug console.logs removed** — replaced 3 diagnostic `console.log` statements in `store.ts`
- [x] **Backend print statements** — `runner.py` uses `rich.console.print()` (legitimate logging, not debug)
- [ ] **Frontend lint** — run `cd ui && npm run lint` and fix any warnings
- [ ] **Python lint** — run `ruff check .` or `flake8` on backend code and fix critical issues
- [ ] **Remove unused files** — `plans/` (empty), `video model detaisl.txt` (dev notes), `test_models.py`, `test_e2e.py`, `.cursorrules`
- [ ] **Remove `"private": true`** from `ui/package.json` if you want it to be installable (optional)

---

## 4. Dependencies & Build

- [x] **`requirements.txt` complete** — added missing: `sqlalchemy`, `bcrypt`, `pyjwt`, `email-validator`
- [x] **`openai-whisper` commented out** — optional dependency (requires ffmpeg), with instructions to enable
- [x] **`package.json` deps** — all frontend deps are present (React 19, Next 16, React Flow, Zustand, Framer Motion, etc.)
- [ ] **Fresh install test (Python):**
  ```bash
  python -m venv test-venv
  test-venv\Scripts\activate        # or source test-venv/bin/activate
  pip install -r requirements.txt
  python -m uvicorn api.server:app --port 8030
  # Should start without ImportError
  ```
- [ ] **Fresh install test (Node):**
  ```bash
  cd ui
  rm -rf node_modules .next
  npm install
  npm run build
  # Should complete with 0 errors
  ```

---

## 5. Docker

- [x] **`docker-compose.yml`** — backend (port 8030) + frontend (port 3030), env_file, volumes
- [x] **`Dockerfile.backend`** — Python 3.12-slim, pip install, uvicorn CMD
- [x] **`ui/Dockerfile`** — multi-stage Node build (deps → builder → runner)
- [x] **`.dockerignore`** — excludes venv, __pycache__, .env, output, ui (for backend image)
- [ ] **Docker build test:**
  ```bash
  cp .env.example .env
  # Add at least OPENROUTER_API_KEY to .env
  docker compose up --build
  # Verify: http://localhost:3030 loads, http://localhost:8030/api/health returns {"status":"ok"}
  ```
- [ ] **Frontend Dockerfile `.dockerignore`** — create `ui/.dockerignore` to exclude `.next/`, `node_modules/`

---

## 6. Cross-Platform Start Scripts

- [x] **`start.ps1`** — Windows PowerShell (starts backend + frontend, Ctrl+C kills both)
- [x] **`start.sh`** — macOS/Linux bash (starts backend + frontend, trap cleanup on exit)
- [ ] **Test `start.sh`** — verify on macOS or Linux (or WSL) that both processes start and Ctrl+C cleans up
- [ ] **Test `start.ps1`** — verify on Windows PowerShell

---

## 7. Go-Live Integration Tests

Run these manually after a fresh clone to verify the full stack works:

### 7.1 Backend Health
- [ ] `GET http://localhost:8030/api/health` → `{"status":"ok","service":"openframe-api"}`
- [ ] `GET http://localhost:8030/api/projects` → `[]` (empty list on fresh install)
- [ ] `GET http://localhost:8030/api/image/models` → returns list of 4 image models

### 7.2 Frontend Load
- [ ] http://localhost:3030 loads without errors
- [ ] Projects page renders (empty state with "Create Your First Ad" button)
- [ ] Settings modal opens (gear icon in header)
- [ ] API Keys tab shows provider status

### 7.3 Workflow Pipeline (requires API keys)
- [ ] Create new AI project → enters ad type, submits idea
- [ ] SSE stream works → agent cards update in real-time (Creative Director → Sound Designer)
- [ ] Canvas renders → asset nodes on left, scene nodes on right
- [ ] Agent outputs display in AgentDeck sidebar

### 7.4 Image Generation (requires kie.ai key)
- [ ] Generate asset image → loading spinner → image appears in node
- [ ] Model picker works → can switch between Seedream, Nano Banana, GPT Image, Z Image
- [ ] Quality picker works → changes quality option per model
- [ ] Generate scene frame (start/end) → image appears in frame slot
- [ ] Image upload works → click Upload, select file, image shows

### 7.5 Video Generation (requires kie.ai key)
- [ ] Video model picker works → can select from available models
- [ ] Generate video → loading state → video player appears
- [ ] Audio mode toggle works → silent / audio-native / talking-head
- [ ] Talking card appears when non-silent audio mode selected

### 7.6 Audio Generation
- [ ] Voiceover generation → TTS audio plays in scene card (requires ElevenLabs key)
- [ ] Music generation → audio player in music asset card
- [ ] Voice picker works → can select different voices

### 7.7 Project Management
- [ ] Save project → persists across page reload
- [ ] Load project from list → canvas restores with all assets and scenes
- [ ] Rename project → title updates in list
- [ ] Delete project → removed from list
- [ ] Create folder → appears in folders section
- [ ] Drag project to folder → project moves into folder
- [ ] Search bar → filters project list

### 7.8 Manual Mode
- [ ] Create manual project → empty canvas with "Ask Agent for Help" buttons
- [ ] Add asset cards manually (character, product, setting, etc.)
- [ ] Add scene cards manually
- [ ] Run single agent → agent processes and updates canvas
- [ ] Manual project auto-saves → survives page reload

### 7.9 Export
- [ ] Export workflow JSON → downloads .json file
- [ ] Import workflow JSON → creates new project from file
- [ ] Export SRT subtitles → generates subtitle file from voiceover

### 7.10 Auth (if enabled)
- [ ] Signup → creates account
- [ ] Signin → logs in
- [ ] Reset password → updates password

---

## 8. Pre-Push Final Checks

- [ ] **Run full build one more time:**
  ```bash
  cd ui && npm run build && cd ..
  python -c "from api.server import app; print('Backend imports OK')"
  ```
- [ ] **Check git status** — no `.env`, no `data/*.db`, no `venv/`, no `node_modules/`
  ```bash
  git status
  git diff --cached --name-only   # verify staged files
  ```
- [ ] **First commit message:**
  ```
  feat: initial open-source release of OpenFrame AI
  ```
- [ ] **GitHub repo settings:**
  - [ ] Add description: "The open-source AI ad creation engine"
  - [ ] Add topics: `ai`, `video-generation`, `image-generation`, `langgraph`, `nextjs`, `react-flow`, `multi-agent`, `fashion`, `advertising`
  - [ ] Set license to Sustainable Use
  - [ ] Enable Issues
  - [ ] Add branch protection rules (optional)

---

## 9. Post-Launch

- [ ] **Rotate all API keys** used during development
- [ ] **Create GitHub Release** — tag v1.0.0 with changelog
- [ ] **Add CI/CD** — GitHub Actions for frontend build check on PR (optional)
- [ ] **Community setup** — issue templates, PR template, discussions (optional)
- [ ] **Demo video** — record a 2-minute walkthrough for README (optional)

---

_Last updated: Feb 2026_
