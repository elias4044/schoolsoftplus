# Social features

These routes require a live verified SchoolSoft session and use Firestore Admin helpers. Field names such as `targetUsername` and `fromUsername` are retained for compatibility, but values can be canonical numeric ID strings. Known legacy usernames resolve through `account_aliases`. Response fields named username can also contain IDs.

## Profiles and search

`GET /api/profile` returns `{success:true,profile}` for the current account, possibly null. `PUT /api/profile` creates or merges a profile, overwrites identity snapshot fields from the verified SchoolSoft session, and returns `{success:true,profile}`. Clients cannot supply authoritative first/last name, email, school, or user type through this request.

Editable fields are displayName (80), bio (500), pronouns (40), location (80), website (200), pfpUrl/coverUrl (500 each), accentColor (30), github/twitter/instagram (100 each), linkedin (200), dmPrivacy, ringtone, and ringtoneCustomUrl (500). Supplied strings are validated, trimmed, and bounded; website and nonempty custom ringtone URL must begin with HTTP(S). A malformed six-digit hex accentColor is dropped from the update. dmPrivacy accepts everyone/nobody and ringtone accepts default/classic/digital/soft/pulse/custom. Unknown fields are ignored.

The helper stores userId and updatedAt on every upsert and joinedAt only on creation. Display name and picture changes propagate to conversation participant snapshots in awaited batches of up to 400. Despite a stale comment describing fire-and-forget propagation, the route waits; failure can occur after the profile was already saved.

`GET /api/profile/[username]` accepts an ID or legacy reference, resolves it, returns 404 when absent, and removes email from the returned profile. It requires authentication. Other profile fields remain, including loginUsername and preferences. This projection does not govern direct Firestore profile reads: the client rules allow authenticated profile documents to be read in full.

`GET /api/users/search?q=student` trims query to 100; fewer than two characters returns `{success:true,users:[]}`. It runs two prefix searches, one on loginUsername and one on document ID, each limited to fifteen, deduplicates documents, and excludes the requester. It is not a substring or display-name search. Results contain username (document ID), displayName, bio, location, pfpUrl, pronouns, schoolName, and userType.

```js
await fetch('/api/profile', {
  method: 'PUT', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ displayName: 'Alex', bio: 'Learning biology', accentColor: '#337755' })
});
const users = await fetch('/api/users/search?q=student').then(r => r.json());
```

## Friends

`GET /api/friends` returns accepted friends, pending received requests, pending sent requests, and a profileMap keyed by peer IDs with displayName, pfpUrl, and schoolName. It performs several queries and enriches profiles; there is no pagination.

`POST /api/friends` takes `{targetUsername}`. Self/empty targets are 400 and absent profiles are 404. Sending the same pending request again returns the existing record. Sending in the opposite direction accepts an existing pending request automatically. Sending to an accepted friend returns a helper error surfaced as 400 by the handler. A declined record can be reused as pending. Records use sorted user IDs and a deterministic pair ID for new friendships, while preserving existing migrated document IDs when found.

`PATCH /api/friends` takes `{fromUsername,accept?}`. Omitted accept means true; false declines. Only a pending request from that requester can be answered. Missing/mismatched requests are 404. Success is `{success,friendship}`. `DELETE` takes `{targetUsername}` and removes the relationship if present; missing relationships still return `{success:true}`.

```json
{"fromUsername":"12346","accept":true}
```

## Conversations

`GET /api/conversations` returns `{success,conversations}` for the newest fifty conversations by lastAt. It is not an unlimited history API.

`POST /api/conversations` defaults to a DM and takes `{targetUsername}`. It requires a different existing profile. A new DM requires accepted friendship (403 with `needsFriend:true` otherwise), while reopening an existing DM bypasses that friendship check. The helper checks sorted participant IDs and type, then uses a deterministic `dm-ID-ID` document for new DMs in a transaction. It returns `{success,conversation}`; metrics increment only for creation. The stored dmPrivacy preference is not checked by this route.

A group request uses `{type:"group",groupName,groupDescription?,encrypted?,members:[...]}`. A nonblank name and at least one other member are required; profiles must exist. The creator becomes admin, duplicates/self are removed, and the group has at most fifty participants. The route does not require friendships for group creation. Group names allow eighty characters, description two hundred. New groups capture participant display names and pictures and return the conversation.

```json
{"type":"group","groupName":"Biology revision","groupDescription":"Chapter 4","members":["12346","12347"],"encrypted":false}
```

`GET /api/conversations/[conversationId]` checks membership, then returns `{success,messages}` with the latest sixty messages in chronological order. `?pinned=true` selects all nondeleted pinned messages instead. It does not return conversation metadata or mark the conversation read. Ordinary message reads include soft-deleted records; the consumer must handle deletedAt.

`PATCH /api/conversations/[conversationId]` uses an action:

| Action | Fields | Authorization and result |
| --- | --- | --- |
| mark_read | None | Any participant, including DMs; `{success:true}`. Transaction skips if lastReadAt already reaches lastAt. |
| rename | groupName and/or groupDescription | Group admin; `{success,conversation}`. An empty patch can succeed. |
| add_member | targetUsername | Group admin; profile must exist; existing member is a no-op; full group is 409. |
| remove_member | targetUsername | Admin can remove another member; a member can remove themselves. |
| leave | None | Remove caller. If admin leaves, the first remaining participant becomes admin; an empty group remains with null admin. |
| transfer_admin | targetUsername | Current admin; target must already participate. |

