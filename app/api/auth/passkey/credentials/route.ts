import { NextRequest, NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';

import { listCredentials, makeUserHandle } from '@/app/api/lib/passkeyDb';
import { withValidation } from '@/app/api/lib/routeValidation';
import { requireSession } from '@/app/api/lib/schoolsoft';

/**
 * GET /api/auth/passkey/credentials
 *
 * Returns the list of passkey credentials registered by the current user.
 * Public key material is never returned.
 */
export const GET = withValidation(async function GET(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess) {
    return NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
  }

  const userHandle = makeUserHandle(sess.userId, sess.school);
  const creds = await listCredentials(userHandle);

  return NextResponse.json({
    success: true,
    credentials: creds.map((c) => ({
      id: c.credentialId,
      deviceName: c.deviceName,
      deviceType: c.deviceType,
      backedUp: c.backedUp,
      createdAt: (c.createdAt as Timestamp).toMillis(),
      lastUsedAt: (c.lastUsedAt as Timestamp).toMillis(),
    })),
  });
});
