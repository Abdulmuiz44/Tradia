// middleware.ts - TEMPORARY: Disabled for testing
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const res = NextResponse.next();

  // Skip middleware for NextAuth routes and API routes
  if (pathname.startsWith("/api/auth") || pathname.startsWith("/api/")) {
    return res;
  }

  // TEMPORARILY: Allow all dashboard access for testing
  // This will help us determine if NextAuth is creating sessions
  if (pathname.startsWith("/dashboard")) {
    console.log("middleware: TEMP - allowing all dashboard access for testing");
    return res;
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
