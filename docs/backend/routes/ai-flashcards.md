# /api/ai/flashcards

Generate unsaved study cards from source text. Requires verified cookies, an instance-local eight-per-minute user window, and Gemini configuration. Validate 20-20,000 trimmed source characters, clamp requested count to 3-30, parse the model JSON array, and filter/truncate cards. Invalid model syntax or shape is 502; an empty filtered array can still succeed.

[Domain guide](../integrations.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/ai/flashcards/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/ai/flashcards/route.ts#L1). Source SHA-256: `3786a9874689c5305f02d8fafa97d7bd0b05b71442d66487fdd993b5b86cfa00`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/rateLimit](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/rateLimit.ts#L1): `{ enforceRateLimit }`
- [@/app/api/lib/requestBody](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/requestBody.ts#L1): `{ readRouteBody }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ requireSession }`

## POST /api/ai/flashcards

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/ai/flashcards/route.ts#L12).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  -H 'Content-Type: application/json' \
  --data '{"text":"The nucleus contains DNA and controls many activities of the cell.","count":5,"language":"English"}' \
  'http://localhost:3000/api/ai/flashcards'
```

### Source contract

#### Request reads


```ts
readRouteBody(req)
```


#### Parsed body and local type


```ts
const body = (await readRouteBody(req)) as { text?: string; count?: number; language?: string };
```


#### Response branches


```ts
NextResponse.json({ success: false, message: 'Not authenticated.' }, { status: 401 })
```


```ts
NextResponse.json({ success: false, message: 'AI is not configured.' }, { status: 503 })
```


```ts
NextResponse.json(
      { success: false, message: 'text must be at least 20 characters.' },
      { status: 400 }
    )
```


```ts
NextResponse.json(
      { success: false, message: 'text is too long (max 20 000 characters).' },
      { status: 400 }
    )
```


```ts
NextResponse.json(
        { success: false, message: 'AI returned unparseable output. Try again.' },
        { status: 502 }
      )
```


```ts
NextResponse.json(
        { success: false, message: 'AI returned unexpected format.' },
        { status: 502 }
      )
```


```ts
NextResponse.json({ success: true, cards: clean })
```


```ts
NextResponse.json({ success: false, message: 'AI generation failed.' }, { status: 500 })
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls


```ts
ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.4, maxOutputTokens: 4096 },
    })
```

