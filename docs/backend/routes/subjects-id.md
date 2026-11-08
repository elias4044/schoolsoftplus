# /api/subjects/[id]

The coursework view fetches only room metadata and assignment rows; assignments view fetches only rows. assessment-link separately resolves holistic metadata using shared cached reads. Legacy default and includeAssessment=true remain supported. Session-scoped cache lasts sixty seconds for core reads and two minutes for holistic rows; refresh=1 bypasses it. Discovery errors never block the new coursework view, and authentication remains required.

[Domain guide](../schoolsoft-data.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/subjects/[id]/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/subjects/%5Bid%5D/route.ts#L1). Source SHA-256: `f602b4e144f12953ad32c8a82da94e000101c22ef642cb762a285980114861a3`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/apiError](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/apiError.ts#L1): `{ handleApiError }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ InputError, withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ createSchoolsoftClient, requireSession }`
- [@/app/api/lib/schoolsoftReadCache](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoftReadCache.ts#L1): `{ cachedSchoolsoftGet }`
- [@/app/api/lib/subjectMapping](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/subjectMapping.ts#L1): `{ fetchHolisticSubjects, resolveSubjectAssessment }`

## GET /api/subjects/[id]

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/subjects/%5Bid%5D/route.ts#L11).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/subjects/12345'
```

### Source contract

#### Request reads

```ts
req.nextUrl.searchParams.get('view');
```

```ts
req.nextUrl.searchParams.get('refresh');
```

```ts
req.nextUrl.searchParams.get('includeAssessment');
```

#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches

```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 });
```

```ts
NextResponse.json({ success: true, assignments });
```

```ts
NextResponse.json({
  success: true,
  subject: {
    ...room,
    ...(assessmentLink
      ? { holisticAssessmentId: assessmentLink.subject?.holisticAssessmentId ?? null }
      : {}),
  },
  ...(assessmentLink
    ? { assessmentLink: assessmentLink.status, assessmentSummary: assessmentLink.subject }
    : {}),
  overview: {
    examinations: examinationsRes.data,
    submissions: submissionsRes.data,
  },
  assignments: assignmentsRes.data,
});
```

#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
