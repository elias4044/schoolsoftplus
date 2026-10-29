# /api/auth/passkey/register/begin

For a verified account, generate discoverable WebAuthn registration options with user verification required and existing credential IDs excluded. Save a five-minute registration challenge bound to userId@school and set its HttpOnly cookie. AuthV2 refresh material is enforced at completion, not begin.

[Domain guide](../authentication.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/auth/passkey/register/begin/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/passkey/register/begin/route.ts#L1). Source SHA-256: `2f37611e1029ab9a6766317f0c439d1cea767b0621c2e316a4c801996d800690`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/passkeyDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/passkeyDb.ts#L1): `{ listCredentials, makeUserHandle, saveChallenge }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ requireSession }`

## POST /api/auth/passkey/register/begin

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/passkey/register/begin/route.ts#L22).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  'http://localhost:3000/api/auth/passkey/register/begin'
```

### Source contract

#### Request reads


```ts
req.cookies.get('ssp_ss_orgid')
```


#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json({
    success: true,
    options,
    challengeId,
    userHandle,
    meta: { username, school, orgId },
  })
```


#### Cookie writes


```ts
res.cookies.set('ssp_pk_challenge_id', challengeId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 5 * 60,
  })
```


#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## Local helper behavior

The route also uses these local functions. Imported persistence and authentication behavior is described in the domain guide.

### getRpConfig

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/passkey/register/begin/route.ts#L9).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls

No direct upstream call.
