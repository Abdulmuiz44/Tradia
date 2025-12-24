// middleware.ts - Authentication & Redirect Protection
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
    const pathname = req.nextUrl.pathname;

    // Skip middleware for API auth routes
    if (pathname.startsWith("/api/auth")) {
        return NextResponse.next();
    }

    // Get NextAuth session token
    const token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
    });

    // Protected dashboard routes - require authentication
    if (pathname.startsWith("/dashboard")) {
        if (!token) {
            // Not authenticated - redirect to login
            return NextResponse.redirect(new URL("/login", req.url));
        }
        // Authenticated - allow access
        return NextResponse.next();
    }

    // Public auth pages - redirect authenticated users to dashboard
    const isAuthPage = ["/login", "/signup"].includes(pathname);
    if (isAuthPage && token) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/dashboard/:path*", "/login", "/signup"],
};
