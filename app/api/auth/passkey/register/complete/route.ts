import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationResponse, type RegistrationResponseJSON } from "@simplewebauthn/server";
import { requireSession } from "@/app/api/lib/schoolsoft";
import {
  makeUserHandle,
  consumeChallenge,
  upsertPasskeyUser,
  saveCredential,
} from "@/app/api/lib/passkeyDb";
import { encrypt } from "@/app/api/lib/serverCrypto";
import { Timestamp } from "firebase-admin/firestore";

function getRpConfig() {
  const rpID   = process.env.PASSKEY_RP_ID;
  const origin = process.env.PASSKEY_ORIGIN;
  if (!rpID)   throw new Error("PASSKEY_RP_ID env var is not set.");
  if (!origin) throw new Error("PASSKEY_ORIGIN env var is not set.");
  return { rpID, origin };
}

/**
 * POST /api/auth/passkey/register/complete
 *
 * Body: { response: RegistrationResponseJSON, deviceName?: string }
 *
 * Verifies the authenticator's registration response, then stores the
 * credential public key and an encrypted copy of the user's current
 * SchoolSoft refresh token so future passkey logins can exchange it
 * for a fresh session.
 */
export async function POST(req: NextRequest) {
  const sess = await requireSession(req);
  if (!sess) {
    return NextResponse.json({ success: false, error: "Not authenticated." }, { status: 401 });
  }

  const { username, school } = sess;
  const orgId = req.cookies.get("ssp_ss_orgid")?.value ?? "18";
  const refreshToken = req.cookies.get("ssp_ss_refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json(
      { success: false, error: "No AuthV2 refresh token found. Please log in with SchoolSoft OAuth first." },
      { status: 400 }
    );
  }

  const challengeId = req.cookies.get("ssp_pk_challenge_id")?.value;
  if (!challengeId) {
    return NextResponse.json({ success: false, error: "No pending registration challenge." }, { status: 400 });
  }

  let body: { response: RegistrationResponseJSON; deviceName?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  const challengeDoc = await consumeChallenge(challengeId);
  if (!challengeDoc) {
    return NextResponse.json(
      { success: false, error: "Registration challenge expired or not found. Please try again." },
      { status: 400 }
    );
  }

  const { rpID, origin } = getRpConfig();
  const userHandle = makeUserHandle(username, school);

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body.response,
      expectedChallenge: challengeDoc.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
    });
  } catch (err) {
    console.error("[passkey/register/complete] verification error:", (err as Error).message);
    return NextResponse.json(
      { success: false, error: "Passkey verification failed. Please try again." },
      { status: 400 }
    );
  }

  if (!verification.verified || !verification.registrationInfo) {
    return NextResponse.json({ success: false, error: "Passkey verification failed." }, { status: 400 });
  }

  const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

  // Encode credential ID and public key as base64url strings for storage
  const credentialId = Buffer.from(credential.id).toString("base64url");
  const publicKey = Buffer.from(credential.publicKey).toString("base64url");

  // Determine a device name: user-provided or fallback to UA
  const ua = req.headers.get("user-agent") ?? "";
  const deviceName = sanitizeDeviceName(body.deviceName) || deriveDeviceName(ua);

  const now = Timestamp.now();

  // Encrypt and store the refresh token
  const { ciphertext, iv } = encrypt(refreshToken);
  await upsertPasskeyUser(userHandle, {
    encryptedRefreshToken: ciphertext,
    encryptedRefreshTokenIV: iv,
    school,
    orgId,
    username: username.toLowerCase(),
  });

  // Save the credential
  await saveCredential(userHandle, {
    credentialId,
    publicKey,
    signCount: credential.counter,
    deviceName,
    createdAt: now,
    lastUsedAt: now,
    deviceType: credentialDeviceType,
    backedUp: credentialBackedUp,
  });

  const res = NextResponse.json({ success: true, credentialId, deviceName });
  // Clear the challenge cookie
  res.cookies.set("ssp_pk_challenge_id", "", { maxAge: 0, path: "/" });
  return res;
}

function sanitizeDeviceName(name: unknown): string {
  if (typeof name !== "string") return "";
  return name.trim().slice(0, 64);
}

function deriveDeviceName(ua: string): string {
  if (/iphone/i.test(ua))  return "iPhone";
  if (/ipad/i.test(ua))    return "iPad";
  if (/android/i.test(ua)) return "Android device";
  if (/windows/i.test(ua)) return "Windows device";
  if (/macintosh/i.test(ua)) return "Mac";
  if (/linux/i.test(ua))   return "Linux device";
  return "Unknown device";
}
