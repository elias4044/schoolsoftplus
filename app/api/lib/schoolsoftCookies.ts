export async function requestSchoolsoftCookies(
  url: string,
  options: RequestInit
): Promise<{ status: number; cookies: string[] }> {
  const response = await fetch(url, { ...options, redirect: 'manual' });
  const cookies = response.headers.getSetCookie();
  await response.body?.cancel();
  return { status: response.status, cookies };
}
