# Growth Pulse Analytics System

## Overview
Growth Pulse is Tradia's comprehensive user activity tracking system that stores all user interaction data securely in Supabase. This system helps understand user behavior, improve UX, and make data-driven decisions.

## Architecture

### Components

1. **ActivityTracker** (`src/components/analytics/ActivityTracker.tsx`)
   - Client-side component that tracks user interactions
   - Automatically tracks page views, actions, and time-on-page
   - Runs on every page via the root layout

2. **Track API** (`src/app/api/analytics/track/route.ts`)
   - Server-side endpoint that receives tracking data
   - Validates and enriches data with server-side metadata
   - Stores data in Supabase `page_activity` table

3. **Database Tables** (Supabase)
   - `page_activity`: Stores all individual tracking events
   - `user_sessions`: Aggregated session-level data
   - `analytics_summary`: View for daily metrics

## Data Collection

### Tracked Events

#### 1. Page Views
```typescript
{
  type: 'page_view',
  path: '/dashboard',
  referrer: 'https://google.com',
  sessionId: 'abc123...',
  viewport: { w: 1920, h: 1080 },
  tz: 'America/New_York'
}
```

#### 2. User Actions
```typescript
{
  type: 'action',
  name: 'button_click',
  path: '/dashboard',
  meta: { button: 'upgrade', plan: 'plus' }
}
```

#### 3. Page Duration
```typescript
{
  type: 'page_duration',
  path: '/dashboard',
  durationMs: 45000
}
```

### Automatic Data Enrichment

The API automatically adds:
- `user_id`: From NextAuth session
- `user_email`: From NextAuth session
- `user_agent`: Browser information
- `ip`: User's IP address (anonymized if needed)
- `created_at`: Timestamp

## Usage

### Tracking Custom Actions

Add `data-track` attribute to any element:

```tsx
<button data-track="upgrade_clicked" data-track-meta='{"plan":"plus"}'>
  Upgrade to Plus
</button>
```

### Tracking in Components

```tsx
// The ActivityTracker automatically handles:
// - Page views on route changes
// - Time spent on each page
// - Clicks on elements with data-track attribute
// - Session correlation
```

## Database Schema

### page_activity Table

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| type | TEXT | Event type: page_view, action, page_duration |
| path | TEXT | URL path |
| name | TEXT | Action name (for type='action') |
| referrer | TEXT | Referrer URL |
| meta | JSONB | Additional metadata |
| duration_ms | INTEGER | Duration in milliseconds |
| session_id | TEXT | Client session identifier |
| viewport_w | INTEGER | Viewport width |
| viewport_h | INTEGER | Viewport height |
| tz | TEXT | User timezone |
| user_id | TEXT | User ID (if authenticated) |
| user_email | TEXT | User email (if authenticated) |
| user_agent | TEXT | Browser user agent |
| ip | TEXT | User IP address |
| created_at | TIMESTAMPTZ | Event timestamp |

### user_sessions Table

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| session_id | TEXT | Unique session identifier |
| user_id | TEXT | User ID (if authenticated) |
| user_email | TEXT | User email |
| first_seen | TIMESTAMPTZ | First activity in session |
| last_seen | TIMESTAMPTZ | Last activity in session |
| page_views | INTEGER | Total page views |
| actions | INTEGER | Total actions |
| total_duration_ms | BIGINT | Total time spent |
| device_type | TEXT | Device type |
| browser | TEXT | Browser name |
| os | TEXT | Operating system |
| country | TEXT | Country |
| city | TEXT | City |
| referrer | TEXT | Initial referrer |
| landing_page | TEXT | First page visited |
| exit_page | TEXT | Last page visited |
| created_at | TIMESTAMPTZ | Session start |
| updated_at | TIMESTAMPTZ | Last update |

## Querying Analytics Data

### Get user activity for a specific user
```sql
SELECT * FROM page_activity
WHERE user_id = 'user_123'
ORDER BY created_at DESC
LIMIT 100;
```

### Get daily summary
```sql
SELECT * FROM analytics_summary
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY date DESC;
```

