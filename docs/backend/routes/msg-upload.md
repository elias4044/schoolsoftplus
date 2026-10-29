# /api/msg-upload

Upload an authenticated multipart image to ImgBB, accepting the declared raster-image MIME types including image/jpg and up to ten MiB. Bound request bytes before form parsing. Return a direct display URL without sending a message; GIF filenames are sanitized before forwarding. Missing key is 503.

[Domain guide](../integrations.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/msg-upload/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/msg-upload/route.ts#L1). Source SHA-256: `ff5ad9d4a68c9ddbc52f81610e15dde7f9c441e934508ccbc59bb8ead7aad650`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ readRequestBytes, withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ requireSession }`

## POST /api/msg-upload

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/msg-upload/route.ts#L24).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  -F 'image=@example.png' \
  'http://localhost:3000/api/msg-upload'
```

### Source contract

#### Request reads


```ts
readRequestBytes(req, 10 * 1024 * 1024 + 64 * 1024)
```


```ts
req.headers.get('content-type')
```


#### Parsed body and local type


```ts
const bytes = await readRequestBytes(req, 10 * 1024 * 1024 + 64 * 1024);
```


#### Response branches


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json(
      { success: false, error: 'Image upload not configured.' },
      { status: 503 }
    )
```


```ts
new Response(new Uint8Array(bytes), {
      headers: { 'Content-Type': req.headers.get('content-type') ?? '' },
    })
```


```ts
NextResponse.json({ success: false, error: 'Invalid form data.' }, { status: 400 })
```


```ts
NextResponse.json({ success: false, error: 'No image provided.' }, { status: 400 })
```


```ts
NextResponse.json(
      { success: false, error: 'Unsupported file type. Allowed: JPEG, PNG, GIF, WebP, AVIF, BMP.' },
      { status: 400 }
    )
```


```ts
NextResponse.json(
      { success: false, error: 'Image must be under 10 MB.' },
      { status: 400 }
    )
```


```ts
NextResponse.json({ success: false, error: 'Upload failed.' }, { status: 502 })
```


```ts
NextResponse.json({ success: true, url: data.data.display_url || data.data.url })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls


```ts
fetch('https://api.imgbb.com/1/upload', {
    signal: AbortSignal.timeout(8_000),
    method: 'POST',
    body,
  })
```

