-- Check for old format conversations (chat_ prefix)

-- Step 1: See if there are any chat_ prefix conversations
SELECT COUNT(*) as chat_prefix_count
FROM conversations 
WHERE id LIKE 'chat_%';

-- Step 2: See details of these conversations
SELECT id, user_id, title, created_at,
  (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = conversations.id) as message_count
FROM conversations 
WHERE id LIKE 'chat_%'
ORDER BY created_at DESC
LIMIT 20;

-- Step 3: Check conv_ prefix conversations
SELECT COUNT(*) as conv_prefix_count
FROM conversations 
WHERE id LIKE 'conv_%';

-- Step 4: Summary
SELECT 
  (SELECT COUNT(*) FROM conversations WHERE id LIKE 'chat_%') as old_format_conversations,
  (SELECT COUNT(*) FROM conversations WHERE id LIKE 'conv_%') as new_format_conversations,
  COUNT(*) as total_conversations
FROM conversations;
