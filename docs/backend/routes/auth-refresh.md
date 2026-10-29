# /api/auth/refresh

Exchange caller-supplied SchoolSoft refresh-token material for fresh provider token fields. School is selected from body, x-school, or engelska. This is not browser-cookie refresh and does not authenticate the caller through requireSession. Non-200 upstream refresh is 401; transport failure is 502.

[Domain guide](../authentication.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/auth/refresh/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/refresh/route.ts#L1). Source SHA-256: `7f93da3bb6a40f8eda35a77229a6bcfa0858519d76f1895bc28f606d2d8fbeb7`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/requestBody](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/requestBody.ts#L1): `{ readRouteBody }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`

## POST /api/auth/refresh

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/refresh/route.ts#L29).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  -H 'Content-Type: application/json' \
  --data '{"refreshToken":"EXAMPLE_SCHOOLSOFT_REFRESH_TOKEN","school":"engelska"}' \
  'http://localhost:3000/api/auth/refresh'
```

### Source contract

#### Request reads


```ts
readRouteBody(req)
```


```ts
req.headers.get('x-school')
```


#### Parsed body and local type


```ts
const body = (await readRouteBody(req)) as { refreshToken?: string; school?: string };
```


#### Response branches


```ts
NextResponse.json(
      { success: false, error: 'refreshToken is required.' },
      { status: 400 }
    )
```


```ts
NextResponse.json(
        { success: false, error: 'Refresh failed. The refresh token may have expired.' },
        { status: 401 }
      )
```


```ts
NextResponse.json({ success: true, ...(data as object) })
```


```ts
NextResponse.json(
      { success: false, error: 'Could not reach SchoolSoft. Try again later.' },
      { status: 502 }
    )
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls


```ts
fetch(refreshUrl, {
      signal: AbortSignal.timeout(8_000),
      method: 'POST',
      headers: { accept: 'application/json' },
    })
```

