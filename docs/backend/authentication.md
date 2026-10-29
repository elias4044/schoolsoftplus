# Authentication

The backend supports classic browser cookies, browser OAuth with PKCE, mobile token exchange, and WebAuthn passkeys. These flows produce different credentials. Use the actual paths below: comments in several files still refer to `/api/mobile/*`, but those routes do not exist in this tree.

## Choose a flow

| Need | Entry point | Result |
| --- | --- | --- |
| Classic browser login | `POST /api/login` | SSP browser cookies; no SchoolSoft access token |
| Browser SchoolSoft OAuth | `GET /api/auth/v2/initiate` | Redirect, PKCE cookie, callback, browser cookies and SchoolSoft tokens |
| Browser SAML login | `GET /api/auth/v2/initiate/external` | Same callback, direct SchoolSoft SAML entry |
| Native app password exchange | `POST /api/auth/login` | Raw SchoolSoft token fields in JSON |
| Native app browser PKCE | `GET /api/auth/login`, then `POST /api/auth/token` | SSP-signed mobile JWT, not browser cookies |
| Native app SchoolSoft token refresh | `POST /api/auth/refresh` | Raw refreshed SchoolSoft token fields |
| Convert a SchoolSoft token to session material | `GET /api/auth/session` | SSP cookie values and upstream Cookie header in JSON; no Set-Cookie installation |
| Login using a saved refresh token | `POST /api/auth/v2/refresh-token-login` | Verified AuthV2 browser cookies |
| Passkey login | Begin and complete authentication endpoints | Verified AuthV2 browser cookies |

## Classic browser login

`POST /api/login` accepts `username` (nonempty, up to 200), `password` (nonempty, up to 1,000), and optional string `usertype` in `1`, `2`, `3`, `4` (default `1`). School comes from `x-school`, default `engelska`; a body school does not select this flow's school.

The handler posts a form to `/jsp/Login.jsp` with `action=login`, `ssusername`, `sspassword`, and `usertype`. It requires a 302 response and both JSESSIONID and hash cookies. It then fetches `/rest-api/session`, verifies the returned account ID, and migrates the account before returning `{success:true,userId}`.

Login statistics are recorded transactionally where possible. A first recorded login can credit the `ssp_ref` referral cookie. This referral credit is implemented here; the AuthV2 callback does not perform the same referral-credit step. A statistics error is caught, but a later referral failure can still fail the request.

```sh
curl -i -c cookies.txt -H 'Content-Type: application/json' -H 'x-school: engelska' \
  -d '{"username":"student.example","password":"example-password"}' \
  http://localhost:3000/api/login
curl -b cookies.txt http://localhost:3000/api/session
```

This creates seven-day classic session cookies, including server-only JSESSIONID/hash/user type/account ID/organization. School and username are browser-readable. It clears AuthV2 token, refresh, expiry, auth-type, and referral cookies.

## Browser AuthV2 and refresh

Both initiation routes accept `school=engelska` and `orgid=18` defaults. The callback base is `NEXT_PUBLIC_APP_URL`, otherwise forwarded protocol (default HTTPS) plus Host. The handler stores `{verifier,state,school,orgid,redirectUri}` in an HttpOnly `ssp_v2_pkce` cookie for ten minutes and redirects to SchoolSoft using client `eApp`. External initiation constructs a SAML RelayState.

The callback accepts `code`, `state`, and optional `error`. It checks the cookie and state, exchanges code plus verifier, verifies the account through the EVA-to-browser-session bridge, migrates it, and synchronizes any stored passkey refresh token. It attempts a second browser-session exchange, records login statistics, sets tokens/cookies, clears PKCE state on success, and redirects to `/dashboard?init`. Expected OAuth failures redirect to `/login?authv2_error=...`; unhandled exceptions still use the shared JSON error wrapper.

The callback can finish without the second exchange producing browser cookies, because token-backed resolution can recreate them later. It does not establish a session from a username hint. SchoolSoft's verified user record is authoritative.

`POST /api/auth/v2/token-refresh` takes no JSON body. It reads `ssp_ss_refresh_token`, school, organization, and username cookies. Missing refresh token is 401. The shared refresh helper obtains fresh tokens, verifies identity, attempts browser-session creation, and returns expiry plus updated cookies. Its explicit refresh failures are 401, network failures 502, and unexpected failures 500. Browser-session creation is optional here, but identity verification is mandatory.

`POST /api/auth/v2/refresh-token-login` accepts `{school,refreshToken,orgid?}`. Unlike token-refresh, this flow requires a returned JSESSIONID and hash. It records a login and returns `{success:true,username,expiresAt}`. `expiresAt` is Unix seconds. Both routes migrate the verified account and update an existing passkey user's encrypted refresh token.

```js
const response = await fetch('/api/auth/v2/token-refresh', { method: 'POST' });
const result = await response.json();
// When response.status === 401, return the user to login.
```

Normal protected routes also recover AuthV2 sessions: a missing browser session triggers refresh/exchange, and an upstream 401/403 for an old JSESSIONID retries using token material. There is no cross-request refresh lock, so parallel requests are not guaranteed to share refresh-token rotation.

## Mobile token endpoints

`GET /api/auth/login` returns `{success,authUrl,verifier,state}` without storing server state. Query fields are `school`, `orgid`, and `redirect_uri`. The actual default redirect is `com.schoolsoftplus.app://`. The app must retain the verifier and state, open `authUrl`, and compare callback state itself.

