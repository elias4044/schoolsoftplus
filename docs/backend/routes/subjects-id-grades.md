# /api/subjects/[id]/grades

Scan reported and expired candidate assignment assessments in batches of four. Explicit review grades take precedence over estimated criteria/points grades. Skip inaccessible or unusable items and return scanned/total/skipped/grades. It does not persist the tracker; a separate PUT is needed.

[Domain guide](../schoolsoft-data.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/subjects/[id]/grades/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/subjects/%5Bid%5D/grades/route.ts#L1). Source SHA-256: `108a6c5bad87f1b59e42a6af10e0414db9c988bb540ba4c61eca55c13a040815`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/lib/grades/constants](https://github.com/elias4044/schoolsoftplus/blob/main/lib/grades/constants.ts#L1): `{ parseGradeFromReview }`
- [@/lib/grades/inferGrade](https://github.com/elias4044/schoolsoftplus/blob/main/lib/grades/inferGrade.ts#L1): `{ inferGrade, normalizeAssessmentRaw }`
- [@/lib/grades/types](https://github.com/elias4044/schoolsoftplus/blob/main/lib/grades/types.ts#L1): `type { ScannedGradeResult }`
- [@/app/api/lib/apiError](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/apiError.ts#L1): `{ handleApiError }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ createSchoolsoftClient, requireSession }`

## POST /api/subjects/[id]/grades

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/subjects/%5Bid%5D/grades/route.ts#L132).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  'http://localhost:3000/api/subjects/12345/grades'
```

### Source contract

#### Request reads

No request headers, query values, cookies, or body reader is called directly in this handler. Authentication helpers can still read cookies.

#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json({
      success: true,
      scanned: results.length,
      total: toScan.length,
      skipped,
      grades: results,
    })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## Local helper behavior

The route also uses these local functions. Imported persistence and authentication behavior is described in the domain guide.

### safeFetch

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/subjects/%5Bid%5D/grades/route.ts#L13).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls


```ts
api.get(url, {
      headers: { Cookie: cookies },
      responseType: 'json',
    })
```


### scanAssignment

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/subjects/%5Bid%5D/grades/route.ts#L43).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls

No direct upstream call.

### fetchTableRows

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/subjects/%5Bid%5D/grades/route.ts#L113).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls


```ts
api.get(`/rest-api/student/ps/subjectroom/${subjectId}/table/rows`, {
      headers: { Cookie: cookies },
      responseType: 'json',
    })
```

