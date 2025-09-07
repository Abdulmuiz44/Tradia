# PowerShell script for Vercel deployment
# Run this script to deploy your Tradia app to Vercel

Write-Host "🚀 Setting up Vercel deployment..." -ForegroundColor Green

# Check if Vercel CLI is installed
try {
    $vercelVersion = vercel --version 2>$null
    Write-Host "✅ Vercel CLI found: $vercelVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Vercel CLI not found. Installing..." -ForegroundColor Yellow
    npm install -g vercel
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install Vercel CLI. Please install it manually: npm i -g vercel" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Check if user is logged in to Vercel
try {
    vercel whoami >$null 2>&1
    Write-Host "✅ Already logged in to Vercel" -ForegroundColor Green
} catch {
    Write-Host "🔐 Please login to Vercel:" -ForegroundColor Yellow
    vercel login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Vercel login failed." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Check if project is already linked
if (Test-Path ".vercel\project.json") {
    Write-Host "✅ Project already linked to Vercel" -ForegroundColor Green
} else {
    Write-Host "🔗 Linking project to Vercel..." -ForegroundColor Yellow
    vercel link
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to link project to Vercel." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Build the project to check for errors
Write-Host "📦 Building project..." -ForegroundColor Yellow
pnpm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed! Please fix build errors before deploying." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Build successful!" -ForegroundColor Green

# Deploy to production
Write-Host "🚀 Deploying to Vercel..." -ForegroundColor Yellow
vercel --prod
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed. Check the error messages above." -ForegroundColor Red
    Write-Host "You can also deploy manually from the Vercel dashboard." -ForegroundColor Yellow
    Write-Host "Make sure your environment variables are set in Vercel dashboard." -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✅ Deployment successful!" -ForegroundColor Green
Write-Host "🌐 Your app should now be live at the Vercel URL shown above." -ForegroundColor Green
Write-Host "" -ForegroundColor White
Write-Host "⚠️  IMPORTANT: Make sure to set these environment variables in your Vercel dashboard:" -ForegroundColor Yellow
Write-Host "   - NEXTAUTH_SECRET" -ForegroundColor White
Write-Host "   - NEXTAUTH_URL" -ForegroundColor White
Write-Host "   - DATABASE_URL" -ForegroundColor White
Write-Host "   - NEXT_PUBLIC_SUPABASE_URL" -ForegroundColor White
Write-Host "   - NEXT_PUBLIC_SUPABASE_ANON_KEY" -ForegroundColor White
Write-Host "   - SUPABASE_SERVICE_ROLE_KEY" -ForegroundColor White
Write-Host "   - GOOGLE_CLIENT_ID" -ForegroundColor White
Write-Host "   - GOOGLE_CLIENT_SECRET" -ForegroundColor White
Write-Host "   - JWT_SECRET" -ForegroundColor White
Write-Host "   - SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "📝 You can copy values from your .env file to Vercel dashboard." -ForegroundColor Cyan

Read-Host "Press Enter to exit"