#!/bin/bash

set -e

echo ""
echo "  Feedback Synthesis"
echo "  ──────────────────"

# Check Node
if ! command -v node &> /dev/null; then
  echo ""
  echo "  ✗ Node.js is not installed."
  echo "    Download it at https://nodejs.org (v18 or higher)"
  echo ""
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo ""
  echo "  ✗ Node.js v18 or higher is required (you have $(node -v))"
  echo "    Download the latest at https://nodejs.org"
  echo ""
  exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo ""
  echo "  Installing dependencies (first run only)..."
  npm install --silent
fi

# Create .env if it doesn't exist (in-app setup wizard fills it in)
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo ""
  echo "  First run: complete setup in the browser when the app opens."
  echo ""
fi

echo ""
echo "  Starting server and client..."
echo "  App will open at http://localhost:5173"
echo ""
echo "  Press Ctrl+C to stop."
echo ""

# Open browser after short delay
(sleep 2 && open "http://localhost:5173" 2>/dev/null || xdg-open "http://localhost:5173" 2>/dev/null || true) &

npm run start
