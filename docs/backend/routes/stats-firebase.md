# /api/stats/firebase

Public status from externally maintained service_status/firestore, not a live Monitoring API query. Missing/read-failed document is 503. A stored outage or RESOURCE_EXHAUSTED returns operational=false with HTTP 200. Missing usage maps default to zero and operational defaults true.

[Domain guide](../integrations.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/stats/firebase/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/stats/firebase/route.ts#L1). Source SHA-256: `0d175d1b50d03580e353579c905e9c3ed859bd228041f5b03663b2e02c29ba93`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`

## GET /api/stats/firebase

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/stats/firebase/route.ts#L13).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/stats/firebase'
```

### Source contract

#### Request reads

No request headers, query values, cookies, or body reader is called directly in this handler. Authentication helpers can still read cookies.

#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
new Response(
        JSON.stringify({
          operational: false,
          error: 'NOT_FOUND',
          message: 'Service status document not found.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
```


```ts
Response.json({
        operational: false,
        errorCode: 'RESOURCE_EXHAUSTED',
        today,
        month,
        limits,
        exceeded,
      })
```


```ts
Response.json({
        operational: false,
        error: data.error ?? 'SERVICE_DOWN',
        today,
        month,
        limits,
        exceeded,
      })
```


```ts
Response.json({ operational: true, today, month, limits, exceeded })
```


```ts
new Response(
      JSON.stringify({
        operational: false,
        error: code,
        message: 'Service status is unavailable.',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
