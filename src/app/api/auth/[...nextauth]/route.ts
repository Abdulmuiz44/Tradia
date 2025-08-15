// app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcrypt";
import { PostgresAdapter } from "@/lib/pgAdapter";

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
        if (!credentials?.email || !credentials?.password) return null;

        // fetch user by email
        const res = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/user?email=${credentials.email}`);
        const user = await res.json();

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        return isValid ? user : null;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      try {
        // Link Google account to existing user if email exists
        if (account?.provider === "google" && user?.email) {
          const res = await fetch(`${process.env.NEXTAUTH_URL}/api/auth/user?email=${user.email}`);
          const existingUser = await res.json();

          if (existingUser) {
            await fetch(`${process.env.NEXTAUTH_URL}/api/auth/linkAccount`, {
              method: "POST",
              body: JSON.stringify({
                userId: existingUser.id,
                account,
              }),
              headers: { "Content-Type": "application/json" },
            });
            return true;
          }
        }
        return true;
      } catch (err) {
        console.error("NextAuth signIn callback error:", err);
        return false;
      }
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
