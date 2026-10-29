# /api/ai/note

Run one supported writing action on supplied note content or selection, returning text without saving the note. Selection is used only by actions whose prompt supports it. Require nonempty content or selection and a configured Gemini key. Limit twenty attempts per user per minute per instance. Empty provider text is an error.

[Domain guide](../integrations.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/ai/note/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/ai/note/route.ts#L1). Source SHA-256: `03ea678c7ef434b4abda906f6e51351fe48bc1fc0a51e0a6bd6a10187c67d2be`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/rateLimit](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/rateLimit.ts#L1): `{ enforceRateLimit }`
- [@/app/api/lib/requestBody](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/requestBody.ts#L1): `{ readRouteBody }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ requireSession }`

## POST /api/ai/note

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/ai/note/route.ts#L80).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  -H 'Content-Type: application/json' \
  --data '{"action":"summarize","content":"Cells contain structures with different functions.","title":"Biology"}' \
  'http://localhost:3000/api/ai/note'
```

### Source contract

#### Request reads


```ts
readRouteBody(req)
```


#### Parsed body and local type


```ts
const body = (await readRouteBody(req)) as {
    action?: string;
    content?: string;
    selection?: string;
    title?: string;
  };
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
      {
        success: false,
        message: `Invalid action. Valid: ${Object.keys(ACTION_PROMPTS).join(', ')}`,
      },
      { status: 400 }
    )
```


```ts
NextResponse.json(
      { success: false, message: 'Note content is empty.' },
      { status: 400 }
    )
```


```ts
NextResponse.json(
        { success: false, message: 'No response from AI.' },
        { status: 500 }
      )
```


```ts
NextResponse.json({ success: true, result: text, action })
```


```ts
NextResponse.json(
      { success: false, message: 'AI request failed.', error: (err as Error).message },
      { status: 500 }
    )
```


#### Cookie writes

No direct cookie writes. Shared authentication/wrapper helpers can still set recovered session cookies.

#### Direct upstream calls


```ts
genAI.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction:
          'You are a precise writing assistant. Follow instructions exactly. ' +
          'Never add preambles, explanations, or meta-commentary. Return only what was asked for.',
      },
    })
```

