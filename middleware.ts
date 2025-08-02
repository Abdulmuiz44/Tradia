import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const isAuth = !!token;
  const isEmailVerified = token?.emailVerified;

  const isDashboard = req.nextUrl.pathname.startsWith("/dashboard");
  const isLoginOrSignup = ["/login", "/signup"].includes(req.nextUrl.pathname);

  if (!isAuth && isDashboard) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAuth && !isEmailVerified && isDashboard) {
    return NextResponse.redirect(new URL("/verify-email", req.url));
  }

  if (isAuth && isLoginOrSignup) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
};
