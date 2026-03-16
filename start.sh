#!/usr/bin/env bash
set -e

echo "========================================="
echo "  3G TMS — Batch Rater Setup & Launch"
echo "========================================="
echo

# Check for Node.js
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is not installed."
  echo "Install it from https://nodejs.org (v18+ recommended)"
  exit 1
fi

echo "Node $(node -v) detected"

# Create .env if missing
if [ ! -f .env ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
fi

# Install server dependencies
echo "Installing server dependencies..."
npm install --silent

# Install client dependencies
echo "Installing client dependencies..."
cd client && npm install --silent && cd ..

echo
echo "========================================="
echo "  Starting app..."
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:3001"
echo "========================================="
echo

# Open browser after a short delay
(sleep 3 && \
  if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:5173
  elif command -v open &> /dev/null; then
    open http://localhost:5173
  elif command -v start &> /dev/null; then
    start http://localhost:5173
  fi
) &

# Start both servers
npm run dev
