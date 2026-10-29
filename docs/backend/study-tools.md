# Study tools

Study routes authenticate through `getAuthenticatedUserId`, which delegates to the same live SchoolSoft verification as the proxy routes. They do not trust a body username. Ownership uses a canonical numeric ID stored as a string. Missing or another user's resource normally returns 404; unauthenticated requests return 401.

## Notes and public links

| Method and path | Input | Result |
| --- | --- | --- |
| `GET /api/notes` | None | `{success,notes}`, all owned notes sorted by updatedAt descending |
| `POST /api/notes` | Optional title/content/status | 201 `{success,note}`; defaults Untitled, empty Markdown, draft; increments note counter |
| `GET /api/notes/[id]` | Note ID | `{success,note}` or 404 |
| `PUT /api/notes/[id]` | At least one title/content/status | Partial update despite PUT; `{success,note}` |
| `DELETE /api/notes/[id]` | Note ID | Transactional deletion; `{success:true}` or 404 |
| `POST /api/notes/[id]/share` | No body | Fresh 40-character lowercase hex token, `{success,token}` |
| `DELETE /api/notes/[id]/share` | No body | Revoke current token, `{success:true}` |
| `GET /api/notes/shared/[token]` | Exactly 40 lowercase hex characters | Public `{success,note}` with only id/title/content/status/createdAt/updatedAt |

Titles allow 500 characters, contents 200,000, and statuses are `draft`, `published`, `archived`. A supplied title may be empty. Unknown fields are ignored. Owner-facing note objects include userId and shareToken as well as timestamps. Creating a note does not trim its title/content. An unchanged update skips the write and preserves updatedAt.

Public access depends on the share token, not on `status=published`. Draft and archived notes can be read through a valid token. Issuing a new token replaces the previous one. No expiry is stored. Revocation stops future link reads, but does not remove note snapshots already sent in messages.

```js
const created = await fetch('/api/notes', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'Cell biology', content: '# Cells\nStudy the nucleus.' })
}).then(r => r.json());
const shared = await fetch(`/api/notes/${created.note.id}/share`, { method: 'POST' }).then(r => r.json());
console.log(`/api/notes/shared/${shared.token}`);
```

## Flashcard decks and cards

Decks are separate from cards: `flashcard_decks_v1` and `flashcard_cards_v1` are top-level collections. Parent and card ownership are both checked for card mutations.

| Method and path | Behavior |
| --- | --- |
| `GET /api/flashcards` | Return `{success,decks}`, sorted by updatedAt descending |
| `POST /api/flashcards` | Require nonblank title; create empty deck; 201 `{success,deck}` |
| `GET /api/flashcards/[deckId]` | Return `{success,deck,cards}`; cards sorted oldest first |
| `PATCH /api/flashcards/[deckId]` | At least one supported metadata field; `{success,deck}` |
| `DELETE /api/flashcards/[deckId]` | Delete owned cards and parent in bounded transactions; `{success:true}` |
| `POST /api/flashcards/[deckId]/cards` | Single card object or `{cards:[...]}`; 201 `{success,card}` or `{success,cards}` |
| `PATCH /api/flashcards/[deckId]/cards/[cardId]` | Update content and/or review fields; `{success,card}` |
| `DELETE /api/flashcards/[deckId]/cards/[cardId]` | Delete matching owned card and decrement parent count atomically; `{success:true}` |
| `POST /api/flashcards/import` | `{deckId,messageId?}`; copy an owned or verifiably shared deck; `{success,deck,cardCount}` |

Deck fields are title (nonblank, 120), description (500), color (`violet`, `rose`, `amber`, `emerald`, `sky`, `slate`), emoji (8), subjectId (nullable nonnegative safe integer), subjectName (nullable, 80), and tags (at most 20 strings, each 40). Creation defaults to violet, the implementation's ruler icon, empty metadata, and zero cards. Creation uses null for absent subject metadata. String trimming applies before saving.

Cards accept front/back (2,000 each), hint (500), and at most ten tags of forty characters. Creation requires front or back to contain text after trimming; a single blank side is allowed. Bulk requests contain 1-500 cards and validate all inputs before writing. Card PATCH requires a supported field but can set both sides empty. Metadata edits do not recompute review scheduling.

New cards receive repetitions 0, easeFactor 2.5, interval 1 day, nextReview now, lastReview null, and created/updated times. Review PATCH accepts nonnegative safe-integer repetitions, easeFactor 1.3-4, interval at least 1, a valid millisecond nextReview timestamp, and nullable lastReview. These values are supplied by the client; the route does not run an SM-2 algorithm itself.

```js
const deck = await fetch('/api/flashcards', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ title: 'Biology', color: 'emerald', tags: ['cells'] })
}).then(r => r.json());
await fetch(`/api/flashcards/${deck.deck.id}/cards`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ cards: [{ front: 'What contains DNA?', back: 'The nucleus.', hint: '' }] })
});
```

Bulk writes use chunks of 400 cards plus a parent count update per transaction. A multi-chunk request is not globally atomic. Deck deletion also works in chunks of 400, updating the parent to serialize with concurrent card creation. Unchanged deck/card patches skip writes. Card edits update card time, not deck time; creation/deletion updates deck count/time.

