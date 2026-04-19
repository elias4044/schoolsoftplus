import { useEffect, useState } from "react";

interface Session {
  app: boolean;
  language: {
    langId: number;
    langCode: string;
  };
  adminLoggedInAsUser: boolean;
  hasProtectedIdentityViewAccess: boolean;
  calendarVersion: number;
  superUser: boolean;
  superLoggedInAsUser: boolean;
  printLogoUrl: string;
  organization: {
    id: number;
    name: string;
    school: boolean;
  };
  samlRedirect: boolean;
  theme: string;
  userType: {
    id: number;
    name: string;
  };
  user: {
    id: number;
    firstName: string;
    lastName: string;
    userName: string;
    email: string;
  };
  // Injected by our /api/session route
  school: string;
  username: string;
}

interface UseSessionResult {
  session: Session | null;
  loading: boolean;
  error: string | null;
}

export function useSession(): UseSessionResult {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSession() {
      try {
        setLoading(true);
        const res = await fetch("/api/session");
        const data = await res.json();

        if (data.success) {
          setSession(data.session);
        } else {
          setError(data.error || "Failed to fetch session.");
        }
      } catch (err) {
        setError("An error occurred while fetching session.");
      } finally {
        setLoading(false);
      }
    }

    fetchSession();
  }, []);

  return { session, loading, error };
}