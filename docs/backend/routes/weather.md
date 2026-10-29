# /api/weather

Public current weather by city or numeric lat/lon. Coordinates win when both are supplied, but supplied city is still validated. Use Open-Meteo geocoding/forecast, optional Nominatim reverse lookup, rounded weather metrics, WMO condition mapping, and Unix-second times. Reverse lookup failure falls back to Your location; forecast/geocode failures return 502.

[Domain guide](../integrations.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/weather/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/weather/route.ts#L1). Source SHA-256: `134574916f3fa037dbafa98419bbe763bae524a1c227ad1d7df83a126cd257e5`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`

## GET /api/weather

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/weather/route.ts#L145).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/weather?city=Halmstad'
```

### Source contract

#### Request reads


```ts
searchParams.get('lat')
```


```ts
searchParams.get('lon')
```


```ts
searchParams.get('city')
```


#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json({ error: 'Invalid coordinates.' }, { status: 400 })
```


```ts
NextResponse.json({ error: 'Invalid city.' }, { status: 400 })
```


```ts
NextResponse.json({ error: 'Provide lat/lon or city' }, { status: 400 })
```


```ts
NextResponse.json({ success: true, data })
```


```ts
NextResponse.json({ error: message }, { status: 502 })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## Local helper behavior

The route also uses these local functions. Imported persistence and authentication behavior is described in the domain guide.

### wmoToCondition

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/weather/route.ts#L26).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls

No direct upstream call.

### geocodeCity

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/weather/route.ts#L61).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls


```ts
fetch(url, { signal: AbortSignal.timeout(8_000), next: { revalidate: 86400 } })
```


### fetchWeatherForCoords

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/weather/route.ts#L85).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls


```ts
fetch(url, { signal: AbortSignal.timeout(8_000), next: { revalidate: 300 } })
```


### reverseGeocode

[Implementation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/weather/route.ts#L120).

#### Response branches

No direct HTTP response; this helper transforms or fetches data.

#### Upstream calls


```ts
fetch(url, {
      signal: AbortSignal.timeout(8_000),
      headers: { 'User-Agent': 'SchoolSoftPlus/1.0' },
      next: { revalidate: 86400 },
    })
```

