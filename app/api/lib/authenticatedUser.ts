import type { NextRequest } from 'next/server';

import { authUserWithUsername } from './auth';
import { requireSession } from './schoolsoft';

export async function getAuthenticatedUsername(request: NextRequest): Promise<string | null> {
  const session = await requireSession(request);
  if (!session) return null;
  const username = session.username.toLowerCase().trim();
  if (!username) return null;
  const authenticated = await authUserWithUsername(session.cookieString, username, session.school);
  return authenticated ? username : null;
}
