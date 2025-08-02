#!/bin/bash

# Clean Rebuild Script for Next.js

echo "🧼 Cleaning up previous build files..."
rm -rf .next
rm -rf node_modules
rm -f package-lock.json

echo "📦 Reinstalling dependencies..."
npm install

echo "🚧 Rebuilding and starting the dev server..."
npm run dev &

echo ""
echo "🌐 Project is restarting at: http://localhost:3000"
echo "🧠 Reminder: Do a hard refresh (Ctrl+Shift+R) in your browser after it loads."
echo "🧹 If you had a service worker, unregister it from DevTools > Application > Service Workers."

exit 0
