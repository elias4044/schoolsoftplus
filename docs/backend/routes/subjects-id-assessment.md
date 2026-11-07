# /api/subjects/[id]/assessment

Fetch attendance, assessed assignments, grading criteria, criteria overview, and subject warnings using browser-cookie authentication. A section query returns just that resource independently; without it the legacy aggregate remains supported. Validated reads are cached per session for two minutes, and refresh=1 bypasses them. The required holisticId query identifies a separate assessment record, not the room ID. Each optional resource has available/unavailable/error status; upstream authentication errors propagate. Warning reads use section=warning and /subject_warning. Inactive or unpublished warnings and non-authentication warning failures are unavailable, without blocking other sections. HTML is sanitized before display. The room endpoint discovers the holistic ID when includeAssessment=true; see docs/subject-assessment-api.md.

[Domain guide](../schoolsoft-data.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/subjects/[id]/assessment/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/subjects/%5Bid%5D/assessment/route.ts#L1). Source SHA-256: `dd2fc0764643cc1a75a4ab1bf5a2d73bb46c005224995b483d4f83e7171072f1`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/apiError](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/apiError.ts#L1): `{ handleApiError }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ InputError, withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ createSchoolsoftClient, requireSession }`
- [@/app/api/lib/subjectAssessment](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/subjectAssessment.ts#L1): `{ assessmentPaths, fetchAssessmentResource, fetchSubjectAssessment, }`

## GET /api/subjects/[id]/assessment

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/subjects/%5Bid%5D/assessment/route.ts#L13).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/subjects/12345/assessment?holisticId=294143'
```

### Source contract

#### Request reads


```ts
req.nextUrl.searchParams.get('holisticId')
```


```ts
req.nextUrl.searchParams.get('section')
```


```ts
req.nextUrl.searchParams.get('refresh')
```


#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json({ success: true, resource })
```


```ts
NextResponse.json({ success: true, assessment })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
