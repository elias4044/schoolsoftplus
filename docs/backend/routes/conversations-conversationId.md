# /api/conversations/[conversationId]

Membership-gated message read/send and group actions. GET returns latest sixty messages, or all nondeleted pinned messages. POST rebuilds reply/share metadata on the server and transactionally updates the conversation preview; text is truncated to 2,000 characters. PATCH handles mark_read, rename, add/remove member, leave, and admin transfer. Read the social guide for action-specific privileges and share-card behavior.

[Domain guide](../social.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/conversations/[conversationId]/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/conversations/%5BconversationId%5D/route.ts#L1). Source SHA-256: `fcf3cf448e4f51abf607d8074595a7b31f5e76f9f3421d5bb3c1b24c897949c7`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/flashcardsDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/flashcardsDb.ts#L1): `{ getDeckByIdAny }`
- [@/app/api/lib/messagingDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/messagingDb.ts#L1): `{ addGroupMember, createMessage, FlashDeckShareCard, getConversation, getMessages, getPinnedMessages, getReplyMessage, markConversationRead, removeGroupMember, ReplyTo, ShareCard, transferGroupAdmin, updateGroupInfo, }`
- [@/app/api/lib/notesDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/notesDb.ts#L1): `{ getNoteById }`
- [@/app/api/lib/profileDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/profileDb.ts#L1): `{ getProfile }`
- [@/app/api/lib/requestBody](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/requestBody.ts#L1): `{ readRouteBody }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ createSchoolsoftClient, requireSession }`
- [@/app/api/lib/statsHelper](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/statsHelper.ts#L1): `{ trackMessageSent }`

## GET /api/conversations/[conversationId]

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/conversations/%5BconversationId%5D/route.ts#L186).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/conversations/example-conversation-id?pinned=false'
```

### Source contract

#### Request reads


```ts
req.nextUrl.searchParams.get('pinned')
```


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
NextResponse.json({ success: true, messages })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## POST /api/conversations/[conversationId]

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/conversations/%5BconversationId%5D/route.ts#L208).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  -H 'Content-Type: application/json' \
  --data '{"content":"Shall we revise chapter 4?"}' \
  'http://localhost:3000/api/conversations/example-conversation-id'
```

### Source contract

#### Request reads


```ts
readRouteBody(req)
```


#### Parsed body and local type


```ts
const body = (await readRouteBody(req)) as {
    content?: string;
    replyTo?: ReplyTo;
    shareCard?: { type: string; noteId?: string; assignmentId?: string; deckId?: string };
  };
```


#### Response branches


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json({ success: false, error: 'Not found.' }, { status: 404 })
```


```ts
NextResponse.json(
        { success: false, error: 'Note not found or access denied.' },
        { status: 403 }
      )
```


```ts
NextResponse.json({ success: false, error: 'Assignment not found.' }, { status: 404 })
```


```ts
NextResponse.json(
        { success: false, error: 'Deck not found or access denied.' },
        { status: 403 }
      )
```


```ts
NextResponse.json({ success: false, error: 'Message is empty.' }, { status: 400 })
```


```ts
NextResponse.json({ error: 'Reply message not found.' }, { status: 404 })
```


```ts
NextResponse.json({ success: true, message })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## PATCH /api/conversations/[conversationId]

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/conversations/%5BconversationId%5D/route.ts#L300).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X PATCH \
  -H 'Content-Type: application/json' \
  --data '{"action":"mark_read"}' \
  'http://localhost:3000/api/conversations/example-conversation-id'
```

### Source contract

#### Request reads


```ts
readRouteBody(req)
```


#### Parsed body and local type


```ts
const body = (await readRouteBody(req)) as {
    action?: string;
    groupName?: string;
    groupDescription?: string;
    targetUsername?: string;
  };
```


#### Response branches


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json({ success: false, error: 'Not found.' }, { status: 404 })
```


```ts
NextResponse.json({ success: true })
```


```ts
NextResponse.json(
      { success: false, error: 'Not a group conversation.' },
      { status: 400 }
    )
```


```ts
NextResponse.json({ success: false, error: 'Forbidden.' }, { status: 403 })
```


```ts
NextResponse.json({ success: true, conversation: updated })
```


```ts
NextResponse.json(
        { success: false, error: 'targetUsername required.' },
        { status: 400 }
      )
```


```ts
NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 })
```


```ts
NextResponse.json({ success: false, error: 'Unknown action.' }, { status: 400 })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## Local helper behavior

The route also uses these local functions. Imported persistence and authentication behavior is described in the domain guide.

### stripMd

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/conversations/%5BconversationId%5D/route.ts#L31).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls

No direct upstream call.

### buildNoteCard

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/conversations/%5BconversationId%5D/route.ts#L40).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls

No direct upstream call.

### buildFlashDeckCard

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/conversations/%5BconversationId%5D/route.ts#L55).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls

No direct upstream call.

### buildGradeCard

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/conversations/%5BconversationId%5D/route.ts#L74).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls

No direct upstream call.
