// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import type { NextRequest } from "next/server";
import { authOptions } from "@/lib/authOptions";

const nextAuthHandler = NextAuth(authOptions);

const PROD_FALLBACK_HOST = "tradiaai.app";

const resolveRequestBase = (request: NextRequest): string | null => {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host");
  if (!host) return null;

  const cleanHost = host.trim().toLowerCase();
  if (!cleanHost) return null;

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const protocol = forwardedProto || (cleanHost.includes("localhost") ? "http" : "https");

  return `${protocol}://${cleanHost}`;
};

const applySafeNextAuthUrl = (request: NextRequest) => {
  const requestBase = resolveRequestBase(request);
  const isProd = process.env.NODE_ENV === "production";

  if (isProd) {
    if (requestBase && !requestBase.includes("localhost")) {
      process.env.NEXTAUTH_URL = requestBase;
      return;
    }
    process.env.NEXTAUTH_URL = `https://${PROD_FALLBACK_HOST}`;
    return;
  }

  if (requestBase) {
    process.env.NEXTAUTH_URL = requestBase;
  }
};

const handler = async (request: NextRequest, context: unknown) => {
  applySafeNextAuthUrl(request);
  return nextAuthHandler(request, context as any);
};

export { handler as GET, handler as POST };
