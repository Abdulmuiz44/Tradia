// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret"; // must match backend signing secret

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  const res = NextResponse.next();

  // 1️⃣ Grab JWT from cookie or Authorization header
  const authHeader = req.headers.get("authorization");
  const rawToken =
    authHeader?.replace("Bearer ", "") ||
    req.cookies.get("session")?.value ||   // primary cookie from login route
    req.cookies.get("app_token")?.value || // fallback
    null;

  let payload: any = null;

  if (rawToken) {
    try {
      payload = jwt.verify(rawToken, JWT_SECRET);
    } catch (err) {
      console.warn("middleware: invalid JWT", (err as any).message);
      payload = null;
    }
  }

  // 2️⃣ Determine auth state
  const isAuth = Boolean(payload);
  const isEmailVerified = Boolean(payload?.email_verified);

  // 3️⃣ Path checks
  const isDashboard = pathname.startsWith("/dashboard");
  const isLoginOrSignup = ["/login", "/signup"].includes(pathname);

  // 4️⃣ Redirect flows

  // Not logged in → redirect to /login if accessing dashboard
  if (!isAuth && isDashboard) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Logged in but email not verified → redirect to /verify-email
  if (isAuth && !isEmailVerified && isDashboard) {
    return NextResponse.redirect(new URL("/verify-email", req.url));
  }

  // Logged in + verified → prevent /login or /signup
  if (isAuth && isEmailVerified && isLoginOrSignup) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup", "/verify-email"],
};
