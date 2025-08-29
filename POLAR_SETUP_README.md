# Polar Payment Integration Setup

This guide will help you set up Polar payment integration for your trading platform.

## 🚀 Overview

Polar is a modern payment processing platform that provides:
- Subscription management
- One-time payments
- Webhook handling
- Customer management
- Comprehensive API

## 📋 Prerequisites

1. **Polar Account**: Sign up at [polar.sh](https://polar.sh)
2. **Products Setup**: Create products for your plans in Polar dashboard
3. **Webhook Configuration**: Set up webhook endpoints

## ⚙️ Configuration

### 1. Environment Variables

Add these to your `.env.local` file:

```bash
# Polar Configuration
POLAR_ACCESS_TOKEN=your_polar_access_token
POLAR_SERVER=https://api.polar.sh
POLAR_WEBHOOK_SECRET=your_webhook_secret

# Product IDs (create these in Polar dashboard)
POLAR_PRO_PRODUCT_ID=your_pro_product_id
POLAR_PLUS_PRODUCT_ID=your_plus_product_id
POLAR_ELITE_PRODUCT_ID=your_elite_product_id
```

### 2. Get Your Access Token

1. Go to [Polar Dashboard](https://dashboard.polar.sh)
2. Navigate to **Settings** > **API Keys**
3. Create a new API key with appropriate permissions
4. Copy the token to your environment variables

### 3. Create Products

In your Polar dashboard:

1. Go to **Products** section
2. Create three products:
   - **Pro Plan** - $29/month
   - **Plus Plan** - $79/month
   - **Elite Plan** - $199/month

3. For each product, create a monthly recurring price
4. Copy the Product IDs to your environment variables

### 4. Webhook Setup

1. In Polar dashboard, go to **Webhooks**
2. Create a new webhook with URL: `https://yourdomain.com/api/payments/webhook`
3. Select these events:
   - `subscription.created`
   - `subscription.updated`
   - `subscription.cancelled`
   - `checkout.succeeded`
4. Copy the webhook secret to your environment variables

## 🗄️ Database Schema

You'll need these additional tables for subscription management:

```sql
-- User plans table
CREATE TABLE user_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  plan_type TEXT NOT NULL CHECK (plan_type IN ('free', 'pro', 'plus', 'elite')),
  polar_subscription_id TEXT UNIQUE,
  polar_customer_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add polar_customer_id to users table
ALTER TABLE users ADD COLUMN polar_customer_id TEXT;
```

## 🔧 API Endpoints

The integration provides these endpoints:

### Create Checkout
```
POST /api/payments/create-checkout
```
Creates a Polar checkout session for plan upgrades.

**Request Body:**
```json
{
  "planType": "pro",
  "successUrl": "https://yourdomain.com/dashboard/billing?success=true",
  "cancelUrl": "https://yourdomain.com/dashboard/billing?canceled=true"
}
```

### Get Subscriptions
```
GET /api/payments/subscriptions
```
Retrieves user's current subscriptions.

### Update Subscription
```
PATCH /api/payments/subscriptions
```
Updates or cancels user subscriptions.

### Webhook Handler
```
POST /api/payments/webhook
```
Handles Polar webhook events to sync subscription status.

## 🎯 Plan Configuration

Update your plan configuration in `src/lib/planAccess.ts`:

```typescript
export const PLAN_PRODUCT_IDS = {
  pro: process.env.POLAR_PRO_PRODUCT_ID || '',
  plus: process.env.POLAR_PLUS_PRODUCT_ID || '',
  elite: process.env.POLAR_ELITE_PRODUCT_ID || '',
};
```

## 🔄 User Flow

1. **Free User** sees upgrade prompts throughout the app
2. **Clicks Upgrade** → Redirected to Polar checkout
3. **Completes Payment** → Polar processes payment
4. **Webhook Fires** → Updates user plan in database
5. **User Redirected** → Back to app with new plan features

## 🧪 Testing

### Test Cards (Polar Sandbox)

Use these test cards in sandbox mode:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Require Authentication**: `4000 0025 0000 3155`

### Webhook Testing

1. Use Polar's webhook testing tools
2. Or use ngrok/stripe CLI for local webhook testing
3. Verify subscription status updates correctly

## 🚨 Security Considerations

1. **Webhook Verification**: Always verify webhook signatures in production
2. **Environment Variables**: Never commit API keys to version control
3. **Rate Limiting**: Implement rate limiting on payment endpoints
4. **Error Handling**: Proper error handling for failed payments

## 📊 Monitoring

Monitor these metrics:
- Conversion rates from upgrade prompts
- Failed payment rates
- Subscription churn rates
- Webhook delivery success rates

## 🆘 Troubleshooting

### Common Issues

1. **Webhook not firing**: Check webhook URL and event subscriptions
2. **Plan not updating**: Verify webhook signature and database connection
3. **Checkout failing**: Check product configuration and API keys

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=polar:*
```

## 📚 Additional Resources

- [Polar API Documentation](https://docs.polar.sh)
- [Polar Dashboard](https://dashboard.polar.sh)
- [Webhook Best Practices](https://docs.polar.sh/webhooks)

## 🎉 You're All Set!

Your Polar integration is now ready. Users can upgrade their plans seamlessly, and you'll receive payments directly to your Polar account.

Need help? Check the Polar documentation or reach out to their support team.