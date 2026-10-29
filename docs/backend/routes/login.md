# /api/login

Classic browser login: post credentials to SchoolSoft JSP, require 302 and JSESSIONID/hash, verify canonical account through session REST, migrate, record login, optionally credit a first-login referral, set seven-day classic cookies, and clear old AuthV2/referral cookies. Return canonical userId. x-school selects the school.

[Domain guide](../authentication.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/login/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/login/route.ts#L1). Source SHA-256: `124d96e5fcfb4a7976c318d31cd9c866723ba7c35895113976a5b000d74e94a3`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/identity](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/identity.ts#L1): `{ assertSchool, normalizeUserId }`
- [@/app/api/lib/loginStats](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/loginStats.ts#L1): `{ recordLogin }`
- [@/app/api/lib/referralDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/referralDb.ts#L1): `{ creditReferral, getUserIdByCode }`
- [@/app/api/lib/requestBody](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/requestBody.ts#L1): `{ readRouteBody }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ createSchoolsoftClient }`
- [@/app/api/lib/statsHelper](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/statsHelper.ts#L1): `{ trackLoginEvent }`

## POST /api/login

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/login/route.ts#L12).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  -H 'x-school: engelska' \
  -H 'Content-Type: application/json' \
  --data '{"username":"student.example","password":"example-password","usertype":"1"}' \
  'http://localhost:3000/api/login'
```

### Source contract

#### Request reads


```ts
readRouteBody(req)
```


```ts
req.headers.get('x-school')
```


```ts
req.cookies.get('ssp_ref')
```


#### Parsed body and local type


```ts
const body = await readRouteBody(req);
```


#### Response branches


```ts
NextResponse.json(
      { success: false, message: 'Username and password are required.' },
      { status: 400 }
    )
```


```ts
NextResponse.json(
      { success: false, message: 'Login failed. Check your credentials.' },
      { status: 401 }
    )
```


```ts
NextResponse.json({ success: false, message: 'Login failed.' }, { status: 401 })
```


```ts
NextResponse.json(
      { success: false, message: 'Account verification failed.' },
      { status: 401 }
    )
```


```ts
NextResponse.json({ success: true, userId })
```


#### Cookie writes


```ts
response.cookies.set('ssp_jsessionid', jsessionid, options)
```


```ts
response.cookies.set('ssp_hash', hash, options)
```


```ts
response.cookies.set('ssp_usertype', usertype, options)
```


```ts
response.cookies.set('ssp_userid', userId, options)
```


```ts
response.cookies.set('ssp_ss_orgid', String(data.organization?.id ?? ''), options)
```


```ts
response.cookies.set('ssp_school', school, { ...options, httpOnly: false })
```


```ts
response.cookies.set('ssp_username', data.user.userName.toLowerCase(), {
    ...options,
    httpOnly: false,
  })
```


```ts
response.cookies.set(name, '', { ...options, maxAge: 0 })
```


#### Direct upstream calls


```ts
axios.post(loginUrl, form.toString(), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'Mozilla/5.0',
      Referer: loginUrl,
    },
    timeout: 8_000,
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

