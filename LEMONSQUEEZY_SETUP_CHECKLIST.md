# LemonSqueezy Setup Checklist

Complete this checklist to fully configure and test the LemonSqueezy integration for Tradia.

## Pre-Integration Setup

### LemonSqueezy Account
- [ ] Create LemonSqueezy account at https://lemonsqueezy.com
- [ ] Verify email
- [ ] Set up organization/store profile
- [ ] Complete initial setup wizard

### Get API Credentials
- [ ] Log in to LemonSqueezy dashboard
- [ ] Navigate to Settings > API Tokens
- [ ] Create new API token for Tradia
- [ ] Copy API key: `LEMONSQUEEZY_API_KEY` → `.env.local`

### Configure Webhook
- [ ] Navigate to Settings > Webhooks
- [ ] Click "Create webhook"
- [ ] Set URL to: `https://your-production-domain.com/api/payments/webhook`
- [ ] (For local testing, use ngrok/tunnel tool)
- [ ] Subscribe to these events:
  - [ ] `order.created`
  - [ ] `order.completed`
  - [ ] `order.refunded`
  - [ ] `subscription.created`
  - [ ] `subscription.updated`
  - [ ] `subscription.cancelled`
- [ ] Copy webhook signing secret: `LEMONSQUEEZY_WEBHOOK_SECRET` → `.env.local`

## Product & Variant Setup

### Create Products

#### Pro Plan Product
- [ ] Create product "Tradia Pro Plan"
- [ ] Set description: "Advanced trading tools with 6 months history"

#### Plus Plan Product
- [ ] Create product "Tradia Plus Plan"
- [ ] Set description: "Unlimited AI chat and 1 year trade history"

#### Elite Plan Product
- [ ] Create product "Tradia Elite Plan"
- [ ] Set description: "All premium features with dedicated support"

### Create Variants (Monthly)

#### Pro Monthly
- [ ] Create variant in Pro product
- [ ] Price: $9.00 USD
- [ ] Billing cycle: Monthly
- [ ] Copy variant ID → `LEMONSQUEEZY_VARIANT_PRO_MONTHLY`

#### Plus Monthly
- [ ] Create variant in Plus product
- [ ] Price: $19.00 USD
- [ ] Billing cycle: Monthly
- [ ] Copy variant ID → `LEMONSQUEEZY_VARIANT_PLUS_MONTHLY`

#### Elite Monthly
- [ ] Create variant in Elite product
- [ ] Price: $39.00 USD
- [ ] Billing cycle: Monthly
- [ ] Copy variant ID → `LEMONSQUEEZY_VARIANT_ELITE_MONTHLY`

### Create Variants (Yearly)

#### Pro Yearly
- [ ] Create variant in Pro product
- [ ] Price: $90.00 USD (17% discount from monthly)
- [ ] Billing cycle: Yearly
- [ ] Copy variant ID → `LEMONSQUEEZY_VARIANT_PRO_YEARLY`

#### Plus Yearly
- [ ] Create variant in Plus product
- [ ] Price: $190.00 USD (17% discount from monthly)
- [ ] Billing cycle: Yearly
- [ ] Copy variant ID → `LEMONSQUEEZY_VARIANT_PLUS_YEARLY`

#### Elite Yearly
- [ ] Create variant in Elite product
- [ ] Price: $390.00 USD (17% discount from monthly)
- [ ] Billing cycle: Yearly
- [ ] Copy variant ID → `LEMONSQUEEZY_VARIANT_ELITE_YEARLY`

## Environment Configuration

### Update .env.local

```bash
# Required LemonSqueezy Variables
LEMONSQUEEZY_API_KEY=your_api_key_here
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret_here
LEMONSQUEEZY_VARIANT_PRO_MONTHLY=variant_id_pro_monthly
LEMONSQUEEZY_VARIANT_PRO_YEARLY=variant_id_pro_yearly
LEMONSQUEEZY_VARIANT_PLUS_MONTHLY=variant_id_plus_monthly
LEMONSQUEEZY_VARIANT_PLUS_YEARLY=variant_id_plus_yearly
LEMONSQUEEZY_VARIANT_ELITE_MONTHLY=variant_id_elite_monthly
LEMONSQUEEZY_VARIANT_ELITE_YEARLY=variant_id_elite_yearly
```

- [ ] Update all 8 environment variables
- [ ] Verify no typos in variable names
- [ ] Don't commit `.env.local` to git

## Database Setup

### Run Migration

```bash
# In Supabase SQL editor:
```

- [ ] Copy contents of `database/migrations/2025-01-15_add_lemonsqueezy_support.sql`
- [ ] Paste into Supabase SQL editor
- [ ] Execute the migration
- [ ] Verify no errors

### Verify Tables Created

```sql
-- Check lemonsqueezy_products table
SELECT * FROM lemonsqueezy_products;

-- Check new columns in user_plans
SELECT 
  checkout_id,
  lemonsqueezy_variant_id,
  lemonsqueezy_order_id,
  lemonsqueezy_subscription_id
FROM user_plans LIMIT 1;
```

- [ ] `lemonsqueezy_products` table exists
- [ ] All new columns exist in `user_plans`
- [ ] Indexes created successfully

## Code Deployment

### Pre-Deployment Checks

- [ ] All new files committed to git:
  - [ ] `src/lib/lemonsqueezy.server.ts`
  - [ ] `app/api/payments/webhook/lemonsqueezy/route.ts`
  - [ ] `LEMONSQUEEZY_MIGRATION.md`
  - [ ] `LEMONSQUEEZY_IMPLEMENTATION_SUMMARY.md`
  - [ ] `LEMONSQUEEZY_SETUP_CHECKLIST.md`
  - [ ] `scripts/test-lemonsqueezy.sh`

