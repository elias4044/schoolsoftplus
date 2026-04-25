import { NextResponse } from "next/server";
import axios from "axios";

// ---------------------------------------------------------------------------
// Module-level cache — avoids hammering SchoolSoft on every page load.
// The list rarely changes; 1-hour TTL is plenty. Please note, this does not work across serverless function instances (vercel for example)
// ---------------------------------------------------------------------------
interface School {
  name: string;
  id: string; // slug, e.g. "carlwahren"
}

let cachedSchools: School[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

const SCHOOLSOFT_LIST_URL =
  "https://sms.schoolsoft.se/internal/rest-api/login/schoollist";

function extractSlug(evaUrl: string): string {
  // evaUrl looks like https://sms.schoolsoft.se/carlwahren/eva
  try {
    const path = new URL(evaUrl).pathname; // "/carlwahren/eva"
    return path.split("/").filter(Boolean)[0]; // "carlwahren"
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// GET /api/schools
// No auth required. Returns { schools: { name, id }[] } sorted by name.
// ---------------------------------------------------------------------------
export async function GET() {
  const now = Date.now();

  if (cachedSchools && now < cacheExpiry) {
    return NextResponse.json(
      { success: true, schools: cachedSchools },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      }
    );
  }

  try {
    const { data } = await axios.get<
      { name: string; evaUrl: string }[]
    >(SCHOOLSOFT_LIST_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        Accept: "application/json",
      },
      timeout: 10_000,
    });

    const schools: School[] = data
      .map((s) => ({ name: s.name.trim(), id: extractSlug(s.evaUrl) }))
      .filter((s) => s.id) // drop entries without a valid slug
      .sort((a, b) => a.name.localeCompare(b.name, "sv"));

    cachedSchools = schools;
    cacheExpiry = now + CACHE_TTL_MS;

    return NextResponse.json(
      { success: true, schools },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (err) {
    console.error("[schools] Failed to fetch school list:", (err as Error).message);

    // Return the cache even if stale rather than failing completely
    if (cachedSchools) {
      return NextResponse.json({ success: true, schools: cachedSchools, stale: true });
    }

    return NextResponse.json(
      { success: false, message: "Could not load school list." },
      { status: 502 }
    );
  }
}
