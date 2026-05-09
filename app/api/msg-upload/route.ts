import { NextRequest, NextResponse } from "next/server";
import { authUser } from "@/app/api/lib/auth";
import { requireSession, getSessionCookies } from "@/app/api/lib/schoolsoft";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
  "image/bmp",
]);

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * POST /api/msg-upload
 * Body: FormData with field "image" (File / Blob)
 * Proxies to ImgBB, returns { success, url }
 * Accepts GIFs and images up to 10 MB (vs 5 MB for profile pictures).
 */
export async function POST(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess)
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  if (!(await authUser(sess.cookieString, sess.school)))
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });

  const apiKey = process.env.IMGBB_API_TOKEN;
  if (!apiKey)
    return NextResponse.json({ success: false, error: "Image upload not configured." }, { status: 503 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid form data." }, { status: 400 });
  }

  const file = formData.get("image") as File | null;
  if (!file) return NextResponse.json({ success: false, error: "No image provided." }, { status: 400 });

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { success: false, error: "Unsupported file type. Allowed: JPEG, PNG, GIF, WebP, AVIF, BMP." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ success: false, error: "Image must be under 10 MB." }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  const body = new URLSearchParams();
  body.append("key", apiKey);
  body.append("image", base64);
  // For GIFs, request the display_url which preserves animation
  if (file.type === "image/gif") {
    body.append("name", file.name.replace(/[^a-zA-Z0-9._-]/g, "_"));
  }

  const res = await fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    body,
  });

  if (!res.ok)
    return NextResponse.json({ success: false, error: "Upload failed." }, { status: 502 });

  const data = (await res.json()) as {
    success: boolean;
    data?: { url: string; display_url: string; thumb?: { url: string } };
  };

  if (!data.success || !data.data?.url)
    return NextResponse.json({ success: false, error: "Upload failed." }, { status: 502 });

  // display_url is the direct link (respects animation for GIFs)
  return NextResponse.json({ success: true, url: data.data.display_url || data.data.url });
}
