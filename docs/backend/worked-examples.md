# Worked backend examples

These examples use invented IDs, timestamps, and content. They show local application-owned shapes rather than pretending to be live SchoolSoft responses. Run browser JavaScript on the app's origin after login. The curl examples throughout the reference use POSIX shell continuation and quoting; Windows users can run them in Git Bash/WSL or use the browser JavaScript equivalents.

## Handle HTTP status and response shape

The API does not use one universal envelope. This helper is suitable for JSON endpoints, but do not use it for attachment/image streams or browser OAuth redirects.

```js
async function requestJson(url, method = 'GET', body) {
  const response = await fetch(url, {
    method,
    credentials: 'include',
    ...(body === undefined ? {} : {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error ?? result.message ?? `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return result;
}
```

Check status before inspecting success. For example, Firebase service status can return HTTP 200 with operational false, while news can return an array without any success field.

## Create, change, share, and revoke a note

```js
const { note } = await requestJson('/api/notes', 'POST', {
  title: 'Cell biology',
  content: '# Cells\nThe nucleus contains DNA.',
  status: 'draft'
});
await requestJson(`/api/notes/${note.id}`, 'PUT', {
  content: '# Cells\nThe nucleus contains DNA. Mitochondria release usable energy.'
});
const { token } = await requestJson(`/api/notes/${note.id}/share`, 'POST');
// This URL works without the owner's cookies while the token exists.
const publicNote = await requestJson(`/api/notes/shared/${token}`);
await requestJson(`/api/notes/${note.id}/share`, 'DELETE');
// The same token URL now returns 404.
```

A creation response has HTTP 201 and this shape:

```json
{
  "success": true,
  "note": {
    "id": "example-note-id",
    "userId": "12345",
    "title": "Cell biology",
    "content": "# Cells\nThe nucleus contains DNA.",
    "status": "draft",
    "shareToken": null,
    "createdAt": 1793289600000,
    "updatedAt": 1793289600000
  }
}
```

Public note responses omit userId and shareToken. Status remains draft in this workflow; public access comes from the token. Generating a second token invalidates the first.

## Generate cards, save them, then record review state

```js
const { cards } = await requestJson('/api/ai/flashcards', 'POST', {
  text: 'The nucleus contains DNA. Mitochondria release usable energy through cellular respiration.',
  count: 5,
  language: 'English'
});
const { deck } = await requestJson('/api/flashcards', 'POST', {
  title: 'Cell structures', color: 'emerald', tags: ['biology']
});
// The AI can return no usable cards, so avoid posting an empty bulk request.
if (cards.length) await requestJson(`/api/flashcards/${deck.id}/cards`, 'POST', { cards });
const saved = await requestJson(`/api/flashcards/${deck.id}`);
if (saved.cards.length) {
  const card = saved.cards[0];
  await requestJson(`/api/flashcards/${deck.id}/cards/${card.id}`, 'PATCH', {
    repetitions: 1, easeFactor: 2.5, interval: 1,
    lastReview: Date.now(), nextReview: Date.now() + 86400000
  });
}
```

A saved card includes the following application-managed fields. The backend initializes the defaults and validates later values; this example's client chooses the next review date.

```json
{
  "id": "example-card-id",
  "deckId": "example-deck-id",
  "userId": "12345",
  "front": "What contains DNA?",
  "back": "The nucleus.",
  "hint": "",
  "tags": [],
  "repetitions": 0,
  "easeFactor": 2.5,
  "interval": 1,
  "nextReview": 1793289600000,
  "lastReview": null,
  "createdAt": 1793289600000,
  "updatedAt": 1793289600000
}
```

If generation succeeds but persistence fails, generation is not rolled back. If a large card save spans chunks, earlier chunks may already have committed. Read the deck before deciding how to recover.

## Become friends and start a DM

Account A sends a request:

```js
await requestJson('/api/friends', 'POST', { targetUsername: '12346' });
```

Account B, in its own authenticated browser session, accepts:

```js
await requestJson('/api/friends', 'PATCH', { fromUsername: '12345', accept: true });
```

Account A opens the DM, sends a message, and marks it read:

```js
const { conversation } = await requestJson('/api/conversations', 'POST', {
  type: 'dm', targetUsername: '12346'
});
const { message } = await requestJson(`/api/conversations/${conversation.id}`, 'POST', {
  content: 'Ready to revise?'
});
await requestJson(`/api/conversations/${conversation.id}/${message.id}`, 'PATCH', {
  action: 'pin'
});
await requestJson(`/api/conversations/${conversation.id}`, 'PATCH', { action: 'mark_read' });
```

A message response uses this shape:

```json
{
  "success": true,
  "message": {
    "id": "example-message-id",
    "conversationId": "dm-12345-12346",
    "senderUserId": "12345",
    "senderDisplayName": "Alex",
    "content": "Ready to revise?",
    "edited": false,
    "editedAt": null,
    "pinned": false,
    "deletedAt": null,
    "createdAt": 1793289600000,
    "reactions": {},
    "replyTo": null,
    "shareCard": null
  }
}
```

A new DM without friendship returns HTTP 403:

```json
{"success":false,"error":"You must be friends to start a new direct message. Send them a friend request first.","needsFriend":true}
```

Do not automatically repeat a message POST after a timeout. Fetch history first; the message may already have committed. The API supplies no idempotency key.

## Share a deck and import it as the recipient

The owner posts a server-verified share card:

```js
const { message } = await requestJson('/api/conversations/example-conversation-id', 'POST', {
  shareCard: { type: 'flashdeck', deckId: 'example-owned-deck-id' }
});
console.log(message.id);
```

The recipient supplies both source deck and share message:

```js
const imported = await requestJson('/api/flashcards/import', 'POST', {
  deckId: 'example-owned-deck-id', messageId: 'example-share-message-id'
});
console.log(imported.deck.id, imported.cardCount);
```

The import reads current cards rather than cards snapshotted into the message. Membership, live message state, deck ID, and source-owner attribution are checked. The recipient owns the copy and gets fresh review progress. Later changes to the source do not synchronize into that copy.

## Scan grades and save them deliberately

```js
const scan = await requestJson('/api/subjects/120/grades', 'POST');
console.log(`Usable results: ${scan.scanned}; candidates: ${scan.total}; skipped: ${scan.skipped}`);
const { tracker } = await requestJson('/api/grade-tracker/120', 'PUT', {
  subjectName: 'Mathematics', scanned: scan.grades, addSnapshot: true
});
console.log(tracker.entries);
```

One illustrative scan result:

```json
{
  "success": true,
  "scanned": 1,
  "total": 2,
  "skipped": 1,
  "grades": [{
    "assignmentId": 12345,
    "title": "Practice assessment",
    "type": "Test",
    "endDate": "2026-10-29",
    "reported": true,
    "review": "B",
    "confidence": "confirmed",
    "gradeSource": "review",
    "grade": "B"
  }]
}
```

Skipped results do not mean there were no assignments. They mean those candidates could not produce a usable grade. Optional fields such as estimatedGrade, pointsPct, and totalPoints are omitted when undefined. The API does not claim that estimated grades are final grades.

## Understand common validation failures

Malformed JSON through the shared reader returns HTTP 400:

```json
{"success":false,"error":"Invalid JSON","message":"Invalid JSON"}
```

Oversized streamed JSON returns HTTP 413:

```json
{"success":false,"error":"Request body is too large","message":"Request body is too large"}
```

Updating a foreign/missing note returns HTTP 404 with `{ "error": "Not found" }`. A shared-wrapper 429 includes error and message with `Too many requests. Please wait.`. Do not rely on one error property being present in every route-specific branch; the status plus error/message fallback in the example helper handles this variation.
