# /api/startpage

Parse homework and test summaries from the legacy start-page JSP. Homework contains dateAndSubject/title/content paragraphs; tests contain title/description/source link. Return success/data without persisting or converting it into the modern assignment model.

[Domain guide](../schoolsoft-data.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/startpage/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/startpage/route.ts#L1). Source SHA-256: `714228c39853e0f72078312809d60175f81f14aa3a82c2c92ccd9c9d77498ba9`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/apiError](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/apiError.ts#L1): `{ handleApiError }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ createSchoolsoftClient, decodeHtmlResponse, requireSession, }`

## GET /api/startpage

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/startpage/route.ts#L12).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/startpage'
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
NextResponse.json({ success: true, data: { homework, tests } })
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

