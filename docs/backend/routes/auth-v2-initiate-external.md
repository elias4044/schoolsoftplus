# /api/auth/v2/initiate/external

Start the same browser PKCE flow through SchoolSoft SAML, constructing RelayState and the ten-minute PKCE cookie. It shares the normal AuthV2 callback rather than implementing a separate callback handler.

[Domain guide](../authentication.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/auth/v2/initiate/external/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/v2/initiate/external/route.ts#L1). Source SHA-256: `325390c10948431874d7183957e52517757945380495408bcf309b4b24e58649`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/mobileAuth](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/mobileAuth.ts#L1): `{ makePkcePair, makeState }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`

## GET /api/auth/v2/initiate/external

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/v2/initiate/external/route.ts#L15).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/auth/v2/initiate/external?school=engelska&orgid=18'
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
    maxAge: 60 * 10, // 10 minutes - enough to complete the login
  })
```


#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
