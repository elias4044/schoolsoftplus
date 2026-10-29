import { InputError } from './validation';

const windows = new Map<string, { count: number; expiresAt: number }>();

export function enforceRateLimit(key: string, limit: number, windowMs = 60_000) {
  const now = Date.now();
  const previous = windows.get(key);
  if (previous && previous.expiresAt > now) {
    if (previous.count >= limit) throw new InputError('Too many requests. Please wait.', 429);
    previous.count++;
    return;
  }
  if (windows.size >= 5000) {
    for (const [entry, value] of windows) if (value.expiresAt <= now) windows.delete(entry);
    if (windows.size >= 5000) throw new InputError('Service is busy. Please try again.', 503);
  }
  windows.set(key, { count: 1, expiresAt: now + windowMs });
}
