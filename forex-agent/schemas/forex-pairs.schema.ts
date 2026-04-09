/**
 * Draft schema artifact for forex_pairs.
 * Planning-only; not wired into production runtime.
 */

export type SessionProfile = {
  activeSessions: Array<'ASIA' | 'LONDON' | 'NEW_YORK' | 'OVERLAP'>;
  volatilityNote?: string;
};

export type ForexPair = {
  id: string;
  symbol: string; // e.g., EURUSD
  baseCurrency: string; // ISO-4217 (3-char)
  quoteCurrency: string; // ISO-4217 (3-char)
  pipPrecision: number;
  sessionProfile: SessionProfile;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export const validateForexPairDraft = (pair: ForexPair): string[] => {
  const errors: string[] = [];
  if (!/^[A-Z]{6}$/.test(pair.symbol)) errors.push('symbol must be 6 uppercase letters');
  if (!/^[A-Z]{3}$/.test(pair.baseCurrency)) errors.push('baseCurrency must be 3 uppercase letters');
  if (!/^[A-Z]{3}$/.test(pair.quoteCurrency)) errors.push('quoteCurrency must be 3 uppercase letters');
  if (pair.pipPrecision <= 0) errors.push('pipPrecision must be > 0');
  return errors;
};
