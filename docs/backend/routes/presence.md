# /api/presence

GET resolves and reads the first hundred deduplicated requested account references, returning derived status under original keys. PATCH requests the caller's status, with persisted fifteen-second all-change and 110-second same-status throttles. The echoed response can differ from persistence if throttled. Status ages to idle at three minutes and offline at fifteen.

[Domain guide](../social.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/presence/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/presence/route.ts#L1). Source SHA-256: `edbde3dd72222b68354fd1aa3bb8fe5e56addc4cd36189e66a1dbe84be5003b0`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/accountRegistry](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/accountRegistry.ts#L1): `{ resolveAccountReference }`
- [@/app/api/lib/presenceDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/presenceDb.ts#L1): `type { UserStatus }`
- [@/app/api/lib/presenceDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/presenceDb.ts#L1): `{ computeStatus, getPresenceForUsers, updatePresence }`
- [@/app/api/lib/requestBody](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/requestBody.ts#L1): `{ readRouteBody }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ applySessionCookieUpdates, requireSession }`

## GET /api/presence

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/presence/route.ts#L13).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/presence?users=12345,12346'
```

### Source contract

#### Request reads


```ts
req.nextUrl.searchParams.get('users')
```


#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json({ success: true, presences: {} })
```


```ts
NextResponse.json({ success: true, presences })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## PATCH /api/presence

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/presence/route.ts#L49).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X PATCH \
  -H 'Content-Type: application/json' \
  --data '{"status":"online"}' \
  'http://localhost:3000/api/presence'
```

### Source contract

#### Request reads


```ts
readRouteBody(req)
```


#### Parsed body and local type


```ts
const body = (await readRouteBody(req)) as { status?: string };
```


#### Response branches


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json({ success: false, error: 'Missing userId.' }, { status: 401 })
```


```ts
NextResponse.json({ success: true, status })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
