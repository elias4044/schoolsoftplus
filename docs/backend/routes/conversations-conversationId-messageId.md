# /api/conversations/[conversationId]/[messageId]

PATCH edits sender-owned text, pins/unpins for any member, or toggles a member reaction. DELETE soft-deletes for the sender or group admin. Transactions verify live conversation membership, matching conversation ID, and nondeleted message. Editing/deleting does not recompute the conversation preview.

[Domain guide](../social.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/conversations/[conversationId]/[messageId]/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/conversations/%5BconversationId%5D/%5BmessageId%5D/route.ts#L1). Source SHA-256: `9c6109719cbdd5ba01e4b865f2f5a6d8bffe3da8f1a1372b46517f0897f0ba7b`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/messagingDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/messagingDb.ts#L1): `{ deleteMessage, editMessage, getConversation, setMessagePinned, toggleReaction, }`
- [@/app/api/lib/requestBody](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/requestBody.ts#L1): `{ readRouteBody }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ requireSession }`
- [@/app/api/lib/statsHelper](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/statsHelper.ts#L1): `{ trackReactionAdded }`

## PATCH /api/conversations/[conversationId]/[messageId]

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/conversations/%5BconversationId%5D/%5BmessageId%5D/route.ts#L21).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X PATCH \
  -H 'Content-Type: application/json' \
  --data '{"action":"edit","content":"Revised message text"}' \
  'http://localhost:3000/api/conversations/example-conversation-id/example-message-id'
```

### Source contract

#### Request reads


```ts
readRouteBody(req)
```


#### Parsed body and local type


```ts
const body = (await readRouteBody(req)) as { action?: string; content?: string; emoji?: string };
```


#### Response branches


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json({ success: false, error: 'Not found.' }, { status: 404 })
```


```ts
NextResponse.json({ success: false, error: 'Content required.' }, { status: 400 })
```


```ts
NextResponse.json(
        { success: false, error: 'Not found or forbidden.' },
        { status: 403 }
      )
```


```ts
NextResponse.json({ success: true, message: msg })
```


```ts
NextResponse.json({ success: false, error: 'Emoji required.' }, { status: 400 })
```


```ts
NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400 })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## DELETE /api/conversations/[conversationId]/[messageId]

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/conversations/%5BconversationId%5D/%5BmessageId%5D/route.ts#L68).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X DELETE \
  'http://localhost:3000/api/conversations/example-conversation-id/example-message-id'
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
NextResponse.json({ success: false, error: 'Not found.' }, { status: 404 })
```


```ts
NextResponse.json({ success: false, error: 'Not found or forbidden.' }, { status: 403 })
```


```ts
NextResponse.json({ success: true })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