Unknown action or group-only action on a DM is 400; missing/foreign conversations are 404; denied helper mutations generally return 403. Membership checks are repeated transactionally for writes. Account-alias guards prevent stale username writers from resurrecting already-migrated references.

## Sending and changing messages

`POST /api/conversations/[conversationId]` accepts text content, optional replyTo with messageId, or a shareCard naming a note, grade assignment, or flashcard deck. The body schema allows content up to 20,000, but ordinary sent content is trimmed and truncated to 2,000 before saving. Empty text without a verified share card is 400.

Reply metadata is reconstructed from a live nondeleted message in the same conversation. The client cannot forge the quoted sender/content. Plain reply previews are truncated to 200; encrypted conversations retain the original stored content for the quote. A missing reply is 404.

Share cards are built on the server, not accepted as display payloads:

- Note: caller must own it. The card stores title, a 220-character stripped preview, full Markdown content, status, and share time. It is a snapshot, not a live public link.
- Flashdeck: caller must own it. Metadata/count/tags are snapshotted; cards are copied later through the import route.
- Grade: fetch the assignment view and assessment with the caller's SchoolSoft session; compute an estimated grade and points. This path has its own calculation and does not use the scan route's explicit-review-grade override. Its confidence remains estimated.

The resulting message and conversation's latest preview/sender/time are written in one transaction. A message counter increments asynchronously afterward. The route returns `{success,message}` with HTTP 200.

```js
await fetch('/api/conversations/conversation-id', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: 'Shall we revise chapter 4?', replyTo: { messageId: 'message-id' } })
});
// Share cards take IDs, not trusted client titles or content.
// { shareCard: { type: 'note', noteId: 'owned-note-id' } }
// { shareCard: { type: 'grade', assignmentId: '12345' } }
// { shareCard: { type: 'flashdeck', deckId: 'owned-deck-id' } }
```

`PATCH /api/conversations/[conversationId]/[messageId]` supports edit (sender only, nonblank content up to 2,000), pin/unpin (any participant), and react (any participant, nonblank emoji up to 32). Reactions toggle the current user's membership in an emoji's ID array. A toggle-off still increments the reaction metric. Missing/deleted/wrong-conversation messages produce route-specific 403 or 404.

`DELETE` soft-deletes a message if the caller is its sender or group admin. It sets deletedAt and clears pinned, retaining stored content/replies/share card. Neither editing nor deletion recomputes the conversation's lastMessage preview. These operations are not data erasure endpoints.

## Encrypted groups

The encrypted flag records the client's intended mode; the HTTP route does not encrypt, decrypt, or validate ciphertext. `lib/crypto.ts` derives a non-exportable AES-256-GCM key from a shared password and conversation ID using PBKDF2-SHA256 with 310,000 iterations. The salt is `schoolsoftplus-e2ee-{conversationId}`. The stored string is base64 of a 12-byte random IV followed by ciphertext and tag.

Do not send the password to the message route. The 2,000-character storage truncation still applies to posted ciphertext. Share cards are constructed as server-readable structured data even in an encrypted conversation; the encrypted flag is not a guarantee that all metadata or shared content is encrypted.

## Group invitations

`GET /api/group-invites` returns pending invites to the caller ordered newest first. `POST` accepts `{conversationId,targetUsername}` and requires an existing invitee profile, a group, and the caller as admin. It rejects an existing participant and reuses an existing pending invite. Success is `{success,invite}`; authorization/existence failures in this path usually become 400.

`PATCH` requires `{inviteId,accept:boolean}`. It checks invite ownership and pending status in a transaction. Acceptance requires the group to exist, the original inviter still to be a participant, and capacity at most fifty. It adds participant metadata and resolves the invite atomically. It does not require the original inviter still to be admin. Declining resolves the invite without joining. Success is `{success,invite,joined}`; helper failures caught here return 400.

## Presence

`GET /api/presence?users=12345,12346` trims/deduplicates entries, keeps the first hundred, resolves account aliases, and reads records in groups of ten. It returns `{success,presences:{requestedReference:"online"|"idle"|"offline"}}`, preserving the caller's requested keys. Empty input returns an empty map. No friendship or conversation relationship is required beyond authentication.

Status derives from stored lastSeen: explicit offline always wins; below three minutes retain stored status; from three to fifteen minutes show idle; at fifteen minutes show offline. Missing records are offline.

`PATCH /api/presence` requires `{status:"online"|"idle"|"offline"}` for the caller. A transaction suppresses all writes within fifteen seconds of the last update and same-status writes within 110 seconds. It uses one transaction attempt. The response echoes requested status even when persistence was skipped; it is not proof of a new write.

The client coalesces presence subscriptions, polls once per minute while visible, and sends heartbeats every two minutes with in-flight/visibility controls. Rate reduction on the client complements the server's persisted throttle. See [data and realtime](data-and-realtime.md) for the separate Firebase subscriptions.
