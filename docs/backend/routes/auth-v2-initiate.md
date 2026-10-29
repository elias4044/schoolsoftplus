# /api/auth/v2/initiate

Start browser OAuth PKCE with client eApp. Set a ten-minute HttpOnly verifier/state cookie and redirect to SchoolSoft's student login. Callback base comes from NEXT_PUBLIC_APP_URL or request host/protocol. Defaults school engelska and organization 18.

[Domain guide](../authentication.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/auth/v2/initiate/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/v2/initiate/route.ts#L1). Source SHA-256: `53df681c23c40a42842ba173b51ec3a0eac9b280aae8f2b5ba015626872f7733`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/mobileAuth](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/mobileAuth.ts#L1): `{ makePkcePair, makeState }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`

## GET /api/auth/v2/initiate

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/v2/initiate/route.ts#L21).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/auth/v2/initiate?school=engelska&orgid=18'
```

### Source contract

#### Request reads


```ts
searchParams.get('school')
```


```ts
searchParams.get('orgid')
```


```ts
req.headers.get('x-forwarded-proto')
```


```ts
req.headers.get('host')
```


#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.redirect(authUrl)
```


#### Cookie writes


```ts
res.cookies.set('ssp_v2_pkce', pkcePayload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 10, // 10 minutes \u2014 enough to complete the login
  })
```


#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
