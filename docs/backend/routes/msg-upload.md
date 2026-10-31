# /api/msg-upload

Upload authenticated JPEG, PNG, or static WebP images to img.e4044.com. Return 202 with pending/id/state until scanning approves publication, then 200 with a public WebP URL. Poll authenticated GET on the same route with ?id=. Requires IMAGE_HOST_API_TOKEN with images:read and images:write. The profile route limits files to five MiB; messages to ten MiB. Saving a profile URL is a separate PUT /api/profile.

[Domain guide](../integrations.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/msg-upload/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/msg-upload/route.ts#L1). Source SHA-256: `ef7935f078c461949512b02376d605b4c829837884236efb30fa563c3b5a2591`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/imageUploadRoute](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/imageUploadRoute.ts#L1): `{ createImageUploadHandlers }`

## POST /api/msg-upload

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/msg-upload/route.ts#L5).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  -F 'image=@example.png' \
  'http://localhost:3000/api/msg-upload'
```

### Source contract

#### Request reads

No request headers, query values, cookies, or body reader is called directly in this handler. Authentication helpers can still read cookies.

#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches

Response construction is delegated to a local helper; see the local-helper section below.

#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## GET /api/msg-upload

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/msg-upload/route.ts#L6).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/msg-upload?id=image-id'
```

### Source contract

#### Request reads

No request headers, query values, cookies, or body reader is called directly in this handler. Authentication helpers can still read cookies.

#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches

Response construction is delegated to a local helper; see the local-helper section below.

#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
