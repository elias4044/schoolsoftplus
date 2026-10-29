import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

import { enforceRateLimit } from '@/app/api/lib/rateLimit';
import { readRouteBody } from '@/app/api/lib/requestBody';
import { withValidation } from '@/app/api/lib/routeValidation';
import { requireSession } from '@/app/api/lib/schoolsoft';

// Valid AI note actions
export type NoteAiAction =
  | 'improve'
  | 'summarize'
  | 'grammar'
  | 'continue'
  | 'title'
  | 'formal'
  | 'casual'
  | 'bullets'
  | 'expand'
  | 'shorten'
  | 'explain';

const ACTION_PROMPTS: Record<NoteAiAction, (content: string, selection?: string) => string> = {
  improve: (content, sel) =>
    sel
      ? `Improve the writing quality of this selected text. Return ONLY the improved text, no explanations:\n\n${sel}`
      : `Improve the writing quality of this note. Return ONLY the improved note text (preserve markdown formatting), no explanations:\n\n${content}`,

  summarize: (content) =>
    `Write a concise 2-4 sentence summary of this note. Return ONLY the summary:\n\n${content}`,

  grammar: (content, sel) =>
    sel
      ? `Fix all grammar, spelling and punctuation errors in this text. Return ONLY the corrected text:\n\n${sel}`
      : `Fix all grammar, spelling and punctuation errors in this note. Return ONLY the corrected note (preserve markdown formatting):\n\n${content}`,

  continue: (content) =>
    `Continue writing this note naturally from where it left off. Add 1-3 paragraphs. Return ONLY the continuation text to append (do not repeat existing content):\n\n${content}`,

  title: (content) =>
    `Suggest a short, clear title for this note (max 8 words). Return ONLY the title text, no quotes:\n\n${content}`,

  formal: (content, sel) =>
    sel
      ? `Rewrite this text in a more formal, professional tone. Return ONLY the rewritten text:\n\n${sel}`
      : `Rewrite this entire note in a more formal, professional tone. Return ONLY the rewritten note (preserve markdown formatting):\n\n${content}`,

  casual: (content, sel) =>
    sel
      ? `Rewrite this text in a more casual, friendly tone. Return ONLY the rewritten text:\n\n${sel}`
      : `Rewrite this entire note in a more casual, friendly tone. Return ONLY the rewritten note (preserve markdown formatting):\n\n${content}`,

  bullets: (content, sel) =>
    sel
      ? `Extract the key points from this text as a markdown bullet list. Return ONLY the bullet list:\n\n${sel}`
      : `Extract all key points from this note as a concise markdown bullet list. Return ONLY the bullet list:\n\n${content}`,

  expand: (content, sel) =>
    sel
      ? `Expand on this text with more detail and explanation. Return ONLY the expanded text:\n\n${sel}`
      : `Expand this note with more detail and context. Return ONLY the expanded note (preserve markdown formatting):\n\n${content}`,

  shorten: (content, sel) =>
    sel
      ? `Shorten this text while keeping the key information. Return ONLY the shortened text:\n\n${sel}`
      : `Shorten this note while keeping the essential information. Return ONLY the shortened note (preserve markdown formatting):\n\n${content}`,

  explain: (content, sel) =>
    sel
      ? `Explain what this text means in simple terms. Return ONLY the explanation:\n\n${sel}`
      : `Explain the main concepts in this note in simple, easy-to-understand terms. Return ONLY the explanation:\n\n${content}`,
};

// Rate limiting

// ---------------------------------------------------------------------------
// POST /api/ai/note
// Body: { action, content, selection?, title? }
// ---------------------------------------------------------------------------
export const POST = withValidation(async function POST(req: NextRequest) {
  // Rate limiting
  const sess = await requireSession(req);
  if (!sess) {
    return NextResponse.json({ success: false, message: 'Not authenticated.' }, { status: 401 });
  }

  enforceRateLimit('ai:note:' + sess.userId, 20);

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ success: false, message: 'AI is not configured.' }, { status: 503 });
  }

  // Parse body
  const body = (await readRouteBody(req)) as {
    action?: string;
    content?: string;
    selection?: string;
    title?: string;
  };

  const { action, content = '', selection, title } = body;

  if (!action || !Object.hasOwn(ACTION_PROMPTS, action)) {
    return NextResponse.json(
      {
        success: false,
        message: `Invalid action. Valid: ${Object.keys(ACTION_PROMPTS).join(', ')}`,
      },
      { status: 400 }
    );
  }

  if (!content && !selection) {
    return NextResponse.json(
      { success: false, message: 'Note content is empty.' },
      { status: 400 }
    );
  }

  // Build full context for the model
  const contextNote = title ? `Title: ${title}\n\nContent:\n${content}` : content;
  const prompt = ACTION_PROMPTS[action as NoteAiAction](contextNote, selection);

  try {
    const genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: { timeout: 30_000 },
    });

    const result = await genAI.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction:
          'You are a precise writing assistant. Follow instructions exactly. ' +
          'Never add preambles, explanations, or meta-commentary. Return only what was asked for.',
      },
    });

    const parts = result.candidates?.[0]?.content?.parts ?? [];
    const text = parts.find((p) => p.text)?.text?.trim() ?? '';

    if (!text) {
      return NextResponse.json(
        { success: false, message: 'No response from AI.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, result: text, action });
  } catch (err) {
    console.error('[ai/note] Error:', (err as Error).message);
    return NextResponse.json(
      { success: false, message: 'AI request failed.', error: (err as Error).message },
      { status: 500 }
    );
  }
});
