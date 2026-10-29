import type { NextRequest } from 'next/server';

import { requireSession } from './schoolsoft';

export async function getAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  return (await requireSession(request))?.userId ?? null;
}
