# /api/people/staff

Parse the legacy staff JSP into section lists plus a flat list deduplicated by email or name. Normalize first/surname ordering, split roles on line breaks, collect phone/email/contact/picture metadata, and prefix relative pictures with the school's base URL.

[Domain guide](../schoolsoft-data.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/people/staff/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/people/staff/route.ts#L1). Source SHA-256: `f7bd00034c3a343a8ee7d335bdd2585fff7065fd59ec01169b90962c138510ef`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/apiError](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/apiError.ts#L1): `{ handleApiError }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ createSchoolsoftClient, decodeHtmlResponse, requireSession, }`

## GET /api/people/staff

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/people/staff/route.ts#L38).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/people/staff'
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
NextResponse.json({ success: true, sections, staff: uniqueStaff })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls


```ts
api.get('/jsp/student/right_student_staff.jsp', {
      headers: { Cookie: cookies },
      responseType: 'arraybuffer',
    })
```

