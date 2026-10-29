# /api/notes/[id]

Read, partially update through PUT, or delete an owned note. Updates validate supported fields and skip identical writes; at least one supported field is required. Foreign and absent IDs are both 404. Public sharing uses the separate share routes.

[Domain guide](../study-tools.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/notes/[id]/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/notes/%5Bid%5D/route.ts#L1). Source SHA-256: `b5716a2aa6cc212ed1cf48b26052b3ee0f1aa89c80399a6c7852dae0f8bfe873`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/authenticatedUser](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/authenticatedUser.ts#L1): `{ getAuthenticatedUserId }`
- [@/app/api/lib/notesDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/notesDb.ts#L1): `{ deleteNote, getNoteById, updateNote }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ assertDocumentId, readJsonObject, validateFields, withValidation, }`
- [@/app/api/lib/studyValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/studyValidation.ts#L1): `{ noteFields }`

## GET /api/notes/[id]

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/notes/%5Bid%5D/route.ts#L13).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/notes/12345'
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
NextResponse.json({ success: true, note })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## PUT /api/notes/[id]

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/notes/%5Bid%5D/route.ts#L27).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X PUT \
  -H 'Content-Type: application/json' \
  --data '{"title":"Cell biology revision","status":"published"}' \
  'http://localhost:3000/api/notes/12345'
```

### Source contract

#### Request reads


```ts
readJsonObject(req)
```


#### Parsed body and local type


```ts
const body = (await readJsonObject(req)) as { title?: string; content?: string; status?: string };
```


#### Response branches


```ts
NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```


```ts
NextResponse.json({ error: 'Not found' }, { status: 404 })
```


```ts
NextResponse.json({ success: true, note })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## DELETE /api/notes/[id]

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/notes/%5Bid%5D/route.ts#L48).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X DELETE \
  'http://localhost:3000/api/notes/12345'
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
