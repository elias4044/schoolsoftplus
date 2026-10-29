# /api/auth/passkey/authenticate/begin

Public entry point for discoverable passkeys. Generate authentication options without an allowlist, require user verification, save a five-minute single-use challenge, and set the authentication challenge cookie. No account name or school is needed.

[Domain guide](../authentication.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/auth/passkey/authenticate/begin/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/passkey/authenticate/begin/route.ts#L1). Source SHA-256: `b1845b4aa54aab6027e1a6abd31ee24db4f92e9d93cb9e1715ef5978994625ef`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/passkeyDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/passkeyDb.ts#L1): `{ saveChallenge }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`

## POST /api/auth/passkey/authenticate/begin

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/passkey/authenticate/begin/route.ts#L21).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  'http://localhost:3000/api/auth/passkey/authenticate/begin'
```

### Source contract

#### Request reads

No request headers, query values, cookies, or body reader is called directly in this handler. Authentication helpers can still read cookies.

#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json({ success: true, options, challengeId })
```


#### Cookie writes


```ts
res.cookies.set('ssp_pk_auth_challenge_id', challengeId, {
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

### getRpId

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/passkey/authenticate/begin/route.ts#L8).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls

No direct upstream call.
