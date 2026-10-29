# /api/conversations

GET lists the latest fifty member conversations. POST reopens/creates a DM or creates a group with profile snapshots. New DMs require friendship; existing DMs can reopen after unfriending. Groups require another existing member, cap membership at fifty, and make the creator admin. The stored dmPrivacy field is not checked by this route.

[Domain guide](../social.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/conversations/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/conversations/route.ts#L1). Source SHA-256: `a3facd39e9a5418a5d68a4eee75b9370389ca1a0a995181aaba3a3488d4851f0`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/friendsDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/friendsDb.ts#L1): `{ areFriends }`
- [@/app/api/lib/messagingDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/messagingDb.ts#L1): `{ createGroupChat, findOrCreateDM, getConversationsForUser, }`
- [@/app/api/lib/profileDb](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/profileDb.ts#L1): `{ getProfile }`
- [@/app/api/lib/requestBody](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/requestBody.ts#L1): `{ readRouteBody }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ requireSession }`
- [@/app/api/lib/statsHelper](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/statsHelper.ts#L1): `{ trackConversationCreated }`

## GET /api/conversations

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/conversations/route.ts#L16).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X GET \
  'http://localhost:3000/api/conversations'
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
NextResponse.json({ success: true, conversations })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.

## POST /api/conversations

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/conversations/route.ts#L29).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  -H 'Content-Type: application/json' \
  --data '{"type":"dm","targetUsername":"12346"}' \
  'http://localhost:3000/api/conversations'
```

### Source contract

#### Request reads


```ts
readRouteBody(req)
```


#### Parsed body and local type


```ts
const body = (await readRouteBody(req)) as {
    type?: string;
    targetUsername?: string;
    groupName?: string;
    groupDescription?: string;
    encrypted?: boolean;
    members?: string[];
  };
```


#### Response branches


```ts
NextResponse.json({ success: false, error: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json(
        { success: false, error: 'Group name is required.' },
        { status: 400 }
      )
```


```ts
NextResponse.json(
        { success: false, error: 'Add at least one other member.' },
        { status: 400 }
      )
```


```ts
NextResponse.json({ error: 'One or more members were not found.' }, { status: 404 })
```


```ts
NextResponse.json({ success: true, conversation })
```


```ts
NextResponse.json({ success: false, error: 'Invalid target user.' }, { status: 400 })
```


```ts
NextResponse.json({ success: false, error: 'User not found.' }, { status: 404 })
```


```ts
NextResponse.json(
        {
          success: false,
          error:
            'You must be friends to start a new direct message. Send them a friend request first.',
          needsFriend: true,
        },
        { status: 403 }
      )
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls

No direct upstream call in this handler. Imported/local helpers may perform network or database work.
