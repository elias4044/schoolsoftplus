import { ReactNode, useEffect } from "react";
import { useAuthContext } from "@/lib/auth-context";

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { theme } = useAuthContext();

  useEffect(() => {
    document.documentElement.style.cssText = `var(--theme-${theme})`;
  }, [theme]);

  return <>{children}</>;
};