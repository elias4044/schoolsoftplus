# /api/flashcards/[deckId]/cards

Create a single card or 1-500 validated cards inside an owned deck. At least front or back must contain text. Initialize fresh review state and transactionally update parent count per chunk of four hundred. Return 201 with card or cards. A multi-chunk request can partially complete before a failure.

[Domain guide](../study-tools.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/flashcards/[deckId]/cards/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/flashcards/%5BdeckId%5D/cards/route.ts#L1). Source SHA-256: `a1eef9899d9cdce56449fe35384656ece60cbb0c897d249a0ca0d74789ef51e5`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/authenticatedUser](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/authenticatedUser.ts#L1): `{ getAuthenticatedUserId }`
- [@/app/api/lib/flashcardsDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/flashcardsDb.ts#L1): `{ bulkCreateCards, createCard, getDeckById }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ assertDocumentId, InputError, readJsonObject, withValidation, }`
- [@/app/api/lib/studyValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/studyValidation.ts#L1): `{ parseCardInput }`

## POST /api/flashcards/[deckId]/cards

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/flashcards/%5BdeckId%5D/cards/route.ts#L13).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  -H 'Content-Type: application/json' \
  --data '{"cards":[{"front":"Where is DNA stored?","back":"In the nucleus.","hint":"Think of the cell'\''s control center."}]}' \
  'http://localhost:3000/api/flashcards/example-deck-id/cards'
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
NextResponse.json({ error: 'Deck not found' }, { status: 404 })
```


```ts
NextResponse.json({ success: true, cards }, { status: 201 })
```


```ts
NextResponse.json({ success: true, card }, { status: 201 })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
