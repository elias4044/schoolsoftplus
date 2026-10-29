# /api/news

Require a verified session plus SchoolSoft access token and fetch EVA news for the verified user and selected/default organization. Return upstream JSON directly, usually an array; list descriptions are not sanitized here. Classic callers must explicitly use the legacy endpoint.

[Domain guide](../schoolsoft-data.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/news/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/news/route.ts#L1). Source SHA-256: `0de3a07048dec9d06368fa4bda28fce831b079333c69c964b660c3626d403c62`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/apiError](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/apiError.ts#L1): `{ handleApiError }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ createSchoolsoftClient, requireSession }`

## GET /api/news

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/news/route.ts#L9).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/news'
```

### Source contract

#### Request reads


```ts
searchParams.get('orgid')
```


#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json(
      {
        success: false,
        error:
          'This route requires AuthV2 (https://developer.ssp.elias4044.com/docs/auth-v2). The legacy route is available at /api/news/legacy',
      },
      { status: 401 }
    )
```


```ts
NextResponse.json(
      {
        success: false,
        error: 'UserId was not found.',
      },
      { status: 400 }
    )
```


```ts
NextResponse.json(res.data)
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls


```ts
api.get(`/eva/api/v2/student/${sess.user.userId}/schools/${orgId}/news`, {
      headers: { Authorization: 'Bearer ' + sess.token },
    })
```

