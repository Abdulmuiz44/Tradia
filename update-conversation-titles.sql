-- Update conversation titles based on first message content

-- Step 1: Update each chat_ conversation with a better title
UPDATE conversations c
SET title = CASE
  WHEN cm.content ILIKE '%strategy%' THEN 'Trade Analysis: Strategy'
  WHEN cm.content ILIKE '%win%' OR cm.content ILIKE '%loss%' THEN 'Trade Analysis: Performance'
  WHEN cm.content ILIKE '%risk%' THEN 'Risk Management Discussion'
  WHEN cm.content ILIKE '%psychology%' THEN 'Psychology & Mindset'
  WHEN cm.content ILIKE '%entry%' OR cm.content ILIKE '%exit%' THEN 'Entry & Exit Analysis'
  WHEN cm.content ILIKE '%help%' THEN 'Trading Help'
  WHEN cm.content ILIKE '%analyze%' OR cm.content ILIKE '%analysis%' THEN 'Trade Analysis'
  ELSE 'Trading Discussion'
END
FROM (
  -- Get first message for each conversation
  SELECT DISTINCT ON (conversation_id) 
    conversation_id, 
    content
  FROM chat_messages
  WHERE type = 'user'
  ORDER BY conversation_id, created_at ASC
) cm
WHERE c.id = cm.conversation_id
AND c.id LIKE 'chat_%'
AND c.title = 'New Conversation';

-- Step 2: Check updated titles
SELECT id, title, 
  (SELECT COUNT(*) FROM chat_messages WHERE conversation_id = conversations.id) as message_count
FROM conversations 
WHERE id LIKE 'chat_%'
ORDER BY updated_at DESC
LIMIT 20;

-- Step 3: Check how many were updated
SELECT COUNT(*) as updated_conversations
FROM conversations
WHERE id LIKE 'chat_%'
AND title != 'New Conversation';
