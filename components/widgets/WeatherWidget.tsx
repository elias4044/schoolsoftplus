'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Droplets,
  MapPin,
  Navigation,
  RefreshCw,
  Search,
  Thermometer,
  Wind,
  X,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { WidgetSize } from '@/lib/widgets/types';

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

type LoadState = 'idle' | 'loading' | 'ok' | 'error' | 'denied';

/* ---------- OWM condition → visual config ---------- */
const CONDITION_CONFIG: Record<string, { emoji: string; gradient: string; accent: string }> = {
  Clear: {
    emoji: '☀️',
    gradient: 'from-amber-500/20 via-orange-400/10 to-transparent',
    accent: 'oklch(0.82 0.18 75)',
  },
  Clouds: {
    emoji: '☁️',
    gradient: 'from-slate-400/20 via-slate-500/10 to-transparent',
    accent: 'oklch(0.72 0.03 260)',
  },
  Rain: {
    emoji: '🌧️',
    gradient: 'from-blue-500/20 via-sky-400/10 to-transparent',
    accent: 'oklch(0.68 0.18 230)',
  },
  Drizzle: {
    emoji: '🌦️',
    gradient: 'from-sky-400/20 via-blue-300/10 to-transparent',
    accent: 'oklch(0.72 0.15 220)',
  },
  Thunderstorm: {
    emoji: '⛈️',
    gradient: 'from-violet-600/25 via-purple-500/10 to-transparent',
    accent: 'oklch(0.65 0.22 285)',
  },
  Snow: {
    emoji: '❄️',
    gradient: 'from-sky-200/20 via-blue-100/10 to-transparent',
    accent: 'oklch(0.82 0.08 215)',
  },
  Mist: {
    emoji: '🌫️',
    gradient: 'from-slate-300/15 via-slate-400/10 to-transparent',
    accent: 'oklch(0.70 0.02 260)',
  },
  Fog: {
    emoji: '🌫️',
    gradient: 'from-slate-300/15 via-slate-400/10 to-transparent',
    accent: 'oklch(0.70 0.02 260)',
  },
  Haze: {
    emoji: '🌫️',
    gradient: 'from-amber-300/15 via-yellow-200/10 to-transparent',
    accent: 'oklch(0.82 0.10 80)',
  },
};
const DEFAULT_CONDITION = {
  emoji: '🌡️',
  gradient: 'from-primary/20 via-primary/5 to-transparent',
  accent: 'oklch(0.65 0.22 278)',
};

function conditionConfig(condition: string) {
  return CONDITION_CONFIG[condition] ?? DEFAULT_CONDITION;
}

/* ---------- tiny helpers ---------- */
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const STORAGE_KEY = 'ssp_weather_city';

