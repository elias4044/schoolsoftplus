/* -- Base fetcher ----------------------------------------- */
interface ApiOptions extends RequestInit {
  params?: Record<string, string | number | undefined>;
}

export async function apiFetch<T = unknown>(
  path: string,
  { params, ...init }: ApiOptions = {}
): Promise<T> {
  const url = new URL(path, typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  // Stringify plain-object bodies
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  };

  if (init.body && !(init.body instanceof FormData) && typeof init.body === "object") {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(init.body) as unknown as BodyInit;
  }

  // credentials: "same-origin" is the browser default for same-origin requests,
  // so browser cookies are sent automatically — no manual injection needed.
  const res = await fetch(url.toString(), { ...init, headers, credentials: "same-origin" });

  if (!res.ok) {
    if (res.status === 401) {
      throw new ApiError(401, "Unauthorized");
    }
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body?.error ?? res.statusText);
  }

  return res.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
