# LemonSqueezy Payment Integration Migration

This document describes the complete migration from Flutterwave to LemonSqueezy for Tradia's payment processing.

## Overview

Tradia has migrated from Flutterwave to LemonSqueezy for all payment processing. LemonSqueezy provides better global payment coverage, improved compliance, and a more reliable checkout experience.

## What Changed

### Removed Components
- `src/lib/flutterwave.server.ts` - Legacy Flutterwave API integration
- Flutterwave inline checkout modal from `app/checkout/page.tsx`
- Flutterwave script loading
- All Flutterwave environment variables and API keys

### New Components Added

#### 1. **LemonSqueezy Server Library** (`src/lib/lemonsqueezy.server.ts`)
- `createCheckoutForPlan()` - Generates LemonSqueezy checkout URLs
- `getOrCreateProductOnLemonSqueezy()` - Manages product/variant mappings
- `verifyWebhookSignature()` - Validates webhook signatures using HMAC-SHA256
- `getSubscriptionDetails()` - Fetches subscription information from LemonSqueezy API
- `getOrderDetails()` - Fetches order information from LemonSqueezy API

#### 2. **LemonSqueezy Webhook Handler** (`app/api/payments/webhook/lemonsqueezy/route.ts`)
Processes these webhook events:
- `order.created` / `order.completed` - Activates subscriptions on successful payment
- `order.refunded` - Marks subscriptions as refunded
- `subscription.created` - Registers new subscriptions
- `subscription.updated` - Handles subscription pauses/resumes
- `subscription.cancelled` - Marks subscriptions as cancelled

#### 3. **Updated Checkout Page** (`app/checkout/page.tsx`)
- Removed Flutterwave modal initialization
- Simplified to redirect to LemonSqueezy hosted checkout
- No additional payment processing scripts needed
- Support for both card and alternative payment methods via LemonSqueezy

#### 4. **Database Migration** (`database/migrations/2025-01-15_add_lemonsqueezy_support.sql`)
Adds LemonSqueezy columns to `user_plans` table:
- `checkout_id` - Unique checkout identifier
- `lemonsqueezy_variant_id` - Product variant ID
- `lemonsqueezy_order_id` - Order ID from LemonSqueezy
- `lemonsqueezy_subscription_id` - Subscription ID for recurring billing
- `lemonsqueezy_transaction` - Full webhook payload (JSONB)

Also creates `lemonsqueezy_products` table for variant ID mappings.

## Configuration

### Environment Variables

Update your `.env.local` with LemonSqueezy credentials:

```env
# LemonSqueezy API
LEMONSQUEEZY_API_KEY=your_lemonsqueezy_api_key

# Webhook Signature Secret (from LemonSqueezy settings)
LEMONSQUEEZY_WEBHOOK_SECRET=your_lemonsqueezy_webhook_secret

# Product Variant IDs (create in LemonSqueezy dashboard)
LEMONSQUEEZY_VARIANT_PRO_MONTHLY=your_pro_monthly_variant_id
LEMONSQUEEZY_VARIANT_PRO_YEARLY=your_pro_yearly_variant_id
LEMONSQUEEZY_VARIANT_PLUS_MONTHLY=your_plus_monthly_variant_id
LEMONSQUEEZY_VARIANT_PLUS_YEARLY=your_plus_yearly_variant_id
LEMONSQUEEZY_VARIANT_ELITE_MONTHLY=your_elite_monthly_variant_id
LEMONSQUEEZY_VARIANT_ELITE_YEARLY=your_elite_yearly_variant_id
```

### LemonSqueezy Store Setup

1. **Create Products in LemonSqueezy Dashboard**
   - Pro Plan
   - Plus Plan
   - Elite Plan

2. **Create Variants for Each Product**
   - Monthly variant (e.g., $9/month for Pro)
   - Yearly variant (e.g., $90/year for Pro)
   - Set variant IDs in environment variables

3. **Configure Webhooks**
   - Go to Settings > Webhooks
   - Add webhook endpoint: `https://your-domain.com/api/payments/webhook`
   - Subscribe to events:
     - `order.created`
     - `order.completed`
     - `order.refunded`
     - `subscription.created`
     - `subscription.updated`
     - `subscription.cancelled`
   - Copy webhook secret to `LEMONSQUEEZY_WEBHOOK_SECRET`

## Payment Flow

### Checkout Process

