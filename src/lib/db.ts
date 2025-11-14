// lib/db.ts
import { Pool, PoolConfig } from "pg";

/**
 * Serverless-safe Postgres pool.
 * - Prefer using DATABASE_URL (e.g. Supabase)
 * - Falls back to discrete DB_USER/DB_PASSWORD/etc if needed
 * - Uses a global cached Pool so multiple serverless invocations don't create many connections
 */

declare global {
  // eslint-disable-next-line no-var
  var __global_pg_pool__: Pool | null | undefined;
}

function buildPoolConfig(): PoolConfig | null {
  // If a single DATABASE_URL is provided, use it (recommended for Supabase)
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      // Supabase requires SSL; most server environments need rejectUnauthorized:false
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    };
  }

  // Fallback to legacy DB_* env variables (kept for local dev compatibility)
  if (
    !process.env.DB_USER ||
    !process.env.DB_PASSWORD ||
    !process.env.DB_HOST ||
    !process.env.DB_PORT ||
    !process.env.DB_NAME
  ) {
    // Don't throw error at build time, return null instead
    console.warn(
      "Database environment variables not set. Database features will be unavailable. Please set DATABASE_URL or DB_USER/DB_PASSWORD/DB_HOST/DB_PORT/DB_NAME in production."
    );
    return null;
  }

  const port = Number(process.env.DB_PORT) || 5432;

  return {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port,
    database: process.env.DB_NAME,
    ssl: { rejectUnauthorized: false },
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  };
}

function makePool(): Pool | null {
  const cfg = buildPoolConfig();
  if (!cfg) return null;
  return new Pool(cfg);
}

// Use a global pool in Node dev / serverless environments to avoid creating many clients
// Will be null if database env vars not configured (e.g., during build)
const pool: Pool | null = global.__global_pg_pool__ ?? makePool();
if (pool && !global.__global_pg_pool__) global.__global_pg_pool__ = pool;

export { pool };
