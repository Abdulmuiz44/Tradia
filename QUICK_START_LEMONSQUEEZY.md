# LemonSqueezy Integration - Quick Start Guide

## 5-Minute Overview

You've replaced Flutterwave with LemonSqueezy. Here's what you need to know:

### What Changed?
- ❌ **Flutterwave inline modal** - No longer used
- ❌ **External payment SDK** - Not needed anymore
- ✅ **LemonSqueezy checkout** - Hosted, more secure
- ✅ **Webhooks** - Now handles all activation
- ✅ **Better coverage** - Works in 200+ countries

### What You Need to Do

#### MUST DO (Before Going Live)
1. **Create LemonSqueezy Store** (15 min)
   ```
   Go to lemonsqueezy.com → Sign up → Create products
   ```

2. **Update 8 Environment Variables** (5 min)
   ```env
   LEMONSQUEEZY_API_KEY=your_key
   LEMONSQUEEZY_WEBHOOK_SECRET=your_secret
   LEMONSQUEEZY_VARIANT_PRO_MONTHLY=variant_id
   LEMONSQUEEZY_VARIANT_PRO_YEARLY=variant_id
   LEMONSQUEEZY_VARIANT_PLUS_MONTHLY=variant_id
   LEMONSQUEEZY_VARIANT_PLUS_YEARLY=variant_id
   LEMONSQUEEZY_VARIANT_ELITE_MONTHLY=variant_id
   LEMONSQUEEZY_VARIANT_ELITE_YEARLY=variant_id
   ```

3. **Run Database Migration** (5 min)
   ```bash
   # Copy and run in Supabase:
   database/migrations/2025-01-15_add_lemonsqueezy_support.sql
   ```

4. **Test Checkout** (10 min)
   - Click upgrade button
   - See LemonSqueezy checkout appear
   - Test payment
   - Verify plan activation

#### SHOULD DO (For Confidence)
- [ ] Run setup checklist: `LEMONSQUEEZY_SETUP_CHECKLIST.md`
- [ ] Run test script: `bash scripts/test-lemonsqueezy.sh`
- [ ] Read migration guide: `LEMONSQUEEZY_MIGRATION.md`

#### OPTIONAL (After Launch)
- [ ] Delete Flutterwave code once all users migrated
- [ ] Add subscription management portal
- [ ] Implement usage-based billing

---

## Key Differences

### Old Way (Flutterwave)
```javascript
// 1. Load Flutterwave SDK
<script src="https://checkout.flutterwave.com/v3.js"></script>

// 2. Initialize modal on frontend
window.FlutterwaveCheckout({
  public_key: "...",
  tx_ref: "...",
  amount: 9,
  // ... modal config
})
```

### New Way (LemonSqueezy)
```typescript
// 1. Create checkout URL on backend
const response = await fetch('/api/payments/create-checkout', {
  method: 'POST',
  body: JSON.stringify({ planType: 'pro' })
})

// 2. Redirect to LemonSqueezy
window.location.href = response.checkoutUrl
```

**Result:** Simpler, cleaner, more secure.

---

## Payment Plans

| Plan | Monthly | Yearly | Features |
|------|---------|--------|----------|
| Starter | FREE | FREE | Basic trading tools |
| Pro | **$9** | $90 | 6 months history + AI |
| Plus | **$19** | $190 | Unlimited history + AI |
| Elite | **$39** | $390 | Premium + everything |

✨ All prices now working in 200+ countries with local payment methods.

---

## Common Scenarios

### Scenario: Upgrade to Pro Plan
```
1. User clicks "Upgrade to Pro" button
2. Frontend redirects to /api/payments/create-checkout
3. Backend returns LemonSqueezy checkout URL
4. User sees hosted LemonSqueezy checkout
5. User completes payment
6. LemonSqueezy sends webhook
7. Backend activates plan in database
8. User redirected to success page
9. Plan shows as "Active" in dashboard
```

### Scenario: Webhook Processing
```
1. Payment completes on LemonSqueezy
2. LemonSqueezy sends webhook to /api/payments/webhook
3. Webhook router detects it's LemonSqueezy (by x-signature header)
4. Routes to /api/payments/webhook/lemonsqueezy
5. Handler validates signature
6. Handler extracts plan type from variant name
7. Handler updates user_plans table
8. Handler sets plan to "active" for user
9. User immediately sees updated billing page
```

### Scenario: User Clicks Upgrade While Already Logged In
```
1. Checkout page loads
2. User is authenticated (NextAuth session)
3. Email auto-filled from session
4. User selects monthly or yearly
5. Clicks "Continue to Payment"
6. Redirects to LemonSqueezy
7. Same payment flow as above
```

### Scenario: User Upgrades Without Logging In
```
1. User is not logged in (no session)
2. Checkout page shows email input field
3. User enters email manually
4. Same checkout flow as above
5. After payment, user can login with that email
6. Plan is already activated
```

---

## Troubleshooting

### "Environment variables missing" Error
**Fix:** Run `bash scripts/test-lemonsqueezy.sh` to see which ones.

