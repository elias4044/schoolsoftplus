# /api/firebase-token

Mint a Firebase custom token after live SchoolSoft session verification and migration. UID is the canonical user ID, with identityVersion=2. Return the token and userId for Firebase signInWithCustomToken. This is not a SchoolSoft token or universal HTTP Bearer credential.

[Domain guide](../data-and-realtime.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/firebase-token/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/firebase-token/route.ts#L1). Source SHA-256: `483468e6522de47d75e29a6f86e8e660724c6ce8f928605d6032f3fbe07d4d72`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/firebaseAdmin](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/firebaseAdmin.ts#L1): `side effect import`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ applySessionCookieUpdates, requireSession }`

## GET /api/firebase-token

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/firebase-token/route.ts#L9).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/firebase-token'
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
NextResponse.json({ success: true, token, userId: session.userId })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