- [ ] All modified files reviewed:
  - [ ] `app/api/payments/create-checkout/route.ts`
  - [ ] `app/api/payments/verify/route.ts`
  - [ ] `app/api/payments/webhook/route.ts`
  - [ ] `app/api/payments/subscriptions/route.ts`
  - [ ] `app/checkout/page.tsx`
  - [ ] `app/checkout/layout.tsx`
  - [ ] `app/dashboard/billing/page.tsx`
  - [ ] `src/lib/payment-options.ts`
  - [ ] `.env.example`

### Deploy Code
- [ ] Push changes to main/production branch
- [ ] Trigger production deployment
- [ ] Verify all TypeScript compiles without errors
- [ ] Check for any build warnings related to payments

## Testing (Local/Staging)

### Test Checkout Flow - Pro Plan

1. [ ] Navigate to pricing page
2. [ ] Click "Upgrade to Pro" button
3. [ ] Try both Monthly and Yearly options
4. [ ] Verify redirect to LemonSqueezy checkout
5. [ ] Use LemonSqueezy test card: `4111111111111111`
6. [ ] Complete payment
7. [ ] Verify webhook processes (check logs)
8. [ ] Confirm redirect to success page

### Test Checkout Flow - Plus Plan

1. [ ] Navigate to pricing page
2. [ ] Click "Upgrade to Plus" button
3. [ ] Try both Monthly and Yearly options
4. [ ] Verify redirect to LemonSqueezy checkout
5. [ ] Use test card and complete payment
6. [ ] Verify webhook processing
7. [ ] Confirm success redirect

### Test Checkout Flow - Elite Plan

1. [ ] Navigate to pricing page
2. [ ] Click "Upgrade to Elite" button
3. [ ] Try both Monthly and Yearly options
4. [ ] Verify redirect to LemonSqueezy checkout
5. [ ] Use test card and complete payment
6. [ ] Verify webhook processing
7. [ ] Confirm success redirect

### Verify Database Updates

After each test payment:
```sql
-- Check user_plans table
SELECT 
  user_id,
  plan_type,
  status,
  lemonsqueezy_order_id,
  lemonsqueezy_subscription_id,
  created_at
FROM user_plans
WHERE user_id = 'test_user_id'
ORDER BY created_at DESC
LIMIT 1;
```

- [ ] New record created after payment
- [ ] `status` set to "active"
- [ ] `lemonsqueezy_order_id` populated
- [ ] `lemonsqueezy_subscription_id` populated (if recurring)

### Test Billing Page

- [ ] Log in as upgraded user
- [ ] Navigate to `/dashboard/billing`
- [ ] Verify plan shows as "Active"
- [ ] Verify billing cycle displayed (Monthly/Yearly)
- [ ] Verify amount shown matches
- [ ] Verify renewal date visible (if applicable)

### Test Guest Checkout

- [ ] Don't log in
- [ ] Click upgrade button (should work as guest)
- [ ] Enter email address manually
- [ ] Proceed to payment
- [ ] Complete payment
- [ ] Verify user can log in after payment with email

### Test Error Scenarios

- [ ] Test with invalid email (should show error)
- [ ] Test webhook with invalid signature (should reject)
- [ ] Test with network timeout (should handle gracefully)
- [ ] Test duplicate webhook (should be idempotent)

## Production Deployment

### Pre-Production

- [ ] All tests passed on staging
- [ ] Team reviewed all changes
- [ ] Security check completed (no exposed secrets)
- [ ] Backup production database

### Production Deployment

- [ ] Deploy code to production
- [ ] Update production `.env` with real LemonSqueezy keys
- [ ] Run database migration on production
- [ ] Verify webhook URL is correct and reachable

### Post-Deployment Testing

- [ ] Test checkout flow with real LemonSqueezy
- [ ] Monitor webhook logs for errors
- [ ] Verify user plans activated correctly
- [ ] Test with different payment methods if available

### Monitoring & Support

- [ ] Set up monitoring for `/api/payments/webhook`
- [ ] Set up alerts for webhook failures
- [ ] Document support process for payment issues
- [ ] Create FAQ for common payment questions

## Verification Checklist

### Code Quality
- [ ] No TypeScript errors: `npm run build`
- [ ] No linting errors: `npm run lint`
- [ ] All imports resolve correctly
- [ ] No console.logs left in production code

### Security
- [ ] API keys not committed to git
- [ ] Webhook signature validation enabled
- [ ] CORS properly configured
- [ ] Rate limiting in place for checkout endpoints

### Database
- [ ] Migration successfully applied
- [ ] All required columns present
- [ ] Indexes created for performance
- [ ] Backwards compatible with old data

### Payment Flow
- [ ] Checkout creates correct plans
- [ ] Webhooks process correctly
- [ ] Users activated on payment
- [ ] Billing page shows correct info
- [ ] Cancellation works as expected

## Rollback Plan (if needed)

If critical issues occur:

1. [ ] Disable LemonSqueezy checkout temporarily
2. [ ] Direct users to contact support
3. [ ] Revert to previous code version
4. [ ] Revert environment variables to fallback
5. [ ] Notify users of resolution ETA
6. [ ] Once fixed, re-enable checkout
7. [ ] Re-test fully before re-enabling

## Documentation

- [ ] Create internal wiki/docs about payment flow
- [ ] Document how to add new plans
- [ ] Document webhook events and responses
- [ ] Create customer FAQ for payment issues
- [ ] Document refund process

## Final Sign-Off

- [ ] All items checked ✓
- [ ] Team lead approval: ________________
- [ ] QA verification: ________________
- [ ] Deployment date: ________________
- [ ] Backup made: ________________

---

**Last Updated:** January 15, 2025  
**Status:** Implementation Complete - Ready for Setup
