Secure Cloud Storage Architecture

- All user data is stored in the cloud (Postgres/Supabase) with per-user Row Level Security (RLS).
- Sensitive fields (journal notes, emotions, reasons, strategy, planner notes) are encrypted at the application layer using AES‑256‑GCM before being written to the database.
- Decryption happens server-side in API routes when preparing responses; clients only see their own decrypted data.

What Changed

- Trades: added `secret jsonb` column and enabled RLS. API `/api/trades` now encrypts sensitive fields into `secret` and decrypts on read.
- MT5 Imports: `/api/mt5/import` writes encrypted secrets for sensitive fields.
- Trade Planner: new API `/api/trade-plans` with encrypted `secret` payload for notes; RLS enforced.
- AI Chat: server decrypts sensitive fields before analysis for accurate insights.

Migrations

- Run `database/migrations/add_encrypted_secret_and_rls.sql` after base tables.

Environment

- Set `MT5_ENCRYPTION_KEY` to a 64‑hex‑char key (256‑bit). Optionally `USER_DATA_ENCRYPTION_KEY`; if both exist, MT5_ENCRYPTION_KEY is used.

Key Rotation

- Keys are derived per‑user via HKDF‑like HMAC from the master key. To rotate, change the master and run a background re‑encryption using the provided helpers.

Offline Cache

- Client may cache lists in `localStorage` for UX only. Source of truth is the cloud database.

