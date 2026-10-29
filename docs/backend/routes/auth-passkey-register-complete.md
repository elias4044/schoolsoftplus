# /api/auth/passkey/register/complete

Consume the registration challenge, check its account binding and WebAuthn response, encrypt the current AuthV2 refresh token, and store credential/public-key/device metadata plus the flat index. Requires verified cookies and an AuthV2 refresh cookie. A failed verification consumes the challenge; begin again. See the authentication guide for a real browser ceremony.

[Domain guide](../authentication.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/auth/passkey/register/complete/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/passkey/register/complete/route.ts#L1). Source SHA-256: `6e228135123af36ad3bb413cafa4a3677243810568c5595bb131496336dd0b5b`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/passkeyDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/passkeyDb.ts#L1): `{ consumeChallenge, makeUserHandle, saveCredential, upsertPasskeyUser, }`
- [@/app/api/lib/requestBody](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/requestBody.ts#L1): `{ readRouteBody }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ requireSession }`
- [@/app/api/lib/serverCrypto](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/serverCrypto.ts#L1): `{ encrypt }`

## POST /api/auth/passkey/register/complete

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/passkey/register/complete/route.ts#L34).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  -H 'Content-Type: application/json' \
  --data '{"response":{"id":"EXAMPLE_CREDENTIAL_ID","rawId":"EXAMPLE_CREDENTIAL_ID","type":"public-key","response":{"clientDataJSON":"GENERATED_BY_AUTHENTICATOR","attestationObject":"GENERATED_BY_AUTHENTICATOR"},"clientExtensionResults":{}},"deviceName":"My laptop"}' \
  'http://localhost:3000/api/auth/passkey/register/complete'
```

### Source contract

#### Request reads


```ts
req.cookies.get('ssp_ss_orgid')
```


```ts
req.cookies.get('ssp_ss_refresh_token')
```


```ts
req.cookies.get('ssp_pk_challenge_id')
```


```ts
readRouteBody(req)
```


```ts
req.headers.get('user-agent')
```


#### Parsed body and local type


```ts
const body = (await readRouteBody(req)) as {
    response: RegistrationResponseJSON;
    deviceName?: string;
  };
```


#### Response branches


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json(
      {
        success: false,
        error: 'No AuthV2 refresh token found. Please log in with SchoolSoft OAuth first.',
      },
      { status: 400 }
    )
```


```ts
NextResponse.json(
      { success: false, error: 'No pending registration challenge.' },
      { status: 400 }
    )
```


```ts
NextResponse.json(
      { success: false, error: 'Registration challenge expired or not found. Please try again.' },
      { status: 400 }
    )
```


```ts
NextResponse.json(
      { success: false, error: 'Passkey verification failed. Please try again.' },
      { status: 400 }
    )
```


```ts
NextResponse.json(
      { success: false, error: 'Passkey verification failed.' },
      { status: 400 }
    )
```


```ts
NextResponse.json({ success: true, credentialId, deviceName })
```


#### Cookie writes


```ts
res.cookies.set('ssp_pk_challenge_id', '', { maxAge: 0, path: '/' })
```


#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## Local helper behavior

The route also uses these local functions. Imported persistence and authentication behavior is described in the domain guide.

### getRpConfig

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/passkey/register/complete/route.ts#L16).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls

No direct upstream call.

### sanitizeDeviceName

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/passkey/register/complete/route.ts#L147).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls

No direct upstream call.

### deriveDeviceName

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/passkey/register/complete/route.ts#L152).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls

No direct upstream call.
