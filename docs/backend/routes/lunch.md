# /api/lunch

Require a week query, fetch the current verified school's SchoolSoft lunch menu, wrap raw provider data in success/data, and increment the lunch-fetch metric. No local menu persistence or normalization is performed.

[Domain guide](../schoolsoft-data.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/lunch/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lunch/route.ts#L1). Source SHA-256: `a748a1e00caaafbf1050ce89f6dc8e39b5935fdd68b824c3ed7ba281fbb7ebcb`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/apiError](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/apiError.ts#L1): `{ handleApiError }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ createSchoolsoftClient, requireSession }`
- [@/app/api/lib/statsHelper](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/statsHelper.ts#L1): `{ trackLunchFetch }`

## GET /api/lunch

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lunch/route.ts#L9).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/lunch?week=44'
```

### Source contract

#### Request reads


```ts
searchParams.get('week')
```


#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json(
      { success: false, error: 'week query parameter is required.' },
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
api.get(`/rest-api/lunchmenu/week/${week}`, {
      headers: { Cookie: cookies },
      responseType: 'json',
    })
```

