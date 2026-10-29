# /api/auth/passkey/credentials

List the current verified account's credentials newest first, projecting only IDs, device metadata, backup flag, and creation/last-use times in milliseconds. Public key and encrypted token material are omitted.

[Domain guide](../authentication.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/auth/passkey/credentials/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/passkey/credentials/route.ts#L1). Source SHA-256: `f15d40629b95caa314ddbd7cc3e70a5a75d2f996dc1e7cf754d437a1dfb73776`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/passkeyDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/passkeyDb.ts#L1): `{ listCredentials, makeUserHandle }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ requireSession }`

## GET /api/auth/passkey/credentials

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/passkey/credentials/route.ts#L14).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/auth/passkey/credentials'
```

### Source contract

#### Request reads

No request headers, query values, cookies, or body reader is called directly in this handler. Authentication helpers can still read cookies.

#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json({
    success: true,
    credentials: creds.map((c) => ({
      id: c.credentialId,
      deviceName: c.deviceName,
      deviceType: c.deviceType,
      backedUp: c.backedUp,
      createdAt: (c.createdAt as Timestamp).toMillis(),
      lastUsedAt: (c.lastUsedAt as Timestamp).toMillis(),
    })),
  })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
