import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { verifyAuthenticationResponse, type AuthenticationResponseJSON } from "@simplewebauthn/server";
import {
  consumeChallenge,
  findCredentialByIdGlobal,
  getCredential,
  getPasskeyUser,
  updateCredentialSignCount,
  updatePasskeyToken,
  type PasskeyCredential,
} from "@/app/api/lib/passkeyDb";
import { decrypt, encrypt } from "@/app/api/lib/serverCrypto";
import { fetchSchoolsoftSession } from "@/app/api/lib/mobileAuth";

const CLIENT_ID = "eApp";

function getRpConfig() {
  const rpID   = process.env.PASSKEY_RP_ID;
  const origin = process.env.PASSKEY_ORIGIN;
  if (!rpID)   throw new Error("PASSKEY_RP_ID env var is not set.");
  if (!origin) throw new Error("PASSKEY_ORIGIN env var is not set.");
  return { rpID, origin };
}

/**
 * POST /api/auth/passkey/authenticate/complete
 *
 * Body: { response: AuthenticationResponseJSON }
 *
 * 1. Verifies the WebAuthn assertion.
 * 2. Enforces sign count (anti-clone).
 * 3. Decrypts the stored SchoolSoft refresh token.
 * 4. Exchanges it for a new access token + JSESSIONID.
 * 5. Sets all session cookies identically to AuthV2 callback.
 * 6. Re-encrypts and persists the new refresh token.
 */
