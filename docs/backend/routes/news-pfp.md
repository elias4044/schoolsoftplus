# /api/news/pfp

Read a teacher picture using digits-only query id and verified SchoolSoft cookies. Return bytes with upstream content type/cache policy, using JPEG and private/no-store fallbacks. This is a query URL, not the malformed path shown in an old comment.

[Domain guide](../schoolsoft-data.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/news/pfp/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/news/pfp/route.ts#L1). Source SHA-256: `ad5b4be64df343e68c58f9470cff9e2eb8334eba9d62e0314084b0e90d94d4e9`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`

## GET /api/news/pfp

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/news/pfp/route.ts#L9).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/news/pfp?id=3020'
```

### Source contract

#### Request reads


```ts
searchParams.get('id')
```


#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json({ error: 'Invalid teacher id.' }, { status: 400 })
```


```ts
new NextResponse(response.data, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': cacheControl,
      },
    })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls


```ts
api.get('/jsp/student/pictureFile.jsp?teacherId=' + id, {
      headers: { Cookie: cookies },
      responseType: 'arraybuffer',
    })
```

