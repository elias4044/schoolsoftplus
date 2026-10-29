# /api/flashcards/import

Copy an owned source deck, or one backed by a live deck-share message whose conversation includes the requester and author resolves to source owner. Clone current cards and metadata with fresh IDs/review state. Thrown copy errors attempt cleanup; the overall import is not one atomic operation. Unavailable or unauthorized shares return 404.

[Domain guide](../study-tools.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/flashcards/import/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/flashcards/import/route.ts#L1). Source SHA-256: `35f4bf2653b0d35b04b692d5337450d754495ebbd8a5f56333b299edc5d039b1`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/authenticatedUser](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/authenticatedUser.ts#L1): `{ getAuthenticatedUserId }`
- [@/app/api/lib/flashcardsDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/flashcardsDb.ts#L1): `{ bulkCreateCards, canImportDeck, createDeck, deleteDeck, getCardsByDeck, getDeckByIdAny, }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ assertDocumentId, readJsonObject, withValidation }`

## POST /api/flashcards/import

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/flashcards/import/route.ts#L14).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  -H 'Content-Type: application/json' \
  --data '{"deckId":"example-source-deck-id","messageId":"example-share-message-id"}' \
  'http://localhost:3000/api/flashcards/import'
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
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json({ success: false, error: 'deckId is required.' }, { status: 400 })
```


```ts
NextResponse.json({ success: false, error: 'Invalid message id.' }, { status: 400 })
```


```ts
NextResponse.json(
      { success: false, error: 'Deck no longer available.' },
      { status: 404 }
    )
```


```ts
NextResponse.json(
          { success: false, error: 'Deck no longer available.' },
          { status: 404 }
        )
```


```ts
NextResponse.json({
    success: true,
    deck: { ...newDeck, cardCount: cardData.length },
    cardCount: cardData.length,
  })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
