# /api/flashcards

List owned decks newest-updated first or create an empty deck from validated metadata. Creation requires nonblank title and returns 201 with cardCount zero. This route does not create cards; use the child cards route after retaining the returned deck ID.

[Domain guide](../study-tools.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/flashcards/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/flashcards/route.ts#L1). Source SHA-256: `dafab813fee15dc14bccf56d4ac697bdbf5952213a3d9d743acd044984171664`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/authenticatedUser](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/authenticatedUser.ts#L1): `{ getAuthenticatedUserId }`
- [@/app/api/lib/flashcardsDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/flashcardsDb.ts#L1): `{ createDeck, getDecksByUser, type DeckColor }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ readJsonObject, validateFields, withValidation }`
- [@/app/api/lib/studyValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/studyValidation.ts#L1): `{ deckFields }`

## GET /api/flashcards

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/flashcards/route.ts#L10).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/flashcards'
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
NextResponse.json({ success: true, decks })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## POST /api/flashcards

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/flashcards/route.ts#L18).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  -H 'Content-Type: application/json' \
  --data '{"title":"Biology","color":"emerald","tags":["cells"]}' \
  'http://localhost:3000/api/flashcards'
```

### Source contract

#### Request reads


```ts
readJsonObject(req)
```


#### Parsed body and local type


```ts
const body = await readJsonObject(req);
```


#### Response branches


```ts
NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```


```ts
NextResponse.json({ error: 'title is required' }, { status: 400 })
```


```ts
NextResponse.json({ success: true, deck }, { status: 201 })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
