# /api/assignment/[id]

Aggregate one SchoolSoft assignment or the first part of a planning. Assignment mode normalizes the view, fetches sections/plannings/assessment/columns, then conditionally fetches selected criteria. Only type=planning switches branches. Optional fetches absorb 403/404, while other upstream failures can fail the request. No assignment data is persisted.

[Domain guide](../schoolsoft-data.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/assignment/[id]/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/assignment/%5Bid%5D/route.ts#L1). Source SHA-256: `976f75ad0ca6b0cd7349eddfb13114c8ec2c19551d26c73eed81472f5438c0f2`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/apiError](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/apiError.ts#L1): `{ handleApiError }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ createSchoolsoftClient, requireSession }`
- [@/app/api/lib/schoolsoftReadCache](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoftReadCache.ts#L1): `{ cachedSchoolsoftGet }`
- [@/app/api/lib/subjectHtml](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/subjectHtml.ts#L1): `{ cleanSubjectContent, cleanSubjectHtml }`

## GET /api/assignment/[id]

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/assignment/%5Bid%5D/route.ts#L88).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/assignment/12345?type=assignment'
```

### Source contract

#### Request reads


```ts
searchParams.get('type')
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
NextResponse.json({ success: false, error: 'Planning not found.' }, { status: 404 })
```


```ts
NextResponse.json(
          { success: false, error: 'Planning view not found.' },
          { status: 404 }
        )
```


```ts
NextResponse.json({
        success: true,
        type: 'planning',
        assignment: cleanSubjectContent(view),
        sections: Array.isArray(sections) ? cleanSubjectContent(sections) : [],
        connectedPlannings: [],
        assessment: normalizeAssessment(null),
        grading: { availableColumns: [], selectedCriteria: [] },
      })
```


```ts
NextResponse.json({ success: false, error: 'Assignment not found.' }, { status: 404 })
```


```ts
NextResponse.json({
      success: true,
      type: 'assignment',
      assignment,
      sections: cleanSubjectContent(sections),
      connectedPlannings,
      assessment: normalizeAssessment(assessmentRaw),
      grading: {
        availableColumns,
        selectedCriteria: cleanSubjectContent(selectedCriteria),
      },
    })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## Local helper behavior

The route also uses these local functions. Imported persistence and authentication behavior is described in the domain guide.

### safeFetch

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/assignment/%5Bid%5D/route.ts#L22).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls

No direct upstream call.

### normalizeAssessment

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/assignment/%5Bid%5D/route.ts#L39).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls

No direct upstream call.

### normalizeAssignmentView

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/assignment/%5Bid%5D/route.ts#L68).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls

No direct upstream call.
