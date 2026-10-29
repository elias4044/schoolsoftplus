# /api/grade-tracker/[subjectId]

Read or transactionally update the current account's subject tracker. Nonempty scanned data merges by assignment ID with user overrides preserved; otherwise entries replaces the list. Settings merge and unknown settings fail. Entries/scans can append a snapshot unless explicitly disabled, retaining fifty. Saving is separate from the SchoolSoft scan endpoint.

[Domain guide](../study-tools.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/grade-tracker/[subjectId]/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/grade-tracker/%5BsubjectId%5D/route.ts#L1). Source SHA-256: `8f9081c4ffae1fa53c8806f859d338a5516966e9a59f1bd8dae13bffbb5eab2c`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/authenticatedUser](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/authenticatedUser.ts#L1): `{ getAuthenticatedUserId }`
- [@/app/api/lib/gradeTrackerDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/gradeTrackerDb.ts#L1): `{ getGradeTracker, updateGradeTracker }`
- [@/app/api/lib/gradeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/gradeValidation.ts#L1): `{ validateGradeBody, type GradeUpdates }`
- [@/app/api/lib/requestBody](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/requestBody.ts#L1): `{ readRouteBody }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`

## GET /api/grade-tracker/[subjectId]

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/grade-tracker/%5BsubjectId%5D/route.ts#L11).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/grade-tracker/120'
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
NextResponse.json({ success: true, tracker })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## PUT /api/grade-tracker/[subjectId]

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/grade-tracker/%5BsubjectId%5D/route.ts#L18).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X PUT \
  -H 'Content-Type: application/json' \
  --data '{"subjectName":"Mathematics","settings":{"targetGrade":"B"},"addSnapshot":false}' \
  'http://localhost:3000/api/grade-tracker/120'
```

### Source contract

#### Request reads


```ts
readRouteBody(req)
```


#### Parsed body and local type


```ts
const body = await readRouteBody(req);
```


#### Response branches


```ts
NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```


```ts
NextResponse.json({ success: true, tracker })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
