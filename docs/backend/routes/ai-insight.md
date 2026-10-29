# /api/ai/insight

Generate an insight using the caller's system prompt and optional parallel SchoolSoft data sources. Failed data sources become unavailable markers. Assignments require week and year; lunch requires week; schedule uses today's UTC date. Return text without saving it and increment the insight AI metric. Limit twelve attempts per user per minute per instance.

[Domain guide](../integrations.md) | [Common validation and errors](../architecture.md) | [All routes](README.md)

Implementation: [app/api/ai/insight/route.ts](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/ai/insight/route.ts#L1). Source SHA-256: `77e8c146ac2d3956b88481381d0669cfb9a6abf05587b1be52a25e3f9d000a8a`.

The following expressions are extracted from executable source. They are not example response values. Conditional branches, local variables, and upstream payloads retain their source names; consult the guide for their meaning. Shared wrapper errors and validation apply in addition to the branches shown here. Non-ASCII characters in excerpts are escaped. Source links follow main and can move after this snapshot.

## Dependencies

- [@/app/api/lib/rateLimit](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/rateLimit.ts#L1): `{ enforceRateLimit }`
- [@/app/api/lib/requestBody](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/requestBody.ts#L1): `{ readRouteBody }`
- [@/app/api/lib/routeValidation](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/routeValidation.ts#L1): `{ withValidation }`
- [@/app/api/lib/schoolsoft](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/schoolsoft.ts#L1): `{ createSchoolsoftClient, decodeHtmlResponse, requireSession, }`
- [@/app/api/lib/statsHelper](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/lib/statsHelper.ts#L1): `{ trackAiMessage }`

## POST /api/ai/insight

[Handler source](https://github.com/elias4044/schoolsoftplus/blob/main/app/api/ai/insight/route.ts#L20).

### Example request

Use a valid cookie jar from the documented login flow for protected operations. Placeholder resource IDs must be replaced. Public operations ignore an unrelated jar. WebAuthn and OAuth placeholders describe structure and require a real ceremony. Custom-proxy write examples require a real supported upstream path. These examples have not been sent to external services.

```sh
curl -i -b cookies.txt -c cookies.txt -X POST \
  -H 'Content-Type: application/json' \
  --data '{"systemPrompt":"Help me prepare for this school week.","fetchAssignments":true,"fetchLunch":true,"week":"44","year":"2026"}' \
  'http://localhost:3000/api/ai/insight'
```

### Source contract

#### Request reads


```ts
readRouteBody(req)
```


#### Parsed body and local type


```ts
const body = (await readRouteBody(req)) as {
    systemPrompt?: string;
    fetchAssignments?: boolean;
    fetchSchedule?: boolean;
    fetchLunch?: boolean;
    fetchNews?: boolean;
    week?: string;
    year?: string;
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
NextResponse.json({ success: false, message: 'Missing systemPrompt.' }, { status: 400 })
```


```ts
NextResponse.json({ success: true, data: text })
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
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      config: {
        systemInstruction:
          body.systemPrompt +
          ' Be concise. Use markdown bullet points where appropriate. Do not include preambles.',
      },
    })
```

