# /api/layout

Read the saved dashboard layout or null, or replace it with validated version/widgets. Cap thirty widgets, require unique instance IDs and supported widget/size values, discard extra widget fields, and skip equal saves. GET can include stored userId/updatedAt while PUT returns the cleaned submitted layout.

[Domain guide](../study-tools.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/layout/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/layout/route.ts#L1). Source SHA-256: `2152c879abb678693ee6ae9fdb0e8b5d2aa281a5b5ebbe01988d984496eb2c3b`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/lib/widgets/types](https://github.com/elias4044/schoolsoftplus/blob/main/lib/widgets/types.ts#L1): `type { DashboardLayout }`
- [@/app/api/lib/authenticatedUser](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/authenticatedUser.ts#L1): `{ getAuthenticatedUserId }`
- [@/app/api/lib/layoutDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/layoutDb.ts#L1): `{ getLayout, saveLayout }`
- [@/app/api/lib/requestBody](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/requestBody.ts#L1): `{ readRouteBody }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ InputError, isObject, nonEmptyText, withValidation }`

## GET /api/layout

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/layout/route.ts#L21).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/layout'
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
NextResponse.json({ success: true, layout: await getLayout(userId) })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## PUT /api/layout

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/layout/route.ts#L27).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X PUT \
  -H 'Content-Type: application/json' \
  --data '{"layout":{"version":1,"widgets":[{"instanceId":"schedule-main","widgetId":"schedule","size":"2x2"}]}}' \
  'http://localhost:3000/api/layout'
```

### Source contract

#### Request reads


```ts
readRouteBody(req)
```


#### Parsed body and local type


```ts
const { layout } = await readRouteBody(req);
```


#### Response branches


```ts
NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```


```ts
NextResponse.json({ success: true, layout: clean })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
