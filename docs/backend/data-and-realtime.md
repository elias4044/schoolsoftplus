# Data, migration, and realtime behavior

Firestore Admin initializes from base64-encoded service-account JSON in `FIREBASE_SERVICE_ACCOUNT_KEY`. The module extracts project_id, client_email, and private_key, caches the database globally, and enables ignoreUndefinedProperties. Missing/malformed configuration can fail at import time before a route's error wrapper runs.

## Collection map

Times below are Unix milliseconds unless identified as Firestore Timestamp. See the [source contracts](contracts/README.md) for full interface fields and converters. Conversion defaults can hide missing historical fields; they are not a database schema migration by themselves.

| Collection / document | Key and contents | Main access path |
| --- | --- | --- |
| notes_v2 | Random ID; userId, title, Markdown content, status, nullable shareToken, createdAt/updatedAt | Notes API and verified share cards |
| countdowns_v1 | UUID; owner, targetDate, category/theme/icon, pin/archive flags, times | Countdown API |
| flashcard_decks_v1 | Random ID; owner, title/description/color/icon, optional subject, tags, cardCount, times | Flashcard API |
| flashcard_cards_v1 | Random ID; deckId, owner, front/back/hint/tags, review fields, times | Flashcard API |
| grade_tracker_v1 | `userId_subjectId`; settings, entries, latest fifty snapshots, updatedAt | Grade tracker API |
| final_grades_v1 | userId; full subjects array, updatedAt | Final-grade API |
| dashboard_layouts | userId; version, widgets, owner, updatedAt | Layout API |
| profiles_v1 | userId; editable profile and verified identity snapshot, joinedAt/updatedAt | Profile API and direct client reads |
| conversations_v1 | Existing preserved ID; new DM `dm-sortedId-sortedId`, group random; participants/maps/admin/encrypted/last-message/read markers | Social API and realtime listeners |
| messages_v1 | Random ID; conversation, sender, text, reply/share card, edit/pin/delete/reactions, times | Social API and realtime listeners |
| friendships_v1 | New `sortedId_sortedId`, migrated IDs preserved; two user IDs, requester, status, times | Friends API and listeners |
| group_invites_v1 | New `conversationId_invitedUserId`, existing IDs reusable; participants, status, invite/update times | Invite API and listeners |
| presence_v1 | userId; status, lastSeen, updatedAt | Presence API; authenticated client reads allowed |
| referrals_v1 | userId; code, totals, referred ID/time array, creation/update times | Referral API |
| referral_codes_v1 | Uppercase code; owner userId and createdAt | Referral lookup/reservation |
| login_users | userId; school/method/loginCount and first/last times | Transactional recordLogin |
| stats/loginStats | Counters and UTC histogram maps | Metrics helpers and public stats projection |
| service_status/firestore | Externally maintained operational/usage/limit fields | Public status API |
| passkey_users | base64url of `userId@school`; encrypted refresh token/IV, account context, lastTokenUpdate Timestamp | Passkey/AuthV2 helpers |
| passkey_users/{handle}/credentials | Credential ID; public COSE key, signCount, device metadata, created/last-use Timestamps | Passkey API |
| passkey_credential_index | Credential ID to userHandle | Discoverable credential fallback |
| passkey_challenges | Random challenge ID; type, challenge, userHandle, createdAt Timestamp | Five-minute, single-use WebAuthn ceremonies |
| account_aliases | Lowercase legacy username to userId/school, claim/completion/version | Verified migration and reference resolution |
| account_migration_conflicts | base64url of old source path; source/target paths, preserved old data, savedAt | Private conflict recovery |
| legacy_user_data | userId; archived legacy statistics user entries | Migration recovery |
| calls_v1 | Random ID; caller/callee IDs, offer/answer, status, timing | Direct client WebRTC signaling |
| calls_v1/{id}/callerCandidates, calleeCandidates | ICE candidate docs | Direct call parties |
| group_calls_v2 | Random ID; conversationId, startedByUserId, participants, status/timing | Direct group-call signaling |
| group_calls_v2/{id}/connections/{key} | Initiator/responder IDs and offer/answer | Pairwise group-call connection |
| connections/{key}/fromInitiator, fromResponder | ICE candidate docs under the connection | Direct connection parties |

## Canonical identity and compatibility

`normalizeUserId` accepts a positive, safe-integer decimal number or string and returns its string form. It does not assume a fixed number of digits. Ownership comes from SchoolSoft's live session user.id, not a client cookie or submitted username.

`resolveAccountReference` accepts a restricted account-reference alphabet up to 200 characters, returns an already-numeric ID directly, or looks up a lowercase alias. Unknown legacy peers can remain lowercase username references until their own account is verified. Profiles resolve these references too. Compatibility response fields such as username usually represent document IDs, while loginUsername preserves the SchoolSoft login name.

`assertCurrentAccountReferences` reads aliases inside social write transactions. A stale legacy reference that has since been claimed produces 409, asking the caller to refresh. It does not require every unknown legacy reference to have an alias.

## Progressive migration

`ensureAccountMigration` normalizes username/school, checks the canonical ID, and shares an in-flight promise per identity in the current process. Each invocation still consults the alias record; completed migrationVersion 1 skips the remaining work. Failure removes the pending promise and leaves unfinished work retryable.

