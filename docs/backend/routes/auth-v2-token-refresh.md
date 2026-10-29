# /api/auth/v2/token-refresh

Use the HttpOnly refresh-token cookie to refresh and verify an AuthV2 account, update session cookies, migrate identity, and synchronize any stored passkey token. No JSON body is read. Browser-session creation is optional after account verification. Return access expiry in Unix seconds, or 401 when refresh is unavailable/expired.

[Domain guide](../authentication.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/auth/v2/token-refresh/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/v2/token-refresh/route.ts#L1). Source SHA-256: `a5dee110e3f0e469702efb4087e91f39ded3898ab6d85d4032909b852c1ea78c`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/auth/v2/lib](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/v2/lib.ts#L1): `{ applyAuthV2Cookies, AuthV2Error, refreshAuthV2Session, syncPasskeyRefreshToken, }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`

## POST /api/auth/v2/token-refresh

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/v2/token-refresh/route.ts#L22).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  'http://localhost:3000/api/auth/v2/token-refresh'
```

### Source contract

#### Request reads


```ts
req.cookies.get('ssp_ss_refresh_token')
```


```ts
req.cookies.get('ssp_school')
```


```ts
req.cookies.get('ssp_ss_orgid')
```


```ts
req.cookies.get('ssp_username')
```


#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json(
      { success: false, error: 'No refresh token available. Please log in again.' },
      { status: 401 }
    )
```


```ts
NextResponse.json({ success: true, expiresAt: session.ssTokenExpiresAt })
```


```ts
NextResponse.json({ success: false, error: error.message }, { status: error.status })
```


```ts
NextResponse.json(
      { success: false, error: 'Could not refresh the SchoolSoft session.' },
      { status: 500 }
    )
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
