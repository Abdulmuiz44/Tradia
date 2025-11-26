// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const res = NextResponse.next();

  // Skip middleware for NextAuth routes and API routes
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/")) {
    return res;
  }

  // For dashboard routes
  const isDashboard = pathname.startsWith("/dashboard");

  if (isDashboard) {
    // Check for NextAuth session cookie (simpler and more reliable)
    const sessionToken = req.cookies.get('next-auth.session-token')?.value ||
      req.cookies.get('__Secure-next-auth.session-token')?.value;

    if (sessionToken) {
      console.log("middleware: NextAuth session found, allowing dashboard access");
      return res;
    }

    // Try custom JWT as fallback
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
    const sessionToken = req.cookies.get('next-auth.session-token')?.value ||
      req.cookies.get('__Secure-next-auth.session-token')?.value;

    if (sessionToken) {
      console.log("middleware: authenticated user trying to access login, redirecting to dashboard");
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup", "/verify-email"],
};
