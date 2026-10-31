export async function uploadImage(
  file: File,
  endpoint: '/api/pfp-upload' | '/api/msg-upload'
): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    throw new Error('Use a JPEG, PNG, or static WebP image.');

  const form = new FormData();
  form.append('image', file);
  const deadline = Date.now() + 120_000;
  let response = await fetch(endpoint, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(20_000),
  });
  while (true) {
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.error ?? 'Image upload failed.');
    if (!data.pending && typeof data.url === 'string') return data.url;
    if (!data.pending || typeof data.id !== 'string')
      throw new Error('Invalid image service response.');
    if (Date.now() >= deadline)
      throw new Error('Image scanning is taking too long. Please try again later.');
    await new Promise((resolve) => setTimeout(resolve, 1500));
    response = await fetch(`${endpoint}?id=${encodeURIComponent(data.id)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(20_000),
    });
  }
}
