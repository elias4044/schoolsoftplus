let refreshPromise: Promise<boolean> | null = null;

export function refreshSessionToken(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = fetch('/api/auth/v2/token-refresh', {
    method: 'POST',
    signal: AbortSignal.timeout(20_000),
  })
    .then((response) => {
      if (response.status === 401 || response.status === 403) return false;
      if (!response.ok) throw new Error('Could not refresh your session. Please try again.');
      return true;
    })
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}
