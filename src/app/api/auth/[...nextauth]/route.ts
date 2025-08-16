// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { PostgresAdapter } from "@/lib/pgAdapter";
import { pool } from "@/lib/db"; // Ensure you have a db.ts that exports pool

export const authOptions = {
  adapter: PostgresAdapter(),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "email@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required.");
        }

        try {
          // Query user directly from Postgres
          const { rows } = await pool.query(
            "SELECT id, email, password, email_verified, name FROM users WHERE email = $1 LIMIT 1",
            [credentials.email]
          );

          const user = rows[0];
          if (!user) throw new Error("No account found with this email.");

          // Require verified email before login
          if (!user.email_verified) {
            throw new Error("Please verify your email before logging in.");
          }

          // Compare password
          const isValid = await bcrypt.compare(credentials.password, user.password);
          if (!isValid) throw new Error("Invalid password.");

          // Return user object (without password!)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (err: any) {
          console.error("Authorize error:", err.message);
          throw new Error(err.message || "Invalid login credentials.");
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      try {
        // Link Google account to existing user if email exists
        if (account?.provider === "google" && user?.email) {
          const { rows } = await pool.query(
            "SELECT id FROM users WHERE email = $1 LIMIT 1",
            [user.email]
          );

          const existingUser = rows[0];
          if (existingUser) {
            await fetch(`${process.env.NEXTAUTH_URL}/api/auth/linkAccount`, {
              method: "POST",
              body: JSON.stringify({
                userId: existingUser.id,
                account,
              }),
              headers: { "Content-Type": "application/json" },
            });
          }
        }
        return true;
      } catch (err) {
        console.error("NextAuth signIn callback error:", err);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
