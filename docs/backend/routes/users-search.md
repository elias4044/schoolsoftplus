# /api/users/search

Authenticated prefix search of loginUsername and document ID, capped at fifteen results per query and deduplicated, excluding the caller. Trim query to one hundred characters; fewer than two returns an empty list. It does not search display-name substrings.

[Domain guide](../social.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/users/search/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/users/search/route.ts#L1). Source SHA-256: `bdfe9f66c9670409fb08b01a42e355d0813ac81a44d880f238dbfd685540c625`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/messagingDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/messagingDb.ts#L1): `{ searchUsers }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ requireSession }`

## GET /api/users/search

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/users/search/route.ts#L8).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/users/search?q=student'
```

### Source contract

#### Request reads


```ts
req.nextUrl.searchParams.get('q')
```


#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json({ success: true, users: [] })
```


```ts
NextResponse.json({ success: true, users })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
