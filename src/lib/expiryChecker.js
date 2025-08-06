export function checkAndExpire(user, markExpired) {
  if (!user || !user.expiresAt) return;
  const now = new Date();
  const expiry = new Date(user.expiresAt);
  if (now > expiry) markExpired();
}
