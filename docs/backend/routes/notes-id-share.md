# /api/notes/[id]/share

Issue a fresh forty-character random hex token or revoke the current token after transactional ownership verification. Issuing replaces the previous token. Neither action changes note status or requires a body. Revoking does not erase message snapshots of the note.

[Domain guide](../study-tools.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/notes/[id]/share/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/notes/%5Bid%5D/share/route.ts#L1). Source SHA-256: `76f69a39c73ed7ea8dc76d1c62c560cc40b9b05240e8705c590f34cd119c5adc`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/authenticatedUser](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/authenticatedUser.ts#L1): `{ getAuthenticatedUserId }`
- [@/app/api/lib/notesDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/notesDb.ts#L1): `{ generateShareToken, revokeShareToken }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ assertDocumentId, withValidation }`

## POST /api/notes/[id]/share

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/notes/%5Bid%5D/share/route.ts#L7).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  'http://localhost:3000/api/notes/12345/share'
```

### Source contract

#### Request reads

No request headers, query values, cookies, or body reader is called directly in this handler. Authentication helpers can still read cookies.

#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```


```ts
NextResponse.json({ error: 'Not found' }, { status: 404 })
```


```ts
NextResponse.json({ success: true, token })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## DELETE /api/notes/[id]/share

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/notes/%5Bid%5D/share/route.ts#L21).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X DELETE \
  'http://localhost:3000/api/notes/12345/share'
```

### Source contract

#### Request reads

No request headers, query values, cookies, or body reader is called directly in this handler. Authentication helpers can still read cookies.

#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```


```ts
NextResponse.json({ error: 'Not found' }, { status: 404 })
```


```ts
NextResponse.json({ success: true })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
