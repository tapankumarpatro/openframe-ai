# Contributing to OpenFrame AI

Thank you for your interest in contributing! This guide will help you get started.

---

## Development Setup

### Prerequisites

- Python 3.12+
- Node.js 20+
- Git

### 1. Fork & Clone

```bash
git clone https://github.com/tapankumarpatro/openframe-ai.git
cd openframe-ai
```

### 2. Backend

```bash
python -m venv venv

# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate

pip install -r requirements.txt
```

### 3. Frontend

```bash
cd ui
npm install
cd ..
```

### 4. Environment

```bash
cp .env.example .env
# Add your API keys to .env
```

### 5. Run in development mode

```bash
# Terminal 1 — Backend (auto-reload)
python -m uvicorn api.server:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2 — Frontend (hot-reload)
cd ui && npm run dev
```

---

## Project Layout

| Directory | What lives here |
|---|---|
| `src/agents/` | LangGraph AI agent definitions |
| `src/` | Shared state, graph, utilities |
| `api/routes/` | FastAPI endpoint handlers |
| `api/services/` | Business logic, storage, providers |
| `api/models/` | Pydantic + SQLAlchemy models |
| `ui/src/components/` | React components |
| `ui/src/lib/` | Store (Zustand) + API client |

---

## Making Changes

### Branch naming

```
feature/short-description
fix/bug-description
docs/what-you-changed
```

### Commit messages

Use clear, concise commit messages:

```
feat: add new image provider for Flux
fix: scene node drag handler type error
docs: update API reference in README
```

### Before submitting a PR

1. **Backend** — ensure the server starts without errors:
   ```bash
   python -m uvicorn api.server:app --port 8000
   ```

2. **Frontend** — ensure TypeScript compiles cleanly:
   ```bash
   cd ui && npm run build
   ```

3. **No secrets** — never commit API keys or `.env` files.

4. **Test your changes** — manually verify the feature works end-to-end.

---

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Verify build passes (both backend + frontend)
4. Open a PR with a clear description of what changed and why
5. Link any related issues

---

## Adding a New Image/Video Provider

OpenFrame uses a plugin pattern for media generation:

1. Create a new file in `api/services/image_gen/` (e.g., `my_provider.py`)
2. Implement the `ImageProvider` base class from `base.py`
3. Register it in `registry.py`
4. The frontend will auto-detect it via `/api/image/models`

---

## Adding a New AI Agent

1. Create `src/agents/agent_N_name.py` following existing patterns
2. Add it to the LangGraph workflow in `src/graph.py`
3. Add its output key mapping in `api/services/runner.py`
4. Update the frontend `AgentDeck` component and store

---

## Code Style

- **Python**: Follow PEP 8. Use type hints.
- **TypeScript/React**: Follow existing patterns. Use functional components with hooks.
- **CSS**: Tailwind utility classes. No custom CSS unless absolutely necessary.
- **No comments removal**: Don't remove existing comments when editing files.

---

## Reporting Issues

When filing an issue, include:

1. What you expected to happen
2. What actually happened
3. Steps to reproduce
4. Browser + OS version
5. Console errors (if any)

---

## License

By contributing, you agree that your contributions will be licensed under the [Sustainable Use License](LICENSE).
