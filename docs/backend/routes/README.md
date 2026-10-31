# Every backend route

75 route files export 106 HTTP operations. This inventory counts explicit exports; framework-provided HEAD/OPTIONS behavior is not an additional authored handler.

Each page includes a reviewed explanation, method-specific example, source fingerprint, inputs, response branches, cookie writes, and direct upstream calls. Read the linked domain guide for helper effects, ownership, data models, and failure behavior.

| Route | Explicit methods | Guide |
| --- | --- | --- |
| [`/api/ai/flashcards`](ai-flashcards.md) | POST | [integrations](../integrations.md) |
| [`/api/ai/insight`](ai-insight.md) | POST | [integrations](../integrations.md) |
| [`/api/ai/note`](ai-note.md) | POST | [integrations](../integrations.md) |
| [`/api/assignment/[id]`](assignment-id.md) | GET | [schoolsoft-data](../schoolsoft-data.md) |
| [`/api/assignments/week`](assignments-week.md) | GET | [schoolsoft-data](../schoolsoft-data.md) |
| [`/api/auth/login`](auth-login.md) | GET, POST | [authentication](../authentication.md) |
| [`/api/auth/passkey/authenticate/begin`](auth-passkey-authenticate-begin.md) | POST | [authentication](../authentication.md) |
| [`/api/auth/passkey/authenticate/complete`](auth-passkey-authenticate-complete.md) | POST | [authentication](../authentication.md) |
| [`/api/auth/passkey/credentials`](auth-passkey-credentials.md) | GET | [authentication](../authentication.md) |
| [`/api/auth/passkey/credentials/[id]`](auth-passkey-credentials-id.md) | DELETE | [authentication](../authentication.md) |
| [`/api/auth/passkey/register/begin`](auth-passkey-register-begin.md) | POST | [authentication](../authentication.md) |
| [`/api/auth/passkey/register/complete`](auth-passkey-register-complete.md) | POST | [authentication](../authentication.md) |
| [`/api/auth/refresh`](auth-refresh.md) | POST | [authentication](../authentication.md) |
| [`/api/auth/session`](auth-session.md) | GET | [authentication](../authentication.md) |
| [`/api/auth/token`](auth-token.md) | POST | [authentication](../authentication.md) |
| [`/api/auth/v2/callback`](auth-v2-callback.md) | GET | [authentication](../authentication.md) |
| [`/api/auth/v2/initiate`](auth-v2-initiate.md) | GET | [authentication](../authentication.md) |
| [`/api/auth/v2/initiate/external`](auth-v2-initiate-external.md) | GET | [authentication](../authentication.md) |
| [`/api/auth/v2/refresh-token-login`](auth-v2-refresh-token-login.md) | POST | [authentication](../authentication.md) |
| [`/api/auth/v2/token-refresh`](auth-v2-token-refresh.md) | POST | [authentication](../authentication.md) |
| [`/api/conversations`](conversations.md) | GET, POST | [social](../social.md) |
| [`/api/conversations/[conversationId]`](conversations-conversationId.md) | GET, POST, PATCH | [social](../social.md) |
| [`/api/conversations/[conversationId]/[messageId]`](conversations-conversationId-messageId.md) | PATCH, DELETE | [social](../social.md) |
| [`/api/countdowns`](countdowns.md) | GET, POST, PATCH, DELETE | [study-tools](../study-tools.md) |
| [`/api/custom`](custom.md) | GET, POST, PUT, DELETE | [schoolsoft-data](../schoolsoft-data.md) |
| [`/api/file`](file.md) | GET | [schoolsoft-data](../schoolsoft-data.md) |
| [`/api/final-grades`](final-grades.md) | GET, PUT | [study-tools](../study-tools.md) |
| [`/api/firebase-token`](firebase-token.md) | GET | [data-and-realtime](../data-and-realtime.md) |
| [`/api/flashcards`](flashcards.md) | GET, POST | [study-tools](../study-tools.md) |
| [`/api/flashcards/[deckId]`](flashcards-deckId.md) | GET, PATCH, DELETE | [study-tools](../study-tools.md) |
| [`/api/flashcards/[deckId]/cards`](flashcards-deckId-cards.md) | POST | [study-tools](../study-tools.md) |
| [`/api/flashcards/[deckId]/cards/[cardId]`](flashcards-deckId-cards-cardId.md) | PATCH, DELETE | [study-tools](../study-tools.md) |
| [`/api/flashcards/import`](flashcards-import.md) | POST | [study-tools](../study-tools.md) |
| [`/api/friends`](friends.md) | GET, POST, DELETE, PATCH | [social](../social.md) |
| [`/api/gif`](gif.md) | GET | [integrations](../integrations.md) |
| [`/api/github/issues`](github-issues.md) | GET | [integrations](../integrations.md) |
| [`/api/github/issues/create`](github-issues-create.md) | POST | [integrations](../integrations.md) |
| [`/api/grade-tracker/[subjectId]`](grade-tracker-subjectId.md) | GET, PUT | [study-tools](../study-tools.md) |
| [`/api/group-invites`](group-invites.md) | GET, POST, PATCH | [social](../social.md) |
| [`/api/layout`](layout.md) | GET, PUT | [study-tools](../study-tools.md) |
| [`/api/login`](login.md) | POST | [authentication](../authentication.md) |
| [`/api/logout`](logout.md) | POST | [authentication](../authentication.md) |
| [`/api/lunch`](lunch.md) | GET | [schoolsoft-data](../schoolsoft-data.md) |
| [`/api/msg-upload`](msg-upload.md) | POST, GET | [integrations](../integrations.md) |
| [`/api/news`](news.md) | GET | [schoolsoft-data](../schoolsoft-data.md) |
| [`/api/news/[id]`](news-id.md) | GET | [schoolsoft-data](../schoolsoft-data.md) |
| [`/api/news/legacy`](news-legacy.md) | GET | [schoolsoft-data](../schoolsoft-data.md) |
| [`/api/news/pfp`](news-pfp.md) | GET | [schoolsoft-data](../schoolsoft-data.md) |
| [`/api/notes`](notes.md) | GET, POST | [study-tools](../study-tools.md) |
| [`/api/notes/[id]`](notes-id.md) | GET, PUT, DELETE | [study-tools](../study-tools.md) |
| [`/api/notes/[id]/share`](notes-id-share.md) | POST, DELETE | [study-tools](../study-tools.md) |
| [`/api/notes/shared/[token]`](notes-shared-token.md) | GET | [study-tools](../study-tools.md) |
| [`/api/people/class`](people-class.md) | GET | [schoolsoft-data](../schoolsoft-data.md) |
| [`/api/people/staff`](people-staff.md) | GET | [schoolsoft-data](../schoolsoft-data.md) |
| [`/api/pfp-upload`](pfp-upload.md) | POST, GET | [integrations](../integrations.md) |
| [`/api/presence`](presence.md) | GET, PATCH | [social](../social.md) |
| [`/api/profile`](profile.md) | GET, PUT | [social](../social.md) |
| [`/api/profile/[username]`](profile-username.md) | GET | [social](../social.md) |
| [`/api/referrals`](referrals.md) | GET | [integrations](../integrations.md) |
| [`/api/referrals/leaderboard`](referrals-leaderboard.md) | GET | [integrations](../integrations.md) |
| [`/api/referrals/set-ref`](referrals-set-ref.md) | POST | [integrations](../integrations.md) |
| [`/api/referrals/validate/[code]`](referrals-validate-code.md) | GET | [integrations](../integrations.md) |
| [`/api/schedule`](schedule.md) | GET | [schoolsoft-data](../schoolsoft-data.md) |
| [`/api/schools`](schools.md) | GET | [schoolsoft-data](../schoolsoft-data.md) |
| [`/api/session`](session.md) | GET | [authentication](../authentication.md) |
| [`/api/startpage`](startpage.md) | GET | [schoolsoft-data](../schoolsoft-data.md) |
| [`/api/stats`](stats.md) | GET | [integrations](../integrations.md) |
| [`/api/stats/firebase`](stats-firebase.md) | GET | [integrations](../integrations.md) |
| [`/api/subjects`](subjects.md) | GET | [schoolsoft-data](../schoolsoft-data.md) |
| [`/api/subjects/[id]`](subjects-id.md) | GET | [schoolsoft-data](../schoolsoft-data.md) |
| [`/api/subjects/[id]/grades`](subjects-id-grades.md) | POST | [schoolsoft-data](../schoolsoft-data.md) |
| [`/api/subjects/results_all`](subjects-results_all.md) | GET | [schoolsoft-data](../schoolsoft-data.md) |
| [`/api/users/search`](users-search.md) | GET | [social](../social.md) |
| [`/api/version`](version.md) | GET | [integrations](../integrations.md) |
| [`/api/weather`](weather.md) | GET | [integrations](../integrations.md) |
