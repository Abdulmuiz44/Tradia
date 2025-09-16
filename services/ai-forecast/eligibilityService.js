// services/ai-forecast/eligibilityService.js
// Mock eligibility service with in-memory user DB

const users = new Map([
  // userId -> user record
  ["123", { id: "123", premium: true, preferences: { favoriteSymbols: ["BTCUSD", "EURUSD"], btcTradesThisMonth: 12 } }],
  ["456", { id: "456", premium: false, preferences: { favoriteSymbols: ["ETHUSD"], btcTradesThisMonth: 1 } }],
]);

export async function isEligible(userId) {
  const u = users.get(String(userId));
  return !!u?.premium;
}

export function getUser(userId) {
  return users.get(String(userId)) || null;
}

export function upsertUser(user) {
  if (!user?.id) return false;
  users.set(String(user.id), { premium: false, preferences: {}, ...user });
  return true;
}

