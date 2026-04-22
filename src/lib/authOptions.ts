
// src/lib/authOptions.ts
import GoogleProvider from "next-auth/providers/google";
import TwitterProvider from "next-auth/providers/twitter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { createAdminSupabase } from "@/utils/supabase/admin";
import type { NextAuthOptions } from "next-auth";

const DEFAULT_PROD_BASE_URL = "https://tradiaai.app";

const sanitizeUrl = (raw?: string | null): string | null => {
  if (!raw) return null;

  const trimmed = raw.trim().replace(/^['"]+|['"]+$/g, "");
  if (!trimmed) return null;

  const repaired = trimmed.replace(/^([a-zA-Z][a-zA-Z0-9+\-.]*)"\/\//, "$1://");

  try {
    return new URL(repaired).origin;
  } catch {
    return null;
  }
};

const resolveSafeBaseUrl = (baseUrl: string): string => {
  const isProd = process.env.NODE_ENV === "production";
  const candidates = [
    sanitizeUrl(baseUrl),
    sanitizeUrl(process.env.NEXTAUTH_URL),
    sanitizeUrl(process.env.NEXT_PUBLIC_BASE_URL),
  ].filter(Boolean) as string[];

  const firstNonLocal = candidates.find((candidate) => !candidate.includes("localhost"));
  if (isProd && firstNonLocal) return firstNonLocal;

  const firstCandidate = candidates[0];
  if (firstCandidate) return firstCandidate;

  return isProd ? DEFAULT_PROD_BASE_URL : "http://localhost:3000";
};

export const authOptions: NextAuthOptions = {
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
          // Create new user with the OAuth provider's user ID
          const userId = (user as any).id || crypto.randomUUID();
          const { error: insertError } = await supabase.from("users").upsert({
            id: userId,
            email,
            name: user.name ?? "",
            email_verified: true,
            plan: "starter",
            role: "trader",
            image: (user as any).image ?? null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }, { onConflict: "email" });

          if (insertError) {
            console.error("Failed to create user in signIn callback:", insertError);
          }
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

    async redirect({ url, baseUrl }) {
      const safeBaseUrl = resolveSafeBaseUrl(baseUrl);

      // Allows relative callback URLs
      if (url.startsWith("/")) return `${safeBaseUrl}${url}`;
      // Allows callback URLs on the same origin
      const safeCallbackUrl = sanitizeUrl(url);
      if (safeCallbackUrl && safeCallbackUrl === safeBaseUrl) return url;
      // Default redirect to dashboard after successful login
      return `${safeBaseUrl}/dashboard`;
    },
  },

  session: { strategy: "jwt" },
  pages: {
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
