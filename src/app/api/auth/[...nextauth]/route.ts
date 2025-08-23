// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createClient } from "@/utils/supabase/server"; // 🔑 use supabase server client
import type { AdapterUser } from "next-auth/adapters";
import type { Account, Profile, User, Session } from "next-auth";
import type { JWT } from "next-auth/jwt";

if (!process.env.NEXTAUTH_URL) {
  console.warn("⚠️ NEXTAUTH_URL not set");
}
if (!process.env.NEXTAUTH_SECRET) {
  console.warn("⚠️ NEXTAUTH_SECRET not set");
}

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),

    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const supabase = createClient();

        if (!credentials?.email || !credentials?.password) return null;

        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("email", credentials.email.toLowerCase().trim())
          .single();

        if (error || !data) return null;

        const valid = await bcrypt.compare(credentials.password, data.password);
        if (!valid) return null;

        return {
          id: String(data.id),
          name: data.name,
          email: data.email,
        };
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      const supabase = createClient();

      if (account?.provider === "google") {
        const email = user.email?.toLowerCase();
        if (!email) return false;

        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("email", email)
          .single();

        if (!existingUser) {
          await supabase.from("users").insert({
            name: user.name,
            email,
            image: user.image,
            created_at: new Date().toISOString(),
          });
        }
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        // cast to any to attach custom fields set in jwt callback
        const su: any = session.user as any;
        su.id = token.id as string;
        su.email = token.email as string;
        su.name = token.name as string;
      }
      return session;
    },
  },

  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
