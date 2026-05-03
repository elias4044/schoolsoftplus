"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";

export type AppTheme =
  | "midnight"
  | "abyss"
  | "dim"
  | "warm"
  | "forest"
  | "ocean";

export type AccentColor =
  | "violet"
  | "blue"
  | "cyan"
  | "green"
  | "rose"
  | "amber";

export interface ThemeContextValue {
  theme: AppTheme;
  accent: AccentColor;
  setTheme: (t: AppTheme) => void;
  setAccent: (a: AccentColor) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "midnight",
  accent: "violet",
  setTheme: () => {},
  setAccent: () => {},
});

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>("midnight");
  const [accent, setAccentState] = useState<AccentColor>("violet");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = (localStorage.getItem("ssp_theme") as AppTheme) ?? "midnight";
    const a = (localStorage.getItem("ssp_accent") as AccentColor) ?? "violet";
    setThemeState(t);
    setAccentState(a);
    document.documentElement.setAttribute("data-theme", t);
    document.documentElement.setAttribute("data-accent", a);
    setMounted(true);
  }, []);

  const setTheme = useCallback((t: AppTheme) => {
    setThemeState(t);
    localStorage.setItem("ssp_theme", t);
    document.documentElement.setAttribute("data-theme", t);
  }, []);

  const setAccent = useCallback((a: AccentColor) => {
    setAccentState(a);
    localStorage.setItem("ssp_accent", a);
    document.documentElement.setAttribute("data-accent", a);
  }, []);

  // Avoid flash — render children immediately; attrs applied before paint
  return (
    <ThemeContext.Provider value={{ theme, accent, setTheme, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useAppTheme = () => useContext(ThemeContext);

/* Metadata for the theme picker UI  */
export const THEMES: { id: AppTheme; label: string; bg: string; surface: string }[] = [
  { id: "midnight", label: "Midnight",  bg: "#191919", surface: "#222222" },
  { id: "abyss",    label: "Abyss",     bg: "#0e0e0e", surface: "#161616" },
  { id: "dim",      label: "Dim",       bg: "#262626", surface: "#2e2e2e" },
  { id: "warm",     label: "Warm",      bg: "#1a1916", surface: "#222019" },
  { id: "forest",   label: "Forest",    bg: "#101710", surface: "#171f17" },
  { id: "ocean",    label: "Ocean",     bg: "#101520", surface: "#171e28" },
];

export const ACCENTS: { id: AccentColor; label: string; color: string }[] = [
  { id: "violet", label: "Violet", color: "oklch(0.65 0.22 278)" },
  { id: "blue",   label: "Blue",   color: "oklch(0.65 0.18 240)" },
  { id: "cyan",   label: "Cyan",   color: "oklch(0.72 0.16 195)" },
  { id: "green",  label: "Green",  color: "oklch(0.68 0.18 148)" },
  { id: "rose",   label: "Rose",   color: "oklch(0.65 0.22 10)"  },
  { id: "amber",  label: "Amber",  color: "oklch(0.75 0.18 70)"  },
];
