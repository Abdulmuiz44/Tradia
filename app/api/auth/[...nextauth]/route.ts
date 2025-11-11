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
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
        },
      },
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
        try {
          const supabase = createAdminSupabase();

          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          const email = credentials.email.toLowerCase().trim();
          const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("email", email)
            .single();

          if (error || !data) {
            return null;
          }

          // Check if email is verified
          if (!data.email_verified) {
            return null;
          }

          // Verify password
          if (!data.password) {
            return null;
          }

          const valid = await bcrypt.compare(credentials.password, data.password);
          if (!valid) {
            return null;
          }

          return {
            id: String(data.id),
            name: data.name,
            email: data.email,
            image: data.image,
          };
        } catch (error) {
          console.error("Credentials authorization error:", error);
          return null;
        }
      },
    }),
  ],

  callbacks: {
  async signIn({ user, account }) {
  try {
    const supabase = createAdminSupabase();
    const email = user.email?.toLowerCase();
        if (!email) return false;

    // For Google OAuth, ensure user exists in database
    if (account?.provider === "google") {
      // Check if user exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, email, email_verified, image")
        .eq("email", email)
        .maybeSingle();

      if (!existingUser) {
        // Create new user for Google OAuth
        await supabase.from("users").insert({
          email,
          name: user.name ?? "",
          email_verified: true,
          plan: "free",
          role: "trader",
          image: user.image ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        // Update existing user to mark email as verified
        await supabase
          .from("users")
          .update({
            email_verified: true,
            image: user.image ?? existingUser.image,
            updated_at: new Date().toISOString(),
          })
          .eq("email", email);
      }
    }

    // Ensure profile row exists (legacy profile table)
  const { data: profile } = await supabase
    .from("profile")
    .select("id")
    .eq("email", email)
          .maybeSingle();

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
      } catch (error) {
        console.error("signIn callback DB error:", error);
        // Allow sign in even if DB operations fail
        return true;
      }
    },

    async jwt({ token, user, account }) {
      // On initial sign in, add user info to token
      if (user) {
        token.userId = user.id;
      }

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
          token.userId = userRow.id;
          token.name = userRow.name;
          token.plan = (userRow as any).plan;
          token.role = (userRow as any).role;
          token.image = userRow.image;
        }
      } catch (error) {
        console.error("jwt callback DB lookup failed:", error);
        // Continue without profile data
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.userId;
        (session.user as any).plan = token.plan;
        (session.user as any).role = token.role;
        session.user.name = token.name as string;
        session.user.image = token.image as string;
      }
      return session;
    },
  },

  session: { strategy: "jwt" },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
