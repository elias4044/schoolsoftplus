# /api/auth/session

Bridge a SchoolSoft access token in x-ss-token into browser-session material, then verify canonical identity through /rest-api/session. Return cookie values and the upstream Cookie header in JSON without setting SSP cookies. Username hints are not trusted as identity. Missing token is 400 and absent browser cookies are 502.

[Domain guide](../authentication.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/auth/session/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/session/route.ts#L1). Source SHA-256: `42ff23dccf451482ddeb79e411ecc3ed06d47da93e9f0cc9c072c4de937cb17e`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/identity](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/identity.ts#L1): `{ normalizeUserId }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ createSchoolsoftClient }`

## GET /api/auth/session

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/session/route.ts#L12).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  -H 'x-ss-token: EXAMPLE_SCHOOLSOFT_ACCESS_TOKEN' \
  -H 'x-school: engelska' \
  -H 'x-orgid: 18' \
  'http://localhost:3000/api/auth/session'
```

### Source contract

#### Request reads


```ts
req.headers.get('x-ss-token')
```


```ts
req.headers.get('x-school')
```


```ts
req.headers.get('x-userid')
```


```ts
req.headers.get('x-username')
```


```ts
req.headers.get('x-orgid')
```


```ts
req.headers.get('x-language')
```


```ts
req.headers.get('x-theme')
```


```ts
req.headers.get('x-useros')
```


```ts
req.headers.get('x-redirect-url')
```


#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json(
      { success: false, error: 'x-ss-token header is required.' },
      { status: 400 }
    )
```


```ts
NextResponse.json(
        { success: false, error: 'SchoolSoft did not return any session cookies.' },
        { status: 502 }
      )
```


```ts
NextResponse.json(
      { success: false, error: 'Could not reach SchoolSoft. Try again later.' },
      { status: 502 }
    )
```


```ts
NextResponse.json(
      {
        success: false,
        error: 'SchoolSoft did not return a valid session (missing JSESSIONID or hash).',
      },
      { status: 502 }
    )
```


```ts
NextResponse.json({ error: 'Account verification failed.' }, { status: 401 })
```


```ts
NextResponse.json({
    success: true,
    school,
    username: data.user.userName.toLowerCase(),
    userId: verifiedId,
    ssp_jsessionid: jsessionid,
    ssp_hash: hash,
    ssp_usertype: usertype,
    cookieHeader: `JSESSIONID=${jsessionid}; hash=${hash}; usertype=${usertype}`,
  })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls


```ts
axios.get(sessionUrl, {
      timeout: 8_000,
      signal: AbortSignal.timeout(8_000),
      headers: {
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'User-Agent': 'nyEva',
        'X-Requested-With': 'com.schoolsoft.eapp.android',
        token: ssToken,
        orgid: orgid,
        redirecturl: redirectUrl,
        language: language,
        theme: theme,
        useros: useros,
        ...(userId ? { userid: userId } : {}),
      },
      maxRedirects: 0,
      validateStatus: () => true,
    })
```


```ts
createSchoolsoftClient(school).get('/rest-api/session', {
    headers: { Cookie: `JSESSIONID=${jsessionid}; hash=${hash}; usertype=${usertype}` },
    responseType: 'json',
  })
```

