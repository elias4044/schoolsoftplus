"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Droplets,
  Wind,
  Thermometer,
  MapPin,
  Search,
  RefreshCw,
  AlertCircle,
  Navigation,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WidgetSize } from "@/lib/widgets/types";

/* ---------- types ---------- */
interface WeatherData {
  city: string;
  country: string;
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  description: string;
  isDay: boolean;
  sunrise: number;
  sunset: number;
  timezone: string;
  dt: number;
}

type LoadState = "idle" | "loading" | "ok" | "error" | "denied";

/* ---------- OWM condition → visual config ---------- */
const CONDITION_CONFIG: Record<
  string,
  { emoji: string; gradient: string; accent: string }
> = {
  Clear:        { emoji: "☀️",  gradient: "from-amber-500/20 via-orange-400/10 to-transparent", accent: "oklch(0.82 0.18 75)" },
  Clouds:       { emoji: "☁️",  gradient: "from-slate-400/20 via-slate-500/10 to-transparent",  accent: "oklch(0.72 0.03 260)" },
  Rain:         { emoji: "🌧️", gradient: "from-blue-500/20 via-sky-400/10 to-transparent",      accent: "oklch(0.68 0.18 230)" },
  Drizzle:      { emoji: "🌦️", gradient: "from-sky-400/20 via-blue-300/10 to-transparent",      accent: "oklch(0.72 0.15 220)" },
  Thunderstorm: { emoji: "⛈️", gradient: "from-violet-600/25 via-purple-500/10 to-transparent", accent: "oklch(0.65 0.22 285)" },
  Snow:         { emoji: "❄️",  gradient: "from-sky-200/20 via-blue-100/10 to-transparent",      accent: "oklch(0.82 0.08 215)" },
  Mist:         { emoji: "🌫️", gradient: "from-slate-300/15 via-slate-400/10 to-transparent",   accent: "oklch(0.70 0.02 260)" },
  Fog:          { emoji: "🌫️", gradient: "from-slate-300/15 via-slate-400/10 to-transparent",   accent: "oklch(0.70 0.02 260)" },
  Haze:         { emoji: "🌫️", gradient: "from-amber-300/15 via-yellow-200/10 to-transparent",  accent: "oklch(0.82 0.10 80)"  },
};
const DEFAULT_CONDITION = { emoji: "🌡️", gradient: "from-primary/20 via-primary/5 to-transparent", accent: "oklch(0.65 0.22 278)" };

function conditionConfig(condition: string) {
  return CONDITION_CONFIG[condition] ?? DEFAULT_CONDITION;
}

/* ---------- tiny helpers ---------- */
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const STORAGE_KEY = "ssp_weather_city";

/* ================================================================
   WeatherWidget
   ================================================================ */
