// app/api/auth/[...nextauth]/route.ts

// quick debug - safe (does not log secret contents)
console.log("NEXTAUTH_URL:", process.env.NEXTAUTH_URL);
console.log("GOOGLE_CLIENT_ID present?:", !!process.env.GOOGLE_CLIENT_ID);
console.log("GOOGLE_CLIENT_SECRET present?:", !!process.env.GOOGLE_CLIENT_SECRET);


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
    async signIn({ user, account, profile }) {
      try {
        // Google flow: link or create user + store account row
        if (account?.provider === "google") {
          const provider = account.provider;
          const providerAccountId = account.providerAccountId;
          const email = (user?.email ?? profile?.email ?? "").toLowerCase();

          if (!providerAccountId || !email) {
            console.error("Google signIn missing providerAccountId or email", { providerAccountId, email });
            return false;
          }

          // If account already exists, allow
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

          // Create user if doesn't exist
          if (!userId) {
            // Adjust INSERT to match your users table columns if needed
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

          // Insert account link
          await pool.query(
            `INSERT INTO accounts (user_id, provider, provider_account_id, type, access_token, token_type, expires_at, scope, id_token, session_state, created_at, updated_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())
             ON CONFLICT (provider, provider_account_id) DO UPDATE
               SET user_id = EXCLUDED.user_id, access_token = EXCLUDED.access_token, id_token = EXCLUDED.id_token, updated_at = NOW()`,
            [
              userId,
              provider,
              providerAccountId,
              account.type ?? null,
              account.access_token ?? null,
              account.token_type ?? null,
              account.expires_at ? new Date(account.expires_at * 1000) : null,
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
        if (user?.id) {
          token.userId = user.id;
          token.email = (user as any).email ?? token.email;
          token.name = (user as any).name ?? token.name;
        } else if (!token.userId && token.email) {
          const r = await pool.query(`SELECT id FROM users WHERE email=$1 LIMIT 1`, [token.email]);
          if (r.rows[0]?.id) token.userId = r.rows[0].id;
        }
      } catch (e) {
        console.error("jwt callback error:", e);
      }
      return token;
    },

    async session({ session, token }) {
      if (token?.userId) (session.user as any).id = token.userId;
      return session;
    },
  },

  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    // optionally add custom sign-in page if you have one:
    // signIn: "/login"
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
