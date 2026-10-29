# /api/auth/passkey/credentials/[id]

Delete a credential only under the current verified user handle. Remove its flat index in the same batch, count remaining credentials, and delete the parent passkey user record when none remain. Missing/foreign credentials are 404.

[Domain guide](../authentication.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/auth/passkey/credentials/[id]/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/passkey/credentials/%5Bid%5D/route.ts#L1). Source SHA-256: `8213a056345d8c60f4fe89fb4ead07b2efd0d2fc91fc9e3b986f883fa3c1753a`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/firebaseAdmin](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/firebaseAdmin.ts#L1): `{ db }`
- [@/app/api/lib/passkeyDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/passkeyDb.ts#L1): `{ countCredentials, deleteCredential, getCredential, makeUserHandle, }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ requireSession }`

## DELETE /api/auth/passkey/credentials/[id]

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/passkey/credentials/%5Bid%5D/route.ts#L19).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X DELETE \
  'http://localhost:3000/api/auth/passkey/credentials/example-credential-id'
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
NextResponse.json({ success: false, error: 'Missing credential ID.' }, { status: 400 })
```


```ts
NextResponse.json({ success: false, error: 'Credential not found.' }, { status: 404 })
```


```ts
NextResponse.json({ success: true })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
