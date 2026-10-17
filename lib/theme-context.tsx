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
  | "graphite"
  | "slate"
  | "ocean"
  | "forest"
  | "olive"
  | "warm"
  | "ember"
  | "wine"
  | "plum";

export type AccentColor =
  | "blue"
  | "sky"
  | "emerald"
  | "lime"
  | "amber"
  | "orange"
  | "red"
  | "pink"
  | "violet";

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

/* Metadata for the theme picker UI- in the case of adding any new themes in the global.css file, add it here. Settings page loads from this automatically.  */
export const THEMES: {
  id: AppTheme;
  label: string;
  bg: string;
  surface: string;
}[] = [
  { id: "midnight", label: "Midnight", bg: "#191919", surface: "#222222" },
  { id: "abyss",    label: "Abyss",    bg: "#0e0e0e", surface: "#161616" },
  { id: "dim",      label: "Dim",      bg: "#262626", surface: "#2e2e2e" },
  { id: "graphite", label: "Graphite", bg: "#202020", surface: "#282828" },
  { id: "slate",    label: "Slate",    bg: "#22232a", surface: "#2a2b34" },
  { id: "ocean",    label: "Ocean",    bg: "#101520", surface: "#171e28" },
  { id: "forest",   label: "Forest",   bg: "#101710", surface: "#171f17" },
  { id: "olive",    label: "Olive",    bg: "#171910", surface: "#1f2117" },
  { id: "warm",     label: "Warm",     bg: "#1a1916", surface: "#222019" },
  { id: "ember",    label: "Ember",    bg: "#1c1712", surface: "#252019" },
  { id: "wine",     label: "Wine",     bg: "#1c1215", surface: "#25191c" },
  { id: "plum",     label: "Plum",     bg: "#1b121b", surface: "#241a24" },
];

export const ACCENTS: {
  id: AccentColor;
  label: string;
  color: string;
}[] = [
  { id: "blue",    label: "Blue",    color: "oklch(0.58 0.22 255)" },
  { id: "sky",     label: "Sky",     color: "oklch(0.68 0.16 225)" },
  { id: "emerald", label: "Emerald", color: "oklch(0.62 0.18 160)" },
  { id: "lime",    label: "Lime",    color: "oklch(0.84 0.22 125)" },
  { id: "amber",   label: "Amber",   color: "oklch(0.80 0.17 85)" },
  { id: "orange",  label: "Orange",  color: "oklch(0.66 0.20 50)" },
  { id: "red",     label: "Red",     color: "oklch(0.58 0.23 22)" },
  { id: "pink",    label: "Pink",    color: "oklch(0.62 0.23 350)" },
  { id: "violet",  label: "Violet",  color: "oklch(0.56 0.24 295)" },
];
