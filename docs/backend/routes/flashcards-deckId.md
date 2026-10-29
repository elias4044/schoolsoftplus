# /api/flashcards/[deckId]

GET returns an owned deck and its cards oldest-created first. PATCH updates supported deck metadata and skips equal changes. DELETE removes cards and parent in transactions of up to four hundred cards; it is not globally atomic across chunks. Foreign/missing deck IDs return 404.

[Domain guide](../study-tools.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/flashcards/[deckId]/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/flashcards/%5BdeckId%5D/route.ts#L1). Source SHA-256: `522a2d1aa7e666cbb973f2b7b3027e92ecd30a1d910ae12e87bbac229512f64c`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/authenticatedUser](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/authenticatedUser.ts#L1): `{ getAuthenticatedUserId }`
- [@/app/api/lib/flashcardsDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/flashcardsDb.ts#L1): `{ deleteDeck, getCardsByDeck, getDeckById, updateDeck, type DeckColor, }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ assertDocumentId, readJsonObject, validateFields, withValidation, }`
- [@/app/api/lib/studyValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/studyValidation.ts#L1): `{ deckFields }`

## GET /api/flashcards/[deckId]

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/flashcards/%5BdeckId%5D/route.ts#L21).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/flashcards/example-deck-id'
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
NextResponse.json({ success: true, deck, cards })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## PATCH /api/flashcards/[deckId]

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/flashcards/%5BdeckId%5D/route.ts#L37).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X PATCH \
  -H 'Content-Type: application/json' \
  --data '{"title":"Biology revision"}' \
  'http://localhost:3000/api/flashcards/example-deck-id'
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
NextResponse.json({ error: 'Not found' }, { status: 404 })
```


```ts
NextResponse.json({ success: true, deck })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## DELETE /api/flashcards/[deckId]

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/flashcards/%5BdeckId%5D/route.ts#L75).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X DELETE \
  'http://localhost:3000/api/flashcards/example-deck-id'
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
