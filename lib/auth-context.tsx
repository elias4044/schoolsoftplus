"use client";

import React, { createContext, useContext, useCallback, useEffect, useRef } from "react";
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

  const refreshInFlight = useRef(false);

  // login() is a no-op — the browser already has the cookies set by the auth flow.
  // Callers should simply redirect to /dashboard after authentication succeeds.
  const login = useCallback(() => {
    router.replace("/dashboard");
  }, [router]);

  const logout = useCallback(async () => {
    await fetch("/api/logout", { method: "POST" });
    router.replace("/login");
  }, [router]);

  /* ── AuthV2 proactive token refresh (safe + single in-flight) ──
     Refresh when fewer than 5 minutes remain on the SS token.
     Protects against overlapping refreshes and unhandled rejections.
  ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!session || session.authType !== "authv2") return;

    async function maybeRefresh() {
      // Avoid concurrent refresh attempts
      if (refreshInFlight.current) return;

      const expiresAt = getAuthV2ExpiresAt();
      if (!expiresAt) return;

      const secsLeft = expiresAt - Math.floor(Date.now() / 1000);
      if (secsLeft < 300) {
        refreshInFlight.current = true;
        try {
          const res = await fetch("/api/auth/v2/token-refresh", { method: "POST" });
          if (!res.ok) {
            console.warn("[auth] token-refresh failed:", res.status);
          }
        } catch (err) {
          console.error("[auth] token-refresh error:", err);
        } finally {
          refreshInFlight.current = false;
        }
      }
    }

    // Run immediately and then on an interval, catching any unexpected errors.
    maybeRefresh().catch((err) => console.error("[auth] maybeRefresh error:", err));
    const interval = setInterval(() => {
      maybeRefresh().catch((err) => console.error("[auth] maybeRefresh error:", err));
    }, 60 * 1000);

    return () => {
      clearInterval(interval);
      refreshInFlight.current = false;
    };
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

