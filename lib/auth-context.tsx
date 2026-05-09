"use client";

import React, { createContext, useContext, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "./useSession";

/* -- Types ----------------------------------------------- */
export interface AuthSession {
  school: string;
  username: string;
  name?: string;
  theme: string;
  authType?: "classic" | "authv2";
}

interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
  isAuthenticated: boolean;
  theme: string;
}

/* -- Context ---------------------------------------------- */
const AuthContext = createContext<AuthContextValue>({
  session: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
  isAuthenticated: false,
  theme: "light",
});

/** Returns the AuthV2 token expiry timestamp from the client-readable cookie, or null. */
function getAuthV2ExpiresAt(): number | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)ssp_ss_token_expires=([^;]+)/);
  return match ? parseInt(match[1], 10) : null;
}

/** Returns true if the user is logged in via AuthV2 (client cookie). */
function isAuthV2(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.includes("ssp_auth_type=authv2");
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { session: sessionData, loading, error } = useSession();

  // Derive AuthSession from the /api/session response
  const session: AuthSession | null =
    !loading && !error && sessionData
      ? {
          school: sessionData.school,
          username: sessionData.username ?? sessionData.user.userName,
          name: `${sessionData.user.firstName} ${sessionData.user.lastName}`.trim() || undefined,
          theme: sessionData.theme ?? "light",
          authType: isAuthV2() ? "authv2" : "classic",
        }
      : null;

  // login() is a no-op — the browser already has the cookies set by /api/login.
  // Callers should simply redirect to /dashboard after a successful login fetch.
  const login = useCallback(() => {
    router.replace("/dashboard");
  }, [router]);

  const logout = useCallback(async () => {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
  }, [router]);

  /* ── AuthV2 proactive token refresh ───────────────────────
     Refresh when fewer than 5 minutes remain on the SS token.
     This keeps JSESSIONID alive without forcing the user to
     log in again.
  ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!session || session.authType !== "authv2") return;

    async function maybeRefresh() {
      const expiresAt = getAuthV2ExpiresAt();
      if (!expiresAt) return;

      const secsLeft = expiresAt - Math.floor(Date.now() / 1000);
      if (secsLeft < 300) {
        // Token is expiring — refresh silently
        await fetch("/api/auth/v2/token-refresh", { method: "POST" });
      }
    }

    maybeRefresh();
    const interval = setInterval(maybeRefresh, 60 * 1000); // check every minute
    return () => clearInterval(interval);
  }, [session]);

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading: loading,
        login,
        logout,
        isAuthenticated: session !== null,
        theme: session?.theme ?? "light",
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => useContext(AuthContext);
export const useAuth = () => useContext(AuthContext);

