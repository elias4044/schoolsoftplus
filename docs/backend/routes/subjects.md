# /api/subjects

Fetch all subject rooms then enrich each activity with entities, unread count, and teachers. Per-subject enrichment failure falls back to empty details without failing the whole list. Entity type is inferred from planningId truthiness; initial list failures use the upstream error mapper.

[Domain guide](../schoolsoft-data.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/subjects/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/subjects/route.ts#L1). Source SHA-256: `f8da7f303e01b92f2fa77e01b47cf099485069742f5dae9a0a62df74806f9d3e`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/apiError](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/apiError.ts#L1): `{ handleApiError }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ applySessionCookieUpdates, createSchoolsoftClient, requireSession, }`

## GET /api/subjects

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/subjects/route.ts#L18).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/subjects'
```

### Source contract

#### Request reads

No request headers, query values, cookies, or body reader is called directly in this handler. Authentication helpers can still read cookies.

#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json({ success: true, subjects: enriched })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls


```ts
api.get('/rest-api/student/ps/subjectroom/all', {
      headers: { Cookie: cookies },
      responseType: 'json',
    })
```


```ts
api.get(`/rest-api/student/ps/subjectroom/${id}/entities`, {
              headers: { Cookie: cookies },
              responseType: 'json',
            })
```


```ts
api.get(`/rest-api/student/ps/subjectroom/${id}/unread_entities`, {
              headers: { Cookie: cookies },
              responseType: 'json',
            })
```


```ts
api.get(`/rest-api/student/ps/subjectroom/${id}/teachers`, {
              headers: { Cookie: cookies },
              responseType: 'json',
            })
```

