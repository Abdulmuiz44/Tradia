// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import jwt from "jsonwebtoken"; // <--- make sure installed
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret"; // same secret you used to sign tokens

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const pathname = req.nextUrl.pathname;

  // Supabase client (if you still want to support Supabase auth)
  const supabase = createMiddlewareClient({ req, res });

  let supabaseUser = null;
  try {
    const { data } = await supabase.auth.getUser();
    supabaseUser = data?.user ?? null;
  } catch (err) {
    supabaseUser = null;
  }

  // Try NextAuth token
  let nextAuthToken = null;
  try {
    nextAuthToken = await getToken({ req }) ?? null;
  } catch (err) {
    nextAuthToken = null;
  }

  // Try custom JWT from Authorization header or cookie
  let customJwtPayload: any = null;
  const authHeader = req.headers.get("authorization");
  const cookieToken = req.cookies.get("app_token")?.value; // adjust name if you use a cookie
  const rawToken = authHeader?.replace("Bearer ", "") || cookieToken;

  if (rawToken) {
    try {
      customJwtPayload = jwt.verify(rawToken, JWT_SECRET);
    } catch (err) {
      console.error("Invalid custom JWT:", err);
    }
  }

  // Auth detection
  const isAuth = Boolean(supabaseUser || nextAuthToken || customJwtPayload);

  // Email verification detection
  const supabaseEmailVerified =
    Boolean(
      supabaseUser &&
        (supabaseUser.email_confirmed_at ||
          (supabaseUser as any).confirmed_at ||
          (supabaseUser as any).user_metadata?.emailVerified)
    ) ?? false;

  const nextAuthEmailVerified =
    Boolean(
      nextAuthToken &&
        ((nextAuthToken as any).emailVerified || (nextAuthToken as any).email_verified)
    ) ?? false;

  const customEmailVerified =
    Boolean(customJwtPayload?.email_verified) ?? false;

  const isEmailVerified =
    supabaseEmailVerified || nextAuthEmailVerified || customEmailVerified;

  // Path checks
  const isDashboard = pathname.startsWith("/dashboard");
  const isLoginOrSignup = ["/login", "/signup"].includes(pathname);

  // Redirect flows
  if (!isAuth && isDashboard) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAuth && !isEmailVerified && isDashboard) {
    return NextResponse.redirect(new URL("/verify-email", req.url));
  }

  if (isAuth && isLoginOrSignup) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup", "/verify-email"],
};
