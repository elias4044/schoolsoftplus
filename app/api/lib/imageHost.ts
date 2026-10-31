const IMAGE_HOST = 'https://img.e4044.com';

export const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export class ImageHostError extends Error {
  constructor(
    message: string,
    public status = 502
  ) {
    super(message);
  }
}

export type ImageUploadResult =
  | { success: true; pending: true; id: string; state: string }
  | { success: true; pending: false; url: string };

export function requireImageHostToken(): string {
  const token = process.env.IMAGE_HOST_API_TOKEN;
  if (!token) throw new ImageHostError('Image upload not configured.', 503);
  return token;
}

async function requestImage(path: string, init?: RequestInit): Promise<ImageUploadResult> {
  const token = requireImageHostToken();
  let response: Response;
  try {
    response = await fetch(`${IMAGE_HOST}/api/v1/images${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new ImageHostError('Could not reach the image service. Please try again.');
  }
  if (!response.ok) {
    if (response.status === 413) throw new ImageHostError('Image is too large.', 413);
    if (response.status === 422)
      throw new ImageHostError('Use a JPEG, PNG, or static WebP image.', 422);
    if (response.status === 429)
      throw new ImageHostError('Image service is busy. Please try again later.', 429);
    throw new ImageHostError('Image service request failed. Please try again.');
  }

  let data: { id?: string; state?: string; public?: boolean; url?: string | null };
  try {
    data = await response.json();
  } catch {
    throw new ImageHostError('Invalid response from the image service.');
  }
  if (
    !data ||
    typeof data.id !== 'string' ||
    !/^[a-zA-Z0-9_-]{1,200}$/.test(data.id) ||
    data.public !== true
  )
    throw new ImageHostError('Invalid response from the image service.');

  if (data.state === 'ready') {
    const url = new URL(`/i/${data.id}.webp`, IMAGE_HOST).href;
    let deliveryUrl: string | undefined;
    try {
      if (data.url) deliveryUrl = new URL(data.url, IMAGE_HOST).href;
    } catch {
      throw new ImageHostError('Invalid image delivery URL.');
    }
    if (deliveryUrl !== url) throw new ImageHostError('Invalid image delivery URL.');
    return { success: true, pending: false, url };
  }
  if (data.state === 'blocked')
    throw new ImageHostError('The image was rejected by the image service.', 422);
  if (data.state === 'expired')
    throw new ImageHostError('The image has expired. Upload it again.', 410);
  if (data.state === 'scan_error')
    throw new ImageHostError('The image could not be scanned. Please try again later.');
  if (data.state !== 'pending' && data.state !== 'scanning')
    throw new ImageHostError('Invalid image processing state.');
  return { success: true, pending: true, id: data.id, state: data.state };
}

export async function uploadHostedImage(file: File): Promise<ImageUploadResult> {
  const body = new FormData();
  body.append('file', file);
  body.append('public', 'true');
  return requestImage('', { method: 'POST', body });
}

export async function getHostedImage(id: string): Promise<ImageUploadResult> {
  if (!/^[a-zA-Z0-9_-]{1,200}$/.test(id)) throw new ImageHostError('Invalid image ID.', 400);
  return requestImage(`/${encodeURIComponent(id)}`);
}
