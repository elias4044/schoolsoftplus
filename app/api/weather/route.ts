import { NextRequest, NextResponse } from "next/server";

const GEO_BASE     = "https://geocoding-api.open-meteo.com/v1";
const WEATHER_BASE = "https://api.open-meteo.com/v1";

/* ---- Public shape consumed by the widget ---- */
export interface WeatherData {
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

/* ---- WMO code → condition ---- */
function wmoToCondition(code: number): { condition: string; description: string } {
  if (code === 0)                 return { condition: "Clear",        description: "Clear sky" };
  if (code === 1)                 return { condition: "Clear",        description: "Mainly clear" };
  if (code === 2)                 return { condition: "Clouds",       description: "Partly cloudy" };
  if (code === 3)                 return { condition: "Clouds",       description: "Overcast" };
  if (code === 45 || code === 48) return { condition: "Fog",          description: "Foggy" };
  if (code >= 51 && code <= 55)   return { condition: "Drizzle",      description: "Drizzle" };
  if (code === 56 || code === 57) return { condition: "Drizzle",      description: "Freezing drizzle" };
  if (code === 61)                return { condition: "Rain",         description: "Light rain" };
  if (code === 63)                return { condition: "Rain",         description: "Moderate rain" };
  if (code === 65)                return { condition: "Rain",         description: "Heavy rain" };
  if (code === 66 || code === 67) return { condition: "Rain",         description: "Freezing rain" };
  if (code === 71)                return { condition: "Snow",         description: "Light snow" };
  if (code === 73)                return { condition: "Snow",         description: "Moderate snow" };
  if (code === 75)                return { condition: "Snow",         description: "Heavy snow" };
  if (code === 77)                return { condition: "Snow",         description: "Snow grains" };
  if (code >= 80 && code <= 82)   return { condition: "Rain",         description: code === 80 ? "Light showers" : code === 81 ? "Showers" : "Violent showers" };
  if (code === 85 || code === 86) return { condition: "Snow",         description: "Snow showers" };
  if (code === 95)                return { condition: "Thunderstorm", description: "Thunderstorm" };
  if (code === 96 || code === 99) return { condition: "Thunderstorm", description: "Thunderstorm with hail" };
  return { condition: "Clouds", description: "Unknown" };
}

interface GeoResult { lat: number; lon: number; name: string; country: string }

async function geocodeCity(q: string): Promise<GeoResult> {
  const url = `${GEO_BASE}/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`;
  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) throw new Error(`Geocoding error ${res.status}`);
  const json = await res.json();
  const r = json.results?.[0];
  if (!r) throw new Error(`City not found: "${q}"`);
  return { lat: r.latitude, lon: r.longitude, name: r.name, country: r.country_code?.toUpperCase() ?? "" };
}

const CURRENT_PARAMS = [
  "temperature_2m",
  "apparent_temperature",
  "relative_humidity_2m",
  "weather_code",
  "wind_speed_10m",
  "is_day",
].join(",");

async function fetchWeatherForCoords(
  lat: number | string,
  lon: number | string,
  cityName: string,
  country: string,
): Promise<WeatherData> {
  const url =
    `${WEATHER_BASE}/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=${CURRENT_PARAMS}&daily=sunrise,sunset&wind_speed_unit=kmh&timezone=auto&forecast_days=1`;

  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`Open-Meteo error ${res.status}`);
  const raw = await res.json();

  const cur = raw.current ?? {};
  const { condition, description } = wmoToCondition(cur.weather_code ?? 0);
  const toUnix = (s: string) => (s ? Math.floor(new Date(s).getTime() / 1000) : 0);

  return {
    city:      cityName,
    country,
    temp:      Math.round(cur.temperature_2m ?? 0),
    feelsLike: Math.round(cur.apparent_temperature ?? 0),
    humidity:  cur.relative_humidity_2m ?? 0,
    windSpeed: Math.round(cur.wind_speed_10m ?? 0),
    condition,
    description,
    isDay:     cur.is_day === 1,
    sunrise:   toUnix(raw.daily?.sunrise?.[0] ?? ""),
    sunset:    toUnix(raw.daily?.sunset?.[0] ?? ""),
    timezone:  raw.timezone ?? "UTC",
    dt:        toUnix(cur.time ?? new Date().toISOString()),
  };
}

async function reverseGeocode(lat: string, lon: string): Promise<{ name: string; country: string }> {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "SchoolSoftPlus/1.0" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return { name: "Your location", country: "" };
    const json = await res.json();
    const name =
      json.address?.city ??
      json.address?.town ??
      json.address?.village ??
      json.address?.county ??
      "Your location";
    return { name, country: json.address?.country_code?.toUpperCase() ?? "" };
  } catch {
    return { name: "Your location", country: "" };
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat  = searchParams.get("lat");
  const lon  = searchParams.get("lon");
  const city = searchParams.get("city");

  try {
    let data: WeatherData;
    if (lat && lon) {
      const { name, country } = await reverseGeocode(lat, lon);
      data = await fetchWeatherForCoords(lat, lon, name, country);
    } else if (city) {
      const geo = await geocodeCity(city);
      data = await fetchWeatherForCoords(geo.lat, geo.lon, geo.name, geo.country);
    } else {
      return NextResponse.json({ error: "Provide lat/lon or city" }, { status: 400 });
    }
    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
