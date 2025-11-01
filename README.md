# Tradia - AI-Powered Trading Assistant

A modern trading platform with AI chat assistance, built with Next.js, Supabase, and OpenAI.

## 🚀 Features

- **AI Chat Assistant**: Get trading insights with Grok AI
- **Plan-based Limits**: Free, Pro, Plus, and Elite tiers
- **Real-time Usage Tracking**: Monitor daily limits and usage
- **File Upload Support**: Upload charts and get AI analysis
- **Offline Support**: Queue messages when offline
- **Responsive Design**: Works on all devices

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account
- OpenAI API key (for AI chat)
- Stripe account (for payments, optional)

## 🛠 Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd tradia
npm install
```

### 2. Environment Variables

Copy the example environment file and fill in your values:

```bash
cp .env.example .env.local
```

Fill in the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Admin Configuration
NEXT_PUBLIC_ADMIN_EMAIL=your_admin_email@example.com
```

### 3. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)

2. Go to Settings > API and copy your project URL and API keys

3. Run the database schema:

   **Step 1: Create Tables**
   - Go to Supabase Dashboard > SQL Editor
   - Copy the contents of `supabase-minimal.sql` and run it
   - This creates the basic tables and storage bucket

   **Step 2: Create Policies**
   - Copy the contents of `create-policies.sql` and run it
   - This creates all Row Level Security policies automatically

**If you still get errors with the automated scripts, you can manually create policies through the UI:**

Go to **Authentication > Policies** in Supabase dashboard and create the policies listed in `create-policies.sql`.

**If you still get errors, try running in smaller chunks:**

   **Chunk 1 - Tables:**
   ```sql
   -- Create custom types
   CREATE TYPE user_plan AS ENUM ('free', 'pro', 'plus', 'elite');
   CREATE TYPE message_type AS ENUM ('user', 'assistant');
   CREATE TYPE assistant_mode AS ENUM ('coach', 'grok');

   -- Create tables
   CREATE TABLE public.users (...);
   CREATE TABLE public.chat_messages (...);
   CREATE TABLE public.file_uploads (...);
   CREATE TABLE public.usage_stats (...);
   CREATE TABLE public.trades (...);

   -- Create indexes
   CREATE INDEX idx_chat_messages_user_id ON public.chat_messages(user_id);
   -- ... other indexes
   ```

   **Chunk 2 - RLS:**
   ```sql
   ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.usage_stats ENABLE ROW LEVEL SECURITY;
   ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
   ```

   **Chunk 3 - Policies (Manual Setup):**
   Since SQL policy creation is failing, create them manually in Supabase:

   1. **Go to Authentication > Policies** in your Supabase dashboard
   2. **For each table**, create these policies:

   **Users Table:**
   - Policy Name: `users_select`
   - Operation: SELECT
   - Using: `(auth.uid() = id)`

   - Policy Name: `users_update`
   - Operation: UPDATE
   - Using: `(auth.uid() = id)`

   **Chat Messages Table:**
   - Policy Name: `chat_select`
   - Operation: SELECT
   - Using: `(auth.uid()::text = user_id::text)`

   - Policy Name: `chat_insert`
   - Operation: INSERT
   - Using: `(auth.uid()::text = user_id::text)`

   - Policy Name: `chat_update`
   - Operation: UPDATE
   - Using: `(auth.uid()::text = user_id::text)`

   - Policy Name: `chat_delete`
   - Operation: DELETE
   - Using: `(auth.uid()::text = user_id::text)`

   **File Uploads Table:**
   - Policy Name: `files_select`
   - Operation: SELECT
   - Using: `(auth.uid() = user_id)`

   - Policy Name: `files_insert`
   - Operation: INSERT
   - Using: `(auth.uid() = user_id)`

4. Create storage bucket (usually auto-created by schema):

   - Go to Storage in your Supabase dashboard
   - The schema script should have created the `chat-uploads` bucket automatically

### 4. OpenAI Setup

1. Get an API key from [OpenAI](https://platform.openai.com/api-keys)
2. Add it to your `.env.local` file

### 5. Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📊 Database Schema

The app uses the following main tables:

- `users` - User profiles and plans
- `chat_messages` - AI conversation history
- `file_uploads` - Uploaded files metadata
- `usage_stats` - Daily usage tracking
- `trades` - Trading history (for context)

## 🔧 Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript checks
```

## 🏗 Project Structure

```
src/
├── components/
│   ├── ai/                 # AI chat components
│   ├── pricing/           # Pricing and upgrade components
│   └── common/            # Shared components (Toast, Skeleton, etc.)
├── contexts/              # React contexts (Toast, User, Trade)
├── lib/                   # Utilities and configurations
├── pages/
│   ├── api/               # API routes
│   └── app/               # Next.js app router (if using)
└── styles/                # Global styles
```

## 🔐 Authentication

The app uses Supabase Auth with email/password authentication. Users can:

- Sign up with email verification
- Sign in/out
- Reset passwords
- Access is controlled by user plans

## 💰 Pricing Plans

| Feature | Free | Pro | Plus | Elite |
|---------|------|-----|------|-------|
| AI Chats/Day | 5 | 50 | 200 | Unlimited |
| File Uploads | ❌ | ✅ | ✅ | ✅ |
| Export Data | ❌ | ✅ | ✅ | ✅ |
| Message History | 30 days | 182 days | 365 days | Unlimited |

## ⚡ Performance & Optimization

The app includes advanced performance optimizations:

### Code Splitting & Lazy Loading
- **Dynamic imports** for heavy components (pricing, chat, modals)
- **Route-based splitting** for faster initial loads
- **Component lazy loading** with Suspense fallbacks
- **Progressive loading** for better UX

### Bundle Analysis
```bash
# Analyze bundle size and dependencies
npm run analyze
```
This generates a visual report at `./analyze/client.html`

### Caching & Compression
- **SWC minification** for faster builds
- **Gzip compression** enabled
- **Smart caching** strategies
- **Image optimization** with Next.js

## 🛡️ Error Handling & Recovery

### Comprehensive Error System
- **Global error boundary** catches React crashes
- **Custom error pages** (404, 500) with retry options
- **API error recovery** with exponential backoff
- **Network status monitoring** with offline detection
- **Toast notifications** for user feedback

### Error Recovery Features
- **Automatic retries** for failed API calls
- **Rate limiting** with user-friendly messages
- **Offline queuing** for messages
- **Graceful degradation** when services are unavailable

### Development Tools
```bash
# Type checking
npm run type-check

# Bundle analysis
npm run analyze

# Code formatting
npm run format
```

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push

### Manual Deployment

```bash
npm run build
npm run start
```

### Performance Monitoring

After deployment, monitor:
- **Core Web Vitals** in Vercel dashboard
- **Bundle size** with `npm run analyze`
- **Error rates** with built-in error boundaries
- **User feedback** via toast notifications

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support, please contact the development team or create an issue in the repository.
