-- Cleanup script to remove old "New Conversation" entries
-- Keep only conversations with actual messages or recent ones

-- Step 1: See how many "New Conversation" entries exist
SELECT COUNT(*) as total_new_conversations 
FROM conversations 
WHERE title = 'New Conversation';

-- Step 2: See conversations grouped by user
SELECT user_id, title, COUNT(*) as count 
FROM conversations 
WHERE title = 'New Conversation'
GROUP BY user_id, title
ORDER BY count DESC;

-- Step 3: Delete "New Conversation" entries that have NO messages
-- This preserves conversations with actual content
DELETE FROM conversations 
WHERE title = 'New Conversation' 
AND id NOT IN (
  SELECT DISTINCT conversation_id 
  FROM chat_messages
);

-- Step 4: Check remaining conversations
SELECT COUNT(*) as remaining_conversations 
FROM conversations;

-- Step 5: For each user, show their actual conversations (should be much fewer)
SELECT user_id, title, mode, created_at, updated_at, 
  (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = conversations.id) as message_count
FROM conversations 
ORDER BY user_id, updated_at DESC;
