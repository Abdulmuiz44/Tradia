// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { pool } from "@/lib/db";
import type { NextAuthOptions } from "next-auth";

if (!process.env.NEXTAUTH_URL) {
  console.warn("WARNING: NEXTAUTH_URL not set. Set NEXTAUTH_URL=http://localhost:3000 in .env.local");
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

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) return null;
          const email = String(credentials.email).toLowerCase().trim();
          const res = await pool.query(`SELECT * FROM users WHERE email=$1 LIMIT 1`, [email]);
          const u = res.rows[0] as { id?: string; name?: string | null; email?: string; password?: string | null } | undefined;
          if (!u || !u.password) return null;
          const ok = await bcrypt.compare(String(credentials.password), u.password);
          return ok ? { id: u.id, name: u.name ?? undefined, email: u.email } : null;
        } catch (err: unknown) {
          console.error("Credentials authorize error:", err instanceof Error ? err.message : String(err));
          return null;
        }
      },
    }),
  ],

  callbacks: {
    /**
     * signIn: google linking/creation logic
     */
    async signIn({ user, account, profile }: { user?: Record<string, unknown>; account?: Record<string, unknown> | null; profile?: Record<string, unknown> | null }) {
      try {
        if (account?.provider === "google") {
          const provider = getString(account, "provider") ?? "google";
          const providerAccountId = getString(account, "providerAccountId") ?? getString(account, "provider_account_id");
          const email = (getString(user, "email") ?? getString(profile, "email") ?? "").toLowerCase();

          if (!providerAccountId || !email) {
            console.error("Google signIn missing providerAccountId or email", { providerAccountId, email });
            return false;
          }

          // check existing account link
          const acc = await pool.query(`SELECT user_id FROM accounts WHERE provider=$1 AND provider_account_id=$2 LIMIT 1`, [provider, providerAccountId]);
          if (acc.rows[0]) return true;

          // find user by email
          const ures = await pool.query<{ id: string }>(`SELECT id FROM users WHERE email=$1 LIMIT 1`, [email]);
          let userId: string | null = ures.rows[0]?.id ?? null;

          // create user if not exists - mark email_verified
          if (!userId) {
            const ins = await pool.query<{ id: string }>(
              `INSERT INTO users (name, email, email_verified, created_at, updated_at)
               VALUES ($1,$2,NOW(), NOW(), NOW()) RETURNING id`,
              [getString(user, "name") ?? getString(profile, "name") ?? null, email]
            );
            userId = ins.rows[0]?.id ?? null;
          }

          if (!userId) {
            console.error("Failed to get or create user for google sign-in", { email });
            return false;
          }

          // insert/update account link (minimal columns)
          await pool.query(
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

          return true;
        }

        return true;
      } catch (err: unknown) {
        console.error("signIn callback error:", err instanceof Error ? err.message : String(err));
        return false;
      }
    },

    /**
     * jwt: populate token.userId and latest user fields
     */
    async jwt({ token, user }: { token: Record<string, unknown>; user?: Record<string, unknown> }) {
      try {
        // user object present only on initial sign-in
        const incomingUserId = getString(user, "id");
        if (incomingUserId) {
          token.userId = incomingUserId;
          if (getString(user, "email")) token.email = getString(user, "email");
          if (getString(user, "name")) token.name = getString(user, "name");
        } else if (!("userId" in token) && typeof token.email === "string") {
          // try resolve user id by email
          const r = await pool.query<{ id: string }>(`SELECT id FROM users WHERE email=$1 LIMIT 1`, [String(token.email)]);
          if (r.rows[0]?.id) token.userId = r.rows[0].id;
        }

        // if we have userId, refresh name/email/image/role from DB
        if (typeof token.userId === "string") {
          const r2 = await pool.query<{ id: string; name?: string | null; email?: string | null; image?: string | null; role?: string | null }>(
            `SELECT id, name, email, image, role FROM users WHERE id=$1 LIMIT 1`,
            [String(token.userId)]
          );
          const u = r2.rows[0];
          if (u) {
            token.name = u.name ?? token.name;
            token.email = u.email ?? token.email;
            token.image = u.image ?? token.image;
            token.role = u.role ?? token.role ?? "trader";
          }
        }
      } catch (err: unknown) {
        console.error("jwt callback error:", err instanceof Error ? err.message : String(err));
      }
      return token;
    },

    /**
     * session: attach id, name, email, image, role to session.user
     */
    async session({ session, token }: { session: Record<string, unknown>; token: Record<string, unknown> }) {
      try {
        if (!session.user || typeof session.user !== "object") session.user = {};
        const su = session.user as Record<string, unknown>;
        if (typeof token.userId === "string") su.id = token.userId;
        if (typeof token.name === "string") su.name = token.name;
        if (typeof token.email === "string") su.email = token.email;
        if (typeof token.image === "string") su.image = token.image;
        su.role = typeof token.role === "string" ? token.role : "trader";
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

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
