# /api/assignments/week

Fetch a week's SchoolSoft assignment start-page data, preserving the upstream payload inside data. Both week and year are required and common numeric-range validation applies. Successful fetches increment the assignment counter.

[Domain guide](../schoolsoft-data.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/assignments/week/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/assignments/week/route.ts#L1). Source SHA-256: `744e2f6dbd89370d2d5fdf3d4fdbbe792f555a21ccb7dfef83d131050d46d1c0`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/apiError](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/apiError.ts#L1): `{ handleApiError }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ createSchoolsoftClient, requireSession }`
- [@/app/api/lib/statsHelper](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/statsHelper.ts#L1): `{ trackAssignmentsFetch }`

## GET /api/assignments/week

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/assignments/week/route.ts#L9).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/assignments/week?week=44&year=2026'
```

### Source contract

#### Request reads


```ts
searchParams.get('week')
```


```ts
searchParams.get('year')
```


#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json(
      { success: false, error: 'week and year query parameters are required.' },
      { status: 400 }
    )
```


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json({ success: true, data: response.data })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls


```ts
api.get(
      `/rest-api/student/ps/assignments/start-page?week=${week}&year=${year}`,
      { headers: { Cookie: cookies }, responseType: 'json' }
    )
```

