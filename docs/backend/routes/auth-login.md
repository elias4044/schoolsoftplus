# /api/auth/login

GET creates a stateless mobile PKCE URL, verifier, and state for the app to retain. POST performs password-to-code-to-SchoolSoft-token exchange and returns raw SchoolSoft token fields, despite older comments describing an SSP JWT. Neither method installs browser cookies. Actual paths are /api/auth/*, not the old /api/mobile/* comment paths.

[Domain guide](../authentication.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/auth/login/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/login/route.ts#L1). Source SHA-256: `fe675261244f435c3440b7b0d30bddc88af20ef3c3bcbb2d9303782905bb32b3`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/mobileAuth](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/mobileAuth.ts#L1): `{ exchangeCodeForToken, makePkcePair, makeState }`
- [@/app/api/lib/requestBody](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/requestBody.ts#L1): `{ readRouteBody }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/statsHelper](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/statsHelper.ts#L1): `{ trackLoginEvent }`

## GET /api/auth/login

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/login/route.ts#L40).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/auth/login?school=engelska&orgid=18'
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
searchParams.get('redirect_uri')
```


#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json({ success: true, authUrl, verifier, state })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## POST /api/auth/login

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/login/route.ts#L96).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  -H 'Content-Type: application/json' \
  --data '{"username":"student.example","password":"example-password","school":"engelska","orgid":"18"}' \
  'http://localhost:3000/api/auth/login'
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
    username?: string;
    password?: string;
    school?: string;
    orgid?: string;
  };
```


#### Response branches


```ts
NextResponse.json(
      { success: false, error: 'username and password are required.' },
      { status: 400 }
    )
```


```ts
NextResponse.json(
        { success: false, error: loginRes.data?.userMessage || 'Authentication failed.' },
        { status: 401 }
      )
```


```ts
NextResponse.json(
        { success: false, error: 'Authentication failed \u2014 no authorization code returned.' },
        { status: 401 }
      )
```


```ts
NextResponse.json(
      { success: false, error: 'Could not reach SchoolSoft. Try again later.' },
      { status: 502 }
    )
```


```ts
NextResponse.json({ success: false, error: 'Token exchange failed.' }, { status: 401 })
```


```ts
NextResponse.json({ success: true, ...tokenResult })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls


```ts
axios.get(passwordLoginUrl, {
      timeout: 8_000,
      signal: AbortSignal.timeout(8_000),
      maxRedirects: 0,
      headers: { Accept: 'application/json', 'User-Agent': 'SchoolSoftPlus-Mobile/1.0' },
      validateStatus: () => true,
    })
```

