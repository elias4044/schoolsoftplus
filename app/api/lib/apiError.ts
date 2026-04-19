import { NextResponse } from "next/server";
import type { AxiosError } from "axios";

interface ApiError extends Error {
  response?: {
    status: number;
    statusText: string;
    data: unknown;
  };
  request?: unknown;
}

/**
 * A robust error handler for API route handlers.
 * Logs the error and returns a standardised NextResponse with the
 * appropriate HTTP status code.
 */
export function handleApiError(error: ApiError | AxiosError | unknown, context: string): NextResponse {
  const err = error as ApiError;
  console.error(`[${context}] Error:`, err.message);

  if (err.response) {
    const { status, statusText, data } = err.response;
    console.error(`[${context}] Upstream status: ${status} ${statusText}`);
    console.error(`[${context}] Upstream data:`, data);
    return NextResponse.json(
      { success: false, error: `Upstream service error: ${statusText}` },
      { status }
    );
  }

  if (err.request) {
    return NextResponse.json(
      { success: false, error: "No response from upstream server." },
      { status: 504 }
    );
  }

  return NextResponse.json(
    { success: false, error: "Internal Server Error" },
    { status: 500 }
  );
}
