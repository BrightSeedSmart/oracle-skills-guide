#!/usr/bin/env bash
# Oracle + Octogent launcher
# Usage: bash .octogent/start.sh

ORACLE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OCTOGENT_DIR="$ORACLE_ROOT/ψ/lab/octogent"

echo "🐙 Starting Octogent..."
echo "   API  → http://localhost:8787"
echo "   Web  → http://localhost:5173"
echo "   Oracle Dashboard → http://localhost:3000"
echo ""

# Point octogent to Oracle project root
export OCTOGENT_PROJECT_ROOT="$ORACLE_ROOT"

cd "$OCTOGENT_DIR"

# Run API + Web concurrently
if command -v pnpm &>/dev/null; then
  pnpm dev
else
  echo "ERROR: pnpm not found. Run: npm install -g pnpm"
  exit 1
fi
