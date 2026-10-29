# /api/logout

Expire SSP classic/AuthV2/PKCE/passkey challenge cookies and return success without requiring a session or body. It does not revoke SchoolSoft tokens, delete passkeys, clear the referral cookie, or perform Firebase client sign-out.

[Domain guide](../authentication.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/logout/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/logout/route.ts#L1). Source SHA-256: `dafbf59c8d1cf80608fe6f1be0ca321788f803c90edb06920c469c4be3701bfd`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`

## POST /api/logout

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/logout/route.ts#L7).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  'http://localhost:3000/api/logout'
```

### Source contract

#### Request reads

No request headers, query values, cookies, or body reader is called directly in this handler. Authentication helpers can still read cookies.

#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json({ success: true })
```


#### Cookie writes


```ts
res.cookies.set('ssp_jsessionid', '', expired)
```


```ts
res.cookies.set('ssp_hash', '', expired)
```


```ts
res.cookies.set('ssp_usertype', '', expired)
```


```ts
res.cookies.set('ssp_userid', '', expired)
```


```ts
res.cookies.set('ssp_pk_challenge_id', '', expired)
```


```ts
res.cookies.set('ssp_pk_auth_challenge_id', '', expired)
```


```ts
res.cookies.set('ssp_school', '', { ...expired, httpOnly: false })
```


```ts
res.cookies.set('ssp_username', '', { ...expired, httpOnly: false })
```


```ts
res.cookies.set('ssp_ss_token', '', expired)
```


```ts
res.cookies.set('ssp_ss_refresh_token', '', expired)
```


```ts
res.cookies.set('ssp_ss_token_expires', '', { ...expired, httpOnly: false })
```


```ts
res.cookies.set('ssp_auth_type', '', { ...expired, httpOnly: false })
```


```ts
res.cookies.set('ssp_ss_orgid', '', { ...expired, httpOnly: false })
```


```ts
res.cookies.set('ssp_v2_pkce', '', expired)
```


#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
