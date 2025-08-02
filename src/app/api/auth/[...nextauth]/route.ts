import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { NextAuthOptions } from "next-auth";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Allow only specific emails to sign in (optional: store a list or use DB later)
      const allowedEmails = ["abdulmuizproject@gmail.com"]; // replace with dynamic check later
      if (user?.email && allowedEmails.includes(user.email)) {
        return true;
      }
      return false; // deny access if not pre-registered
    },
    async session({ session, token }) {
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
    error: "/auth/signup",
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
