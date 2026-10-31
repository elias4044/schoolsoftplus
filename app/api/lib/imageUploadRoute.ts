import { NextRequest, NextResponse } from 'next/server';

import {
  getHostedImage,
  IMAGE_TYPES,
  ImageHostError,
  requireImageHostToken,
  uploadHostedImage,
} from './imageHost';
import { readRequestBytes, withValidation } from './routeValidation';
import { requireSession } from './schoolsoft';

export function createImageUploadHandlers(maxSize: number) {
  const handle = (upload: boolean) =>
    withValidation(async (req: NextRequest) => {
      if (!(await requireSession(req)))
        return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });

      try {
        requireImageHostToken();
        if (!upload) {
          const result = await getHostedImage(req.nextUrl.searchParams.get('id') ?? '');
          return NextResponse.json(result, { status: result.pending ? 202 : 200 });
        }

        const bytes = await readRequestBytes(req, maxSize + 64 * 1024);
        let form: FormData;
        try {
          form = await new Response(new Uint8Array(bytes), {
            headers: { 'Content-Type': req.headers.get('content-type') ?? '' },
          }).formData();
        } catch {
          return NextResponse.json(
            { success: false, error: 'Invalid form data.' },
            { status: 400 }
          );
        }
        const file = form.get('image');
        if (!(file instanceof File))
          return NextResponse.json(
            { success: false, error: 'No image provided.' },
            { status: 400 }
          );
        if (!IMAGE_TYPES.has(file.type))
          return NextResponse.json(
            { success: false, error: 'Use a JPEG, PNG, or static WebP image.' },
            { status: 400 }
          );
        if (!file.size || file.size > maxSize)
          return NextResponse.json(
            {
              success: false,
              error: `Image must be nonempty and under ${maxSize / 1024 / 1024} MB.`,
            },
            { status: 400 }
          );

        const result = await uploadHostedImage(file);
        return NextResponse.json(result, { status: result.pending ? 202 : 200 });
      } catch (error) {
        if (!(error instanceof ImageHostError)) throw error;
        return NextResponse.json(
          { success: false, error: error.message },
          { status: error.status }
        );
      }
    });
  return { POST: handle(true), GET: handle(false) };
}
