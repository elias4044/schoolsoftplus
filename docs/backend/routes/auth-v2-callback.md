# /api/auth/v2/callback

Validate callback state against the PKCE cookie, exchange code, verify identity, migrate the account, synchronize passkey token material, attempt browser-session creation, and redirect to /dashboard?init with cookies. Expected OAuth failures redirect to login with authv2_error. No referral credit is performed here. The example requires a genuine pending initiation cookie.

[Domain guide](../authentication.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/auth/v2/callback/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/v2/callback/route.ts#L1). Source SHA-256: `0a7d08bed153ef2f6ea2219c815b534c146d134f4c8a6eda5d2f01e7e494f6d5`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/loginStats](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/loginStats.ts#L1): `{ recordLogin }`
- [@/app/api/lib/mobileAuth](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/mobileAuth.ts#L1): `{ exchangeCodeForToken, fetchSchoolsoftSession }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/statsHelper](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/statsHelper.ts#L1): `{ trackLoginEvent }`

## GET /api/auth/v2/callback

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/auth/v2/callback/route.ts#L25).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/auth/v2/callback?code=EXAMPLE_CODE&state=EXAMPLE_STATE'
```

### Source contract

#### Request reads


```ts
searchParams.get('code')
```


```ts
searchParams.get('state')
```


```ts
searchParams.get('error')
```


```ts
req.cookies.get('ssp_v2_pkce')
```


#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.redirect(new URL(`/login?authv2_error=${msg}`, req.url))
```


```ts
NextResponse.redirect(
      new URL(
        '/login?authv2_error=' + encodeURIComponent('Session expired. Please try again.'),
        req.url
      )
    )
```


```ts
NextResponse.redirect(
      new URL(
        '/login?authv2_error=' + encodeURIComponent('Invalid session data. Please try again.'),
        req.url
      )
    )
```


```ts
NextResponse.redirect(
      new URL(
        '/login?authv2_error=' + encodeURIComponent('State mismatch. Please try again.'),
        req.url
      )
    )
```


```ts
NextResponse.redirect(
      new URL(
        '/login?authv2_error=' + encodeURIComponent('Token exchange failed. Please try again.'),
        req.url
      )
    )
```


```ts
NextResponse.redirect(
      new URL(
        '/login?authv2_error=' + encodeURIComponent('No access token returned. Please try again.'),
        req.url
      )
    )
```


```ts
NextResponse.redirect(
      new URL('/login?authv2_error=Account%20verification%20failed', req.url)
    )
```


```ts
NextResponse.redirect(new URL('/dashboard?init', req.url))
```


#### Cookie writes


```ts
res.cookies.set('ssp_v2_pkce', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
```


```ts
res.cookies.set('ssp_jsessionid', jsessionid, sessionCookieOpts)
```


```ts
res.cookies.set('ssp_hash', hash, sessionCookieOpts)
```


```ts
res.cookies.set('ssp_usertype', usertype, sessionCookieOpts)
```


```ts
res.cookies.set('ssp_school', school, {
    ...sessionCookieOpts,
    httpOnly: false,
  })
```


```ts
res.cookies.set('ssp_username', username, {
    ...sessionCookieOpts,
    httpOnly: false,
  })
```


```ts
res.cookies.set('ssp_ss_token', ssToken, {
    ...sessionCookieOpts,
    maxAge: 60 * 60 * 24 * 30,
  })
```


```ts
res.cookies.set('ssp_ss_token_expires', String(ssTokenExpiresAt), {
    ...sessionCookieOpts,
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  })
```


```ts
res.cookies.set('ssp_ss_refresh_token', refreshToken, {
      ...sessionCookieOpts,
      maxAge: 60 * 60 * 24 * 30,
    })
```


```ts
res.cookies.set('ssp_auth_type', 'authv2', {
    ...sessionCookieOpts,
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  })
```


```ts
res.cookies.set('ssp_ss_orgid', orgid, {
    ...sessionCookieOpts,
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  })
```


```ts
res.cookies.set('ssp_userid', userId, {
    ...sessionCookieOpts,
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  })
```


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
        orgid,
        redirecturl: redirectUrl,
        language: 'sw',
        theme: 'dark',
        useros: 'android',
        ...(userId ? { userid: userId } : {}),
      },
      maxRedirects: 0,
      validateStatus: () => true,
    })
```

