# /api/file

Resolve an AuthV2 attachment to an HTTPS Location from SchoolSoft's 303 resource response. responseType=url returns the destination; all other values stream downloaded bytes with restrictive headers. Only the same SchoolSoft school path receives the access token. The type query is unused. Non-raster data is forced to attachment disposition.

[Domain guide](../schoolsoft-data.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/file/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/file/route.ts#L1). Source SHA-256: `6105d9a3ecd90682bafd570e9ded019b77668ca0a47f8393b84334171faa93d3`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ assertDocumentId, InputError, withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ createSchoolsoftClient, requireSession }`

## GET /api/file

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/file/route.ts#L8).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/file?id=12345&responseType=url'
```

### Source contract

#### Request reads


```ts
req.nextUrl.searchParams.get('id')
```


```ts
req.nextUrl.searchParams.get('responseType')
```


#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json({ error: 'AuthV2 is required.' }, { status: 401 })
```


```ts
NextResponse.json({ error: 'Resource not found.' }, { status: 404 })
```


```ts
NextResponse.json({ url: location.href })
```


```ts
new NextResponse(download.body, { headers })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls


```ts
createSchoolsoftClient(session.school).get(
    `/eva/api/v1/resource/attachment/${encodeURIComponent(id)}`,
    {
      headers: { Authorization: `Bearer ${session.token}` },
      validateStatus: () => true,
    }
  )
```


```ts
fetch(location.href, {
    signal: AbortSignal.timeout(10_000),
    redirect: 'error',
    headers:
      location.origin === 'https://sms.schoolsoft.se' &&
      location.pathname.startsWith(`/${session.school}/`)
        ? { Authorization: `Bearer ${session.token}` }
        : {},
  })
```

