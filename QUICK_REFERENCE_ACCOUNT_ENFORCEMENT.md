# Quick Reference: Account Selection Enforcement

## Rule
**Users MUST create and select a trading account before adding or importing trades.**

## User Flow

```
No Account? ──→ See Warning ──→ Click "Create Account" ──→ Create & Select ──→ Enable Form
                 Grayed Form
```

## Files Changed

| File | Change |
|------|--------|
| `app/dashboard/trades/add/page.tsx` | Added account check + warning |
| `app/dashboard/trades/import/page.tsx` | Added account check + warning |
| `app/api/trades/route.ts` | Backend validation |
| `app/api/trades/batch/route.ts` | Backend batch validation |

## What Gets Prevented

❌ Adding trade without account_id
❌ Importing trades without account_id
❌ API calls without account_id
❌ Database inserts with null account_id

## What Users See

### Without Account (Add Page)
```
┌─────────────────────────────────┐
│ ⚠️ No Trading Account Selected   │
│ Must create account first        │
│ [Create Account] button          │
└─────────────────────────────────┘
```

### With Account (Add Page)
```
✅ Form enabled
✅ "Trading to: My Account" shown
✅ Can submit trade
✅ Success: "Added to 'My Account'"
```

## API Responses

| Scenario | Status | Response |
|----------|--------|----------|
| No account_id | 400 | `{ error: "Trading account required" }` |
| Valid account_id | 201 | Trade created ✓ |
| Batch without account_id | 400 | `Trade #1: Account ID required` |

## Testing

**Quick Test**:
1. No account created → go to `/trades/add` → see warning ✓
2. Create account → see form enabled ✓
3. Submit trade → see success with account name ✓

**API Test**:
```bash
# This fails (400 error)
curl -X POST http://localhost:3000/api/trades \
  -H "Content-Type: application/json" \
  -d '{"symbol":"EUR","entryPrice":1.0850}'

# This succeeds (201 created)
curl -X POST http://localhost:3000/api/trades \
  -H "Content-Type: application/json" \
  -d '{"symbol":"EUR","entryPrice":1.0850,"account_id":"uuid-123"}'
```

## Validation Layers

```
1. UI Warning       → "Create Account" button
2. Frontend Check   → if (!selectedAccount?.id) return
3. API Validation   → if (!accountId) return 400
4. DB Constraint    → FOREIGN KEY (account_id) REFERENCES trading_accounts
```

## Documentation

- **Complete Guide**: `ACCOUNT_SELECTION_ENFORCEMENT.md`
- **Summary**: `ENFORCEMENT_COMPLETE_SUMMARY.md`
- **This Guide**: `QUICK_REFERENCE_ACCOUNT_ENFORCEMENT.md`

## Commit

**Hash**: c2a58a7
**Message**: "enforce: require trading account selection before adding/importing trades"

## Status

✅ Complete
✅ Tested
✅ Committed
✅ Documented
✅ Production Ready

---

**TL;DR**: Users can't add/import trades without selecting an account. Enforced in UI, frontend, API, and database.
