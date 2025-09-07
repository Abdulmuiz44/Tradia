#!/bin/bash

# Usage:
# ./git-auto.sh "commit message"   -> non-interactive with arg
# ./git-auto.sh                     -> interactive prompt
# Or set GIT_MSG env var and run ./git-auto.sh

set -euo pipefail

if [ "$#" -ge 1 ]; then
  message="$*"
elif [ -n "${GIT_MSG:-}" ]; then
  message="$GIT_MSG"
else
  echo "Enter your commit message:"
  read -r message
fi

if [ -z "$message" ]; then
  echo "Aborting: empty commit message" >&2
  exit 1
fi

echo "🚀 Starting deployment process..."

# Build the project first
echo "📦 Building project..."
if ! pnpm run build; then
  echo "❌ Build failed! Please fix build errors before deploying."
  exit 1
fi

echo "✅ Build successful!"

# Add and commit changes
echo "📝 Committing changes..."
git add .
git commit -m "$message" || {
  echo "⚠️  Nothing to commit or commit failed";
}

# Push to GitHub
echo "⬆️  Pushing to GitHub..."
git push origin main

echo "✅ Code pushed successfully to GitHub!"

# Check if Vercel CLI is available and deploy
if command -v vercel &> /dev/null; then
  echo "🚀 Deploying to Vercel..."
  if vercel --prod; then
    echo "✅ Deployment to Vercel successful!"
  else
    echo "❌ Vercel deployment failed. You can also deploy manually from the Vercel dashboard."
    echo "   Make sure your environment variables are set in Vercel dashboard."
  fi
else
  echo "⚠️  Vercel CLI not found. Please install it with: npm i -g vercel"
  echo "   Or deploy manually from the Vercel dashboard."
  echo "   Make sure to set these environment variables in Vercel:"
  echo "   - NEXTAUTH_SECRET"
  echo "   - NEXTAUTH_URL"
  echo "   - DATABASE_URL"
  echo "   - NEXT_PUBLIC_SUPABASE_URL"
  echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY"
  echo "   - SUPABASE_SERVICE_ROLE_KEY"
  echo "   - GOOGLE_CLIENT_ID"
  echo "   - GOOGLE_CLIENT_SECRET"
  echo "   - JWT_SECRET"
  echo "   - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS"
fi

echo "🎉 Deployment process complete!"
