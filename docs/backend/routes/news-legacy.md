# /api/news/legacy

Parse title/preview/requestid from legacy SchoolSoft start-page HTML with classic cookies. Return success/data and increment the legacy news counter. Markup changes can yield an empty successful array. It is not automatically selected by the modern route.

[Domain guide](../schoolsoft-data.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/news/legacy/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/news/legacy/route.ts#L1). Source SHA-256: `680394ef4c01d09b082e8f02ed01a03a6d7da8f8631af1095d0aa2c22fc91c2f`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/apiError](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/apiError.ts#L1): `{ handleApiError }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ createSchoolsoftClient, decodeHtmlResponse, requireSession, }`
- [@/app/api/lib/statsHelper](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/statsHelper.ts#L1): `{ trackNewsFetch }`

## GET /api/news/legacy

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/news/legacy/route.ts#L15).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/news/legacy'
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
NextResponse.json({ success: true, data: news })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls


```ts
api.get('/jsp/student/right_student_startpage.jsp', {
      headers: { Cookie: cookies },
      responseType: 'arraybuffer',
    })
```

