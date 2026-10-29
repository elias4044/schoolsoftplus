# /api/notes/shared/[token]

Public read by exact forty-character lowercase hex share token. Return only note ID/title/content/status/timestamps, excluding owner and token. Token existence controls access regardless of draft/published/archived status. Revoked/unknown tokens return 404.

[Domain guide](../study-tools.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/notes/shared/[token]/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/notes/shared/%5Btoken%5D/route.ts#L1). Source SHA-256: `192e21e3936434cc013cff870cb05410c7b91dc847685a711404fcfbb9dda907`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/notesDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/notesDb.ts#L1): `{ getNoteByShareToken }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ InputError, withValidation }`

## GET /api/notes/shared/[token]

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/notes/shared/%5Btoken%5D/route.ts#L6).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/notes/shared/0123456789abcdef0123456789abcdef01234567'
```

### Source contract

#### Request reads

No request headers, query values, cookies, or body reader is called directly in this handler. Authentication helpers can still read cookies.

#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json({ error: 'Not found or link revoked' }, { status: 404 })
```


```ts
NextResponse.json({ success: true, note: pub })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
