# /api/referrals

Get or transactionally reserve the current user's eight-character referral code, then enrich referred account IDs with profile display data. GET can create database records. Reservation retries code collisions up to ten times; identity and referral timestamps remain separate.

[Domain guide](../integrations.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/referrals/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/referrals/route.ts#L1). Source SHA-256: `d1925b82f60decbc57f1f332e85f55c21cec4227c61e6b10f24773406382c114`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/profileDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/profileDb.ts#L1): `{ getProfile }`
- [@/app/api/lib/referralDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/referralDb.ts#L1): `{ getOrCreateReferralCode }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ applySessionCookieUpdates, requireSession }`

## GET /api/referrals

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/referrals/route.ts#L13).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/referrals'
```

### Source contract

#### Request reads

No request headers, query values, cookies, or body reader is called directly in this handler. Authentication helpers can still read cookies.

#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json({
      success: true,
      data: {
        ...data,
        referredUsers: enriched,
      },
    })
```


```ts
NextResponse.json(
      { success: false, error: 'Failed to load referral data.' },
      { status: 500 }
    )
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
