import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import * as cheerio from "cheerio";
import { authUser } from "@/app/api/lib/auth";
import { db } from "@/app/api/lib/firebaseAdmin";
import {
  createSchoolsoftClient,
  decodeHtmlResponse,
  getSessionCookies,
} from "@/app/api/lib/schoolsoft";
import { trackAiMessage } from "@/app/api/lib/statsHelper";

// -----------------------------------------------------------------------------
// Rate-limiting (in-memory — single instance only; use Redis for multi-server)
// -----------------------------------------------------------------------------
const rateLimitMap = new Map<string, number[]>();
const MAX_REQUESTS_PER_MINUTE = 8;
const MAX_MESSAGE_LENGTH = 1000;
const BLOCKED_WORDS: string[] = [];

// -----------------------------------------------------------------------------
// POST /api/ai
// Body: { message, history?, username? }
// Headers: cookies, x-school?
// -----------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  // -- Rate limiting -----------------------------------------------------------
  const ip =
    req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) ?? []).filter(
    (t) => now - t < 60_000
  );
  if (timestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    return NextResponse.json(
      { success: false, message: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }
  rateLimitMap.set(ip, [...timestamps, now]);

  // -- Input validation --------------------------------------------------------
  let body: { message?: string; history?: unknown[]; username?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { message, history = [], username } = body;

  if (!message || typeof message !== "string") {
    return NextResponse.json(
      { success: false, message: "Missing or invalid message." },
      { status: 400 }
    );
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json(
      {
        success: false,
        message: `Message too long. Keep under ${MAX_MESSAGE_LENGTH} characters.`,
      },
      { status: 413 }
    );
  }

  // -- Content moderation ------------------------------------------------------
  const lower = message.toLowerCase();
  if (BLOCKED_WORDS.some((w) => lower.includes(w))) {
    return NextResponse.json(
      { success: false, message: "Inappropriate content detected." },
      { status: 400 }
    );
  }

  // -- Auth --------------------------------------------------------------------
  const sess = getSessionCookies(req);
  if (!sess) {
    return NextResponse.json(
      { success: false, message: "Not authenticated." },
      { status: 401 }
    );
  }

  const { cookieString: cookies, school, username: cookieUsername } = sess;
  // Prefer explicitly-provided username from body, fall back to cookie
  const effectiveUsername = username ?? cookieUsername;

  if (!(await authUser(cookies, school))) {
    return NextResponse.json(
      { success: false, message: "Not authenticated." },
      { status: 401 }
    );
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { success: false, message: "AI is not configured." },
      { status: 503 }
    );
  }

  const schoolApi = createSchoolsoftClient(school);

  // -- Helper: fetch user data from Firestore ----------------------------------
  async function fetchUserData(
    uname: string,
    dataKey: "notes" | "goals"
  ): Promise<unknown> {
    try {
      const statsDoc = await db.collection("stats").doc("loginStats").get();
      if (!statsDoc.exists) return [];
      const user = (
        statsDoc.data()!.users as {
          username: string;
          data: Record<string, unknown>;
        }[]
      ).find((u) => u.username === uname.toLowerCase().trim());
      return user?.data[dataKey] ?? [];
    } catch {
      return [];
    }
  }

  try {
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // -- Tool declarations -----------------------------------------------------
    // Using unknown cast to avoid SDK version type mismatches while keeping
    // the runtime shape the Gemini API expects.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tools: any[] = [
      {
        functionDeclarations: [
          {
            name: "getUpcomingAssignments",
            description:
              "Fetch the student's upcoming assignments for a specific week and year.",
            parameters: {
              type: "OBJECT",
              properties: {
                week: { type: "STRING", description: "Week number, e.g. '44'" },
                year: { type: "STRING", description: "Year, e.g. '2025'" },
              },
              required: ["week", "year"],
            },
          },
          {
            name: "getLunchMenu",
            description: "Fetch the school lunch menu for a specific week.",
            parameters: {
              type: "OBJECT",
              properties: {
                week: { type: "STRING", description: "Week number, e.g. '44'" },
              },
              required: ["week"],
            },
          },
          {
            name: "getNews",
            description: "Fetch the latest news articles from the school start page.",
            parameters: { type: "OBJECT", properties: {} },
          },
          {
            name: "getNotes",
            description: "Fetch the user's personal notes.",
            parameters: {
              type: "OBJECT",
              properties: {
                username: {
                  type: "STRING",
                  description: "The username of the user.",
                },
              },
              required: ["username"],
            },
          },
          {
            name: "getGoals",
            description: "Fetch the user's personal goals.",
            parameters: {
              type: "OBJECT",
              properties: {
                username: {
                  type: "STRING",
                  description: "The username of the user.",
                },
              },
              required: ["username"],
            },
          },
        ],
      },
    ];

    const systemInstruction =
      `You're Schoolsoft+ AI, a smart assistant developed by Elias. ` +
      `Be helpful, concise, and friendly like a classmate. Use emojis sparingly. ` +
      `Refer to the user by their first name. For formal writing, be professional. ` +
      `Today's date is ${new Date().toLocaleDateString("sv-SE")}. ` +
      `User's username is '${effectiveUsername ?? "unknown"}'.`;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config: any = { tools, systemInstruction };
    const model = "gemini-2.5-flash-lite";

    // Build contents for the SDK
    type MsgPart = { role: string; parts: { text: string }[] };
    const contents: MsgPart[] = [
      { role: "user", parts: [{ text: message }] },
      ...(history as MsgPart[]).filter((h) => h.parts?.[0]?.text),
    ];

    // -- First model call ------------------------------------------------------
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (genAI.models as any).generateContent({
      model,
      contents,
      config,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const responseParts: any[] = result.candidates?.[0]?.content?.parts ?? [];
    const functionCalls = responseParts
      .filter((p) => p.functionCall?.name)
      .map((p) => p.functionCall as { name: string; args: Record<string, string> });

    // -- No tool calls — return text directly ---------------------------------
    if (!functionCalls.length) {
      const text =
        responseParts.find((p) => p.text)?.text ?? "Sorry, I didn't get a response.";
      return NextResponse.json({ success: true, data: text });
    }

    // -- Execute tool calls ----------------------------------------------------
    const modelResponseContent = result.candidates![0].content!;
    const toolResponseParts: unknown[] = [];

    for (const fc of functionCalls) {
      const { name, args } = fc;
      let toolResult: unknown;

      try {
        switch (name) {
          case "getUpcomingAssignments": {
            const r = await schoolApi.get(
              `/rest-api/student/ps/assignments/start-page?week=${args.week}&year=${args.year}`,
              { headers: { Cookie: cookies }, responseType: "json" }
            );
            toolResult = r.data;
            break;
          }
          case "getLunchMenu": {
            const r = await schoolApi.get(
              `/rest-api/lunchmenu/week/${args.week}`,
              { headers: { Cookie: cookies }, responseType: "json" }
            );
            toolResult = r.data;
            break;
          }
          case "getNews": {
            const r = await schoolApi.get(
              "/jsp/student/right_student_startpage.jsp",
              { headers: { Cookie: cookies }, responseType: "arraybuffer" }
            );
            const html = decodeHtmlResponse(r.data as Buffer);
            const $ = cheerio.load(html);
            toolResult = $("#news_con_content table tr")
              .map((_, el) => {
                const a = $(el).find("a.toplist-item");
                return a.length
                  ? {
                      title: a.find(".heading_bold").text().trim(),
                      preview: a.find("div").last().text().trim() || null,
                    }
                  : null;
              })
              .get()
              .filter(Boolean);
            break;
          }
          case "getNotes":
            toolResult = await fetchUserData(args.username, "notes");
            break;
          case "getGoals":
            toolResult = await fetchUserData(args.username, "goals");
            break;
          default:
            toolResult = { error: `Unknown tool: ${name}` };
        }
      } catch (e) {
        console.error(`[ai] Tool error '${name}':`, (e as Error).message);
        toolResult = { error: `Tool '${name}' failed: ${(e as Error).message}` };
      }

      toolResponseParts.push({
        functionResponse: { name, response: { content: toolResult } },
      });
    }

    // -- Second model call with tool results -----------------------------------
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result2 = await (genAI.models as any).generateContent({
      model,
      contents: [
        ...contents,
        modelResponseContent,
        { role: "tool", parts: toolResponseParts },
      ],
      config,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalParts: any[] = result2.candidates?.[0]?.content?.parts ?? [];
    const finalText =
      finalParts.find((p) => p.text)?.text ?? "Sorry, I didn't get a response.";

    trackAiMessage();
    return NextResponse.json({ success: true, data: finalText });
  } catch (err) {
    console.error("[ai] Error:", (err as Error).message);
    return NextResponse.json(
      {
        success: false,
        message: "AI request failed.",
        error: (err as Error).message,
      },
      { status: 500 }
    );
  }
}
