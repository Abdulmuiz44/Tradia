# Tradia AI Chat Feature

## Overview

Tradia AI Chat is a production-ready, ChatGPT-style conversational interface that allows traders to chat with their trading data. The AI has access to complete trading history and provides contextual analysis and advice. **Now supports guest users and users with no trade history!**

## Features

- **Conversational AI**: Chat with OpenAI GPT models about your trading performance
- **Guest Mode Support**: Users can chat without authentication for general trading advice
- **Zero-Trade Support**: AI provides helpful guidance even when there are no trades in history
- **Context-Aware Responses**: AI analyzes attached trades and account summary for personalized advice
- **Trade Attachment**: Drag-and-drop trades from the right panel to include in conversations
- **Real-time Streaming**: Responses stream in real-time for better UX
- **Conversation Management**: Create, rename, pin, and export conversations
- **Trade Picker**: Filterable and searchable trade selection with summary statistics
- **Mobile-Optimized**: Enhanced input behavior prevents auto-closing on mobile devices
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Recent Updates (November 2025)

### Mobile Input Fix
- Fixed issue where chat input would automatically close on mobile devices
- Added touch-optimized handlers and focus management
- Improved keyboard behavior on iOS and Android

### Guest User Support
- Users can now chat without authentication
- AI provides general trading advice and education
- Local conversation management for guest users
- Seamless upgrade path to authenticated experience

### Zero-Trade Handling
- AI provides contextual responses when users have no trades
- Encourages users to add trades manually or import history
- Explains benefits of having trade data for personalized insights
- Still answers general trading questions and strategies

## Setup

### Environment Variables

Create a `.env.local` file in the project root:

```bash
OPENAI_API_KEY=your_openai_api_key_here
```

Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys).

### Dependencies

The following packages are already included:
- `@radix-ui/react-checkbox`
- `openai` (server-side only)
- `lucide-react` for icons

### Running the Application

1. Install dependencies: `pnpm install`
2. Set up environment variables as above
3. Start the development server: `pnpm dev`
4. Navigate to `/chat`

## API Endpoints

### Authentication Optional

The chat now works for both authenticated and guest users:

- **Authenticated Users**: Get full features including conversation persistence, trade analysis, and personalized insights
- **Guest Users**: Can chat for general trading advice and education without signing up

- `GET /api/trades` - Fetch user's trades with filtering (authenticated)
- `GET /api/trades/summary` - Get aggregated trading statistics (authenticated)
- `POST /api/trades/select` - Select specific trades for analysis (authenticated)
- `POST /api/tradia/ai` - Chat with AI (works for both guest and authenticated users)

## Component Structure

```
src/app/chat/page.tsx                 # Main page
src/components/chat/
├── ChatLayout.tsx                    # Main layout (sidebar + chat + picker)
├── ConversationsSidebar.tsx          # Left panel for conversations
├── ChatArea.tsx                      # Center chat interface
├── MessageBubble.tsx                 # Individual message display
├── TradePickerPanel.tsx              # Right panel for trade selection
└── TypingIndicator.tsx               # Loading animation
```

## Demo Data

Sample trades are available in `/dev-demos/trades.json` for testing purposes.

## Security

- OpenAI API key is server-side only, never exposed to client
- All inputs are sanitized
- Rate limiting should be implemented for production
- User data is encrypted at rest
- Guest conversations are ephemeral and not persisted to database
- Authentication is optional but recommended for full features

## Development Notes

- Streaming responses use SSE (Server-Sent Events)
- Trade data is decrypted on-demand for performance
- UI uses Tailwind CSS with dark theme
- Components are fully accessible with ARIA attributes
- Mobile-optimized with touch handlers and focus management
- Guest mode uses client-side state management
- Authenticated mode persists to Supabase database

## Testing

Run tests with:
```bash
pnpm test
```

Current test coverage includes API route mocking and component interactions.

## Deployment

Ensure `OPENAI_API_KEY` is set in production environment variables. The application is ready for Vercel, Railway, or similar platforms.
