# /api/gif

Search Giphy or return trending when q is empty. Require authenticated cookies, configured API key, and limit 1-30 (default twenty). Request PG results and return slim URL/dimension metadata, filtering entries without usable previews/full URLs. Provider failures are 502.

[Domain guide](../integrations.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/gif/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/gif/route.ts#L1). Source SHA-256: `5e87ab870ca63c576d2fea5f60ebcc5b9bb492bb69a98ecc660dc79ae299cfca`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ requireSession }`

## GET /api/gif

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/gif/route.ts#L11).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/gif?q=cats&limit=10'
```

### Source contract

#### Request reads


```ts
req.nextUrl.searchParams.get('q')
```


```ts
req.nextUrl.searchParams.get('limit')
```


#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json(
      { success: false, error: 'GIF search not configured.' },
      { status: 503 }
    )
```


```ts
NextResponse.json({ error: 'Invalid limit.' }, { status: 400 })
```


```ts
NextResponse.json(
      { success: false, error: 'GIF service unavailable.' },
      { status: 502 }
    )
```


```ts
NextResponse.json({ success: false, error: 'GIF search failed.' }, { status: 502 })
```


```ts
NextResponse.json({ success: true, gifs })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls


```ts
fetch(url, { signal: AbortSignal.timeout(8_000) })
```

