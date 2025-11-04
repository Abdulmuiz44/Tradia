// src/app/api/auth/[...nextauth]/route.ts
import NextAuth, { type NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import TwitterProvider from "next-auth/providers/twitter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createAdminSupabase } from "@/utils/supabase/admin";

const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),

    TwitterProvider({
      clientId: process.env.TWITTER_CLIENT_ID ?? "",
      clientSecret: process.env.TWITTER_CLIENT_SECRET ?? "",
    }),

    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const supabase = createAdminSupabase();

        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required.");
        }

        const email = credentials.email.toLowerCase().trim();
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("email", email)
          .single();

        if (error || !data) {
          throw new Error("Invalid email or password.");
        }

        // Check if email is verified
        if (!data.email_verified) {
          throw new Error("Email not verified. Please check your email.");
        }

        const valid = await bcrypt.compare(credentials.password, data.password);
        if (!valid) {
          throw new Error("Invalid email or password.");
        }

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
  try {
    const supabase = createAdminSupabase();
    const email = user.email?.toLowerCase();
        if (!email) return false;

    // Ensure profile row exists (legacy profile table)
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

    // Ensure primary users row exists (merge manual + OAuth by email)
  const { data: existingUser } = await supabase
    .from("users")
    .select("id, email")
    .eq("email", email)
          .maybeSingle();

  if (!existingUser) {
  await supabase.from("users").insert({
    email,
    name: user.name ?? "",
    email_verified: true,
    plan: "free",
    role: "trader",
    image: (user as any).image ?? null,
    created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      });
        }

      return true;
      } catch (error) {
        console.error("signIn callback DB error:", error);
        // Allow sign in even if DB operations fail
        return true;
      }
    },

    async jwt({ token }) {
      const supabase = createAdminSupabase();
      const email = token.email as string;
      if (!email) return token;

      try {
        // Prefer users table as the canonical identity
        const { data: userRow } = await supabase
          .from("users")
          .select("id, name, email, plan, role, image")
          .eq("email", email)
          .maybeSingle();

        if (userRow) {
          token.profile = {
            id: userRow.id,
            name: userRow.name,
            email: userRow.email,
            plan: (userRow as any).plan,
            role: (userRow as any).role,
            image: userRow.image,
          } as any;
        }
      } catch (error) {
        console.error("jwt callback DB lookup failed:", error);
        // Continue without profile data
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token.profile) {
        session.user = {
          ...(session.user as any),
          ...(token.profile as any),
        } as any;
      }
      return session;
    },
  },

  session: { strategy: "jwt" },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
