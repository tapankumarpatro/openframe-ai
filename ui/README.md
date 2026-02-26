# OpenFrame AI — Frontend

The React-based frontend for OpenFrame AI, built with **Next.js 16**, **React Flow**, and **Tailwind CSS v4**.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000 (requires backend running on port 8000).

## Tech Stack

| Library | Purpose |
|---|---|
| Next.js 16 (App Router) | Framework + routing |
| React 19 | UI library |
| React Flow (`@xyflow/react`) | Visual canvas for ad composition |
| Zustand | Global state management |
| Tailwind CSS v4 | Utility-first styling |
| Framer Motion | Animations |
| Lucide React | Icon system |

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   └── page.tsx            # Single-page app entry
├── components/
│   ├── canvas/             # React Flow canvas
│   │   ├── DirectorCanvas.tsx   # Main canvas container
│   │   └── nodes/
│   │       ├── AssetNode.tsx    # Asset cards (character, product, etc.)
│   │       ├── SceneNode.tsx    # Scene cards (start/end frames + video)
│   │       └── TalkingCard.tsx  # Talking-head video cards
│   ├── agents/             # AgentDeck sidebar (7 AI agents)
│   ├── projects/           # Projects list page
│   ├── settings/           # Settings modal + API key management
│   ├── auth/               # Login/signup forms
│   ├── overlay/            # Modals (ProjectStart, Export, etc.)
│   └── ui/                 # Shared components (3D folders, etc.)
├── lib/
│   ├── store.ts            # Zustand store (all app state + actions)
│   ├── api.ts              # Backend API client (fetch wrappers)
│   ├── utils.ts            # Tailwind cn() helper
│   └── imageUtils.ts       # Client-side image compression
└── types/
    └── schema.ts           # TypeScript interfaces (KeyItem, Scene, etc.)
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend API base URL |

Set via `.env.local` or Docker build arg.

## Scripts

```bash
npm run dev       # Development server (hot reload)
npm run build     # Production build
npm run start     # Start production server
npm run lint      # ESLint check
```

## Docker

```bash
docker build -t openframe-ui \
  --build-arg NEXT_PUBLIC_API_URL=http://your-backend:8000 .
docker run -p 3000:3000 openframe-ui
```
