# Security Policy

## Reporting Vulnerabilities

If you discover a security vulnerability in OpenFrame AI, please report it responsibly:

1. **Do NOT** open a public GitHub issue
2. Email: **security@openframe.ai** (or open a private security advisory on GitHub)
3. Include: description, steps to reproduce, and impact assessment
4. We will acknowledge within 48 hours and provide a fix timeline

---

## Security Model

### API Key Handling

OpenFrame AI connects to external services that require API keys. Here's how keys are managed:

| Method | Location | Persistence | Priority |
|---|---|---|---|
| Environment variables | `.env` file | Survives restarts | Lowest (fallback) |
| Runtime settings | `settings.json` | Survives restarts | Highest (overrides env) |
| UI Settings panel | In-app modal | Writes to `settings.json` | Same as above |

**Key principles:**
- `.env` and `settings.json` are both in `.gitignore` — never committed
- Keys are never logged, never sent to the frontend, never included in API responses
- The `/api/settings/keys` endpoint returns only `*_key_set: boolean` and masked previews (`sk-or...****`)
- Keys are stored in plaintext on disk — this is a local-first tool, not a multi-tenant SaaS

### Authentication

- **JWT-based** authentication with configurable secret (`JWT_SECRET_KEY` in `.env`)
- Default dev secret is used if `JWT_SECRET_KEY` is not set — **change this in production**
- Passwords hashed with `bcrypt`
- No email verification (local-first design)

### CORS

- Development default: `allow_origins=["*"]` (all origins)
- For production deployments, restrict to your frontend domain in `api/server.py`

### Data Storage

| Data | Location | Sensitive? |
|---|---|---|
| Projects & workflows | `data/workflows/` (JSON files) | No (user content) |
| API call logs | `data/api_logs.db` (SQLite) | Low (summaries only, no keys) |
| User accounts | `data/api_logs.db` (SQLite) | Medium (hashed passwords) |
| Uploaded images | `uploads/` | No (user content) |
| Generated outputs | `output/` | No (generated media) |
| Runtime API keys | `settings.json` | **Yes** — gitignored |

### Network

- Backend binds to `0.0.0.0:8000` by default (accessible on LAN)
- Frontend connects to backend via `NEXT_PUBLIC_API_URL` (default: `http://localhost:8000`)
- All external API calls go to: OpenRouter, kie.ai, ImgBB, ElevenLabs
- No telemetry, no analytics, no phone-home

---

## Best Practices for Deployment

### Local Development
- Default configuration is safe for local use
- Set your API keys in `.env` or via the UI

### Self-Hosted Server
1. Set `JWT_SECRET_KEY` to a strong random string
2. Restrict CORS origins in `api/server.py`
3. Use HTTPS (reverse proxy with nginx/caddy)
4. Restrict network access (firewall rules)
5. Do NOT expose port 8000 directly to the internet without auth

### Docker
- The `docker-compose.yml` mounts `.env` into the container
- Ensure `.env` file permissions are restricted (`chmod 600 .env`)
- Do NOT bake API keys into Docker images

---

## Supported Versions

| Version | Supported |
|---|---|
| 1.0.x | Yes |
| < 1.0 | No |
