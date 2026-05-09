import { NextRequest, NextResponse } from "next/server";
import { authUser } from "@/app/api/lib/auth";
import { requireSession, getSessionCookies } from "@/app/api/lib/schoolsoft";

/**
 * GET /api/gif?q=<query>&limit=<n>
 * Proxies Giphy GIF search (or trending GIFs when q is empty).
 * Requires env var GIPHY_API_KEY.
 */
export async function GET(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess)
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  if (!(await authUser(sess.cookieString, sess.school)))
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });

  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey)
    return NextResponse.json({ success: false, error: "GIF search not configured." }, { status: 503 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  const limit = Math.min(
    Math.max(parseInt(req.nextUrl.searchParams.get("limit") ?? "20", 10), 1),
    30
  );

  const base = "https://api.giphy.com/v1/gifs";
  const common = `api_key=${encodeURIComponent(apiKey)}&limit=${limit}&rating=pg`;
  const url = q
    ? `${base}/search?q=${encodeURIComponent(q)}&${common}&lang=en`
    : `${base}/trending?${common}`;

  let giphyRes: Response;
  try {
    giphyRes = await fetch(url);
  } catch {
    return NextResponse.json({ success: false, error: "GIF service unavailable." }, { status: 502 });
  }

  if (!giphyRes.ok)
    return NextResponse.json({ success: false, error: "GIF search failed." }, { status: 502 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = (await giphyRes.json()) as { data?: any[] };

  // Map to the same slim shape the frontend expects: id, title, preview, full, width, height
  const gifs = (raw.data ?? []).map((r) => {
    const images = r.images ?? {};
    // fixed_height_downsampled is small + animated (good preview); original for full send
    const preview =
      images.fixed_height_downsampled?.url ??
      images.fixed_height_small?.url ??
      images.fixed_height?.url ?? "";
    const full =
      images.original?.url ??
      images.fixed_height?.url ?? "";
    return {
      id: String(r.id ?? ""),
      title: String(r.title ?? ""),
      preview,
      full,
      width: parseInt(images.original?.width ?? "200", 10),
      height: parseInt(images.original?.height ?? "200", 10),
    };
  }).filter((g) => g.preview && g.full);

  return NextResponse.json({ success: true, gifs });
}