### Get most visited pages
```sql
SELECT path, COUNT(*) as visits
FROM page_activity
WHERE type = 'page_view'
  AND created_at >= NOW() - INTERVAL '7 days'
GROUP BY path
ORDER BY visits DESC
LIMIT 10;
```

### Get average session duration
```sql
SELECT 
  AVG(total_duration_ms / 1000.0 / 60.0) as avg_minutes
FROM user_sessions
WHERE created_at >= NOW() - INTERVAL '7 days';
```

### Get user engagement metrics
```sql
SELECT 
  user_id,
  COUNT(DISTINCT session_id) as sessions,
  COUNT(*) FILTER (WHERE type = 'page_view') as page_views,
  COUNT(*) FILTER (WHERE type = 'action') as actions,
  SUM(duration_ms) / 1000.0 / 60.0 as total_minutes
FROM page_activity
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND user_id IS NOT NULL
GROUP BY user_id
ORDER BY total_minutes DESC;
```

## Privacy & Compliance

### Data Retention
- Default retention: 90 days
- Use `clean_old_analytics_data(days)` function to clean old data
- Example: `SELECT clean_old_analytics_data(90);`

### GDPR Compliance
To delete a user's analytics data:
```sql
DELETE FROM page_activity WHERE user_id = 'user_to_delete';
DELETE FROM user_sessions WHERE user_id = 'user_to_delete';
```

### IP Anonymization
Consider anonymizing IP addresses before storage:
```typescript
// In track/route.ts
const anonymizeIP = (ip: string) => {
  const parts = ip.split('.');
  return parts.slice(0, 3).join('.') + '.0';
};
```

## Performance Considerations

### Indexes
The migration creates indexes on:
- `user_id` - Fast user-specific queries
- `session_id` - Fast session lookups
- `type` - Fast filtering by event type
- `created_at` - Fast time-range queries
- Composite indexes for common query patterns

### Batch Processing
For high-traffic applications, consider:
1. Batching events on the client
2. Using a queue system (Redis, RabbitMQ)
3. Async processing with workers

## Monitoring

### Key Metrics to Track
1. **Event Volume**: Events per minute/hour/day
2. **API Latency**: Response time of /api/analytics/track
3. **Error Rate**: Failed tracking requests
4. **Database Size**: Growth of page_activity table
5. **Session Duration**: Average time users spend

### Alerts
Set up alerts for:
- Sudden drop in tracking events (tracking broken?)
- High error rates (API issues?)
- Database size exceeding threshold
- Unusual traffic patterns

## Migration

To set up the database tables, run the migration:

```bash
# Using Supabase CLI
supabase db push

# Or manually in Supabase SQL Editor
# Copy and paste the contents of database/migrations/create_analytics_tables.sql
```

## Environment Variables

Required environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Testing

### Test Tracking Locally
1. Open browser DevTools Network tab
2. Navigate through the app
3. Look for POST requests to `/api/analytics/track`
4. Check Supabase dashboard for new rows in `page_activity`

### Test Custom Actions
```tsx
<button 
  data-track="test_action" 
  data-track-meta='{"test": true}'
  onClick={() => console.log('Testing tracking')}
>
  Test Button
</button>
```

## Troubleshooting

### Events Not Being Tracked
1. Check browser console for errors
2. Verify API endpoint is accessible
3. Check Supabase service role key
4. Verify RLS policies allow inserts

### High Database Load
1. Review and optimize indexes
2. Implement data retention policy
3. Consider archiving old data
4. Use connection pooling

### Missing User Data
1. Verify NextAuth session is working
2. Check session cookie configuration
3. Ensure authOptions is correctly imported

## Future Enhancements

Potential improvements:
1. Real-time dashboard for analytics
2. Funnel analysis
3. A/B testing integration
4. Heatmap generation
5. User journey visualization
6. Predictive analytics
7. Export to data warehouse
8. Integration with external analytics tools

## Support

For issues or questions:
- Check Supabase logs
- Review API route logs
- Contact: support@tradiaai.app