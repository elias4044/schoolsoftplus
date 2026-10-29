# Firestore query 

| Collection | Fields / modes | Query source |
| --- | --- | --- |
| conversations_v1 | participantIds CONTAINS, lastAt DESC | useMessages.ts; messagingDb.ts |
| conversations_v1 | participantIds ASC, type ASC | conversations/route.ts; messagingDb.ts DM lookup |
| conversations_v1 | participants CONTAINS, lastAt DESC | Retained legacy conversation index |
| messages_v1 | conversationId ASC, createdAt ASC | messagingDb.ts; useMessages.ts history |
| messages_v1 | conversationId ASC, createdAt DESC | Reverse ordering for useMessages.ts limitToLast history |
| messages_v1 | conversationId ASC, pinned ASC, createdAt ASC | messagingDb.ts pinned messages |
| group_invites_v1 | invitedUserId ASC, status ASC, invitedAt DESC | groupInvitesDb.ts |
| group_invites_v1 | invitedUsername ASC, status ASC, invitedAt DESC | Retained legacy invite index |
| friendships_v1 | userAId ASC, status ASC | friendsDb.ts |
| friendships_v1 | userBId ASC, status ASC | friendsDb.ts |
| friendships_v1 | requestedById ASC, status ASC | friendsDb.ts |
| calls_v1 | calleeUserId ASC, status ASC | useCall.ts incoming calls |
| group_calls_v2 | conversationId ASC, status ASC | useCall.ts active group calls |
| flashcard_cards_v1 | deckId ASC, userId ASC | flashcardsDb.ts reads and deletion |
| flashcard_cards_v1 | deckId ASC, username ASC | flashcardsDb.ts legacy shared-deck reads |

