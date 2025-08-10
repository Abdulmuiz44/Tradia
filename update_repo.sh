#!/bin/bash
# 🚀 Auto Git Update Script for Tradia (Frontend + Backend)

# Navigate to project root
cd "$(dirname "$0")"

# Ensure SSH key is loaded
eval "$(ssh-agent -s)"
ssh-add /home/userland/.ssh/id_ed25519

# Check if .git exists
if [ ! -d ".git" ]; then
    echo "❌ This folder is not a Git repository."
    exit 1
fi

# Stage all changes (including submodules)
echo "📦 Staging all changes..."
git add -A
git submodule foreach --recursive 'git add -A'

# Commit with auto-message
echo "📝 Committing changes..."
git commit -m "Auto-update: $(date '+%Y-%m-%d %H:%M:%S')" || echo "⚠️ No changes to commit."

# Push to master
echo "🚀 Pushing to GitHub (master)..."
git push origin master
git submodule foreach --recursive 'git push origin master || true'

echo "✅ Update complete!"
