import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      subscription?: string;
    };
  }

  interface User {
    id: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
    subscription?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string;
  }
}