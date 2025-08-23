// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import jwt from "jsonwebtoken";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret"; // MUST match server-side JWT signing secret

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const pathname = req.nextUrl.pathname;

  // Supabase client (optional if you still support Supabase sessions)
  const supabase = createMiddlewareClient({ req, res });

  // 1) Try Supabase session/user
  let supabaseUser = null;
  try {
    const { data } = await supabase.auth.getUser();
    supabaseUser = data?.user ?? null;
  } catch {
    supabaseUser = null;
  }

  // 2) Try NextAuth token (optional)
  let nextAuthToken = null;
  try {
    nextAuthToken = (await getToken({ req })) ?? null;
  } catch {
    nextAuthToken = null;
  }

  // 3) Try custom JWT token from common places (Authorization header or cookies)
  let customJwtPayload: any = null;
  const authHeader = req.headers.get("authorization");
  // Check several cookie names that might be used by your app (robust)
  const cookieCandidates = [
    req.cookies.get("session")?.value,
    req.cookies.get("app_token")?.value,
    req.cookies.get("access_token")?.value,
  ].filter(Boolean);

  const rawToken = authHeader?.replace("Bearer ", "") || cookieCandidates[0] || null;

  if (rawToken) {
    try {
      customJwtPayload = jwt.verify(rawToken, JWT_SECRET);
    } catch (err) {
      // invalid/expired token — silently ignore (treated as unauthenticated)
      console.error("middleware: invalid custom JWT:", (err as any)?.message ?? err);
      customJwtPayload = null;
    }
  }

  // Determine "is authenticated"
  const isAuth = Boolean(supabaseUser || nextAuthToken || customJwtPayload);

  // Determine "is email verified"
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

  const customEmailVerified = Boolean(customJwtPayload?.email_verified) ?? false;

  const isEmailVerified = supabaseEmailVerified || nextAuthEmailVerified || customEmailVerified;

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
