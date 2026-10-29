# /api/final-grades

GET returns the saved user-managed final-grade document or null. PUT sanitizes and replaces the complete subjects array (at most eighty subjects and twenty grade cells each). Grades normalize to A-F or null; this endpoint does not fetch SchoolSoft grades. Every save updates its timestamp.

[Domain guide](../study-tools.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/final-grades/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/final-grades/route.ts#L1). Source SHA-256: `84d4957603ffc6e38099f98ef0f32393a314810cd7240dbcbb9f93dfc57fad9a`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/lib/final-grades/types](https://github.com/elias4044/schoolsoftplus/blob/main/lib/final-grades/types.ts#L1): `type { FinalGradeLetter, FinalGradeSubject }`
- [@/app/api/lib/authenticatedUser](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/authenticatedUser.ts#L1): `{ getAuthenticatedUserId as authenticate }`
- [@/app/api/lib/finalGradesDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/finalGradesDb.ts#L1): `{ getFinalGrades, saveFinalGrades }`
- [@/app/api/lib/requestBody](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/requestBody.ts#L1): `{ readRouteBody }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`

## GET /api/final-grades

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/final-grades/route.ts#L60).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/final-grades'
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
NextResponse.json({ success: true, finalGrades: doc })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## PUT /api/final-grades

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/final-grades/route.ts#L68).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X PUT \
  -H 'Content-Type: application/json' \
  --data '{"subjects":[{"subject":"Mathematics","grades":[{"period":"Autumn 2026","grade":"B"}],"manual":true}]}' \
  'http://localhost:3000/api/final-grades'
```

### Source contract

#### Request reads


```ts
readRouteBody(req)
```


#### Parsed body and local type


```ts
const body = (await readRouteBody(req)) as { subjects?: unknown };
```


#### Response branches


```ts
NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```


```ts
NextResponse.json(
      { error: error instanceof Error ? error.message : 'Invalid subjects' },
      { status: 400 }
    )
```


```ts
NextResponse.json({ error: 'Subjects must be an array' }, { status: 400 })
```


```ts
NextResponse.json({ success: true, finalGrades })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## Local helper behavior

The route also uses these local functions. Imported persistence and authentication behavior is described in the domain guide.

### sanitizeSubjects

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/final-grades/route.ts#L11).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls

No direct upstream call.