export default function WeatherWidget({ size }: { size: WidgetSize }) {
  const [state, setState]     = useState<LoadState>("idle");
  const [data, setData]       = useState<WeatherData | null>(null);
  const [error, setError]     = useState("");
  const [query, setQuery]     = useState("");
  const [searching, setSearching] = useState(false);
  const inputRef  = useRef<HTMLInputElement>(null);

  const compact  = size === "1x1" || size === "2x1" || size === "4x1";
  const wide     = size === "4x1" || size === "4x2";

  /* --- fetch helpers --- */
  const fetchWeather = useCallback(async (params: string) => {
    setState("loading");
    setError("");
    try {
      const res = await fetch(`/api/weather?${params}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? "Failed to load weather");
      setData(json.data);
      setState("ok");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setState("error");
    }
  }, []);

  const fetchByCoords = useCallback((lat: number, lon: number) => {
    fetchWeather(`lat=${lat}&lon=${lon}`);
  }, [fetchWeather]);

  const fetchByCity = useCallback((city: string) => {
    fetchWeather(`city=${encodeURIComponent(city)}`);
    localStorage.setItem(STORAGE_KEY, city);
  }, [fetchWeather]);

  /* --- auto-load on mount --- */
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      fetchByCity(saved);
      return;
    }
    if (!navigator.geolocation) {
      setState("idle");
      return;
    }
    setState("loading");
    navigator.geolocation.getCurrentPosition(
      pos => fetchByCoords(pos.coords.latitude, pos.coords.longitude),
      err => {
        if (err.code === 1) setState("denied");
        else setState("idle");
      },
      { timeout: 8000 }
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* --- search submit --- */
  function handleSearch(e?: React.FormEvent) {
    e?.preventDefault();
    const q = query.trim();
    if (!q) return;
    setSearching(false);
    setQuery("");
    fetchByCity(q);
  }

  /* --- request geolocation --- */
  function requestLocation() {
    if (!navigator.geolocation) return;
    setState("loading");
    navigator.geolocation.getCurrentPosition(
      pos => {
        localStorage.removeItem(STORAGE_KEY);
        fetchByCoords(pos.coords.latitude, pos.coords.longitude);
      },
      err => {
        if (err.code === 1) setState("denied");
        else setState("error");
      }
    );
  }

  /* --- clear saved city --- */
  function clearCity() {
    localStorage.removeItem(STORAGE_KEY);
    setData(null);
    setState("idle");
  }

  /* ============ RENDER ============ */
  const cfg = data ? conditionConfig(data.condition) : DEFAULT_CONDITION;

  return (
    <div className="relative h-full flex flex-col overflow-hidden select-none">
      {/* Background gradient hint */}
      <AnimatePresence mode="wait">
        {data && (
          <motion.div
            key={data.condition}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className={cn("absolute inset-0 bg-linear-to-br pointer-events-none rounded-lg", cfg.gradient)}
          />
        )}
      </AnimatePresence>

      {/* Search overlay */}
      <AnimatePresence>
        {searching && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 z-30 flex items-start pt-2 px-2"
            style={{ background: "var(--card)" }}
          >
            <form onSubmit={handleSearch} className="flex items-center gap-1.5 w-full">
              <div className="flex-1 flex items-center gap-1.5 rounded-lg bg-white/8 border border-white/10 px-2 py-1.5">
                <Search className="w-3 h-3 text-muted-foreground shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="City name or ZIP…"
                  className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none min-w-0"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="text-[10px] px-2 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 transition-colors font-medium"
              >
                Go
              </button>
              <button
                type="button"
                onClick={() => { setSearching(false); setQuery(""); }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons (always visible, top-right) */}
      <div className="absolute top-2 right-2 flex items-center gap-1 z-20">
        {data && (
          <button
            onClick={clearCity}
            title="Change location"
            className="text-muted-foreground hover:text-foreground transition-colors opacity-50 hover:opacity-100 p-0.5"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        )}
        <button
          onClick={() => { setSearching(true); }}
          title="Search city"
          className="text-muted-foreground hover:text-foreground transition-colors opacity-60 hover:opacity-100 p-0.5"
        >
          <Search className="w-2.5 h-2.5" />
        </button>
        {state === "ok" && data && (
          <button
            onClick={() => {
              const saved = localStorage.getItem(STORAGE_KEY);
              if (saved) fetchByCity(saved);
              else requestLocation();
            }}
            title="Refresh"
            className="text-muted-foreground hover:text-foreground transition-colors opacity-60 hover:opacity-100 p-0.5"
          >
            <RefreshCw className="w-2.5 h-2.5" />
          </button>
        )}
      </div>

      {/* ---- CONTENT ---- */}
      <div className="relative z-10 flex-1 flex flex-col justify-between min-h-0 px-1 pt-1 pb-1">
        <AnimatePresence mode="wait">
          {state === "loading" && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex items-center justify-center"
            >
              <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />
            </motion.div>
          )}

          {(state === "idle" || state === "denied") && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-2 text-center"
            >
              <span className="text-2xl">🌡️</span>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-40">
                {state === "denied"
                  ? "Location access denied."
                  : "No location yet."}
              </p>
              <div className="flex gap-2 mt-1">
                <button
                  onClick={requestLocation}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-white/8 hover:bg-white/12 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Navigation className="w-2.5 h-2.5" /> Use location
                </button>
                <button
                  onClick={() => setSearching(true)}
                  className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-primary/15 hover:bg-primary/25 text-primary transition-colors"
                >
                  <Search className="w-2.5 h-2.5" /> Search
                </button>
              </div>
            </motion.div>
          )}

          {state === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center gap-2 text-center"
            >
              <AlertCircle className="w-5 h-5 text-destructive/70" />
              <p className="text-[11px] text-muted-foreground max-w-40">{error || "Could not load weather."}</p>
              <button
                onClick={() => setSearching(true)}
                className="text-[10px] px-2 py-1 rounded-md bg-primary/15 hover:bg-primary/25 text-primary transition-colors mt-1"
              >
                Try another city
              </button>
            </motion.div>
          )}

          {state === "ok" && data && (
            <motion.div
              key="ok"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex-1 flex flex-col justify-between min-h-0"
            >
              {wide ? (
                /* ---- WIDE layout (4x1 / 4x2) ---- */
                <div className="flex items-center gap-4 h-full">
                  {/* Emoji icon */}
                  <div className="shrink-0 text-5xl leading-none select-none" role="img" aria-label={data.description}>
                    {cfg.emoji}
                  </div>

                  {/* Temp + condition */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-end gap-1.5">
                      <span className="text-4xl font-bold tracking-tight leading-none" style={{ color: cfg.accent }}>
                        {data.temp}°
                      </span>
                      <span className="text-sm text-muted-foreground mb-0.5">C</span>
                    </div>
                    <p className="text-xs font-medium text-foreground/80 mt-0.5">{capitalize(data.description)}</p>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-2.5 h-2.5" />
                      {data.city}, {data.country}
                    </p>
                  </div>

                  {/* Extras */}
                  <div className="shrink-0 grid grid-cols-3 gap-x-4 gap-y-0.5">
                    <StatPill icon={<Thermometer className="w-2.5 h-2.5" />} label="Feels like" value={`${data.feelsLike}°C`} />
                    <StatPill icon={<Droplets className="w-2.5 h-2.5" />} label="Humidity" value={`${data.humidity}%`} />
                    <StatPill icon={<Wind className="w-2.5 h-2.5" />} label="Wind" value={`${data.windSpeed} km/h`} />
                  </div>
                </div>
              ) : compact ? (
                /* ---- COMPACT layout (2x1 / 1x1) ---- */
                <div className="flex items-center gap-2 h-full">
                  <span className="text-4xl leading-none select-none shrink-0" role="img" aria-label={data.description}>
                    {cfg.emoji}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-end gap-1">
                      <span className="text-2xl font-bold leading-none tracking-tight" style={{ color: cfg.accent }}>
                        {data.temp}°
                      </span>
                      <span className="text-[10px] text-muted-foreground mb-0.5">C</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">{capitalize(data.description)}</p>
                  </div>
                  {size !== "1x1" && (
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] text-muted-foreground flex items-center justify-end gap-0.5">
                        <MapPin className="w-2 h-2" />{data.city}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        <Droplets className="w-2 h-2 inline mr-0.5" />{data.humidity}%
                        <span className="mx-1 opacity-40">·</span>
                        <Wind className="w-2 h-2 inline mr-0.5" />{data.windSpeed} km/h
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* ---- SQUARE layout (2x2) ---- */
                <div className="flex flex-col gap-3 h-full">
                  {/* Top: emoji + temp */}
                  <div className="flex items-center gap-3 mt-3 ml-3">
                    <span className="text-5xl leading-none select-none shrink-0" role="img" aria-label={data.description}>
                      {cfg.emoji}
                    </span>
                    <div>
                      <div className="flex items-end gap-1">
                        <span className="text-4xl font-bold leading-none tracking-tight" style={{ color: cfg.accent }}>
                          {data.temp}°
                        </span>
                        <span className="text-sm text-muted-foreground mb-0.5">C</span>
                      </div>
                      <p className="text-xs text-foreground/80 mt-0.5">{capitalize(data.description)}</p>
                    </div>
                  </div>

                  {/* Location */}
                  <p className="text-[11px] text-muted-foreground flex items-center gap-1 ml-5">
                    <MapPin className="w-2.5 h-2.5 shrink-0" />
                    {data.city}, {data.country}
                  </p>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-2 mt-auto">
                    <StatCard icon={<Thermometer className="w-3 h-3" />} label="Feels like" value={`${data.feelsLike}°`} accent={cfg.accent} />
                    <StatCard icon={<Droplets className="w-3 h-3" />} label="Humidity" value={`${data.humidity}%`} accent={cfg.accent} />
                    <StatCard icon={<Wind className="w-3 h-3" />} label="Wind" value={`${data.windSpeed}`} unit="km/h" accent={cfg.accent} />
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------- sub-components ---------- */

function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col">
      <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
        {icon} {label}
      </span>
      <span className="text-xs font-medium text-foreground/90">{value}</span>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  unit,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  unit?: string;
  accent: string;
}) {
  return (
    <div
      className="rounded-lg px-2 py-1.5 flex flex-col gap-0.5"
      style={{ background: "oklch(1 0 0 / 4%)", border: "1px solid oklch(1 0 0 / 7%)" }}
    >
      <span className="text-muted-foreground" style={{ color: accent, opacity: 0.8 }}>{icon}</span>
      <span className="text-xs font-semibold text-foreground/90">
        {value}
        {unit && <span className="text-[9px] text-muted-foreground ml-0.5">{unit}</span>}
      </span>
      <span className="text-[9px] text-muted-foreground leading-none">{label}</span>
    </div>
  );
}
