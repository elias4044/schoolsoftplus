# /api/referrals/validate/[code]

Public uppercase-normalized code lookup with format validation. Return minimal referrer identity/display data or 404. The helper checks existence, not a date-based expiration, despite invalid-or-expired wording in the response.

[Domain guide](../integrations.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/referrals/validate/[code]/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/referrals/validate/%5Bcode%5D/route.ts#L1). Source SHA-256: `e499604e8f872310eb767c206235a6d84c0dbe224239b54cf4a88134c0e545b9`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/profileDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/profileDb.ts#L1): `{ getProfile }`
- [@/app/api/lib/referralDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/referralDb.ts#L1): `{ getUserIdByCode }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`

## GET /api/referrals/validate/[code]

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/referrals/validate/%5Bcode%5D/route.ts#L12).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/referrals/validate/ABCD2345'
```

### Source contract

#### Request reads

No request headers, query values, cookies, or body reader is called directly in this handler. Authentication helpers can still read cookies.

#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json({ success: false, error: 'Missing code.' }, { status: 400 })
```


```ts
NextResponse.json({ success: false, error: 'Invalid code.' }, { status: 400 })
```


```ts
NextResponse.json(
        { success: false, error: 'Invalid or expired code.' },
        { status: 404 }
      )
```


```ts
NextResponse.json({
      success: true,
      referrer: {
        username,
        displayName: profile?.displayName || username,
        pfpUrl: profile?.pfpUrl || '',
        schoolName: profile?.schoolName || '',
      },
    })
```


```ts
NextResponse.json(
      { success: false, error: 'Failed to validate code.' },
      { status: 500 }
    )
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
