# /api/news/[id]

Fetch AuthV2 EVA news detail, normalize supported square-bracket markup, sanitize HTML/style classes and links, and rewrite only matching attached image IDs through /api/file. Return upstream fields with description and descriptionHtml set to sanitized HTML, without a success wrapper.

[Domain guide](../schoolsoft-data.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/news/[id]/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/news/%5Bid%5D/route.ts#L1). Source SHA-256: `b606c78cb0675cb1a33abef8caf8e7196811b91c1d2e40d966d7683b97cab03d`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/apiError](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/apiError.ts#L1): `{ handleApiError }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ createSchoolsoftClient, requireSession }`

## GET /api/news/[id]

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/news/%5Bid%5D/route.ts#L534).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/news/12345'
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
NextResponse.json(
      {
        success: false,
        error: 'Missing ID',
      },
      { status: 400 }
    )
```


```ts
NextResponse.json(
      {
        success: false,
        error: 'Not authenticated.',
      },
      { status: 401 }
    )
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
NextResponse.json({
      ...news,

      description: descriptionHtml,
      descriptionHtml,
    })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls


```ts
api.get<News>(
      `/eva/api/v2/student/${sess.user.userId}/schools/${orgId}/news/${id}`,
      {
        headers: {
          Authorization: `Bearer ${sess.token}`,
        },
      }
    )
```


## Local helper behavior

The route also uses these local functions. Imported persistence and authentication behavior is described in the domain guide.

### stylesToClasses

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/news/%5Bid%5D/route.ts#L40).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls

No direct upstream call.

### normalizeSchoolsoftMarkup

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/news/%5Bid%5D/route.ts#L194).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls

No direct upstream call.

### sanitizeNewsDescription

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/news/%5Bid%5D/route.ts#L274).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls

No direct upstream call.
