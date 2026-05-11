import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { generateAuthenticationOptions } from "@simplewebauthn/server";
import { saveChallenge } from "@/app/api/lib/passkeyDb";

function getRpId(): string {
  const rpID = process.env.PASSKEY_RP_ID;
  if (!rpID) throw new Error("PASSKEY_RP_ID env var is not set.");
  return rpID;
}

/**
 * POST /api/auth/passkey/authenticate/begin
 *
 * Generates authentication options for a discoverable-credential passkey flow.
 * No username or school is required — the passkey itself encodes the user identity.
 * No session is required (this is the unauthenticated login entry point).
 */
export async function POST(_req: NextRequest) {
  const rpID = getRpId();

  const options = await generateAuthenticationOptions({
    rpID,
    // Empty allowCredentials = discoverable credential flow
    allowCredentials: [],
    userVerification: "required",
  });

  const challengeId = crypto.randomBytes(16).toString("hex");
  // userHandle is unknown at this point — filled in during complete
  await saveChallenge(challengeId, options.challenge, "authentication", "");

  const res = NextResponse.json({ success: true, options, challengeId });

  // Pass challengeId as a short-lived httpOnly cookie for the complete step
  res.cookies.set("ssp_pk_auth_challenge_id", challengeId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 5 * 60,
  });

  return res;
}