1. Claim `account_aliases/{username}` transactionally. A different user ID or school already claiming the name is 409.
2. Find notes/countdowns/decks/cards owned through the legacy username field and replace that ownership with userId, rejecting conflicting stored account/school metadata.
3. Move username-keyed profiles, presence, layouts, final grades, and referrals to ID keys; move tracker records to `userId_subjectId`. Existing destination fields win. Differing source data is privately archived before the source is deleted.
4. Update known identity fields in conversations, friendships, invites, direct/group calls, and referral-code ownership. Preserve conversation IDs. Resolve known participants, rebuild participant-name/picture/read maps, retain aliases for historical messages, and end active calls affected by identity migration.
5. Move passkey credentials and parent data from username handles to ID handles and update the flat credential index. Authenticators with old handles can still be found through that index.
6. Archive legacy login-stat user entries, initialize canonical login_users if needed, remove those entries from stats, and mark the alias complete.

Query traversal pages by document name in batches of one hundred. Record moves/changes use transactions, but the whole account migration spans multiple transactions and collections. It is retryable, not one atomic database migration. Historical message documents are not bulk rewritten: participantAliases is used to normalize authors, reaction user lists, and deck-share attribution when read/mutated. Encrypted content and conversation IDs remain unchanged.

There is no offline migration command in this checkout. A verified login/session request is the trigger. Changing a login name creates a new alias claim; school collisions are explicitly rejected rather than silently merged. Do not infer that every historical account has migrated merely because new logins work.

## Transactions and partial completion

Ownership-sensitive note/countdown/card/message/group/invite updates re-read relevant documents inside transactions. DMs, friendship pairs, invitation reuse, and referral reservations use deterministic or existing records to prevent simple duplicate writes. Read receipts avoid writes when already caught up; presence uses a persisted time throttle.

Operations still span boundaries: profile propagation, migration, large deck create/delete/import, and network token rotation are not one atomic operation. A failed HTTP response can follow an earlier successful write. There is no global idempotency key for message sends, note/deck/countdown creation, AI calls, image uploads, or issue creation. A blind retry can duplicate work.

## Firebase sign-in and rules

`GET /api/firebase-token` requires a verified SchoolSoft browser session and creates a Firebase custom token with UID equal to that user ID and claim `identityVersion:2`. It returns `{success,token,userId}`. The browser calls Firebase `signInWithCustomToken`; it does not use this value as a SchoolSoft token. `useFirebaseAuth` shares bootstrap and an in-flight sign-in promise across subscribers and asks for a new custom token every fifty-five minutes. It checks the ID-token claim before marking subscriptions ready.

The source rules require a signed-in numeric UID and identityVersion 2. Admin routes bypass these rules and rely on their own checks.

| Data | Client permission in the source rules |
| --- | --- |
| Profiles, presence | Authenticated reads; no writes |
| Conversations | Participant reads; only caller's lastReadAt key may be changed directly |
| Messages | Conversation-participant reads; no writes |
| Friendships | Either party reads; no writes |
| Invites | Invitee or inviter reads; no writes |
| Direct calls | Parties read/delete/update with caller/callee identity fields immutable; caller can create |
| Direct ICE candidates | Call parties read/create/delete in recognized candidate collections |
| Group calls | Conversation participants read; creator starts as sole participant; updates restricted to own participant membership and status/endedAt |
| Group connection/candidates | Group/connection parties under the rule predicates; participant identity fields immutable on update |
| Everything else | Denied to the client SDK |

The profile API's email omission is not a database-wide privacy filter. The rules permit authenticated reads of entire profile documents. These descriptions report the current predicates, not a security assessment or a claim of stronger schema validation than the rules implement.

## Realtime and voice calls

The HTTP conversation list is limited to fifty and HTTP messages to sixty. The client message listener instead queries the last hundred messages in ascending createdAt order. Conversations, friendships, invites/notifications, incoming direct calls, and active group calls also use Firestore subscriptions. Review the client listeners as well as server helpers when changing indexes or identity fields.

`lib/useCall.ts` exchanges WebRTC session descriptions and ICE candidates through Firestore. Audio travels over WebRTC, not a SchoolSoft+ HTTP audio endpoint. Direct calls create a calling record with caller/callee IDs and an offer, the recipient supplies an answer and accepted state, and participants observe end/decline transitions and cleanup candidate records. Group calls use a conversation-linked active call document with participant IDs and pairwise connection documents. Connection subcollections carry candidates in each direction.

ICE configuration includes four Google STUN servers. Optional TURN URL, username, and credential come from NEXT_PUBLIC_TURN_* and are therefore visible in the browser bundle. There is no server route minting temporary TURN credentials here. The rules and browser implementation, rather than an HTTP call-management API, define this subsystem.

## Indexes

`firestore.indexes.json` is the checked-in deployment source; `firebase.json` points to it and the rules file. It includes current and legacy social/listener query variants, message ordering, and deck-card ownership queries. The [existing audit](../firestore-index-audit.md) explains coverage. Single-field queries normally use automatic indexes. A local JSON definition does not confirm that an index is built and serving in production.
