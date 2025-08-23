// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret"; // must match backend signing secret

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const pathname = req.nextUrl.pathname;

  // Grab token from cookie or Authorization header
  const authHeader = req.headers.get("authorization");
  const rawToken =
    authHeader?.replace("Bearer ", "") ||
    req.cookies.get("app_token")?.value ||
    req.cookies.get("session")?.value ||
    null;

  let payload: any = null;
  if (rawToken) {
    try {
      payload = jwt.verify(rawToken, JWT_SECRET);
    } catch (err) {
      console.error("Invalid JWT:", (err as any).message);
    }
  }

  const isAuth = Boolean(payload);
  const isEmailVerified = Boolean(payload?.email_verified);

  const isDashboard = pathname.startsWith("/dashboard");
  const isLoginOrSignup = ["/login", "/signup"].includes(pathname);

  // 🚨 Login required
  if (!isAuth && isDashboard) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 🚨 Require verified email before accessing dashboard
  if (isAuth && !isEmailVerified && isDashboard) {
    return NextResponse.redirect(new URL("/verify-email", req.url));
  }

  // 🚨 Prevent logged-in users from seeing /login or /signup again
  if (isAuth && isEmailVerified && isLoginOrSignup) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup", "/verify-email"],
};
