// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

/**
 * Middleware that works with BOTH Supabase (via createMiddlewareClient)
 * and NextAuth (via getToken) so your app accepts sessions from either provider.
 *
 * Behavior:
 * - If no session and visiting /dashboard*  => redirect to /login
 * - If session exists but email not verified => redirect to /verify-email (when visiting /dashboard*)
 * - If user is auth'd and visits /login or /signup => redirect to /dashboard
 *
 * Make sure you have:
 * - NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in env
 * - NEXTAUTH_SECRET (for getToken) if you use next-auth
 * - npm i @supabase/auth-helpers-nextjs
 */
export async function middleware(req: NextRequest) {
  // Use a response object we can mutate and return (createMiddlewareClient expects it)
  const res = NextResponse.next();

  // create Supabase middleware client (uses NEXT_PUBLIC_SUPABASE_* env vars)
  const supabase = createMiddlewareClient({ req, res });

  // Try Supabase session/user first
  let supabaseUser = null;
  try {
    const { data } = await supabase.auth.getUser();
    supabaseUser = data?.user ?? null;
  } catch (err) {
    // ignore errors (no supabase session or misconfigured)
    supabaseUser = null;
  }

  // Fallback to NextAuth JWT token (if you use next-auth)
  let nextAuthToken = null;
  try {
    nextAuthToken = await getToken({ req }) ?? null;
  } catch (err) {
    nextAuthToken = null;
  }

  // Auth detection: accept either provider
  const isAuth = Boolean(supabaseUser || nextAuthToken);

  // Email verification detection:
  // - Supabase: user.email_confirmed_at or user.confirmed_at or metadata flag
  // - NextAuth token: token.emailVerified or token.email_verified
  const supabaseEmailVerified =
    Boolean(
      supabaseUser &&
        (supabaseUser.email_confirmed_at ||
          // some setups use confirmed_at
          (supabaseUser as any).confirmed_at ||
          // user_metadata may contain a custom flag
          (supabaseUser as any).user_metadata?.emailVerified)
    ) ?? false;

  const nextAuthEmailVerified =
    Boolean(
      nextAuthToken &&
        ((nextAuthToken as any).emailVerified || (nextAuthToken as any).email_verified)
    ) ?? false;

  const isEmailVerified = Boolean(supabaseEmailVerified || nextAuthEmailVerified);

  // Path checks (same as your original logic)
  const pathname = req.nextUrl.pathname;
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
