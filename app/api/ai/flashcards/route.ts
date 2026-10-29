import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

import { enforceRateLimit } from '@/app/api/lib/rateLimit';
import { readRouteBody } from '@/app/api/lib/requestBody';
import { withValidation } from '@/app/api/lib/routeValidation';
import { requireSession } from '@/app/api/lib/schoolsoft';

// Rate limiting

/** POST /api/ai/flashcards — generate flashcard Q&A pairs from source text */
export const POST = withValidation(async function POST(req: NextRequest) {
  // Rate limiting
  const sess = await requireSession(req);
  if (!sess)
    return NextResponse.json({ success: false, message: 'Not authenticated.' }, { status: 401 });

  enforceRateLimit('ai:flashcards:' + sess.userId, 8);

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ success: false, message: 'AI is not configured.' }, { status: 503 });
  }

  const body = (await readRouteBody(req)) as { text?: string; count?: number; language?: string };

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text || text.length < 20) {
    return NextResponse.json(
      { success: false, message: 'text must be at least 20 characters.' },
      { status: 400 }
    );
  }
  if (text.length > 20_000) {
    return NextResponse.json(
      { success: false, message: 'text is too long (max 20 000 characters).' },
      { status: 400 }
    );
  }

  const count = Math.min(
    30,
    Math.max(3, typeof body.count === 'number' ? Math.floor(body.count) : 10)
  );
  const language =
    typeof body.language === 'string'
      ? body.language.slice(0, 20)
      : 'the same language as the source text';

  const prompt = `You are a study assistant. Create ${count} flashcard question-answer pairs from the text below.

Rules:
- Each card must have a clear, concise question on the "front" and a direct answer on the "back".
- Optionally add a short memory hint (1 sentence max) in "hint".
- Cover the most important facts, concepts, definitions, and relationships in the text.
- Avoid trivial or duplicate questions.
- Respond in ${language}.
- Return ONLY valid JSON — an array of objects with keys: "front", "back", "hint".
- No markdown fences, no extra text, just the raw JSON array.

Example output:
[{"front":"What is photosynthesis?","back":"The process by which plants convert sunlight, water, and CO2 into glucose and oxygen.","hint":"Think: plants eating sunlight."}]

Source text:
${text}`;

  try {
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { timeout: 30_000 },
    });
    const result = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0.4, maxOutputTokens: 4096 },
    });
    const raw = result.text?.trim() ?? '';

    // Strip optional markdown fences
    const jsonStr = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    let cards: { front: string; back: string; hint?: string }[];
    try {
      cards = JSON.parse(jsonStr);
    } catch {
      return NextResponse.json(
        { success: false, message: 'AI returned unparseable output. Try again.' },
        { status: 502 }
      );
    }

    if (!Array.isArray(cards)) {
      return NextResponse.json(
        { success: false, message: 'AI returned unexpected format.' },
        { status: 502 }
      );
    }

    // Sanitise
    const clean = cards
      .filter(
        (c) =>
          c && typeof c === 'object' && typeof c.front === 'string' && typeof c.back === 'string'
      )
      .map((c) => ({
        front: c.front.trim().slice(0, 2000),
        back: c.back.trim().slice(0, 2000),
        hint: typeof c.hint === 'string' ? c.hint.trim().slice(0, 500) : '',
        tags: [] as string[],
      }))
      .slice(0, 30);

    return NextResponse.json({ success: true, cards: clean });
  } catch (err) {
    console.error('[ai/flashcards] Gemini error:', (err as Error).message);
    return NextResponse.json({ success: false, message: 'AI generation failed.' }, { status: 500 });
  }
});