export default function WeatherWidget({ size }: { size: WidgetSize }) {
  const [state, setState] = useState<LoadState>('idle');
  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const compact = size === '1x1' || size === '2x1' || size === '4x1';
  const wide = size === '4x1' || size === '4x2';

  /* --- fetch helpers --- */
  const fetchWeather = useCallback(async (params: string) => {
    setState('loading');
    setError('');
    try {
      const res = await fetch(`/api/weather?${params}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? 'Failed to load weather');
      setData(json.data);
      setState('ok');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      setState('error');
    }
  }, []);

  const fetchByCoords = useCallback(
    (lat: number, lon: number) => {
      fetchWeather(`lat=${lat}&lon=${lon}`);
    },
    [fetchWeather]
  );

  const fetchByCity = useCallback(
    (city: string) => {
      fetchWeather(`city=${encodeURIComponent(city)}`);
      localStorage.setItem(STORAGE_KEY, city);
    },
    [fetchWeather]
  );

  /* --- auto-load on mount --- */
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      fetchByCity(saved);
      return;
    }
    if (!navigator.geolocation) {
      setState('idle');
      return;
    }
    setState('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchByCoords(pos.coords.latitude, pos.coords.longitude),
      (err) => {
        if (err.code === 1) setState('denied');
        else setState('idle');
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
    setQuery('');
    fetchByCity(q);
  }

  /* --- request geolocation --- */
  function requestLocation() {
    if (!navigator.geolocation) return;
    setState('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        localStorage.removeItem(STORAGE_KEY);
        fetchByCoords(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        if (err.code === 1) setState('denied');
        else setState('error');
      }
    );
  }

  /* --- clear saved city --- */
  function clearCity() {
    localStorage.removeItem(STORAGE_KEY);
    setData(null);
    setState('idle');
  }

  /* ============ RENDER ============ */
  const cfg = data ? conditionConfig(data.condition) : DEFAULT_CONDITION;

  return (
    <div className="relative flex h-full flex-col overflow-hidden select-none">
      {/* Background gradient hint */}
      <AnimatePresence mode="wait">
        {data && (
          <motion.div
            key={data.condition}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className={cn(
              'pointer-events-none absolute inset-0 rounded-lg bg-linear-to-br',
              cfg.gradient
            )}
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
            className="absolute inset-0 z-30 flex items-start px-2 pt-2"
            style={{ background: 'var(--card)' }}
          >
            <form onSubmit={handleSearch} className="flex w-full items-center gap-1.5">
              <div className="flex flex-1 items-center gap-1.5 rounded-lg border border-white/10 bg-white/8 px-2 py-1.5">
                <Search className="text-muted-foreground h-3 w-3 shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="City name or ZIP…"
                  className="text-foreground placeholder:text-muted-foreground min-w-0 flex-1 bg-transparent text-xs outline-none"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                className="bg-primary/20 text-primary hover:bg-primary/30 rounded-lg px-2 py-1.5 text-[10px] font-medium transition-colors"
              >
                Go
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearching(false);
                  setQuery('');
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action buttons (always visible, top-right) */}
      <div className="absolute top-2 right-2 z-20 flex items-center gap-1">
        {data && (
          <button
            onClick={clearCity}
            title="Change location"
            className="text-muted-foreground hover:text-foreground p-0.5 opacity-50 transition-colors hover:opacity-100"
          >
            <X className="h-2.5 w-2.5" />
          </button>
        )}
        <button
          onClick={() => {
            setSearching(true);
          }}
          title="Search city"
          className="text-muted-foreground hover:text-foreground p-0.5 opacity-60 transition-colors hover:opacity-100"
        >
          <Search className="h-2.5 w-2.5" />
        </button>
        {state === 'ok' && data && (
          <button
            onClick={() => {
              const saved = localStorage.getItem(STORAGE_KEY);
              if (saved) fetchByCity(saved);
              else requestLocation();
            }}
            title="Refresh"
            className="text-muted-foreground hover:text-foreground p-0.5 opacity-60 transition-colors hover:opacity-100"
          >
            <RefreshCw className="h-2.5 w-2.5" />
          </button>
        )}
      </div>

      {/* ---- CONTENT ---- */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col justify-between px-1 pt-1 pb-1">
        <AnimatePresence mode="wait">
          {state === 'loading' && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 items-center justify-center"
            >
              <RefreshCw className="text-muted-foreground h-4 w-4 animate-spin" />
            </motion.div>
          )}

          {(state === 'idle' || state === 'denied') && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col items-center justify-center gap-2 text-center"
            >
              <span className="text-2xl">🌡️</span>
              <p className="text-muted-foreground max-w-40 text-xs leading-relaxed">
                {state === 'denied' ? 'Location access denied.' : 'No location yet.'}
              </p>
              <div className="mt-1 flex gap-2">
                <button
                  onClick={requestLocation}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-md bg-white/8 px-2 py-1 text-[10px] transition-colors hover:bg-white/12"
                >
                  <Navigation className="h-2.5 w-2.5" /> Use location
                </button>
                <button
                  onClick={() => setSearching(true)}
                  className="bg-primary/15 hover:bg-primary/25 text-primary flex items-center gap-1 rounded-md px-2 py-1 text-[10px] transition-colors"
                >
                  <Search className="h-2.5 w-2.5" /> Search
                </button>
              </div>
            </motion.div>
          )}

          {state === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-1 flex-col items-center justify-center gap-2 text-center"
            >
              <AlertCircle className="text-destructive/70 h-5 w-5" />
              <p className="text-muted-foreground max-w-40 text-[11px]">
                {error || 'Could not load weather.'}
              </p>
              <button
                onClick={() => setSearching(true)}
                className="bg-primary/15 hover:bg-primary/25 text-primary mt-1 rounded-md px-2 py-1 text-[10px] transition-colors"
              >
                Try another city
              </button>
            </motion.div>
          )}

          {state === 'ok' && data && (
            <motion.div
              key="ok"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-0 flex-1 flex-col justify-between"
            >
              {wide ? (
                /* ---- WIDE layout (4x1 / 4x2) ---- */
                <div className="flex h-full items-center gap-4">
                  {/* Emoji icon */}
                  <div
                    className="shrink-0 text-5xl leading-none select-none"
                    role="img"
                    aria-label={data.description}
                  >
                    {cfg.emoji}
                  </div>

                  {/* Temp + condition */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-end gap-1.5">
                      <span
                        className="text-4xl leading-none font-bold tracking-tight"
                        style={{ color: cfg.accent }}
                      >
                        {data.temp}°
                      </span>
                      <span className="text-muted-foreground mb-0.5 text-sm">C</span>
                    </div>
                    <p className="text-foreground/80 mt-0.5 text-xs font-medium">
                      {capitalize(data.description)}
                    </p>
                    <p className="text-muted-foreground mt-0.5 flex items-center gap-1 text-[10px]">
                      <MapPin className="h-2.5 w-2.5" />
                      {data.city}, {data.country}
                    </p>
                  </div>

                  {/* Extras */}
                  <div className="grid shrink-0 grid-cols-3 gap-x-4 gap-y-0.5">
                    <StatPill
                      icon={<Thermometer className="h-2.5 w-2.5" />}
                      label="Feels like"
                      value={`${data.feelsLike}°C`}
                    />
                    <StatPill
                      icon={<Droplets className="h-2.5 w-2.5" />}
                      label="Humidity"
                      value={`${data.humidity}%`}
                    />
                    <StatPill
                      icon={<Wind className="h-2.5 w-2.5" />}
                      label="Wind"
                      value={`${data.windSpeed} km/h`}
                    />
                  </div>
                </div>
              ) : compact ? (
                /* ---- COMPACT layout (2x1 / 1x1) ---- */
                <div className="flex h-full items-center gap-2">
                  <span
                    className="shrink-0 text-4xl leading-none select-none"
                    role="img"
                    aria-label={data.description}
                  >
                    {cfg.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-end gap-1">
                      <span
                        className="text-2xl leading-none font-bold tracking-tight"
                        style={{ color: cfg.accent }}
                      >
                        {data.temp}°
                      </span>
                      <span className="text-muted-foreground mb-0.5 text-[10px]">C</span>
                    </div>
                    <p className="text-muted-foreground truncate text-[10px]">
                      {capitalize(data.description)}
                    </p>
                  </div>
                  {size !== '1x1' && (
                    <div className="shrink-0 text-right">
                      <p className="text-muted-foreground flex items-center justify-end gap-0.5 text-[10px]">
                        <MapPin className="h-2 w-2" />
                        {data.city}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-[10px]">
                        <Droplets className="mr-0.5 inline h-2 w-2" />
                        {data.humidity}%<span className="mx-1 opacity-40">·</span>
                        <Wind className="mr-0.5 inline h-2 w-2" />
                        {data.windSpeed} km/h
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                /* ---- SQUARE layout (2x2) ---- */
                <div className="flex h-full flex-col gap-3">
                  {/* Top: emoji + temp */}
                  <div className="mt-3 ml-3 flex items-center gap-3">
                    <span
                      className="shrink-0 text-5xl leading-none select-none"
                      role="img"
                      aria-label={data.description}
                    >
                      {cfg.emoji}
                    </span>
                    <div>
                      <div className="flex items-end gap-1">
                        <span
                          className="text-4xl leading-none font-bold tracking-tight"
                          style={{ color: cfg.accent }}
                        >
                          {data.temp}°
                        </span>
                        <span className="text-muted-foreground mb-0.5 text-sm">C</span>
                      </div>
                      <p className="text-foreground/80 mt-0.5 text-xs">
                        {capitalize(data.description)}
                      </p>
                    </div>
                  </div>

                  {/* Location */}
                  <p className="text-muted-foreground ml-5 flex items-center gap-1 text-[11px]">
                    <MapPin className="h-2.5 w-2.5 shrink-0" />
                    {data.city}, {data.country}
                  </p>

                  {/* Stats grid */}
                  <div className="mt-auto grid grid-cols-3 gap-2">
                    <StatCard
                      icon={<Thermometer className="h-3 w-3" />}
                      label="Feels like"
                      value={`${data.feelsLike}°`}
                      accent={cfg.accent}
                    />
                    <StatCard
                      icon={<Droplets className="h-3 w-3" />}
                      label="Humidity"
                      value={`${data.humidity}%`}
                      accent={cfg.accent}
                    />
                    <StatCard
                      icon={<Wind className="h-3 w-3" />}
                      label="Wind"
                      value={`${data.windSpeed}`}
                      unit="km/h"
                      accent={cfg.accent}
                    />
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

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-muted-foreground flex items-center gap-0.5 text-[9px]">
        {icon} {label}
      </span>
      <span className="text-foreground/90 text-xs font-medium">{value}</span>
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
      className="flex flex-col gap-0.5 rounded-lg px-2 py-1.5"
      style={{ background: 'oklch(1 0 0 / 4%)', border: '1px solid oklch(1 0 0 / 7%)' }}
    >
      <span className="text-muted-foreground" style={{ color: accent, opacity: 0.8 }}>
        {icon}
      </span>
      <span className="text-foreground/90 text-xs font-semibold">
        {value}
        {unit && <span className="text-muted-foreground ml-0.5 text-[9px]">{unit}</span>}
      </span>
      <span className="text-muted-foreground text-[9px] leading-none">{label}</span>
    </div>
  );
}
