// src/lib/mt5-map.ts
import { parseISO } from 'date-fns';

export type MetaApiDeal = {
  id: string;            // deal id
  orderId?: string;
  positionId?: string;
  symbol: string;
  type: string;          // DEAL_TYPE, e.g. 'DEAL_TYPE_BUY'/'DEAL_TYPE_SELL'/'DEAL_TYPE_BALANCE'...
  time: string;          // ISO
  volume: number;        // lots
  price: number;
  commission?: number;
  swap?: number;
  profit?: number;
  comment?: string;
  entryType?: string;    // open/close
  reason?: string;
};

export function toSide(type: string): 'buy' | 'sell' {
  return /BUY/i.test(type) ? 'buy' : 'sell';
}

export function normalizeDeals(raw: MetaApiDeal[]) {
  return raw
    .filter(d => /DEAL_TYPE_(BUY|SELL)/.test(d.type)) // ignore balance/credit/etc for now
    .map(d => ({
      deal_id: String(d.id),
      order_id: d.orderId ? String(d.orderId) : null,
      position_id: d.positionId ? String(d.positionId) : null,
      symbol: d.symbol,
      side: toSide(d.type),
      volume: Number(d.volume || 0),
      price: Number(d.price || 0),
      profit: Number(d.profit || 0),
      commission: Number(d.commission || 0),
      swap: Number(d.swap || 0),
      taxes: 0,
      reason: d.reason || null,
      comment: d.comment || null,
      opened_at: new Date(d.time),   // MetaApi returns ISO
      closed_at: null                // we keep per-deal; you can infer closes later if desired
    }));
}
