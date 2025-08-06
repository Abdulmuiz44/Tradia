// src/pages/api/expiry-checker.js
import { lockFeaturesForUser } from '../../lib/featureLock';
export default async function handler(req, res) {
  const expiring = await /** fetch users whose expiry < now */;
  for (const u of expiring) await lockFeaturesForUser(u.email);
  res.status(200).json({ locked: expiring.length });
}
