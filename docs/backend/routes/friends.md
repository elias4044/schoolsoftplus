# /api/friends

List accepted and pending relationships with profile enrichment. POST sends a request, returns a same-direction pending request unchanged, or accepts a reciprocal request. PATCH answers a pending request and defaults accept to true. DELETE removes a relationship idempotently. Compatibility username inputs resolve to known canonical IDs.

[Domain guide](../social.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/friends/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/friends/route.ts#L1). Source SHA-256: `505a27192e6345f58f50e6c473e26aa7af1ee64d8fe7dd4b8f64bbd29a42c820`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/friendsDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/friendsDb.ts#L1): `{ getFriends, getFriendship, getPendingRequestsReceived, getPendingRequestsSent, sendFriendRequest, }`
- [@/app/api/lib/profileDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/profileDb.ts#L1): `{ getProfile }`
- [@/app/api/lib/requestBody](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/requestBody.ts#L1): `{ readRouteBody }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ requireSession }`

## GET /api/friends

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/friends/route.ts#L16).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/friends'
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
NextResponse.json({ success: true, friends, received, sent, profileMap })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## POST /api/friends

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/friends/route.ts#L61).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  -H 'Content-Type: application/json' \
  --data '{"targetUsername":"12346"}' \
  'http://localhost:3000/api/friends'
```

### Source contract

#### Request reads


```ts
readRouteBody(req)
```


#### Parsed body and local type


```ts
const body = (await readRouteBody(req)) as { targetUsername?: string };
```


#### Response branches


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json({ success: false, error: 'Invalid target user.' }, { status: 400 })
```


```ts
NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 })
```


```ts
NextResponse.json({ success: true, friendship })
```


```ts
NextResponse.json({ success: false, error: message }, { status: 400 })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## DELETE /api/friends

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/friends/route.ts#L90).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X DELETE \
  -H 'Content-Type: application/json' \
  --data '{"targetUsername":"12346"}' \
  'http://localhost:3000/api/friends'
```

### Source contract

#### Request reads


```ts
readRouteBody(req)
```


#### Parsed body and local type


```ts
const body = (await readRouteBody(req)) as { targetUsername?: string };
```


#### Response branches


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json({ success: false, error: 'Invalid target.' }, { status: 400 })
```


```ts
NextResponse.json({ success: true })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## PATCH /api/friends

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/friends/route.ts#L109).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X PATCH \
  -H 'Content-Type: application/json' \
  --data '{"fromUsername":"12346","accept":true}' \
  'http://localhost:3000/api/friends'
```

### Source contract

#### Request reads


```ts
readRouteBody(req)
```


#### Parsed body and local type


```ts
const body = (await readRouteBody(req)) as { fromUsername?: string; accept?: boolean };
```


#### Response branches


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json({ success: false, error: 'Missing fromUsername.' }, { status: 400 })
```


```ts
NextResponse.json({ success: false, error: 'Request not found.' }, { status: 404 })
```


```ts
NextResponse.json({ success: true, friendship: friendship ?? existing })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
