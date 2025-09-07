-- Set admin user 'abdulmuizproject@gmail.com' to Elite plan
UPDATE users
SET plan = 'elite'
WHERE email = 'abdulmuizproject@gmail.com';

-- Also update or insert into user_subscriptions table
INSERT INTO user_subscriptions (user_id, plan, status, current_period_start, current_period_end)
SELECT
  id,
  'elite',
  'active',
  NOW(),
  NOW() + INTERVAL '1 year'
FROM users
WHERE email = 'abdulmuizproject@gmail.com'
ON CONFLICT (user_id)
DO UPDATE SET
  plan = 'elite',
  status = 'active',
  current_period_end = NOW() + INTERVAL '1 year',
  updated_at = NOW();

-- Verify the update
SELECT u.email, u.plan, us.status, us.current_period_end
FROM users u
LEFT JOIN user_subscriptions us ON u.id = us.user_id
WHERE u.email = 'abdulmuizproject@gmail.com';