# 🚀 Vercel Deployment Guide

This guide will help you deploy your Tradia app to Vercel successfully.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Your code should be pushed to GitHub
3. **Environment Variables**: All required environment variables set

## Quick Deployment (Recommended)

### Option 1: Windows (Batch Script)

The Windows batch script handles everything automatically:

```bash
# Make sure you're in the project directory
cd C:\path\to\your\tradia\project

# Run the deployment script
pnpm run deploy:win
```

This will:
- ✅ Build your project
- ✅ Check Vercel CLI installation
- ✅ Login to Vercel (if needed)
- ✅ Link project to Vercel
- ✅ Deploy to Vercel

### Option 2: Linux/Mac (Shell Script)

The updated `git-auto.sh` script now includes Vercel deployment:

```bash
# Make sure you're in the project directory
cd /path/to/your/tradia/project

# Run the deployment script
./git-auto.sh "Deploy to production"
```

This will:
- ✅ Build your project
- ✅ Commit and push changes
- ✅ Deploy to Vercel (if Vercel CLI is installed)

### Option 3: Cross-Platform (Package Scripts)

Use the npm/pnpm scripts which work on any platform:

```bash
# For Windows (Batch)
pnpm run deploy:win

# For Windows (PowerShell)
pnpm run deploy:ps

# For Linux/Mac
pnpm run deploy

# Direct Vercel deployment (any platform)
pnpm run deploy:vercel
```

### Option 4: Direct Script Execution

Run the scripts directly:

```bash
# Windows Batch
./deploy-vercel.bat

# Windows PowerShell
./deploy-vercel.ps1

# Linux/Mac Shell
./deploy-vercel.sh
```

## Manual Deployment Steps

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Link Your Project

```bash
vercel link
```

### Step 4: Set Environment Variables

Go to your Vercel dashboard or use the CLI:

```bash
# Set environment variables (replace with your actual values)
vercel env add NEXTAUTH_SECRET
vercel env add NEXTAUTH_URL
vercel env add DATABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add GOOGLE_CLIENT_ID
vercel env add GOOGLE_CLIENT_SECRET
vercel env add JWT_SECRET
vercel env add SMTP_HOST
vercel env add SMTP_PORT
vercel env add SMTP_USER
vercel env add SMTP_PASS
```

### Step 5: Deploy

```bash
# Deploy to production
vercel --prod
```

## Required Environment Variables

Copy these from your `.env` file to Vercel dashboard:

### Authentication
- `NEXTAUTH_SECRET` - Random secret for NextAuth
- `NEXTAUTH_URL` - Your Vercel app URL (e.g., https://your-app.vercel.app)
- `JWT_SECRET` - JWT signing secret

### Database
- `DATABASE_URL` - PostgreSQL connection string
- `DB_USER` - Database username
- `DB_PASSWORD` - Database password
- `DB_HOST` - Database host
- `DB_PORT` - Database port (usually 5432)
- `DB_NAME` - Database name

### Supabase
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key

### Google OAuth
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_CALLBACK_URL` - OAuth callback URL

### Email
- `SMTP_HOST` - SMTP server (e.g., smtp.gmail.com)
- `SMTP_PORT` - SMTP port (465 for SSL)
- `SMTP_USER` - Email username
- `SMTP_PASS` - Email app password
- `FROM_EMAIL` - From email address

### Application
- `NEXT_PUBLIC_BASE_URL` - Your Vercel app URL

## Troubleshooting

### Windows Script Execution Error
If you get "'./deploy-vercel.sh' is not recognized" error:

**Solutions**:

1. **Use the Windows batch script**:
   ```bash
   pnpm run deploy:win
   ```

2. **Run the batch file directly**:
   ```bash
   deploy-vercel.bat
   ```

3. **Use PowerShell script**:
   ```bash
   pnpm run deploy:ps
   ```

4. **Run PowerShell script directly**:
   ```bash
   ./deploy-vercel.ps1
   ```

**Note**: Windows doesn't execute `.sh` files by default. Use the Windows-specific scripts (`.bat` or `.ps1`) instead.

### Build Fails
1. Check that all dependencies are installed: `pnpm install`
2. Run build locally: `pnpm run build`
3. Fix any TypeScript or build errors

### Environment Variables Missing
1. Go to Vercel dashboard → Your project → Settings → Environment Variables
2. Add all required variables listed above
3. Redeploy the project

### Database Connection Issues
1. Ensure your DATABASE_URL is correct
2. Check that your database allows connections from Vercel IPs
3. Verify database credentials are correct

### Authentication Issues
1. Ensure NEXTAUTH_URL matches your Vercel domain exactly
2. Check that Google OAuth callback URL is set correctly
3. Verify NEXTAUTH_SECRET is a secure random string

## File Structure

Make sure these files are properly configured:

- `vercel.json` - Vercel configuration (already updated)
- `next.config.mjs` - Next.js configuration
- `package.json` - Dependencies and scripts
- `.env.example` - Environment variables template

## Security Notes

⚠️ **Important**: Never commit your `.env` file to version control. It contains sensitive information like database passwords and API keys.

The `.env` file is already in `.gitignore`, but double-check that sensitive data isn't accidentally committed.

## Support

If you encounter issues:

1. Check Vercel deployment logs in the dashboard
2. Verify all environment variables are set
3. Ensure your build passes locally
4. Check that your database is accessible from Vercel

## Alternative Deployment

If you prefer not to use the CLI, you can:

1. Connect your GitHub repository to Vercel dashboard
2. Set environment variables in the Vercel dashboard
3. Deploy directly from the Vercel web interface

The automated scripts above will handle most of the setup for you!