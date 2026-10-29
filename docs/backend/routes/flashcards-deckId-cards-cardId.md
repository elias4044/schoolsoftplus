# /api/flashcards/[deckId]/cards/[cardId]

Update card text/tags and client-calculated review state, or delete a card and decrement its parent count. Verify both deck ownership and the card's actual deck/owner in a transaction. PATCH requires a supported field, but unlike creation does not require a nonblank side. No scheduling algorithm is run by the handler.

[Domain guide](../study-tools.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/flashcards/[deckId]/cards/[cardId]/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/flashcards/%5BdeckId%5D/cards/%5BcardId%5D/route.ts#L1). Source SHA-256: `b326c2337f5b0c7bb7c570e7d74e1624c3dc0bcdf78e985d326b4f193e8a04f6`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/authenticatedUser](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/authenticatedUser.ts#L1): `{ getAuthenticatedUserId }`
- [@/app/api/lib/flashcardsDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/flashcardsDb.ts#L1): `{ deleteCard, updateCard }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ assertDocumentId, readJsonObject, validateFields, withValidation, }`
- [@/app/api/lib/studyValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/studyValidation.ts#L1): `{ cardFields, reviewFields }`

## PATCH /api/flashcards/[deckId]/cards/[cardId]

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/flashcards/%5BdeckId%5D/cards/%5BcardId%5D/route.ts#L13).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X PATCH \
  -H 'Content-Type: application/json' \
  --data '{"repetitions":1,"easeFactor":2.5,"interval":1,"nextReview":1793404800000}' \
  'http://localhost:3000/api/flashcards/example-deck-id/cards/example-card-id'
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
NextResponse.json({ success: true, card })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## DELETE /api/flashcards/[deckId]/cards/[cardId]

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/flashcards/%5BdeckId%5D/cards/%5BcardId%5D/route.ts#L55).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X DELETE \
  'http://localhost:3000/api/flashcards/example-deck-id/cards/example-card-id'
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
