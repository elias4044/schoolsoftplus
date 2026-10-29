# /api/auth/token

Exchange code plus PKCE verifier, verify the SchoolSoft account through the session bridge, and sign a thirty-day SSP HS256 JWT. Requires MOBILE_JWT_SECRET. This differs from POST /api/auth/login, which returns provider tokens. General cookie-backed routes do not consume the issued mobile JWT.

[Domain guide](../authentication.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/auth/token/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/token/route.ts#L1). Source SHA-256: `4c180521b84179d004e6a9543c8eb1c160a847f19e9827e0f4204a6fee94ddab`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/mobileAuth](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/mobileAuth.ts#L1): `{ exchangeCodeForToken, fetchSchoolsoftSession, signMobileToken, }`
- [@/app/api/lib/requestBody](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/requestBody.ts#L1): `{ readRouteBody }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/statsHelper](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/statsHelper.ts#L1): `{ trackLoginEvent }`

## POST /api/auth/token

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/token/route.ts#L44).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  -H 'Content-Type: application/json' \
  --data '{"code":"EXAMPLE_CODE","verifier":"EXAMPLE_PKCE_VERIFIER","school":"engelska","orgid":"18"}' \
  'http://localhost:3000/api/auth/token'
```

### Source contract

#### Request reads


```ts
readRouteBody(req)
```


```ts
req.headers.get('x-school')
```


#### Parsed body and local type


```ts
const body = (await readRouteBody(req)) as {
    code?: string;
    verifier?: string;
    school?: string;
    orgid?: string;
  };
```


#### Response branches


```ts
NextResponse.json(
      { success: false, error: 'code and verifier are required.' },
      { status: 400 }
    )
```


```ts
NextResponse.json(
      { success: false, error: 'Token exchange failed. The code may have expired.' },
      { status: 401 }
    )
```


```ts
NextResponse.json(
      { success: false, error: 'Token exchange failed \u2014 no access_token returned.' },
      { status: 401 }
    )
```


```ts
NextResponse.json({ error: 'Account verification failed.' }, { status: 401 })
```


```ts
NextResponse.json({
    success: true,
    token,
    tokenType: 'Bearer',
    expiresIn: 30 * 24 * 60 * 60,
  })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
