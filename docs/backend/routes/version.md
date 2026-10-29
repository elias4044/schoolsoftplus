# /api/version

Public source-defined version response from APP_VERSION. Return version without a success flag. It is not dynamically derived from package.json and inherits private/no-store response caching.

[Domain guide](../integrations.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/version/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/version/route.ts#L1). Source SHA-256: `89a8ca3ccae763ca85a445846d204b0c7a2393e7e60f8e81a482cff8b81aa4cd`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/version](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/version.ts#L1): `{ APP_VERSION }`

## GET /api/version

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/version/route.ts#L6).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/version'
```

### Source contract

#### Request reads

No request headers, query values, cookies, or body reader is called directly in this handler. Authentication helpers can still read cookies.

#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json({ version: APP_VERSION })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
