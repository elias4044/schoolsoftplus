# /api/auth/passkey/authenticate/complete

Consume the challenge, locate the credential by supplied handle or flat index, verify assertion and counter, rotate encrypted refresh material, verify the refreshed SchoolSoft account, migrate, and install AuthV2 cookies. Return redirectTo for the client to navigate. Refresh rejection carries REFRESH_EXPIRED. Placeholder WebAuthn payloads in examples are structural only, not valid assertions.

[Domain guide](../authentication.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/auth/passkey/authenticate/complete/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/passkey/authenticate/complete/route.ts#L1). Source SHA-256: `9537613c15eb7baa10cb51debfb6bf9dd922a795f221f32c63654b8278f3570b`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/mobileAuth](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/mobileAuth.ts#L1): `{ fetchSchoolsoftSession }`
- [@/app/api/lib/passkeyDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/passkeyDb.ts#L1): `{ consumeChallenge, findCredentialByIdGlobal, getCredential, getPasskeyUser, updateCredentialSignCount, updatePasskeyToken, type PasskeyCredential, }`
- [@/app/api/lib/requestBody](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/requestBody.ts#L1): `{ readRouteBody }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/serverCrypto](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/serverCrypto.ts#L1): `{ decrypt, encrypt }`

## POST /api/auth/passkey/authenticate/complete

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/passkey/authenticate/complete/route.ts#L44).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  -H 'Content-Type: application/json' \
  --data '{"response":{"id":"EXAMPLE_CREDENTIAL_ID","rawId":"EXAMPLE_CREDENTIAL_ID","type":"public-key","response":{"clientDataJSON":"GENERATED_BY_AUTHENTICATOR","authenticatorData":"GENERATED_BY_AUTHENTICATOR","signature":"GENERATED_BY_AUTHENTICATOR","userHandle":"GENERATED_BY_AUTHENTICATOR"},"clientExtensionResults":{}}}' \
  'http://localhost:3000/api/auth/passkey/authenticate/complete'
```

### Source contract

#### Request reads


```ts
req.cookies.get('ssp_pk_auth_challenge_id')
```


```ts
readRouteBody(req)
```


#### Parsed body and local type


```ts
const body = (await readRouteBody(req)) as { response: AuthenticationResponseJSON };
```


#### Response branches


```ts
NextResponse.json(
      { success: false, error: 'No pending authentication challenge.' },
      { status: 400 }
    )
```


```ts
NextResponse.json(
      { success: false, error: 'Authentication challenge expired. Please try again.' },
      { status: 400 }
    )
```


```ts
NextResponse.json({ success: false, error: 'Passkey not recognised.' }, { status: 401 })
```


```ts
NextResponse.json(
      { success: false, error: 'Passkey authentication failed. Please try again.' },
      { status: 400 }
    )
```


```ts
NextResponse.json(
      { success: false, error: 'Passkey authentication failed.' },
      { status: 401 }
    )
```


```ts
NextResponse.json(
      { success: false, error: 'Passkey rejected: possible credential clone detected.' },
      { status: 401 }
    )
```


```ts
NextResponse.json(
      { success: false, error: 'Passkey user record not found.' },
      { status: 401 }
    )
```


```ts
NextResponse.json(
      {
        success: false,
        error:
          'Could not read stored credentials. Please log in with AuthV2 once to re-activate your passkey.',
      },
      { status: 401 }
    )
```


```ts
NextResponse.json(
        {
          success: false,
          error:
            'Your passkey session has expired. Please log in with AuthV2 once to re-activate it.',
          code: 'REFRESH_EXPIRED',
        },
        { status: 401 }
      )
```


```ts
NextResponse.json(
        { success: false, error: 'No access token in SchoolSoft response.' },
        { status: 502 }
      )
```


```ts
NextResponse.json(
      { success: false, error: 'Could not reach SchoolSoft. Try again later.' },
      { status: 502 }
    )
```


```ts
NextResponse.json({ error: 'Passkey account could not be verified.' }, { status: 401 })
```


```ts
NextResponse.json({ success: true, redirectTo: '/dashboard' })
```


#### Cookie writes


```ts
res.cookies.set('ssp_jsessionid', jsessionid, base)
```


```ts
res.cookies.set('ssp_hash', hash, base)
```


```ts
res.cookies.set('ssp_usertype', usertype, base)
```


```ts
res.cookies.set('ssp_school', school, { ...base, httpOnly: false })
```


```ts
res.cookies.set('ssp_username', canonicalUsername, { ...base, httpOnly: false })
```


```ts
res.cookies.set('ssp_userid', userId, base)
```


```ts
res.cookies.set('ssp_auth_type', 'authv2', { ...base, httpOnly: false })
```


```ts
res.cookies.set('ssp_ss_token', ssToken, authv2)
```


```ts
res.cookies.set('ssp_ss_refresh_token', newRefreshToken, authv2)
```


```ts
res.cookies.set('ssp_ss_orgid', orgId, authv2)
```


```ts
res.cookies.set('ssp_ss_token_expires', String(ssTokenExpiresAt), { ...authv2, httpOnly: false })
```


```ts
res.cookies.set('ssp_pk_auth_challenge_id', '', { maxAge: 0, path: '/' })
```


#### Direct upstream calls


```ts
fetch(refreshUrl, {
      signal: AbortSignal.timeout(8_000),
      method: 'POST',
      headers: { accept: 'application/json' },
    })
```


```ts
axios.get(sessionUrl, {
      timeout: 8_000,
      signal: AbortSignal.timeout(8_000),
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'nyEva',
        'X-Requested-With': 'com.schoolsoft.eapp.android',
        token: ssToken,
        orgId,
        redirecturl: redirectUrl,
        language: 'sw',
        theme: 'dark',
        useros: 'android',
        ...(userId ? { userid: userId } : {}),
      },
      maxRedirects: 0,
      validateStatus: () => true,
    })
```


## Local helper behavior

The route also uses these local functions. Imported persistence and authentication behavior is described in the domain guide.

### getRpConfig

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/passkey/authenticate/complete/route.ts#L24).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls

No direct upstream call.
