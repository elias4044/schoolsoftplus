'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  LocateFixed,
  Moon,
  RefreshCw,
  Search,
  Sun,
} from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { WeatherData } from '@/app/api/weather/route';

import { WidgetNotice, WidgetSkeleton } from './WidgetContent';

const storageKey = 'ssp_weather_city';
const conditionIcons = {
  Clouds: Cloud,
  Rain: CloudRain,
  Drizzle: CloudRain,
  Thunderstorm: CloudLightning,
  Snow: CloudSnow,
  Fog: CloudFog,
};

export default function WeatherWidget() {
  const [city, setCity] = useState('');
  const [searching, setSearching] = useState(false);
  const [params, setParams] = useState<string | null>(null);
  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const locationRequest = useRef(0);

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          setCity(saved);
          setLoading(true);
          setParams(new URLSearchParams({ city: saved }).toString());
        }
      } catch {
        // City search remains available when storage is disabled.
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!params) return;
    const controller = new AbortController();
    apiFetch<{ data: WeatherData }>(`/api/weather?${params}`, { signal: controller.signal })
      .then(({ data: weather }) => {
        if (controller.signal.aborted) return;
        setData(weather);
        setSearching(false);
        try {
          const saved = new URLSearchParams(params).get('city');
          if (saved) localStorage.setItem(storageKey, saved);
          else localStorage.removeItem(storageKey);
        } catch {
          // The current forecast is still available for this visit.
        }
      })
      .catch((failure: unknown) => {
        if (!controller.signal.aborted) {
          setError(failure instanceof Error ? failure.message : 'Could not load the weather.');
          setSearching(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [params, attempt]);

  useEffect(
    () => () => {
      locationRequest.current += 1;
    },
    []
  );

  function useLocation() {
    if (!navigator.geolocation) {
      setError('Location is unavailable in this browser.');
      return;
    }
    const request = ++locationRequest.current;
    setError('');
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (locationRequest.current !== request) return;
        setParams(
          new URLSearchParams({
            lat: String(coords.latitude),
            lon: String(coords.longitude),
          }).toString()
        );
        setAttempt((value) => value + 1);
      },
      () => {
        if (locationRequest.current !== request) return;
        setError('Could not get your location. Search by city instead.');
        setLoading(false);
      },
      { timeout: 8000 }
    );
  }

  const WeatherIcon =
    data?.condition === 'Clear'
      ? data.isDay
        ? Sun
        : Moon
      : (conditionIcons[data?.condition as keyof typeof conditionIcons] ?? Cloud);

  return (
    <>
      {data && (
        <div className="widgetFeature flex items-center gap-2.5 rounded-lg px-2.5 py-1.5">
          <WeatherIcon aria-hidden className="size-7 shrink-0 text-(--dashboard-color)" />
          <div className="min-w-0 flex-1">
            <p className="text-xl font-semibold tabular-nums">{data.temp} &deg;C</p>
            <p className="truncate text-sm font-medium">{data.city}</p>
            <p className="text-muted-foreground line-clamp-2 text-xs">{data.description}</p>
          </div>
          <Button
            variant="ghost"
            size="icon-lg"
            aria-label="Change weather location"
            aria-expanded={searching}
            onClick={() => setSearching(!searching)}
          >
            <Search />
          </Button>
        </div>
      )}
      {(!data || searching) && (
        <form
          className="flex min-w-0 items-center gap-1.5 pt-1"
          onSubmit={(event) => {
            event.preventDefault();
            if (!city.trim()) return;
            locationRequest.current += 1;
            setLoading(true);
            setError('');
            setParams(new URLSearchParams({ city: city.trim() }).toString());
            setAttempt((value) => value + 1);
          }}
        >
          <Input
            className="h-11 min-w-0"
            value={city}
            maxLength={100}
            onChange={(event) => setCity(event.target.value)}
            aria-label="Weather city"
            placeholder="City"
          />
          <Button
            type="submit"
            variant="outline"
            size="icon-lg"
            aria-label="Search weather by city"
            disabled={!city.trim()}
          >
            <Search />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-lg"
            aria-label="Use current location"
            disabled={loading}
            onClick={useLocation}
          >
            <LocateFixed />
          </Button>
        </form>
      )}
      {loading && !data && params && <WidgetSkeleton label="Loading weather" />}
      {loading && (data || !params) && (
        <p role="status" className="text-muted-foreground mt-1 text-xs">
          Loading weather...
        </p>
      )}
      {error && (
        <div className="mt-2" role="status">
          <WidgetNotice>{error}</WidgetNotice>
        </div>
      )}
      {data && !searching && (
        <div className="widgetToolbar">
          <dl className="flex flex-wrap gap-x-2 gap-y-1 text-xs tabular-nums">
            <div>
              <dt className="sr-only">Feels like</dt>
              <dd>Feels {data.feelsLike} &deg;C</dd>
            </div>
            <div>
              <dt className="sr-only">Humidity</dt>
              <dd>{data.humidity}% humidity</dd>
            </div>
            <div>
              <dt className="sr-only">Wind</dt>
              <dd>{data.windSpeed} km/h wind</dd>
            </div>
          </dl>
          <button
            type="button"
            className="widgetControl"
            disabled={loading}
            onClick={() => {
              setLoading(true);
              setError('');
              setAttempt((value) => value + 1);
            }}
          >
            <RefreshCw aria-hidden className="size-3.5" /> Refresh
          </button>
        </div>
      )}
    </>
  );
}
