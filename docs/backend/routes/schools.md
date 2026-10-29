# /api/schools

Public SchoolSoft school-list discovery. Extract slugs from evaUrl, trim/sort names with Swedish locale, cache for one hour per process, and supply explicit public response caching on fresh success. A failed upstream fetch can return stale process data with stale=true; no cache means 502.

[Domain guide](../schoolsoft-data.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/schools/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/schools/route.ts#L1). Source SHA-256: `893e05e936b535f5d6604547465211e52ac607607d8310f2e1c5f8f54c905173`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`

## GET /api/schools

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/schools/route.ts#L35).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/schools'
```

### Source contract

#### Request reads

No request headers, query values, cookies, or body reader is called directly in this handler. Authentication helpers can still read cookies.

#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json(
      { success: true, schools: cachedSchools },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        },
      }
    )
```


```ts
NextResponse.json(
      { success: true, schools },
      {
        headers: {
          'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
        },
      }
    )
```


```ts
NextResponse.json({ success: true, schools: cachedSchools, stale: true })
```


```ts
NextResponse.json(
      { success: false, message: 'Could not load school list.' },
      { status: 502 }
    )
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls


```ts
axios.get<{ name: string; evaUrl: string }[]>(SCHOOLSOFT_LIST_URL, {
      signal: AbortSignal.timeout(8_000),
      maxRedirects: 0,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        Accept: 'application/json',
      },
      timeout: 10_000,
    })
```


## Local helper behavior

The route also uses these local functions. Imported persistence and authentication behavior is described in the domain guide.

### extractSlug

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/schools/route.ts#L21).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls

No direct upstream call.
