import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/app/api/lib/schoolsoft";
import { makeUserHandle, listCredentials } from "@/app/api/lib/passkeyDb";
import { Timestamp } from "firebase-admin/firestore";

/**
 * GET /api/auth/passkey/credentials
 *
 * Returns the list of passkey credentials registered by the current user.
 * Public key material is never returned.
 */
export async function GET(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  const userHandle = makeUserHandle(sess.username, sess.school);
  const creds = await listCredentials(userHandle);

  return NextResponse.json({
    success: true,
    credentials: creds.map(c => ({
      id: c.credentialId,
      deviceName: c.deviceName,
      deviceType: c.deviceType,
      backedUp: c.backedUp,
      createdAt: (c.createdAt as Timestamp).toMillis(),
      lastUsedAt: (c.lastUsedAt as Timestamp).toMillis(),
    })),
  });
}
