// src/lib/authOptions.ts
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { pool } from "@/lib/db";
import type { NextAuthOptions } from "next-auth";

// Allow disabling DB lookups inside NextAuth JWT callback to avoid noisy errors when DB is unreachable
function skipAuthDb(): boolean {
  const v = (process.env.DISABLE_AUTH_DB_QUERIES || process.env.AUTH_DB_LOOKUPS || '').toLowerCase();
  return v === '1' || v === 'true' || v === 'off' || v === 'disable' || v === 'disabled';
}

/** Environment warnings (kept from original file) */
if (!process.env.NEXTAUTH_URL) {
  console.warn(
    "WARNING: NEXTAUTH_URL not set. Set NEXTAUTH_URL=http://localhost:3000 (or http://127.0.0.1:3000) in .env.local"
  );
}
if (!process.env.NEXTAUTH_SECRET) {
  console.warn("WARNING: NEXTAUTH_SECRET not set. Set a long random string in .env.local");
}
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn("WARNING: GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET missing");
}

/** Safe helpers to extract strings/numbers from unknown objects */
function getString(obj: unknown, key: string): string | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const v = (obj as Record<string, unknown>)[key];
  if (typeof v === "string") return v;
  if (typeof v === "number") return String(v);
  return undefined;
}
function getNumber(obj: unknown, key: string): number | undefined {
  if (!obj || typeof obj !== "object") return undefined;
  const v = (obj as Record<string, unknown>)[key];
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** Minimal shape used for DB query results */
type QueryResultLike<T> = { rows: T[] };

function getFirstRow<T>(res: unknown): T | undefined {
  if (!res || typeof res !== "object") return undefined;
  const maybe = res as Record<string, unknown>;
  const rows = maybe.rows;
  if (!Array.isArray(rows) || rows.length === 0) return undefined;
  return rows[0] as T;
}

async function safeQuery<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
  timeoutMs = 3000
): Promise<QueryResultLike<T>> {
  if (!pool || typeof pool.query !== "function") {
    throw new Error("DB pool not available");
  }
  // cast to any to avoid depending on pg's generic QueryResult type here
  const qPromise = (pool.query as any)(text, params) as Promise<any>;
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("DB_QUERY_TIMEOUT")), timeoutMs)
  );
  const result = await Promise.race([qPromise, timeout]);
  return result as unknown as QueryResultLike<T>;
}

/**
 * Exported authOptions used by NextAuth and other modules
 */
