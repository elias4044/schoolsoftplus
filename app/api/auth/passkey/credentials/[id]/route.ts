import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/app/api/lib/schoolsoft";
import {
  makeUserHandle,
  getCredential,
  deleteCredential,
  countCredentials,
} from "@/app/api/lib/passkeyDb";
import { db } from "@/app/api/lib/firebaseAdmin";

/**
 * DELETE /api/auth/passkey/credentials/[id]
 *
 * Deletes a single passkey credential. If it was the last credential for
 * this user, the passkey_users parent document is also removed.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const sess = await requireSession(req);
  if (!sess) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  const { id: credentialId } = await params;
  if (!credentialId) {
    return NextResponse.json({ success: false, error: "Missing credential ID." }, { status: 400 });
  }

  const userHandle = makeUserHandle(sess.username, sess.school);

  // Verify the credential belongs to this user before deleting
  const existing = await getCredential(userHandle, credentialId);
  if (!existing) {
    return NextResponse.json({ success: false, error: "Credential not found." }, { status: 404 });
  }

  await deleteCredential(userHandle, credentialId);

  // If no credentials remain, clean up the parent user document
  const remaining = await countCredentials(userHandle);
  if (remaining === 0) {
    await db.collection("passkey_users").doc(userHandle).delete();
  }

  return NextResponse.json({ success: true });
}
