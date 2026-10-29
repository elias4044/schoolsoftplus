# /api/countdowns

List owned countdowns by target date, create one, update supported fields by query id, or delete by query id. Creation requires title and millisecond targetDate and forces archived=false. Updates/deletes verify owner transactionally; equal updates skip writes. No server alarm or notification is scheduled.

[Domain guide](../study-tools.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/countdowns/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/countdowns/route.ts#L1). Source SHA-256: `36f3b54c2d1ed79f31b1e0b33130e0bc2147cb81527953ab82a344b4b68984b4`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/authenticatedUser](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/authenticatedUser.ts#L1): `{ getAuthenticatedUserId }`
- [@/app/api/lib/countdownsDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/countdownsDb.ts#L1): `{ createCountdown, deleteCountdown, getCountdownsByUser, updateCountdown, type CountdownCategory, type CountdownTheme, }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ assertDocumentId, readJsonObject, validateFields, withValidation, }`
- [@/app/api/lib/studyValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/studyValidation.ts#L1): `{ countdownFields }`

## GET /api/countdowns

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/countdowns/route.ts#L20).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/countdowns'
```

### Source contract

#### Request reads

No request headers, query values, cookies, or body reader is called directly in this handler. Authentication helpers can still read cookies.

#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```


```ts
NextResponse.json({ success: true, countdowns })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## POST /api/countdowns

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/countdowns/route.ts#L28).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  -H 'Content-Type: application/json' \
  --data '{"title":"Biology exam","targetDate":1796112000000,"category":"exam"}' \
  'http://localhost:3000/api/countdowns'
```

### Source contract

#### Request reads


```ts
readJsonObject(req)
```


#### Parsed body and local type


```ts
const body = await readJsonObject(req);
```


#### Response branches


```ts
NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```


```ts
NextResponse.json({ error: 'title is required' }, { status: 400 })
```


```ts
NextResponse.json({ error: 'targetDate (unix ms) is required' }, { status: 400 })
```


```ts
NextResponse.json({ success: true, countdown }, { status: 201 })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## PATCH /api/countdowns

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/countdowns/route.ts#L58).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X PATCH \
  -H 'Content-Type: application/json' \
  --data '{"pinned":true}' \
  'http://localhost:3000/api/countdowns?id=example-countdown-id'
```

### Source contract

#### Request reads


```ts
req.nextUrl.searchParams.get('id')
```


```ts
readJsonObject(req)
```


#### Parsed body and local type


```ts
const body = await readJsonObject(req);
```


#### Response branches


```ts
NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```


```ts
NextResponse.json({ error: 'Not found' }, { status: 404 })
```


```ts
NextResponse.json({ success: true, countdown: updated })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## DELETE /api/countdowns

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/countdowns/route.ts#L85).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X DELETE \
  'http://localhost:3000/api/countdowns?id=example-countdown-id'
```

### Source contract

#### Request reads


```ts
req.nextUrl.searchParams.get('id')
```


#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```


```ts
NextResponse.json({ error: 'Not found' }, { status: 404 })
```


```ts
NextResponse.json({ success: true })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
