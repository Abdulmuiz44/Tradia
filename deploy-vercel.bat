@echo off
REM Vercel Deployment Script for Windows
REM This script helps you set up and deploy to Vercel on Windows

echo 🚀 Setting up Vercel deployment...

REM Check if Vercel CLI is installed
vercel --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Vercel CLI not found. Installing...
    npm install -g vercel
    if %errorlevel% neq 0 (
        echo ❌ Failed to install Vercel CLI. Please install it manually: npm i -g vercel
        pause
        exit /b 1
    )
)

REM Check if user is logged in to Vercel
vercel whoami >nul 2>&1
if %errorlevel% neq 0 (
    echo 🔐 Please login to Vercel:
    vercel login
    if %errorlevel% neq 0 (
        echo ❌ Vercel login failed.
        pause
        exit /b 1
    )
)

REM Check if project is already linked
if exist ".vercel\project.json" (
    echo ✅ Project already linked to Vercel
) else (
    echo 🔗 Linking project to Vercel...
    vercel link
    if %errorlevel% neq 0 (
        echo ❌ Failed to link project to Vercel.
        pause
        exit /b 1
    )
)

REM Build the project to check for errors
echo 📦 Building project...
pnpm run build
if %errorlevel% neq 0 (
    echo ❌ Build failed! Please fix build errors before deploying.
    pause
    exit /b 1
)

echo ✅ Build successful!

REM Deploy to production
echo 🚀 Deploying to Vercel...
vercel --prod
if %errorlevel% neq 0 (
    echo ❌ Deployment failed. Check the error messages above.
    echo You can also deploy manually from the Vercel dashboard.
    echo Make sure your environment variables are set in Vercel dashboard.
    pause
    exit /b 1
)

echo ✅ Deployment successful!
echo 🌐 Your app should now be live at the Vercel URL shown above.
echo ⚠️  IMPORTANT: Make sure to set these environment variables in your Vercel dashboard:
echo    - NEXTAUTH_SECRET
echo    - NEXTAUTH_URL
echo    - DATABASE_URL
echo    - NEXT_PUBLIC_SUPABASE_URL
echo    - NEXT_PUBLIC_SUPABASE_ANON_KEY
echo    - SUPABASE_SERVICE_ROLE_KEY
echo    - GOOGLE_CLIENT_ID
echo    - GOOGLE_CLIENT_SECRET
echo    - JWT_SECRET
echo    - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
echo 📝 You can copy values from your .env file to Vercel dashboard.

pause