#!/usr/bin/env bash
set -euo pipefail

echo "=== Tradia Agentic Trading OS Demo ==="
echo ""

echo "1. Trade Proposal"
echo "---------------"
tradia propose --symbol XAUUSD --market forex --strategy liquidity_sweep --balance 500 --risk 0.5 --entry 2365.5 --stop 2372 --target 2350
echo ""

echo "2. Risk Check"
echo "------------"
tradia risk --balance 500 --risk 0.5 --entry 2365.5 --stop 2372 --target 2350
echo ""

echo "3. Public Update"
echo "---------------"
echo '{"label":"TRADIA DEMO TRADE","trade":{"symbol":"XAUUSD","direction":"short"},"performance":{"sevenDay":4.2,"twentyEightDay":11.6,"sinceInception":18.4}}' > /tmp/tradia-demo-data.json
tradia public-update --file /tmp/tradia-demo-data.json
echo ""

echo "=== Demo Complete ==="
echo "⚠️ Not financial advice. Human review required."