`POST /api/auth/login` accepts `{username,password,school?,orgid?}`. Body school wins over `x-school`, then `engelska`; organization defaults to `18`. It generates PKCE, calls SchoolSoft's password endpoint, and exchanges the returned code. The executable handler returns `{success:true,...tokenResult}`. It does not sign an SSP JWT, verify an account through `/rest-api/session`, install browser cookies, or record a canonical login user. It does update a login histogram. The comment claiming a signed 30-day JWT is outdated for this method.

`POST /api/auth/token` accepts `{code,verifier,school?,orgid?}`. It exchanges the code, requires an access token, verifies the SchoolSoft account through the browser-session bridge, and signs an HS256 JWT with `MOBILE_JWT_SECRET`. The result is `{success:true,token,tokenType:"Bearer",expiresIn:2592000}`. The JWT payload includes username, school, SchoolSoft access token, optional refresh/expiry/user ID, and `iat`/`exp`. Signing is not encryption; store this token as a credential.

No route in this checkout consumes that SSP JWT via `verifyMobileToken` to authenticate general backend requests. In particular, sending it as `Authorization` to `/api/notes` will not satisfy `requireSession`.

`POST /api/auth/refresh` accepts `{refreshToken,school?}` and returns `{success:true,...SchoolSoftTokenFields}`. A non-200 token response becomes 401; transport failure becomes 502. Bare token text is wrapped as `access_token`. Refresh-token rotation and storage are the caller's responsibility.

`GET /api/auth/session` requires `x-ss-token` containing a SchoolSoft access token. Optional headers include `x-school`, `x-orgid`, `x-userid`, `x-language`, `x-theme`, `x-useros`, `x-redirect-url`, and `x-username` (read but not trusted or returned as identity). Defaults are engelska, 18, sw, dark, and android. It requires JSESSIONID plus hash from EVA, verifies them with `/rest-api/session`, and returns `school`, canonical `username`, `userId`, `ssp_jsessionid`, `ssp_hash`, `ssp_usertype`, and `cookieHeader`. It returns credential material in JSON, not Set-Cookie headers.

## Passkeys

Registration requires a verified browser session. Begin generates resident-key registration options with user verification required and excludes existing credentials. User handles are base64url of `userId@lowercase-school`. Challenges are stored in Firestore and referenced by a five-minute HttpOnly cookie.

Complete accepts `{response: RegistrationResponseJSON,deviceName?}` and also requires the AuthV2 refresh-token cookie. The challenge must be registration type and bound to the current user handle. It is consumed transactionally before WebAuthn verification, so a failed completion needs a new begin request. Verification checks challenge, `PASSKEY_ORIGIN`, `PASSKEY_RP_ID`, and user verification. The public key, counter, device metadata, and encrypted refresh token are then stored. Device names are trimmed to 64 characters or derived from User-Agent.

```js
// In a client with @simplewebauthn/browser installed:
const begin = await fetch('/api/auth/passkey/register/begin', { method: 'POST' }).then(r => r.json());
const response = await startRegistration({ optionsJSON: begin.options });
await fetch('/api/auth/passkey/register/complete', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ response, deviceName: 'My laptop' })
});
```

Authentication begin is public and uses discoverable credentials with empty `allowCredentials`. Complete accepts `{response: AuthenticationResponseJSON}` and the authentication challenge cookie. It first tries the supplied user handle, then the flat credential index. Contrary to an older route comment, fallback is not a collection-group query.

After verifying the assertion, the handler checks counter progression (zero stored counters are allowed), updates counter/last-used time before network calls, decrypts the refresh token, and refreshes it with SchoolSoft. It persists a rotated token before later network work, verifies the refreshed identity against the stored account, migrates it, and sets AuthV2 cookies. Success is `{success:true,redirectTo:"/dashboard"}`; the client performs navigation. SchoolSoft refresh rejection returns 401 with `code:"REFRESH_EXPIRED"`. Reauthentication through AuthV2 can update the stored token.

`GET /api/auth/passkey/credentials` returns only ID, device name/type, backup flag, and creation/last-use times in milliseconds. `DELETE /api/auth/passkey/credentials/[id]` checks ownership, removes credential and flat index, and deletes the parent if no credentials remain. Listing/deletion require a live verified session.

## Cookie and logout details

All these cookie writers use path `/`, SameSite Lax where specified, and Secure in production. Cookie lifetime is not proof that SchoolSoft still accepts the underlying session.

| Cookie family | Typical lifetime | Purpose |
| --- | --- | --- |
| `ssp_jsessionid`, `ssp_hash`, `ssp_usertype` | Seven days on login | Browser session bridge |
| `ssp_school`, `ssp_username`, `ssp_userid`, `ssp_ss_orgid` | Varies by writer, seven or thirty days | Context and display metadata; never authoritative identity |
| `ssp_ss_token`, `ssp_ss_refresh_token` | Thirty days | AuthV2 recovery; HttpOnly |
| `ssp_ss_token_expires` | Thirty days | Browser-readable access-token expiry in seconds |
| `ssp_auth_type` | Thirty days in shared AuthV2 writer; seven in passkey completion | Marks token-backed sessions |
| `ssp_v2_pkce` | Ten minutes | Browser PKCE verifier/state |
| `ssp_pk_challenge_id`, `ssp_pk_auth_challenge_id` | Five minutes | WebAuthn ceremony references |

HttpOnly flags for account/organization metadata differ between writers. The route contract extracts show each actual cookie call. `applySessionCookieUpdates` refreshes classic bridge cookies with seven-day defaults and selected identity/token metadata for thirty days.

`POST /api/logout` requires no session or body. It expires classic, AuthV2, PKCE, and passkey challenge cookies and returns `{success:true}`. It does not revoke upstream tokens, remove stored passkeys, clear `ssp_ref`, or sign the browser out of Firebase. Client logout must also handle its own Firebase/session state.
