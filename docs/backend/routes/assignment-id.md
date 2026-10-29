# /api/assignment/[id]

Aggregate one SchoolSoft assignment or the first part of a planning. Assignment mode normalizes the view, fetches sections/plannings/assessment/columns, then conditionally fetches selected criteria. Only type=planning switches branches. Optional fetches absorb 403/404, while other upstream failures can fail the request. No assignment data is persisted.

[Domain guide](../schoolsoft-data.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/assignment/[id]/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/assignment/%5Bid%5D/route.ts#L1). Source SHA-256: `a7b8b0ca6cbf6c8ec9f5836e15fb6a322ad218bb6912bb9b911f5b7dfa7ef20d`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/apiError](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/apiError.ts#L1): `{ handleApiError }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ createSchoolsoftClient, requireSession }`

## GET /api/assignment/[id]

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/assignment/%5Bid%5D/route.ts#L85).

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
        assignment: view,
        sections: Array.isArray(sections) ? sections : [],
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
      sections,
      connectedPlannings,
      assessment: normalizeAssessment(assessmentRaw),
      grading: {
        availableColumns,
        selectedCriteria,
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

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/assignment/%5Bid%5D/route.ts#L20).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls


```ts
api.get(url, {
      headers: { Cookie: cookies },
      responseType: 'json',
    })
```


### normalizeAssessment

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/assignment/%5Bid%5D/route.ts#L39).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls

No direct upstream call.

### normalizeAssignmentView

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/assignment/%5Bid%5D/route.ts#L66).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls

No direct upstream call.
