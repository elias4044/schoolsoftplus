# /api/github/issues

Public repository issue listing with state/label/page/per_page validation, newest-created sorting, optional server token, and sixty-second upstream revalidation. Filter pull requests after GitHub pagination and derive hasNext from Link. Return issues/hasNext without a success flag.

[Domain guide](../integrations.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/github/issues/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/github/issues/route.ts#L1). Source SHA-256: `d1847af67062f07b69e49a9429b65f85f85fef57b40a98527feb1aaccfb67b9f`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`

## GET /api/github/issues

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/github/issues/route.ts#L8).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/github/issues?state=open&page=1&per_page=25'
```

### Source contract

#### Request reads


```ts
searchParams.get('state')
```


```ts
searchParams.get('labels')
```


```ts
searchParams.get('page')
```


```ts
searchParams.get('per_page')
```


#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json({ error: 'Invalid issue query.' }, { status: 400 })
```


```ts
NextResponse.json(
      { error: 'GitHub API error', status: upstream.status },
      { status: upstream.status }
    )
```


```ts
NextResponse.json({ issues, hasNext })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls


```ts
fetch(url.toString(), {
    signal: AbortSignal.timeout(8_000),
    headers,
    next: { revalidate: 60 },
  })
```

