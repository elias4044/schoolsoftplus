# /api/schedule

Fetch lessons for an explicit or current server ISO week. Normalize object/array responses, drop entries without eventId/startDate, deduplicate by start/end dates, sort chronologically, and increment schedule views. There is no independent year parameter in the upstream lesson URL.

[Domain guide](../schoolsoft-data.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/schedule/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/schedule/route.ts#L1). Source SHA-256: `bf835903bb9ce9a43a8e99aea8b27debd4aa1d1529d377f14fc90b2aba3f720d`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/apiError](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/apiError.ts#L1): `{ handleApiError }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ createSchoolsoftClient, requireSession }`
- [@/app/api/lib/statsHelper](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/statsHelper.ts#L1): `{ trackScheduleView }`

## GET /api/schedule

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/schedule/route.ts#L20).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/schedule?week=44'
```

### Source contract

#### Request reads


```ts
req.nextUrl.searchParams.get('week')
```


#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json({ success: false, error: 'Invalid week number.' }, { status: 400 })
```


```ts
NextResponse.json({ success: true, schedule, week })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls


```ts
api.get(`/rest-api/student/calendar/lessons/week/${week}`, {
      headers: { Cookie: cookies, Accept: 'application/json' },
      responseType: 'json',
    })
```


## Local helper behavior

The route also uses these local functions. Imported persistence and authentication behavior is described in the domain guide.

### isoWeek

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/schedule/route.ts#L9).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls

No direct upstream call.
