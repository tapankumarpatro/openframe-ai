#!/usr/bin/env bash
# ── OpenFrame AI — Start Both Backend + Frontend ──────────
# Usage: ./start.sh
# Stop:  Ctrl+C (kills both processes)

set -e

echo ""
echo "  OpenFrame AI — Starting..."
echo "  Backend:  http://localhost:8030"
echo "  Frontend: http://localhost:3030"
echo ""

# Activate venv if it exists
if [ -d "venv" ]; then
  source venv/bin/activate
fi

# Start backend in background
python -m uvicorn api.server:app --host 0.0.0.0 --port 8030 --reload &
BACKEND_PID=$!

# Start frontend in background
(cd ui && npm run dev) &
FRONTEND_PID=$!

echo "  Backend PID:  $BACKEND_PID"
echo "  Frontend PID: $FRONTEND_PID"
echo ""
echo "  Press Ctrl+C to stop both..."
echo ""

# Cleanup on exit
cleanup() {
  echo ""
  echo "  Stopping..."
  kill $BACKEND_PID 2>/dev/null || true
  kill $FRONTEND_PID 2>/dev/null || true
  wait $BACKEND_PID 2>/dev/null || true
  wait $FRONTEND_PID 2>/dev/null || true
  echo "  Done."
}

trap cleanup EXIT INT TERM

# Wait for either to exit
wait
