// src/lib/secure-store.ts
import { encryptionService, EncryptedData } from "@/lib/encryption";

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };

export interface SecretPayload {
  v: number; // version
  t: string; // type namespace e.g., 'trade', 'trade_plan'
  enc: EncryptedData; // encrypted JSON payload
}

export function getMasterKey(): string {
  const key = process.env.MT5_ENCRYPTION_KEY || process.env.USER_DATA_ENCRYPTION_KEY || "";
  if (!key) throw new Error("Encryption key missing: set MT5_ENCRYPTION_KEY or USER_DATA_ENCRYPTION_KEY");
  if (!encryptionService.isValidKey(key)) throw new Error("Invalid encryption key format (expect 64 hex chars)");
  return key;
}

export function deriveUserDataKey(userId: string, context = "user-data"): string {
  const master = getMasterKey();
  return encryptionService.deriveKey(master, userId, context);
}

export function makeSecret(userId: string, type: string, payload: Record<string, JsonValue>): SecretPayload {
  const key = deriveUserDataKey(userId, `user-data:${type}`);
  const plaintext = JSON.stringify(payload ?? {});
  const enc = encryptionService.encrypt(plaintext, key);
  return { v: 1, t: type, enc };
}

export function readSecret<T extends Record<string, JsonValue> = Record<string, JsonValue>>(
  userId: string,
  secret: any
): T | null {
  if (!secret || typeof secret !== "object") return null;
  const s = secret as Partial<SecretPayload>;
  if (!s.enc) return null;
  const key = deriveUserDataKey(userId, `user-data:${s.t || "unknown"}`);
  const json = encryptionService.decrypt(s.enc, key);
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

// Helpers to separate sensitive from non-sensitive trade fields
export function splitTradeFields(input: any): { safe: any; sensitive: Record<string, JsonValue> } {
  const {
    reasonForTrade = "",
    emotion = "",
    journalNotes = "",
    notes = "",
    strategy = "",
    ...rest
  } = input || {};

  return {
    safe: {
      ...rest,
      // Do not persist plaintext sensitive fields
      reasonForTrade: null,
      emotion: null,
      journalNotes: null,
      notes: null,
      strategy: null,
    },
    sensitive: { reasonForTrade, emotion, journalNotes, notes, strategy },
  };
}

export function mergeTradeSecret(userId: string, row: any): any {
  // Merge decrypted fields from secret into row shape expected by UI
  const merged = { ...row };
  const decrypted = readSecret<Record<string, JsonValue>>(row.user_id, row.secret);
  if (decrypted) {
    if (decrypted.reasonForTrade !== undefined) merged.reasonForTrade = String(decrypted.reasonForTrade || "");
    if (decrypted.emotion !== undefined) merged.emotion = String(decrypted.emotion || "");
    if (decrypted.journalNotes !== undefined) merged.journalNotes = String(decrypted.journalNotes || "");
    if (decrypted.notes !== undefined) merged.notes = String(decrypted.notes || "");
    if (decrypted.strategy !== undefined) merged.strategy = String(decrypted.strategy || "");
  }
  return merged;
}

export function splitTradePlanFields(input: any): { safe: any; sensitive: Record<string, JsonValue> } {
  const { notes = "", ...rest } = input || {};
  return {
    safe: { ...rest, notes: null },
    sensitive: { notes },
  };
}

