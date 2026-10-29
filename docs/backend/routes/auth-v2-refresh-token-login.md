# /api/auth/v2/refresh-token-login

Login from a body-supplied SchoolSoft refresh token and school. Require successful browser-session creation in addition to canonical account verification, then migrate, record login, synchronize passkey token, and set cookies. Unlike token-refresh, absence of JSESSIONID/hash is a 502 failure.

[Domain guide](../authentication.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/auth/v2/refresh-token-login/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/v2/refresh-token-login/route.ts#L1). Source SHA-256: `6dcdf6aa6bd0d61ce609b08695805077d1d443a19a3cf6bf832914b1eebc2c19`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/auth/v2/lib](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/v2/lib.ts#L1): `{ applyAuthV2Cookies, AuthV2Error, refreshAuthV2Session, syncPasskeyRefreshToken, }`
- [@/app/api/lib/loginStats](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/loginStats.ts#L1): `{ recordLogin }`
- [@/app/api/lib/requestBody](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/requestBody.ts#L1): `{ readRouteBody }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/statsHelper](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/statsHelper.ts#L1): `{ trackLoginEvent }`

## POST /api/auth/v2/refresh-token-login

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/v2/refresh-token-login/route.ts#L14).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  -H 'Content-Type: application/json' \
  --data '{"school":"engelska","refreshToken":"EXAMPLE_SCHOOLSOFT_REFRESH_TOKEN","orgid":"18"}' \
  'http://localhost:3000/api/auth/v2/refresh-token-login'
```

### Source contract

#### Request reads


```ts
readRouteBody(req)
```


#### Parsed body and local type


```ts
const body = (await readRouteBody(req)) as {
    school?: string;
    refreshToken?: string;
    orgid?: string;
  };
```


#### Response branches


```ts
NextResponse.json(
      { success: false, error: 'School and refresh token are required.' },
      { status: 400 }
    )
```


```ts
NextResponse.json({
      success: true,
      username: session.username,
      expiresAt: session.ssTokenExpiresAt,
    })
```


```ts
NextResponse.json({ success: false, error: error.message }, { status: error.status })
```


```ts
NextResponse.json(
      { success: false, error: 'Could not complete refresh token login.' },
      { status: 500 }
    )
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
