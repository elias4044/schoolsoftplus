# /api/profile

Read or upsert the current account profile. PUT validates editable metadata, refreshes immutable identity snapshot fields from SchoolSoft, then awaits conversation name/picture propagation. Profile persistence can precede a propagation failure. Missing profiles read as null; equal profile saves still update timestamps.

[Domain guide](../social.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/profile/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/profile/route.ts#L1). Source SHA-256: `582759561a16e990465bcf7cd7f98290beda87448cd86eca7172778f7686b674`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/messagingDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/messagingDb.ts#L1): `{ updateParticipantName, updateParticipantPfp }`
- [@/app/api/lib/profileDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/profileDb.ts#L1): `{ getProfile, upsertProfile }`
- [@/app/api/lib/requestBody](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/requestBody.ts#L1): `{ readRouteBody }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ requireSession }`

## GET /api/profile

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/profile/route.ts#L10).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/profile'
```

### Source contract

#### Request reads

No request headers, query values, cookies, or body reader is called directly in this handler. Authentication helpers can still read cookies.

#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json({ success: true, profile })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## PUT /api/profile

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/profile/route.ts#L20).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X PUT \
  -H 'Content-Type: application/json' \
  --data '{"displayName":"Alex","bio":"Learning biology","accentColor":"#337755"}' \
  'http://localhost:3000/api/profile'
```

### Source contract

#### Request reads


```ts
readRouteBody(req)
```


#### Parsed body and local type


```ts
const body = (await readRouteBody(req)) as Record<string, unknown>;
```


#### Response branches


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json(
      { success: false, error: 'website must be a valid URL.' },
      { status: 400 }
    )
```


```ts
NextResponse.json(
        { success: false, error: 'ringtoneCustomUrl must be a valid URL or empty.' },
        { status: 400 }
      )
```


```ts
NextResponse.json({ success: true, profile })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
