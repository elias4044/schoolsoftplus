# /api/custom

Proxy an allowed relative SchoolSoft rest-api/ or eva/api/ path from x-url using the verified account's school and browser cookies. GET/POST/PUT/DELETE are exported; PATCH is not. Non-GET bodies use bounded JSON-object parsing. Return upstream success status with a success/data wrapper; no SchoolSoft Bearer header is added automatically.

[Domain guide](../schoolsoft-data.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/custom/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/custom/route.ts#L1). Source SHA-256: `543df6e0e28d19baa3bd0f4d66cf860827d85f6431e38a1e4b86ca2e76a1f6e8`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/apiError](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/apiError.ts#L1): `{ handleApiError }`
- [@/app/api/lib/requestBody](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/requestBody.ts#L1): `{ readRouteBody }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ createSchoolsoftClient, requireSession }`

## GET /api/custom

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/custom/route.ts#L11).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  -H 'x-url: rest-api/student/ps/subjectroom/all' \
  'http://localhost:3000/api/custom'
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

## POST /api/custom

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/custom/route.ts#L14).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  -H 'x-url: rest-api/REPLACE_WITH_SUPPORTED_PATH' \
  -H 'Content-Type: application/json' \
  --data '{}' \
  'http://localhost:3000/api/custom'
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

## PUT /api/custom

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/custom/route.ts#L17).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X PUT \
  -H 'x-url: rest-api/REPLACE_WITH_SUPPORTED_PATH' \
  -H 'Content-Type: application/json' \
  --data '{}' \
  'http://localhost:3000/api/custom'
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

## DELETE /api/custom

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/custom/route.ts#L20).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X DELETE \
  -H 'x-url: rest-api/REPLACE_WITH_SUPPORTED_PATH' \
  'http://localhost:3000/api/custom'
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

## Local helper behavior

The route also uses these local functions. Imported persistence and authentication behavior is described in the domain guide.

### proxyRequest

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/custom/route.ts#L24).

#### Response branches


```ts
NextResponse.json(
      { success: false, error: 'x-url header is required.' },
      { status: 400 }
    )
```


```ts
NextResponse.json({ error: 'Invalid SchoolSoft API path.' }, { status: 400 })
```


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json({ success: true, data: response.data }, { status: response.status })
```


#### Upstream calls


```ts
api.request({
      method,
      url: `/${customURL}`,
      headers: { Cookie: cookies },
      data: body,
      responseType: 'json',
    })
```

