// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { pool } from "@/lib/db";
import { NextAuthOptions } from "next-auth";

const ADMIN_EMAIL = "abdulmuizproject@gmail.com";

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
          return ok
            ? {
                id: u.id,
                name: u.name ?? undefined,
                email: u.email,
                // include role so jwt callback can stash it without another query
                role: u.role ?? "trader",
              } as any
            : null;
        } catch (err) {
          console.error("Credentials authorize error:", err);
          return null;
        }
      },
    }),
  ],

  callbacks: {
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

          // If link already exists, ensure admin role if needed and allow
          const acc = await pool.query(
            `SELECT user_id FROM accounts WHERE provider=$1 AND provider_account_id=$2 LIMIT 1`,
            [provider, providerAccountId]
          );
          if (acc.rows[0]?.user_id) {
            if (email === ADMIN_EMAIL) {
              await pool.query(`UPDATE users SET role='admin' WHERE id=$1 AND role <> 'admin'`, [
                acc.rows[0].user_id,
              ]);
            }
            return true;
          }

          // Find user by email
          const ures = await pool.query(`SELECT id, role FROM users WHERE email=$1 LIMIT 1`, [email]);
          let userId: string | null = ures.rows[0]?.id ?? null;

          // Create user if doesn't exist (role: admin only for ADMIN_EMAIL, else trader)
          if (!userId) {
            const ins = await pool.query(
              `INSERT INTO users (name, email, email_verified, role, created_at, updated_at)
               VALUES ($1,$2,NOW(), CASE WHEN lower($2)=lower($3) THEN 'admin' ELSE 'trader' END, NOW(), NOW())
               RETURNING id`,
              [user?.name ?? profile?.name ?? null, email, ADMIN_EMAIL]
            );
            userId = ins.rows[0]?.id ?? null;
          } else {
            // Ensure correct role for the special admin email
            if (email === ADMIN_EMAIL && ures.rows[0]?.role !== "admin") {
              await pool.query(`UPDATE users SET role='admin' WHERE id=$1`, [userId]);
            }
          }

          if (!userId) {
            console.error("Failed to get or create user for google sign-in", { email });
            return false;
          }

          // Upsert account link
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

    async jwt({ token, user }) {
      try {
        // carry over basics
        if (user?.id) {
          (token as any).userId = (user as any).id;
          token.email = (user as any).email ?? token.email;
          token.name = (user as any).name ?? token.name;
        }

        // Prefer role from freshly-authorized user (credentials flow includes role)
        if ((user as any)?.role) {
          (token as any).role = (user as any).role;
          return token;
        }

        // If role not on token, fetch once from DB (by id if possible, else by email)
        if (!(token as any).role) {
          if ((token as any).userId) {
            const r = await pool.query(`SELECT role FROM users WHERE id=$1 LIMIT 1`, [
              (token as any).userId,
            ]);
            if (r.rows[0]?.role) (token as any).role = r.rows[0].role;
          } else if (token.email) {
            const r = await pool.query(`SELECT id, role FROM users WHERE email=$1 LIMIT 1`, [
              token.email,
            ]);
            if (r.rows[0]?.role) (token as any).role = r.rows[0].role;
            if (r.rows[0]?.id) (token as any).userId = r.rows[0].id;
          }
        }
      } catch (e) {
        console.error("jwt callback error:", e);
      }
      return token;
    },

    async session({ session, token }) {
      if ((token as any)?.userId) (session.user as any).id = (token as any).userId;
      if ((token as any)?.role) (session.user as any).role = (token as any).role;
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
