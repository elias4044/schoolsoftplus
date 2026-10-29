# /api/referrals/leaderboard

Public top-referrer list with integer limit 1-50, default twenty. Query only positive totals descending, assign sequential ranks, and enrich display/picture/school fields. Missing profiles use ID/empty fallbacks; DB failures are 500.

[Domain guide](../integrations.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/referrals/leaderboard/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/referrals/leaderboard/route.ts#L1). Source SHA-256: `d423198e935101941e0c533a62eec163019ff33bcee0b5bb4436b02d43d74178`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/profileDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/profileDb.ts#L1): `{ getProfile }`
- [@/app/api/lib/referralDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/referralDb.ts#L1): `{ getLeaderboard }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`

## GET /api/referrals/leaderboard

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/referrals/leaderboard/route.ts#L11).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/referrals/leaderboard?limit=20'
```

### Source contract

#### Request reads


```ts
searchParams.get('limit')
```


#### Parsed body and local type

No direct body declaration. See shared helpers for delegated parsing.

#### Response branches


```ts
NextResponse.json({ error: 'limit must be between 1 and 50.' }, { status: 400 })
```


```ts
NextResponse.json({ success: true, data: enriched })
```


```ts
NextResponse.json(
      { success: false, error: 'Failed to load leaderboard.' },
      { status: 500 }
    )
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
