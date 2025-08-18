// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { pool } from "@/lib/db";
import { NextAuthOptions } from "next-auth";

if (!process.env.NEXTAUTH_URL) {
  console.warn("WARNING: NEXTAUTH_URL not set. Set NEXTAUTH_URL=http://localhost:3000 in .env.local");
}
if (!process.env.NEXTAUTH_SECRET) {
  console.warn("WARNING: NEXTAUTH_SECRET not set. Set a long random string in .env.local");
}
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  console.warn("WARNING: GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET missing");
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
          const u = res.rows[0];
          if (!u || !u.password) return null;
          const ok = await bcrypt.compare(credentials.password, u.password);
          return ok ? { id: u.id, name: u.name ?? undefined, email: u.email } : null;
        } catch (err) {
          console.error("Credentials authorize error:", err);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    /**
     * signIn: unchanged behavior (links Google -> users table + accounts table)
     * kept same flow but we ensure we do not reference created_at/updated_at columns that may differ.
     */
    async signIn({ user, account, profile }) {
      try {
        if (account?.provider === "google") {
          const provider = account.provider;
          const providerAccountId = account.providerAccountId;
          const email = (user?.email ?? profile?.email ?? "").toLowerCase();

          if (!providerAccountId || !email) {
            console.error("Google signIn missing providerAccountId or email", { providerAccountId, email });
            return false;
          }

          // If provider-account link already exists => allow sign in
          const acc = await pool.query(
            `SELECT user_id FROM accounts WHERE provider=$1 AND provider_account_id=$2 LIMIT 1`,
            [provider, providerAccountId]
          );
          if (acc.rows[0]) {
            return true;
          }

          // Find user by email
          const ures = await pool.query(`SELECT id FROM users WHERE email=$1 LIMIT 1`, [email]);
          let userId = ures.rows[0]?.id ?? null;

          // Create user if doesn't exist (mark email_verified)
          if (!userId) {
            const ins = await pool.query(
              `INSERT INTO users (name, email, email_verified, created_at, updated_at)
               VALUES ($1,$2,NOW(), NOW(), NOW()) RETURNING id`,
              [user?.name ?? profile?.name ?? null, email]
            );
            userId = ins.rows[0]?.id;
          }

          if (!userId) {
            console.error("Failed to get or create user for google sign-in", { email });
            return false;
          }

          // Upsert account link (keep minimal columns so schema differences are tolerated)
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
              account.type ?? null,
              provider,
              providerAccountId,
              account.refresh_token ?? null,
              account.access_token ?? null,
              account.expires_at ? Math.floor(Number(account.expires_at)) : null,
              account.token_type ?? null,
              account.scope ?? null,
              account.id_token ?? null,
              account.session_state ?? null,
            ]
          );

          return true;
        }

        // credentials -> already handled
        return true;
      } catch (err) {
        console.error("signIn callback error:", err);
        return false;
      }
    },

    /**
     * jwt:
     * - ensure we compute token.userId on sign-in or from DB via email
     * - always fetch the latest user record (name, email, image, role) from DB when token.userId exists
     *   so token contains fresh image and role for session().
     */
    async jwt({ token, user }) {
      try {
        // When a user signs in, NextAuth passes `user` object once (on signin)
        if (user?.id) {
          (token as any).userId = (user as any).id;
          token.email = (user as any).email ?? token.email;
          token.name = (user as any).name ?? token.name;
        } else if (!(token as any).userId && token.email) {
          // try to resolve user id from email
          const r = await pool.query(`SELECT id FROM users WHERE email=$1 LIMIT 1`, [token.email]);
          if (r.rows[0]?.id) (token as any).userId = r.rows[0].id;
        }

        // If we have a userId, fetch latest fields (name, email, image, role)
        if ((token as any).userId) {
          const r2 = await pool.query(
            `SELECT id, name, email, image, role FROM users WHERE id=$1 LIMIT 1`,
            [(token as any).userId]
          );
          const u = r2.rows[0];
          if (u) {
            token.name = u.name ?? token.name;
            token.email = u.email ?? token.email;
            token.image = u.image ?? token.image;
            token.role = u.role ?? token.role ?? "trader";
          }
        }
      } catch (e) {
        console.error("jwt callback error:", e);
      }
      return token;
    },

    /**
     * session:
     * - expose id, name, email, image and role on the session.user object returned by useSession/getSession
     */
    async session({ session, token }) {
      try {
        if ((token as any)?.userId) (session.user as any).id = (token as any).userId;
        if ((token as any)?.name) (session.user as any).name = (token as any).name;
        if ((token as any)?.email) (session.user as any).email = (token as any).email;
        if ((token as any)?.image) (session.user as any).image = (token as any).image;
        // role defaults to 'trader' if absent
        (session.user as any).role = (token as any)?.role ?? "trader";
      } catch (e) {
        console.error("session callback error:", e);
      }
      return session;
    },
  },

  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    // signIn: "/login" // enable if you want a custom sign in page
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