### "Webhook not processing" 
**Fix:** 
1. Check webhook URL is public: `https://your-domain.com/api/payments/webhook`
2. Verify webhook secret in environment variables
3. Check LemonSqueezy dashboard for failed webhook deliveries

### "Plan not activating after payment"
**Fix:**
1. Check database: `SELECT * FROM user_plans WHERE user_id='your_id' ORDER BY created_at DESC LIMIT 1`
2. Check webhook logs: Dashboard → Billing → View recent transactions
3. Check payment status in LemonSqueezy: Dashboard → Orders

### "Variant ID error"
**Fix:** Make sure all 6 variant IDs are in environment variables:
```
❌ Missing: LEMONSQUEEZY_VARIANT_PRO_MONTHLY
❌ Missing: LEMONSQUEEZY_VARIANT_PRO_YEARLY
... etc
```

### "Wrong plan showing in dashboard"
**Fix:** 
1. Plan type extracted from variant NAME in webhook
2. Variant name must contain plan type (Pro, Plus, Elite)
3. Verify variant names in LemonSqueezy dashboard

---

## Timeline

### Day 1: Setup
- [ ] Create LemonSqueezy account
- [ ] Create products and variants
- [ ] Get API key and webhook secret
- [ ] Update environment variables
- [ ] Run database migration

### Day 2: Testing
- [ ] Test checkout for each plan
- [ ] Test webhook processing
- [ ] Test billing page updates
- [ ] Get team sign-off

### Day 3: Deployment
- [ ] Deploy code to production
- [ ] Monitor webhook logs
- [ ] Test with real payment
- [ ] Document for support team

### Ongoing: Monitoring
- [ ] Check webhook success rate daily
- [ ] Monitor payment metrics
- [ ] Watch for error patterns

---

## Code Changes Summary

### New Files
```
✅ src/lib/lemonsqueezy.server.ts (180 lines)
✅ app/api/payments/webhook/lemonsqueezy/route.ts (230 lines)
✅ database/migrations/2025-01-15_add_lemonsqueezy_support.sql (90 lines)
```

### Modified Files
```
✅ app/api/payments/create-checkout/route.ts
✅ app/api/payments/verify/route.ts
✅ app/api/payments/webhook/route.ts
✅ app/api/payments/subscriptions/route.ts
✅ app/checkout/page.tsx
✅ app/checkout/layout.tsx
✅ app/dashboard/billing/page.tsx
✅ src/lib/payment-options.ts
✅ .env.example
```

**Total:** 9 modified, 3 created = 12 files touched

---

## Getting Help

### Quick Questions
1. Check this guide (QUICK_START_LEMONSQUEEZY.md)
2. Check setup checklist (LEMONSQUEEZY_SETUP_CHECKLIST.md)
3. Check troubleshooting (LEMONSQUEEZY_MIGRATION.md)

### Technical Details
- Full guide: `LEMONSQUEEZY_MIGRATION.md`
- Implementation details: `LEMONSQUEEZY_IMPLEMENTATION_SUMMARY.md`
- Project summary: `FLUTTERWAVE_TO_LEMONSQUEEZY_COMPLETION.md`

### Support
1. Check webhook logs in LemonSqueezy dashboard
2. Review database for error patterns
3. Check application logs for payment errors
4. Ask team for help if needed

---

## Success Criteria

You'll know it's working when:

✅ Checkout page loads without errors  
✅ Clicking upgrade redirects to LemonSqueezy  
✅ Payment completes successfully  
✅ Webhook receives and processes event  
✅ Database `user_plans` row shows `status: 'active'`  
✅ Billing page shows plan as Active  
✅ User emails receive receipt  
✅ All tests pass  

**If all above are true, you're done! 🎉**

---

## One-Page Reference

| Task | Time | Status |
|------|------|--------|
| Create LemonSqueezy store | 15 min | ⏳ TODO |
| Set up products & variants | 15 min | ⏳ TODO |
| Get API key & webhook secret | 5 min | ⏳ TODO |
| Update environment variables | 5 min | ⏳ TODO |
| Run database migration | 5 min | ⏳ TODO |
| Test checkout flow | 15 min | ⏳ TODO |
| Get team sign-off | 30 min | ⏳ TODO |
| Deploy to production | 15 min | ⏳ TODO |
| Monitor for 24 hours | Ongoing | ⏳ TODO |

**Total time to production: ~2 hours**

---

## Last Checklist Before Launch

- [ ] All 8 environment variables set in `.env.local`
- [ ] Database migration executed successfully
- [ ] Checkout page loads without JavaScript errors
- [ ] Test payment completes on LemonSqueezy
- [ ] Webhook processes and activates plan
- [ ] Billing page shows active subscription
- [ ] User receives email receipt
- [ ] All 4 plans tested (Pro, Plus, Elite)
- [ ] Both billing cycles tested (Monthly, Yearly)
- [ ] Team has reviewed setup
- [ ] Rollback plan documented
- [ ] Support team briefed on changes

---

**You're ready to go live! 🚀**

Last updated: January 15, 2025  
Implementation: Complete ✅  
Configuration: Pending ⏳  
Testing: Pending ⏳  
Deployment: Pending ⏳