export async function POST(req: NextRequest) {
  const challengeId = req.cookies.get("ssp_pk_auth_challenge_id")?.value;
  if (!challengeId) {
    return NextResponse.json(
      { success: false, error: "No pending authentication challenge." },
      { status: 400 }
    );
  }

  let body: { response: AuthenticationResponseJSON };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  const challengeDoc = await consumeChallenge(challengeId);
  if (!challengeDoc) {
    return NextResponse.json(
      { success: false, error: "Authentication challenge expired. Please try again." },
      { status: 400 }
    );
  }

  // Resolve the credential from Firestore.
  const rawCredId = body.response.id;
  const responseUserHandle = body.response.response?.userHandle;

  let credentialEntry: { userHandle: string; credential: PasskeyCredential } | null = null;

  if (responseUserHandle) {
    const cred = await getCredential(responseUserHandle, rawCredId);
    if (cred) credentialEntry = { userHandle: responseUserHandle, credential: cred };
  }

  // Fall back to collection-group query (requires a Firestore index on credentials.credentialId)
  if (!credentialEntry) {
    credentialEntry = await findCredentialByIdGlobal(rawCredId);
  }

  if (!credentialEntry) {
    return NextResponse.json(
      { success: false, error: "Passkey not recognised." },
      { status: 401 }
    );
  }

  const { userHandle, credential } = credentialEntry;

  const { rpID, origin } = getRpConfig();

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body.response,
      expectedChallenge: challengeDoc.challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      requireUserVerification: true,
      credential: {
        id: credential.credentialId,
        publicKey: Uint8Array.from(Buffer.from(credential.publicKey, "base64url")),
        counter: credential.signCount,
      },
    });
  } catch (err) {
    console.error("[passkey/authenticate/complete] verification error:", (err as Error).message);
    return NextResponse.json(
      { success: false, error: "Passkey authentication failed. Please try again." },
      { status: 400 }
    );
  }

  if (!verification.verified) {
    return NextResponse.json({ success: false, error: "Passkey authentication failed." }, { status: 401 });
  }

  // Enforce sign count to detect cloned credentials
  const { newCounter } = verification.authenticationInfo;
  if (newCounter <= credential.signCount && credential.signCount !== 0) {
    console.warn(
      `[passkey/authenticate/complete] sign count regression for ${rawCredId}: ` +
      `stored=${credential.signCount} new=${newCounter}`
    );
    return NextResponse.json(
      { success: false, error: "Passkey rejected: possible credential clone detected." },
      { status: 401 }
    );
  }

  // Update sign count immediately (before the slower network calls)
  await updateCredentialSignCount(userHandle, rawCredId, newCounter);

  // Decrypt the stored SchoolSoft refresh token
  const passkeyUser = await getPasskeyUser(userHandle);
  if (!passkeyUser) {
    return NextResponse.json(
      { success: false, error: "Passkey user record not found." },
      { status: 401 }
    );
  }

  let refreshToken: string;
  try {
    refreshToken = decrypt({
      ciphertext: passkeyUser.encryptedRefreshToken,
      iv: passkeyUser.encryptedRefreshTokenIV,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Could not read stored credentials. Please log in with AuthV2 once to re-activate your passkey." },
      { status: 401 }
    );
  }

  const school = passkeyUser.school;
  const orgId  = passkeyUser.orgId;

  // Exchange refresh token for new access token
  const refreshUrl =
    `https://sms.schoolsoft.se/${encodeURIComponent(school)}/rest-api/login/token` +
    `?clientId=${encodeURIComponent(CLIENT_ID)}` +
    `&grantType=refresh_token` +
    `&refreshToken=${encodeURIComponent(refreshToken)}`;

  let ssToken: string;
  let newRefreshToken: string;
  let expiresIn = 900;

  try {
    const refreshRes = await fetch(refreshUrl, {
      method: "POST",
      headers: { accept: "application/json" },
    });

    if (refreshRes.status !== 200) {
      const text = await refreshRes.text().catch(() => "");
      console.warn(`[passkey/authenticate/complete] refresh failed (${refreshRes.status}):`, text);
      return NextResponse.json(
        {
          success: false,
          error: "Your passkey session has expired. Please log in with AuthV2 once to re-activate it.",
          code: "REFRESH_EXPIRED",
        },
        { status: 401 }
      );
    }

    const data = await refreshRes.json() as Record<string, unknown>;
    ssToken          = data.access_token  as string;
    newRefreshToken  = (data.refresh_token as string) ?? refreshToken;
    expiresIn        = typeof data.expires === "number" ? data.expires : 900;

    if (!ssToken) {
      return NextResponse.json(
        { success: false, error: "No access token in SchoolSoft response." },
        { status: 502 }
      );
    }
  } catch (err) {
    console.error("[passkey/authenticate/complete] network error:", (err as Error).message);
    return NextResponse.json(
      { success: false, error: "Could not reach SchoolSoft. Try again later." },
      { status: 502 }
    );
  }

  // Derive JSESSIONID via eva-apps
  const sessionInfo = await fetchSchoolsoftSession(school, ssToken);
  const canonicalUsername = sessionInfo?.username ?? passkeyUser.username;
  const userId = sessionInfo?.userId?.toString() ?? "";
  const redirectUrl = `https://sms.schoolsoft.se/${school}/react/#/student/subjectrooms`;
  const sessionUrl  = `https://sms.schoolsoft.se/${encodeURIComponent(school)}/eva-apps/auth/login/student`;

  let jsessionid = "";
  let hash       = "";
  let usertype   = "1";

  try {
    const sessionRes = await axios.get(sessionUrl, {
      headers: {
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "User-Agent": "nyEva",
        "X-Requested-With": "com.schoolsoft.eapp.android",
        token:       ssToken,
        orgId,
        redirecturl: redirectUrl,
        language:    "sw",
        theme:       "dark",
        useros:      "android",
        ...(userId ? { userid: userId } : {}),
      },
      maxRedirects: 0,
      validateStatus: () => true,
    });

    const setCookie = sessionRes.headers["set-cookie"];
    const rawCookies: string[] = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
    const extractValue = (raw: string) => raw.split(";")[0].split("=").slice(1).join("=");
    const cookieMap: Record<string, string> = {};
    for (const c of rawCookies) {
      const name = c.split("=")[0].trim();
      if (name) cookieMap[name] = extractValue(c);
    }
    jsessionid = cookieMap["JSESSIONID"] ?? "";
    hash       = cookieMap["hash"]       ?? "";
    usertype   = cookieMap["usertype"]   ?? "1";
  } catch (err) {
    console.error("[passkey/authenticate/complete] eva-apps error:", (err as Error).message);
  }

  // Persist re-encrypted refresh token back to Firestore (fire-and-forget)
  const { ciphertext, iv } = encrypt(newRefreshToken);
  updatePasskeyToken(userHandle, ciphertext, iv).catch(err =>
    console.error("[passkey/authenticate/complete] token update error:", (err as Error).message)
  );

  // Set all session cookies — same pattern as AuthV2 callback
  const ssTokenExpiresAt = Math.floor(Date.now() / 1000) + expiresIn;

  const res = NextResponse.json({ success: true, redirectTo: "/dashboard" });

  const base = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 7 };
  const authv2 = { ...base, maxAge: 60 * 60 * 24 * 30 };

  if (jsessionid && hash) {
    res.cookies.set("ssp_jsessionid", jsessionid, base);
    res.cookies.set("ssp_hash",       hash,       base);
    res.cookies.set("ssp_usertype",   usertype,   base);
  }
  res.cookies.set("ssp_school",   school,           { ...base, httpOnly: false });
  res.cookies.set("ssp_username", canonicalUsername, { ...base, httpOnly: false });
  res.cookies.set("ssp_auth_type", "authv2",         { ...base, httpOnly: false });
  res.cookies.set("ssp_ss_token",         ssToken,                  authv2);
  res.cookies.set("ssp_ss_refresh_token", newRefreshToken,          authv2);
  res.cookies.set("ssp_ss_orgid",         orgId,                    authv2);
  res.cookies.set("ssp_ss_token_expires", String(ssTokenExpiresAt), { ...authv2, httpOnly: false });

  // Clear challenge cookie
  res.cookies.set("ssp_pk_auth_challenge_id", "", { maxAge: 0, path: "/" });

  return res;
}
