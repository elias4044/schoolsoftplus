import { NextResponse } from 'next/server';
import { isAxiosError } from 'axios';

import { InputError } from './validation';

export function handleApiError(error: unknown, context: string): NextResponse {
  if (error instanceof InputError)
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  const upstreamStatus = isAxiosError(error) ? error.response?.status : undefined;
  const timeout =
    isAxiosError(error) && ['ECONNABORTED', 'ETIMEDOUT', 'ERR_CANCELED'].includes(error.code ?? '');
  const status = timeout
    ? 504
    : upstreamStatus && upstreamStatus >= 400 && upstreamStatus <= 499
      ? upstreamStatus
      : 502;
  console.error(`[${context}] Upstream request failed`, { status, upstreamStatus });
  return NextResponse.json(
    {
      success: false,
      error: timeout
        ? 'SchoolSoft took too long to respond.'
        : 'Could not retrieve data from SchoolSoft.',
    },
    { status }
  );
}
