# /api/github/issues/create

Create a real issue using the server GitHub account after session verification and a three-attempt instance-local user window. Validate title/body/type, assign fixed labels, append verified username/school attribution, and return issue number and URL. Missing configuration is 503; upstream rejection is 502.

[Domain guide](../integrations.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/github/issues/create/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/github/issues/create/route.ts#L1). Source SHA-256: `87fab5825d9bd97b7553eac8133e3a8aa70873a33fb75281f2b6edc6c9b0a70c`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/rateLimit](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/rateLimit.ts#L1): `{ enforceRateLimit }`
- [@/app/api/lib/requestBody](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/requestBody.ts#L1): `{ readRouteBody }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ requireSession }`

## POST /api/github/issues/create

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/github/issues/create/route.ts#L18).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  -H 'Content-Type: application/json' \
  --data '{"title":"Schedule repeats a lesson","body":"Steps to reproduce and expected behavior.","type":"bug"}' \
  'http://localhost:3000/api/github/issues/create'
```

### Source contract

#### Request reads


```ts
readRouteBody(req)
```


#### Parsed body and local type


```ts
const body = (await readRouteBody(req)) as { title?: string; body?: string; type?: string };
```


#### Response branches


```ts
NextResponse.json({ error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json(
      { error: 'Server is not configured for issue creation. Please contact the admin.' },
      { status: 503 }
    )
```


```ts
NextResponse.json({ error: 'Title is required.' }, { status: 400 })
```


```ts
NextResponse.json({ error: 'Title is too long (max 256 chars).' }, { status: 400 })
```


```ts
NextResponse.json(
      { error: 'Failed to create issue. Please try again later.' },
      { status: 502 }
    )
```


```ts
NextResponse.json({
    success: true,
    number: issue.number,
    html_url: issue.html_url,
  })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls


```ts
fetch(API, {
    signal: AbortSignal.timeout(8_000),
    method: 'POST',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      'User-Agent': 'schoolsoftplus-app',
    },
    body: JSON.stringify({ title: title.trim(), body: issueBody, labels }),
  })
```

