// src/lib/unifiedAuth.ts
"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

type UnifiedAuth = {
  isAuthenticated: boolean;
  email: string | null;
  id: string | null;
  source: "nextauth" | "jwt" | null;
};

function parseJwtPayload(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()\[\]\\/+^])/g, "\\$1") + "=([^;]*)"));
  return match ? decodeURIComponent(match[1]) : null;
}

export function useUnifiedAuth(): UnifiedAuth {
  const { data: nextAuthSession, status } = useSession();
  const [jwtUser, setJwtUser] = useState<{ email: string | null; id: string | null } | null>(null);

  useEffect(() => {
    // Fallback to our app JWT if NextAuth is unauthenticated
    if (status !== "authenticated") {
      const token = getCookie("app_token") || getCookie("session");
      if (token) {
        const payload = parseJwtPayload(token);
        const email = typeof payload?.email === "string" ? payload.email : null;
        const id = typeof payload?.sub === "string" ? payload.sub : null;
        setJwtUser({ email, id });
      } else {
        setJwtUser(null);
      }
    } else {
      setJwtUser(null);
    }
  }, [status]);

  return useMemo<UnifiedAuth>(() => {
    if (status === "authenticated" && nextAuthSession?.user?.email) {
      // Prefer NextAuth when available
      const idVal = (nextAuthSession.user as any).id || null;
      return {
        isAuthenticated: true,
        email: String(nextAuthSession.user.email),
        id: idVal ? String(idVal) : null,
        source: "nextauth",
      };
    }

    if (jwtUser?.email) {
      return {
        isAuthenticated: true,
        email: jwtUser.email,
        id: jwtUser.id || null,
        source: "jwt",
      };
    }

    return { isAuthenticated: false, email: null, id: null, source: null };
  }, [nextAuthSession, status, jwtUser]);
}

