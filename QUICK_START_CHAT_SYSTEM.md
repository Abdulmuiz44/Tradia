# Quick Start: Chat System Guide

## What Was Fixed

Your conversation loading was broken because the API endpoint wasn't properly authenticated. Now it works exactly like ChatGPT/Gemini:

1. **Sidebar with all conversations** - Desktop (always visible) & Mobile (toggle with menu)
2. **Chat history page** - Full-screen view at `/dashboard/trades/history`
3. **Auto-generated titles** - First message automatically creates conversation title
4. **Proper URLs** - Conversations persist with URLs like `/dashboard/trades/chat?id=conv_...`
5. **Conversation management** - Create, delete, rename, pin conversations

## Key URLs

- **Main Chat**: `https://www.tradiaai.app/dashboard/trades/chat`
- **Specific Conversation**: `https://www.tradiaai.app/dashboard/trades/chat?id=conv_710e0606...`
- **Full History**: `https://www.tradiaai.app/dashboard/trades/history`

## User Flow

### Start New Chat
1. Click "New Chat" button in sidebar
2. Get empty chat interface
3. Type first message
4. Conversation ID auto-created and title auto-generated
5. Now appears in sidebar under "Recent"

### Access Previous Chat
1. See conversation in sidebar
2. Click it
3. All previous messages load
4. URL changes to include conversation ID
5. Continue conversation or start fresh

### Browse All Conversations
1. Click "History" button in sidebar
2. See full-screen list of all conversations
3. Search by title if needed
4. Click any to load it
5. Use back button or click another conversation to navigate

## Mobile Experience

### On Mobile
- Menu button (☰) in top-left toggles sidebar
- Sidebar slides in from left with 50% opacity overlay
- Click overlay or conversation to close sidebar
- Click "New Chat" or conversation to navigate
- History works same as desktop

### On Desktop
- Sidebar always visible on left
- Full chat interface on right
- No menu button needed
- Can see conversations while chatting

## What Conversations Include

Each conversation shows:
- **Title**: Auto-generated or edited manually (click to rename)
- **Created Date**: When you started the conversation
- **Last Updated**: When you last messaged
- **Message Count**: How many messages in conversation
- **Pin Status**: Whether it's pinned to top
- **Preview**: Last message text (in history view)

## Managing Conversations

### Pin/Unpin
- Hover over conversation in sidebar
- Click pin icon
- Pinned conversations appear at top

### Rename
- Hover over conversation in sidebar
- Click edit icon
- Type new name
- Press Enter or click elsewhere to save

### Delete
- Hover over conversation in sidebar OR
- View in history page
- Click delete icon
- Confirm deletion
- Conversation removed (can't undo)

## Backend Details

### What Changed
- Fixed API authentication in `/api/conversations/[id]/route.ts`
- Created new layout that manages conversation state
- Added dedicated history page
- Updated sidebar to link to history instead of showing modal

### Files Modified
1. `app/api/conversations/[id]/route.ts` - Fixed admin client usage
2. `app/dashboard/trades/chat/layout.tsx` - NEW
3. `app/dashboard/trades/history/page.tsx` - NEW
4. `app/dashboard/trades/chat/page.tsx` - Simplified
5. `src/components/chat/ConversationsSidebar.tsx` - History link

### No Breaking Changes
- Existing `/api/tradia/ai` endpoint unchanged
- Conversation storage unchanged
- Message persistence unchanged
- Authentication unchanged

## Troubleshooting

### "Conversation not found (404)"
- This was the main issue - FIXED
- If it still happens, try refreshing
- Clear browser cache if needed

### Conversations don't appear in sidebar
- Refresh page (Ctrl+R or Cmd+R)
- Check you're authenticated (see profile in sidebar)
- New conversations appear after first message

### Can't see history
- History button is in sidebar next to "New Chat"
- On mobile, open sidebar first (☰ button)
- History shows all conversations including archived ones

### Mobile sidebar not working
- Click ☰ menu button in top-left
- Should slide in from left
- Click overlay or conversation to close
- Try refreshing if stuck

## Tips & Tricks

1. **Quick Switch**: Use sidebar to jump between conversations instantly
2. **Search**: Use History page search to find old conversations quickly
3. **Organization**: Pin important conversations to keep them on top
4. **Mobile**: Use landscape mode for easier typing on mobile
5. **Refresh Data**: Menu button fetches latest conversations automatically

## API Reference for Developers

```javascript
// Get all user conversations
GET /api/conversations

// Create new conversation
POST /api/conversations
{ "title": "New Conversation", "model": "gpt-4o-mini" }

// Load conversation with messages
GET /api/conversations/conv_...

// Update conversation
PATCH /api/conversations/conv_...
{ "title": "New Title", "pinned": true }

// Delete conversation
DELETE /api/conversations/conv_...

// Send message and get AI response
POST /api/tradia/ai
{
  "conversationId": "conv_...",
  "messages": [{...}],
  "mode": "analysis",
  "attachedTradeIds": [...]
}
```

## Performance Notes

- Sidebar loads all conversations on mount (usually 10-50 items)
- Each conversation loads messages only when clicked
- Search is client-side and instant
- No infinite scroll - all conversations loaded at once
- Mobile sidebar doesn't reload when toggled

## Browser Support

Works on all modern browsers:
- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Security

- All conversations private to logged-in user (RLS policies)
- No conversation visible to other users
- Messages encrypted in transit (HTTPS)
- Database queries check user_id before returning data