export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },

      // <-- FIX: include the second `req` parameter and ensure returned user has id:string
      async authorize(credentials, req) {
        try {
          if (!credentials?.email || !credentials?.password) return null;

          const email = String(credentials.email).toLowerCase().trim();

          const res = await safeQuery<{ id?: string; name?: string | null; email?: string; password?: string | null }>(
            `SELECT * FROM users WHERE email=$1 LIMIT 1`,
            [email]
          );

          const u = getFirstRow<{ id?: string; name?: string | null; email?: string; password?: string | null }>(res);

          // If user record or password or id missing => cannot authorize
          if (!u || !u.password || !u.id) return null;

          const ok = await bcrypt.compare(String(credentials.password), u.password);

          if (!ok) return null;

          // Guarantee id is a string (NextAuth expects id: string)
          const user = {
            id: String(u.id),
            name: u.name ?? undefined,
            email: u.email ?? undefined,
          };

          return user;
        } catch (err: unknown) {
          console.error("Credentials authorize error:", err instanceof Error ? err.message : String(err));
          return null;
        }
      },
    }),
  ],

  callbacks: {
  // use permissive `any` parameter types for callbacks to avoid strict NextAuth
  // type incompatibilities with the project's DB/user shapes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async signIn({ user, account, profile }: any) {
      try {
        if (account?.provider === "google") {
          const provider = getString(account, "provider") ?? "google";
          const providerAccountId = getString(account, "providerAccountId") ?? getString(account, "provider_account_id");
          const email = (getString(user, "email") ?? getString(profile, "email") ?? "").toLowerCase();

          if (!providerAccountId || !email) {
            console.error("Google signIn missing providerAccountId or email", { providerAccountId, email });
            return false;
          }

          try {
            const acc = await safeQuery<{ user_id?: string }>(
              `SELECT user_id FROM accounts WHERE provider=$1 AND provider_account_id=$2 LIMIT 1`,
              [provider, providerAccountId]
            );
            if (getFirstRow<{ user_id?: string }>(acc)) {
              // Ensure admin privileges/plan on every sign-in
              if (email === "abdulmuizproject@gmail.com") {
                await safeQuery(
                  `UPDATE users SET plan='elite', role='admin', email_verified=true, updated_at=NOW() WHERE email=$1`,
                  [email]
                );
              } else {
                await safeQuery(
                  `UPDATE users SET email_verified=COALESCE(email_verified,true), plan=COALESCE(plan,'free'), updated_at=NOW() WHERE email=$1`,
                  [email]
                );
              }
              return true;
            }

            const ures = await safeQuery<{ id: string }>(`SELECT id FROM users WHERE email=$1 LIMIT 1`, [email]);
            let userId: string | null = getFirstRow<{ id: string }>(ures)?.id ?? null;

            if (!userId) {
              const ins = await safeQuery<{ id: string }>(
                `INSERT INTO users (name, email, email_verified, created_at, updated_at)
                 VALUES ($1,$2,NOW(), NOW(), NOW()) RETURNING id`,
                [getString(user, "name") ?? getString(profile, "name") ?? null, email]
              );
              userId = getFirstRow<{ id: string }>(ins)?.id ?? null;
            }

            if (!userId) {
              console.error("Failed to get or create user for google sign-in", { email });
              return true;
            }

            // Upsert account mapping
            await safeQuery(
              `INSERT INTO accounts (
                 user_id, type, provider, provider_account_id,
                 refresh_token, access_token, expires_at, token_type, scope, id_token, session_state
               )
               VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
               ON CONFLICT (provider, provider_account_id) DO UPDATE
                 SET user_id = EXCLUDED.user_id,
                     access_token = EXCLUDED.access_token,
                     refresh_token = EXCLUDED.refresh_token,
                     id_token = EXCLUDED.id_token,
                     expires_at = EXCLUDED.expires_at,
                     token_type = EXCLUDED.token_type,
                     scope = EXCLUDED.scope`,
              [
                userId,
                getString(account, "type") ?? null,
                provider,
                providerAccountId,
                getString(account, "refresh_token") ?? null,
                getString(account, "access_token") ?? null,
                getNumber(account, "expires_at") ? Math.floor(getNumber(account, "expires_at") as number) : null,
                getString(account, "token_type") ?? null,
                getString(account, "scope") ?? null,
                getString(account, "id_token") ?? null,
                getString(account, "session_state") ?? null,
              ]
            );

            // Set email_verified and plan/role after linking account
            if (email === "abdulmuizproject@gmail.com") {
              await safeQuery(
                `UPDATE users SET plan='elite', role='admin', email_verified=true, updated_at=NOW() WHERE id=$1`,
                [userId]
              );
            } else {
              await safeQuery(
                `UPDATE users SET plan=COALESCE(plan,'free'), email_verified=true, updated_at=NOW() WHERE id=$1`,
                [userId]
              );
            }

            // Initialize trial fields for OAuth sign-ins (non-grandfathered by default)
            await safeQuery(
              `UPDATE users
                 SET signup_at = COALESCE(signup_at, NOW()),
                     trial_ends_at = CASE
                       WHEN COALESCE(is_grandfathered, FALSE) THEN trial_ends_at
                       WHEN trial_ends_at IS NULL THEN NOW() + INTERVAL '30 days'
                       ELSE trial_ends_at
                     END
               WHERE id=$1`,
              [userId]
            );

            return true;
          } catch (dbErr: unknown) {
            console.error("Google signIn DB error (continuing OAuth):", dbErr instanceof Error ? dbErr.message : String(dbErr));
            return true;
          }
        }

        return true;
      } catch (err: unknown) {
        console.error("signIn callback error:", err instanceof Error ? err.message : String(err));
        return false;
      }
    },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async jwt({ token, user }: any) {
      try {
        const incomingUserId = getString(user, "id");
        if (incomingUserId) {
          token.userId = incomingUserId;
          if (getString(user, "email")) token.email = getString(user, "email");
          if (getString(user, "name")) token.name = getString(user, "name");
          if (getString(user, "plan")) (token as any).plan = getString(user, "plan");
          if (getString(user, "role")) (token as any).role = getString(user, "role");
        } else if (!skipAuthDb() && !("userId" in token) && typeof token.email === "string") {
          try {
            const r = await safeQuery<{ id: string }>(`SELECT id FROM users WHERE email=$1 LIMIT 1`, [String(token.email)], 2000);
            const row = getFirstRow<{ id: string }>(r);
            if (row?.id) token.userId = row.id;
          } catch (err) {
            console.warn("jwt callback DB lookup failed:", err instanceof Error ? err.message : String(err));
          }
        }

        if (!skipAuthDb() && typeof token.userId === "string") {
          try {
            const r2 = await safeQuery<{ id: string; name?: string | null; email?: string | null; image?: string | null; role?: string | null; plan?: string | null }>(
              `SELECT id, name, email, image, role, plan FROM users WHERE id=$1 LIMIT 1`,
              [String(token.userId)],
              2000
            );
            const u = getFirstRow<{ id: string; name?: string | null; email?: string | null; image?: string | null; role?: string | null; plan?: string | null }>(r2);
            if (u) {
              token.name = u.name ?? token.name;
              token.email = u.email ?? token.email;
              token.image = u.image ?? token.image;
              token.role = u.role ?? token.role ?? "trader";
              (token as any).plan = u.plan ?? (token as any).plan ?? "free";
            }
          } catch (err) {
            console.warn("jwt callback DB refresh failed:", err instanceof Error ? err.message : String(err));
          }
        }
      } catch (err: unknown) {
        console.error("jwt callback error:", err instanceof Error ? err.message : String(err));
      }
      return token;
    },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async session({ session, token }: any) {
      try {
        if (!session.user || typeof session.user !== "object") session.user = {};
        const su = session.user as Record<string, unknown>;
        if (typeof token.userId === "string") su.id = token.userId;
        if (typeof token.name === "string") su.name = token.name;
        if (typeof token.email === "string") su.email = token.email;
        if (typeof token.image === "string") su.image = token.image;
        su.role = typeof token.role === "string" ? token.role : "trader";
        su.plan = typeof (token as any).plan === "string" ? (token as any).plan : "free";
      } catch (err: unknown) {
        console.error("session callback error:", err instanceof Error ? err.message : String(err));
      }
      return session;
    },
  },

  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    // signIn: "/login"
  },
};
