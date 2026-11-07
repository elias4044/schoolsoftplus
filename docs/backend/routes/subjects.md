# /api/subjects

The catalog view returns subject identities after one upstream read. The directory view adds teachers and unread counts with at most three subject workers; default requests retain entity enrichment. Reads are cached per school and session cookies for sixty seconds. refresh=1 bypasses fresh cache entries. Initial list failures use the upstream error mapper; per-subject enrichment failures retain that subject.

[Domain guide](../schoolsoft-data.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/subjects/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/subjects/route.ts#L1). Source SHA-256: `13383cf09c55816aaa7df108cfb9cc022db5d768f7a579c5c57d73aa311eb12d`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/apiError](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/apiError.ts#L1): `{ handleApiError }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ InputError, withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ applySessionCookieUpdates, createSchoolsoftClient, requireSession, }`
- [@/app/api/lib/schoolsoftReadCache](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoftReadCache.ts#L1): `{ cachedSchoolsoftGet }`

## GET /api/subjects

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/subjects/route.ts#L19).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/subjects'
```

### Source contract

#### Request reads


```ts
req.nextUrl.searchParams.get('view')
```


```ts
req.nextUrl.searchParams.get('refresh')
```


#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json({
        success: true,
        subjects: (subjects as { activityId: string }[]).map((subject) => ({
          ...subject,
          id: subject.activityId,
          teachers: [],
        })),
      })
```


```ts
NextResponse.json({ success: true, subjects: enriched })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
