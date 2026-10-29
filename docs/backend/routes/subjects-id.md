# /api/subjects/[id]

Fetch a room view, examinations, submissions, and assignment table rows concurrently. Return subject, overview, and assignments with upstream payload shapes. A failure of any component fails this aggregate; it does not use the list route's per-subject fallback.

[Domain guide](../schoolsoft-data.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/subjects/[id]/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/subjects/%5Bid%5D/route.ts#L1). Source SHA-256: `f7dcad3d3628f1c42c630d1563a40da5d1f60b8f6009f0b914f93b5e79737961`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/apiError](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/apiError.ts#L1): `{ handleApiError }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ createSchoolsoftClient, requireSession }`

## GET /api/subjects/[id]

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/subjects/%5Bid%5D/route.ts#L9).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/subjects/12345'
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
NextResponse.json({
      success: true,
      subject: subjectRes.data,
      overview: {
        examinations: examinationsRes.data,
        submissions: submissionsRes.data,
      },
      assignments: assignmentsRes.data,
    })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls


```ts
api.get(`/rest-api/student/ps/subjectroom/${id}`, {
        headers: { Cookie: cookies },
        responseType: 'json',
      })
```


```ts
api.get(`/rest-api/student/ps/assignments/examinations?activityId=${id}`, {
        headers: { Cookie: cookies },
        responseType: 'json',
      })
```


```ts
api.get(`/rest-api/student/ps/assignments/submissions?activityId=${id}`, {
        headers: { Cookie: cookies },
        responseType: 'json',
      })
```


```ts
api.get(`/rest-api/student/ps/subjectroom/${id}/table/rows`, {
        headers: { Cookie: cookies },
        responseType: 'json',
      })
```

