# /api/stats

Public projection of stats/loginStats counters and histogram maps with zero/empty defaults. Missing/read-failed stats is 500. Instrumentation is selective; totalApiCalls is not every HTTP request and the output excludes the old per-user stats array.

[Domain guide](../integrations.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/stats/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/stats/route.ts#L1). Source SHA-256: `51c6cdd5a0c54e08cf56bfc56475c8b7eed6634ee5ca1c78b755900da711ba4d`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/firebaseAdmin](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/firebaseAdmin.ts#L1): `{ db }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`

## GET /api/stats

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/stats/route.ts#L6).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/stats'
```

### Source contract

#### Request reads

No request headers, query values, cookies, or body reader is called directly in this handler. Authentication helpers can still read cookies.

#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json(
        { success: false, error: 'Stats document does not exist.' },
        { status: 500 }
      )
```


```ts
NextResponse.json({
      success: true,
      // -- Headline numbers
      totalLogins: data.total_successful_logins ?? 0,
      failedLogins: data.failed_logins ?? 0,
      uniqueLogins: data.unique_logins ?? 0,
      totalApiCalls: data.total_api_calls ?? 0,
      // -- Messaging
      totalMessagesSent: data.total_messages_sent ?? 0,
      totalConversations: data.total_conversations_created ?? 0,
      totalReactions: data.total_reactions_added ?? 0,
      messageHours: data.message_hours ?? {},
      // -- Feature usage
      totalAiMessages: data.total_ai_messages ?? 0,
      totalNotesCreated: data.total_notes_created ?? 0,
      totalScheduleViews: data.total_schedule_views ?? 0,
      totalAssignmentFetches: data.total_assignment_fetches ?? 0,
      totalLunchFetches: data.total_lunch_fetches ?? 0,
      totalNewsFetches: data.total_news_fetches ?? 0,
      // -- Histograms (objects keyed by hour/day/school/date)
      loginHours: data.login_hours ?? {},
      loginDays: data.login_days ?? {},
      aiHours: data.ai_hours ?? {},
      schools: data.schools ?? {},
      peakDates: data.peak_dates ?? {},
    })
```


```ts
NextResponse.json({ success: false, error: 'Failed to fetch stats.' }, { status: 500 })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
