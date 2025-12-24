#!/bin/bash

# Test script for LemonSqueezy integration
# Usage: bash scripts/test-lemonsqueezy.sh

echo "🍋 LemonSqueezy Integration Test Suite"
echo "========================================"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check environment variables
echo "📋 Checking Environment Variables..."
echo ""

VARS=(
  "LEMONSQUEEZY_API_KEY"
  "LEMONSQUEEZY_WEBHOOK_SECRET"
  "LEMONSQUEEZY_VARIANT_PRO_MONTHLY"
  "LEMONSQUEEZY_VARIANT_PRO_YEARLY"
  "LEMONSQUEEZY_VARIANT_PLUS_MONTHLY"
  "LEMONSQUEEZY_VARIANT_PLUS_YEARLY"
  "LEMONSQUEEZY_VARIANT_ELITE_MONTHLY"
  "LEMONSQUEEZY_VARIANT_ELITE_YEARLY"
)

missing=0
for var in "${VARS[@]}"; do
  value=$(eval echo \$$var)
  if [ -z "$value" ]; then
    echo -e "${RED}✗${NC} $var - NOT SET"
    missing=$((missing + 1))
  else
    # Show first 10 chars of value for privacy
    if [ ${#value} -gt 10 ]; then
      display="${value:0:10}..."
    else
      display="$value"
    fi
    echo -e "${GREEN}✓${NC} $var = $display"
  fi
done

echo ""
if [ $missing -gt 0 ]; then
  echo -e "${RED}❌ $missing environment variables missing${NC}"
  echo ""
  echo "Required variables:"
  for var in "${VARS[@]}"; do
    echo "  - $var"
  done
  echo ""
  echo "Update your .env.local file with the missing variables."
  exit 1
else
  echo -e "${GREEN}✅ All environment variables set${NC}"
fi

echo ""
echo "📁 Checking Required Files..."
echo ""

FILES=(
  "src/lib/lemonsqueezy.server.ts"
  "app/api/payments/webhook/lemonsqueezy/route.ts"
  "database/migrations/2025-01-15_add_lemonsqueezy_support.sql"
  "LEMONSQUEEZY_MIGRATION.md"
)

missing_files=0
for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $file"
  else
    echo -e "${RED}✗${NC} $file - MISSING"
    missing_files=$((missing_files + 1))
  fi
done

echo ""
if [ $missing_files -gt 0 ]; then
  echo -e "${RED}❌ $missing_files files missing${NC}"
  exit 1
else
  echo -e "${GREEN}✅ All required files present${NC}"
fi

echo ""
echo "🧪 Code Quality Checks..."
echo ""

# Check if TypeScript files have proper imports
if grep -q "from '@/lib/lemonsqueezy.server'" app/api/payments/create-checkout/route.ts; then
  echo -e "${GREEN}✓${NC} create-checkout route imports lemonsqueezy.server"
else
  echo -e "${RED}✗${NC} create-checkout route doesn't import lemonsqueezy.server"
fi

if grep -q "lemonsqueezy" app/checkout/page.tsx && ! grep -q "window.FlutterwaveCheckout" app/checkout/page.tsx; then
  echo -e "${GREEN}✓${NC} checkout page is Flutterwave-free"
else
  echo -e "${RED}✗${NC} checkout page still references Flutterwave"
fi

if grep -q "lemonsqueezy" src/lib/payment-options.ts && ! grep -q "comingSoon: true" src/lib/payment-options.ts | grep -q "lemonsqueezy"; then
  echo -e "${GREEN}✓${NC} LemonSqueezy marked as available in payment options"
else
  echo -e "${YELLOW}⚠${NC} Check payment options configuration"
fi

echo ""
echo "📝 Testing Webhook Handler..."
echo ""

if grep -q "order.completed" app/api/payments/webhook/lemonsqueezy/route.ts; then
  echo -e "${GREEN}✓${NC} Webhook handles order.completed"
else
  echo -e "${RED}✗${NC} Webhook missing order.completed handler"
fi

if grep -q "subscription.created" app/api/payments/webhook/lemonsqueezy/route.ts; then
  echo -e "${GREEN}✓${NC} Webhook handles subscription.created"
else
  echo -e "${RED}✗${NC} Webhook missing subscription.created handler"
fi

if grep -q "verifyWebhookSignature" app/api/payments/webhook/lemonsqueezy/route.ts; then
  echo -e "${GREEN}✓${NC} Webhook signature verification implemented"
else
  echo -e "${RED}✗${NC} Webhook signature verification missing"
fi

echo ""
echo "✨ Next Steps:"
echo ""
echo "1. Set up LemonSqueezy store:"
echo "   - Create products for Pro, Plus, Elite"
echo "   - Create variants for monthly and yearly"
echo "   - Get variant IDs and update environment variables"
echo ""
echo "2. Configure webhooks:"
echo "   - Go to Settings > Webhooks in LemonSqueezy"
echo "   - Add webhook: https://your-domain.com/api/payments/webhook"
echo "   - Subscribe to: order.*, subscription.*"
echo "   - Copy webhook secret to LEMONSQUEEZY_WEBHOOK_SECRET"
echo ""
echo "3. Run database migration:"
echo "   - Execute migrations/2025-01-15_add_lemonsqueezy_support.sql"
echo ""
echo "4. Test checkout flow:"
echo "   - Navigate to upgrade page"
echo "   - Try upgrading to each plan"
echo "   - Verify webhook processes payment"
echo ""
echo "5. Verify activation:"
echo "   - Check billing page shows active plan"
echo "   - Check user_plans table has LemonSqueezy data"
echo ""

echo -e "${GREEN}✅ LemonSqueezy integration ready for testing!${NC}"