Import of someone else's deck requires a live message whose shareCard names that deck, whose author resolves to the deck owner, and whose conversation currently includes the requester. A deleted share message or absent source deck returns 404. Import copies source metadata and current cards, gives them new IDs and fresh review state, and preserves neither the source owner nor review history. Thrown copy failures trigger deletion of the new deck; a helper null result instead returns 404. Do not treat all import failure paths as a globally atomic rollback.

## Countdowns

`GET /api/countdowns` returns `{success,countdowns}` sorted by targetDate ascending, including archived entries. `POST` requires title and targetDate and returns 201 `{success,countdown}`. `PATCH /api/countdowns?id=...` updates at least one supported field. `DELETE` at the same query URL deletes an owned countdown. Missing IDs are validation errors, while absent or foreign records are 404.

Fields: title (nonblank, 200), description (2,000), targetDate (Unix milliseconds), category (`exam`, `holiday`, `birthday`, `event`, `deadline`, `custom`), theme (same six deck colors), emoji (8), pinned, and archived. Defaults are empty description, custom, violet, the implementation's hourglass icon, false pinned, and false archived. Creation always sets archived false even if true was supplied. Updates trim title, preserve description, and skip identical writes. No background timer or notification job runs on the server.

```json
{"title":"Biology exam","targetDate":1796112000000,"category":"exam","theme":"emerald","pinned":true}
```

## Dashboard layouts

`GET /api/layout` returns `{success,layout}` with null when absent. `PUT` takes `{layout:{version,widgets}}`, replaces the stored layout, and returns the cleaned layout. Version must be a positive safe integer and widgets at most thirty. Each widget has a unique nonblank instanceId up to 100 characters, a supported widgetId, and a supported size. Other widget fields are discarded.

Supported widgets: homework, schedule, notes, lunch, news, weather, countdown, messages. Supported sizes: 1x1, 2x1, 4x1, 1x2, 2x2, 4x2. Equal version and widget sequence skips a write. Storage includes userId and updatedAt, so a later GET can include those fields even though PUT returns only the cleaned submitted layout.

```json
{"layout":{"version":1,"widgets":[{"instanceId":"schedule-main","widgetId":"schedule","size":"2x2"}]}}
```

## Grade trackers

`GET /api/grade-tracker/[subjectId]` returns `{success,tracker}` with null when no record exists. `PUT` accepts subjectName, subjectColor, settings, entries, scanned, and addSnapshot. It creates a default tracker if needed and returns `{success,tracker}`. Resource subjectId must be positive numeric because of common path validation.

Settings merge with defaults: targetGrade C, weightMode equal, showEstimated true, includeManual true. Only targetGrade A-F, weightMode equal/recent, showEstimated boolean, and includeManual boolean are supported; unknown setting keys return 400. SubjectName is nonblank up to 200; color allows 100 characters. Each entries/scanned array is capped at 1,000 and the complete serialized body at 800,000 bytes (413).

Every entry requires string title, grade, type, endDate, and boolean reported. Saved entries also require ID (nonblank, 150) and source manual/scanned; scanned entries require nonnegative safe-integer assignmentId. Validated optional fields include notes up to 10,000, review up to 20,000, grade/estimatedGrade up to 40, customWeight 0-1,000, nonnegative pointsPct, flags, and timestamps. See [grade validation contract](contracts/gradeValidation.md) for the full field map. This validation does not constrain every grade string to A-F.

Nonempty `scanned` takes precedence over `entries`. Scanned rows merge by string assignment ID and preserve user overrides, exclusions, notes, and custom weights. Otherwise supplied entries replace the list, including `[]`. Unless addSnapshot is false, an entries replacement or nonempty scan appends an analytics snapshot; only the latest fifty remain. No-change writes are skipped only if the resulting document is equal, so a new snapshot can make an otherwise similar request a write.

```json
{"subjectName":"Mathematics","settings":{"targetGrade":"B","weightMode":"recent"},"entries":[{"id":"manual-1","title":"Practice test","type":"Test","endDate":"2026-10-29","source":"manual","reported":true,"grade":"B"}],"addSnapshot":true}
```

## Final grades

`GET /api/final-grades` returns `{success,finalGrades}` or null. `PUT` requires `{subjects:[...]}`, sanitizes and replaces the full document, and returns the saved document. This is user-managed saved data, not a SchoolSoft final-grade fetch.

At most eighty subjects are accepted, each with a nonblank subject name trimmed to 120, optional string ID trimmed to 140, comment trimmed to 1,000, manual flag, and at most twenty grade cells. Each cell has period (up to 60, default `Period N`), grade normalized to A-F or null, isPreviousTerm coerced to boolean, and raw up to 20. Missing subject IDs default to `subject-N` with zero-based N. Invalid subject/array shapes return 400. Every save updates updatedAt; this helper does not skip equal saves.

```json
{"subjects":[{"id":"math","subject":"Mathematics","manual":true,"comment":"","grades":[{"period":"Autumn 2026","grade":"B","isPreviousTerm":false,"raw":"B"}]}]}
```
