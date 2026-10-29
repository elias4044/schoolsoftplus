import { NextRequest, NextResponse } from 'next/server';

import { readRequestBytes, withValidation } from '@/app/api/lib/routeValidation';
import { requireSession } from '@/app/api/lib/schoolsoft';

/**
 * POST /api/pfp-upload
 * Body: FormData with field "image" (File)
 * Proxies the upload to ImgBB using the server-side API token.
 * Returns: { success, url }
 */
export const POST = withValidation(async function POST(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess)
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });

  const apiKey = process.env.IMGBB_API_TOKEN;
  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'Image upload not configured.' },
      { status: 503 }
    );
  }

  const bytes = await readRequestBytes(req, 5 * 1024 * 1024 + 64 * 1024);
  let formData: FormData;
  try {
    formData = await new Response(new Uint8Array(bytes), {
      headers: { 'Content-Type': req.headers.get('content-type') ?? '' },
    }).formData();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid form data.' }, { status: 400 });
  }

  const file = formData.get('image');
  if (!(file instanceof File))
    return NextResponse.json({ success: false, error: 'No image provided.' }, { status: 400 });

  if (
    !['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/avif', 'image/bmp'].includes(
      file.type
    )
  )
    return NextResponse.json({ error: 'Unsupported image type.' }, { status: 400 });

  // Size guard: 5 MB
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json(
      { success: false, error: 'Image must be under 5 MB.' },
      { status: 400 }
    );
  }

  // Convert to base64
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');

  const body = new URLSearchParams();
  body.append('key', apiKey);
  body.append('image', base64);

  const res = await fetch('https://api.imgbb.com/1/upload', {
    signal: AbortSignal.timeout(8_000),
    method: 'POST',
    body,
  });

  if (!res.ok) {
    return NextResponse.json({ success: false, error: 'Upload failed.' }, { status: 502 });
  }

  const data = (await res.json()) as {
    success: boolean;
    data?: { url: string; display_url: string };
  };
  if (!data.success || !data.data?.url) {
    return NextResponse.json({ success: false, error: 'Upload failed.' }, { status: 502 });
  }

  return NextResponse.json({ success: true, url: data.data.display_url || data.data.url });
});
