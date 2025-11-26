// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import jwt from "jsonwebtoken";
import { createClient } from "@/utils/supabase/server";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret"; // must match backend signing secret

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const res = NextResponse.next();

  // Skip middleware for NextAuth routes and API routes
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/")) {
    return res;
  }

  // For dashboard routes, be more permissive
  const isDashboard = pathname.startsWith("/dashboard");

  if (isDashboard) {
    // Try to get user from NextAuth
    const nextAuthToken = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (nextAuthToken?.email || (nextAuthToken?.profile as any)?.email) {
      // Enforce trial: if expired and not paid/grandfathered -> redirect to checkout
      try {
        const apiUrl = new URL("/api/user/trial-status", req.url).toString();
        const r = await fetch(apiUrl, { headers: { cookie: req.headers.get('cookie') || '' } });
        if (r.ok) {
          const data = await r.json();
          const info = data?.info;
          if (info && !info.isPaid && !info.isGrandfathered && info.expired) {
            const url = new URL("/checkout", req.url);
            url.searchParams.set("reason", "trial_expired");
            return NextResponse.redirect(url);
          }
        }
      } catch { }
      return res;
    }

    // Try custom JWT
    const authHeader = req.headers.get("authorization");
    const rawToken =
      authHeader?.replace("Bearer ", "") ||
      req.cookies.get("session")?.value ||
      req.cookies.get("app_token")?.value ||
      null;

    if (rawToken) {
      try {
        const payload = jwt.verify(rawToken, JWT_SECRET);
        const userEmail = typeof payload === 'object' && payload !== null ? (payload as any).email : null;
        if (userEmail) {
          try {
            const apiUrl = new URL("/api/user/trial-status", req.url).toString();
            const r = await fetch(apiUrl, { headers: { cookie: req.headers.get('cookie') || '' } });
            if (r.ok) {
              const data = await r.json();
              const info = data?.info;
              if (info && !info.isPaid && !info.isGrandfathered && info.expired) {
                const url = new URL("/checkout", req.url);
                url.searchParams.set("reason", "trial_expired");
                return NextResponse.redirect(url);
              }
            }
          } catch { }
          return res;
        }
      } catch (err) {
        console.warn("middleware: invalid JWT", (err as any).message);
      }
    }

    // If no valid auth found, redirect to login
    console.log("middleware: no valid auth found, redirecting to login");
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // For login/signup pages, redirect if already authenticated
  const isLoginOrSignup = ["/login", "/signup"].includes(pathname);

  if (isLoginOrSignup) {
    const nextAuthToken = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (nextAuthToken?.email || (nextAuthToken?.profile as any)?.email) {
      console.log("middleware: authenticated user trying to access login, redirecting to dashboard");
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup", "/verify-email"],
};
