// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createClient } from "@/utils/supabase/server";

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
    async signIn({ user }) {
      const supabase = createClient();
      const email = user.email?.toLowerCase();
      if (!email) return false;

      // Ensure profile row exists
      const { data: profile } = await supabase
        .from("profile")
        .select("id")
        .eq("email", email)
        .single();

      if (!profile) {
        await supabase.from("profile").insert({
          email,
          name: user.name ?? "",
          country: "",
          phone: "",
          tradingStyle: "",
          tradingExperience: "",
          bio: "",
          image: user.image ?? "",
          created_at: new Date().toISOString(),
        });
      }

      return true;
    },

    async jwt({ token }) {
      const supabase = createClient();
      const email = token.email as string;
      if (!email) return token;

      const { data: profile } = await supabase
        .from("profile")
        .select("id, name, email, country, phone, tradingStyle, tradingExperience, bio, image")
        .eq("email", email)
        .single();

      if (profile) {
        token.profile = {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          country: profile.country,
          phone: profile.phone,
          tradingStyle: profile.tradingStyle,
          tradingExperience: profile.tradingExperience,
          bio: profile.bio,
          image: profile.image,
        };
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token.profile) {
        session.user = {
          ...(session.user as any),
          ...(token.profile as any),
        };
      }
      return session;
    },
  },

  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
