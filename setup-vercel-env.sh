#!/bin/bash

# Script to help set up Vercel environment variables
# Run this after installing Vercel CLI and logging in

echo "🔧 Setting up Vercel environment variables..."
echo "Make sure you have your .env file ready with the correct values."
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found! Please create it first."
    echo "   You can copy from .env.example:"
    echo "   cp .env.example .env"
    echo "   Then edit .env with your actual values."
    exit 1
fi

echo "📋 The following environment variables will be set in Vercel:"
echo ""

# Read and display environment variables (excluding comments and empty lines)
grep -v '^#' .env | grep -v '^$' | while IFS='=' read -r key value; do
    if [[ $key == NEXTAUTH_* ]] || [[ $key == DATABASE_URL ]] || [[ $key == NEXT_PUBLIC_SUPABASE_* ]] || [[ $key == SUPABASE_SERVICE_ROLE_KEY ]] || [[ $key == GOOGLE_CLIENT_* ]] || [[ $key == JWT_SECRET ]] || [[ $key == SMTP_* ]] || [[ $key == NEXT_PUBLIC_BASE_URL ]] || [[ $key == STRIPE_* ]]; then
        echo "   ✅ $key"
    fi
done

echo ""
echo "⚠️  IMPORTANT: This script will set PRODUCTION environment variables."
echo "   Make sure these values are correct for production use!"
echo ""

read -p "Do you want to proceed with setting up these environment variables? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Setup cancelled."
    exit 1
fi

echo ""
echo "🚀 Setting environment variables..."

# Set environment variables
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    [[ $key =~ ^# ]] && continue
    [[ -z $key ]] && continue

    # Remove quotes from value if present
    value=$(echo "$value" | sed 's/^"\(.*\)"$/\1/' | sed "s/^'\(.*\)'$/\1/")

    if [[ $key == NEXTAUTH_* ]] || [[ $key == DATABASE_URL ]] || [[ $key == NEXT_PUBLIC_SUPABASE_* ]] || [[ $key == SUPABASE_SERVICE_ROLE_KEY ]] || [[ $key == GOOGLE_CLIENT_* ]] || [[ $key == JWT_SECRET ]] || [[ $key == SMTP_* ]] || [[ $key == NEXT_PUBLIC_BASE_URL ]] || [[ $key == STRIPE_* ]]; then
        echo "   Setting $key..."
        echo "$value" | vercel env add "$key" production
    fi
done < .env

echo ""
echo "✅ Environment variables setup complete!"
echo ""
echo "🌐 You can now deploy with:"
echo "   ./deploy-vercel.sh"
echo "   or"
echo "   pnpm run deploy"
echo ""
echo "📝 Don't forget to:"
echo "   1. Verify all environment variables are set correctly in Vercel dashboard"
echo "   2. Check that your database allows connections from Vercel"
echo "   3. Test your deployed application"