import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { generateRegistrationOptions } from "@simplewebauthn/server";
import { requireSession } from "@/app/api/lib/schoolsoft";
import { makeUserHandle, saveChallenge, listCredentials } from "@/app/api/lib/passkeyDb";

function getRpConfig() {
  const rpID   = process.env.PASSKEY_RP_ID;
  const rpName = process.env.PASSKEY_RP_NAME ?? "SchoolSoft+";
  if (!rpID) throw new Error("PASSKEY_RP_ID env var is not set.");
  return { rpID, rpName };
}

/**
 * POST /api/auth/passkey/register/begin
 *
 * Returns WebAuthn registration options.
 * Requires an active session (user must already be logged in via AuthV2).
 */
export async function POST(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  const { username, school } = sess;
  const orgId = req.cookies.get("ssp_ss_orgid")?.value ?? "18";
  const userHandle = makeUserHandle(username, school);

  const { rpID, rpName } = getRpConfig();

  // Collect existing credential IDs to exclude from re-registration
  let existingCredentialIds: Uint8Array[] = [];
  try {
    const existing = await listCredentials(userHandle);
    existingCredentialIds = existing.map(c =>
      Uint8Array.from(Buffer.from(c.credentialId, "base64url"))
    );
  } catch { /* non-fatal */ }

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: Buffer.from(userHandle, "utf8"),
    userName: `${username}@${school}`,
    userDisplayName: username,
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "required",
      // Allow both platform (Face ID, Windows Hello) and cross-platform (hardware keys)
    },
    excludeCredentials: existingCredentialIds.map(id => ({ id, type: "public-key" })),
  });

  // Store challenge in Firestore
  const challengeId = crypto.randomBytes(16).toString("hex");
  await saveChallenge(challengeId, options.challenge, "registration", userHandle);

  // Return challenge ID alongside the options so the client can reference it on complete
  const res = NextResponse.json({
    success: true,
    options,
    challengeId,
    userHandle,
    meta: { username, school, orgId },
  });

  // Pass challengeId back as a short-lived httpOnly cookie for the complete step
  res.cookies.set("ssp_pk_challenge_id", challengeId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 5 * 60,
  });

  return res;
}
