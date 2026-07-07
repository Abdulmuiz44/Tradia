#!/usr/bin/env bash
set -euo pipefail

echo "Installing Tradia Agentic Trading OS..."

# Check for Node.js
if ! command -v node &> /dev/null; then
  echo "Error: Node.js is required. Install it from https://nodejs.org"
  exit 1
fi

# Install from npm
npm install -g @talocode/tradia

echo ""
echo "Tradia v0.1.0 installed successfully!"
echo ""
echo "Quick start:"
echo "  tradia --help"
echo "  tradia propose --symbol XAUUSD --market forex --balance 500 --risk 0.5"
echo ""
echo "⚠️ Not financial advice. Human review required."