1. **User initiates upgrade** → Clicks upgrade button on any plan card
2. **Frontend calls** `/api/payments/create-checkout` with plan type and billing cycle
3. **Backend generates** LemonSqueezy checkout URL with customer data
4. **User redirected** to LemonSqueezy hosted checkout
5. **User completes payment** on LemonSqueezy (supports multiple payment methods globally)
6. **LemonSqueezy sends webhook** to `/api/payments/webhook`
7. **Webhook handler processes** and activates subscription in database
8. **User redirected** to success page with plan activated

### Subscription Management

- **Activation**: Automatic via webhook when payment completes
- **Cancellation**: Updated via API endpoint or webhook
- **Status Tracking**: Stored in `user_plans` table with payment details

## Testing

### Local Testing with LemonSqueezy Webhooks

1. Set up LemonSqueezy development webhook using ngrok or similar tunneling service
2. Forward webhooks to your local dev server
3. Test complete flow: checkout → payment → webhook → activation

### Sample Webhook Payload

```json
{
  "meta": {
    "event_name": "order.completed"
  },
  "data": {
    "id": "order_12345",
    "status": "paid",
    "total_formatted": "$9.00",
    "currency": "USD",
    "customer": {
      "email": "user@example.com"
    },
    "variant": {
      "id": "variant_pro_monthly",
      "attributes": {
        "name": "Pro Monthly"
      }
    },
    "custom": {
      "user_id": "uuid-here",
      "billing_cycle": "monthly"
    }
  }
}
```

## Migration Checklist

- [x] Create `lemonsqueezy.server.ts` with API integration
- [x] Create `lemonsqueezy` webhook handler
- [x] Update checkout page to use LemonSqueezy redirect
- [x] Update create-checkout API route
- [x] Update verify endpoint for LemonSqueezy
- [x] Update webhook router to detect provider by headers
- [x] Add database migration for LemonSqueezy columns
- [x] Update `.env.example` with new variables
- [x] Mark LemonSqueezy as available in payment options
- [ ] Run database migration on production
- [ ] Configure LemonSqueezy store with all 4 plans
- [ ] Set webhook endpoint in LemonSqueezy dashboard
- [ ] Test end-to-end checkout flow
- [ ] Update billing page to display LemonSqueezy subscriptions
- [ ] Update any customer-facing documentation

## Support for All 4 Plans

### Pricing
- **Starter** - Free plan (no checkout needed)
- **Pro** - $9/month or $90/year
- **Plus** - $19/month or $190/year
- **Elite** - $39/month or $390/year

Each plan has:
- Monthly billing variant
- Yearly billing variant (with ~17% discount)
- Proper plan type tracking in database
- Automatic activation on payment

## Backwards Compatibility

The system maintains backwards compatibility with legacy Flutterwave subscriptions:

- Old Flutterwave subscription IDs are preserved in database
- Webhook router detects payment provider by header signature
- Both payment methods can coexist during transition period
- User billing page works with both Flutterwave and LemonSqueezy subscriptions

## Troubleshooting

### Issue: Variant IDs Not Configured
**Solution**: Ensure all 6 variant IDs are set in environment variables (3 plans × 2 billing cycles)

### Issue: Webhook Not Processing
**Solution**: 
1. Check webhook signature secret matches LemonSqueezy settings
2. Verify webhook URL is publicly accessible
3. Check logs for signature validation errors

### Issue: Users Not Activated After Payment
**Solution**:
1. Check webhook delivery in LemonSqueezy dashboard
2. Verify database migration was applied
3. Check `user_plans` table for order records with `status: "pending"`

## Future Improvements

- [ ] Implement subscription management portal (pause/resume/upgrade)
- [ ] Add automated renewal reminders
- [ ] Implement usage-based billing if needed
- [ ] Add affiliate/commission tracking
- [ ] Implement dunning/retry logic for failed payments

## Files Modified

```
app/api/payments/webhook/route.ts          - Route to appropriate handler
app/api/payments/create-checkout/route.ts - Use LemonSqueezy instead of Flutterwave
app/api/payments/verify/route.ts           - Updated for LemonSqueezy verification
app/api/payments/subscriptions/route.ts    - Support both payment providers
app/checkout/page.tsx                      - Redirect to LemonSqueezy checkout
app/checkout/layout.tsx                    - Updated descriptions
src/lib/payment-options.ts                 - Mark LemonSqueezy as available
.env.example                               - LemonSqueezy env vars
```

## Files Created

```
src/lib/lemonsqueezy.server.ts
app/api/payments/webhook/lemonsqueezy/route.ts
database/migrations/2025-01-15_add_lemonsqueezy_support.sql
LEMONSQUEEZY_MIGRATION.md (this file)
```
