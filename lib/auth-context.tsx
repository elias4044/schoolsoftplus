"use client";

import React, { createContext, useContext, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "./useSession";

/* -- Types ----------------------------------------------- */
export interface AuthSession {
  school: string;
  username: string;
  name?: string;
  theme: string;
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
