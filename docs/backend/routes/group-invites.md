# /api/group-invites

List pending invites, send/reuse an admin-created invite to an existing nonmember, or accept/decline an owned pending invite. accept is required on PATCH. Acceptance checks original inviter still participates and group capacity, then joins/resolves atomically. The route catches response-helper failures as 400.

[Domain guide](../social.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/group-invites/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/group-invites/route.ts#L1). Source SHA-256: `702bda3b1d6d9fea7c1c462fab6764dc82586da9efdfb42e6d9baaa286e97cf4`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/groupInvitesDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/groupInvitesDb.ts#L1): `{ getPendingInvitesForUser, respondToGroupInvite, sendGroupInvite, }`
- [@/app/api/lib/requestBody](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/requestBody.ts#L1): `{ readRouteBody }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ requireSession }`

## GET /api/group-invites

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/group-invites/route.ts#L13).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/group-invites'
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
NextResponse.json({ success: true, invites })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## POST /api/group-invites

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/group-invites/route.ts#L25).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  -H 'Content-Type: application/json' \
  --data '{"conversationId":"example-conversation-id","targetUsername":"12346"}' \
  'http://localhost:3000/api/group-invites'
```

### Source contract

#### Request reads


```ts
readRouteBody(req)
```


#### Parsed body and local type


```ts
const body = (await readRouteBody(req)) as { conversationId?: string; targetUsername?: string };
```


#### Response branches


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json({ success: false, error: 'Missing fields.' }, { status: 400 })
```


```ts
NextResponse.json(
      {
        success: false,
        error:
          'Could not send invite. Ensure you are the admin and the user is not already a member.',
      },
      { status: 400 }
    )
```


```ts
NextResponse.json({ success: true, invite })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## PATCH /api/group-invites

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/group-invites/route.ts#L54).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X PATCH \
  -H 'Content-Type: application/json' \
  --data '{"inviteId":"example-invite-id","accept":true}' \
  'http://localhost:3000/api/group-invites'
```

### Source contract

#### Request reads


```ts
readRouteBody(req)
```


#### Parsed body and local type


```ts
const body = (await readRouteBody(req)) as { inviteId?: string; accept?: boolean };
```


#### Response branches


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json({ success: false, error: 'Missing inviteId.' }, { status: 400 })
```


```ts
NextResponse.json({ success: true, ...result })
```


```ts
NextResponse.json({ success: false, error: message }, { status: 400 })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
