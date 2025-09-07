#!/bin/bash

# Vercel Deployment Setup Script
# This script helps you set up and deploy to Vercel

set -euo pipefail

echo "🚀 Setting up Vercel deployment..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if user is logged in to Vercel
if ! vercel whoami &> /dev/null; then
    echo "🔐 Please login to Vercel:"
    vercel login
fi

# Check if project is already linked
if [ ! -f ".vercel/project.json" ]; then
    echo "🔗 Linking project to Vercel..."
    vercel link
else
    echo "✅ Project already linked to Vercel"
fi

# Build the project to check for errors
echo "📦 Building project..."
if ! pnpm run build; then
    echo "❌ Build failed! Please fix build errors before deploying."
    exit 1
fi

echo "✅ Build successful!"

# Deploy to production
echo "🚀 Deploying to Vercel production..."
if vercel --prod; then
    echo "✅ Deployment successful!"
    echo ""
    echo "🌐 Your app should now be live at the Vercel URL shown above."
    echo ""
    echo "⚠️  IMPORTANT: Make sure to set these environment variables in your Vercel dashboard:"
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
    echo ""
    echo "📝 You can copy values from your .env file to Vercel dashboard."
else
    echo "❌ Deployment failed. Check the error messages above."
    exit 1
fi