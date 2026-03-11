#!/usr/bin/env bash
# ── OpenFrame AI — Docker Setup Script ────────────────────
# Interactive setup that creates .env and starts Docker Compose.
# Usage: chmod +x docker-setup.sh && ./docker-setup.sh

set -e

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║       OpenFrame AI — Docker Setup     ║"
echo "  ╚══════════════════════════════════════╝"
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
  echo "  ❌ Docker is not installed. Please install Docker first:"
  echo "     https://docs.docker.com/get-docker/"
  exit 1
fi

if ! docker compose version &> /dev/null; then
  echo "  ❌ Docker Compose is not available. Please update Docker."
  exit 1
fi

echo "  ✅ Docker found: $(docker --version | head -1)"
echo ""

# Create .env if it doesn't exist
if [ -f .env ]; then
  echo "  📄 .env file already exists. Skipping creation."
  echo "     (Edit .env manually to change API keys)"
  echo ""
else
  echo "  📄 Creating .env from .env.example..."
  cp .env.example .env
  echo ""

  # Prompt for API keys
  echo "  ── API Keys ──────────────────────────────────"
  echo "  You need at least an OpenRouter key to use AI agents."
  echo "  Get one free at: https://openrouter.ai/keys"
  echo ""

  read -p "  OpenRouter API Key (required): " OPENROUTER_KEY
  if [ -n "$OPENROUTER_KEY" ]; then
    sed -i "s|^OPENROUTER_API_KEY=.*|OPENROUTER_API_KEY=$OPENROUTER_KEY|" .env
  fi

  echo ""
  echo "  kie.ai is needed for image & video generation."
  echo "  Get a key at: https://kie.ai/"
  echo ""

  read -p "  kie.ai API Key (required for media): " KIE_KEY
  if [ -n "$KIE_KEY" ]; then
    sed -i "s|^KIE_API_KEY=.*|KIE_API_KEY=$KIE_KEY|" .env
  fi

  echo ""
  read -p "  ImgBB API Key (recommended, for image hosting): " IMGBB_KEY
  if [ -n "$IMGBB_KEY" ]; then
    sed -i "s|^IMGBB_API_KEY=.*|IMGBB_API_KEY=$IMGBB_KEY|" .env
  fi

  echo ""
  echo "  ✅ .env created with your keys."
  echo ""
fi

# Build and start
echo "  🐳 Building and starting containers..."
echo "     This may take a few minutes on first run."
echo ""

docker compose up --build -d

echo ""
echo "  ╔══════════════════════════════════════╗"
echo "  ║          Setup Complete!              ║"
echo "  ╠══════════════════════════════════════╣"
echo "  ║  Frontend: http://localhost:3030      ║"
echo "  ║  Backend:  http://localhost:8030      ║"
echo "  ║  Health:   http://localhost:8030/api/health  ║"
echo "  ╠══════════════════════════════════════╣"
echo "  ║  Stop:  docker compose down           ║"
echo "  ║  Logs:  docker compose logs -f        ║"
echo "  ╚══════════════════════════════════════╝"
echo ""
