# /api/referrals/set-ref

Public code lookup followed by an HttpOnly thirty-day referral cookie. Require a 6-12-character alphanumeric code that already exists. This prepares possible future classic-login credit; it does not immediately award a referral.

[Domain guide](../integrations.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/referrals/set-ref/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/referrals/set-ref/route.ts#L1). Source SHA-256: `27ebfb8444506387ce2f8ae7117e522c9a8ba1c26b3e1ed5174917ec90a6edfc`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/referralDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/referralDb.ts#L1): `{ getUserIdByCode }`
- [@/app/api/lib/requestBody](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/requestBody.ts#L1): `{ readRouteBody }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`

## POST /api/referrals/set-ref

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/referrals/set-ref/route.ts#L14).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  -H 'Content-Type: application/json' \
  --data '{"code":"ABCD2345"}' \
  'http://localhost:3000/api/referrals/set-ref'
```

### Source contract

#### Request reads


```ts
readRouteBody(req)
```


#### Parsed body and local type


```ts
const body = (await readRouteBody(req)) as { code?: string };
```


#### Response branches


```ts
NextResponse.json({ success: false, error: 'Invalid code.' }, { status: 400 })
```


```ts
NextResponse.json({ success: false, error: 'Code not found.' }, { status: 404 })
```


```ts
NextResponse.json({ success: true })
```


#### Cookie writes


```ts
res.cookies.set('ssp_ref', code, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
```


#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
