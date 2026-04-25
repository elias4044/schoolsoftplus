import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import * as cheerio from "cheerio";
import { authUser } from "@/app/api/lib/auth";
import {
  createSchoolsoftClient,
  decodeHtmlResponse,
  getSessionCookies,
} from "@/app/api/lib/schoolsoft";
import { trackAiMessage } from "@/app/api/lib/statsHelper";

// Rate limiting
const rateLimitMap = new Map<string, number[]>();
const MAX_REQUESTS_PER_MINUTE = 12;

// ---------------------------------------------------------------------------
// POST /api/ai/insight
// Body: { systemPrompt, fetchAssignments?, fetchSchedule?, fetchLunch?, fetchNews?, week?, year? }
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  // Rate limiting
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  const now = Date.now();
  const timestamps = (rateLimitMap.get(ip) ?? []).filter((t) => now - t < 60_000);
  if (timestamps.length >= MAX_REQUESTS_PER_MINUTE) {
    return NextResponse.json(
      { success: false, message: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }
  rateLimitMap.set(ip, [...timestamps, now]);

  // Auth
  const sess = getSessionCookies(req);
  if (!sess) {
    return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });
  }
  if (!(await authUser(sess.cookieString, sess.school))) {
    return NextResponse.json({ success: false, message: "Not authenticated." }, { status: 401 });
  }
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ success: false, message: "AI is not configured." }, { status: 503 });
  }

  const { cookieString: cookies, school } = sess;
  const schoolApi = createSchoolsoftClient(school);

  // Parse body
  let body: {
    systemPrompt?: string;
    fetchAssignments?: boolean;
    fetchSchedule?: boolean;
    fetchLunch?: boolean;
    fetchNews?: boolean;
    week?: string;
    year?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.systemPrompt) {
    return NextResponse.json({ success: false, message: "Missing systemPrompt." }, { status: 400 });
  }

  // ---------------------------------------------------------------------------
  // Fetch requested data sources in parallel
  // ---------------------------------------------------------------------------
  const dataChunks: string[] = [];

  const fetches: Promise<void>[] = [];

  if (body.fetchAssignments && body.week && body.year) {
    fetches.push(
      schoolApi
        .get(`/rest-api/student/ps/assignments/start-page?week=${body.week}&year=${body.year}`, {
          headers: { Cookie: cookies },
          responseType: "json",
        })
        .then((r) => {
          dataChunks.push(`ASSIGNMENTS DATA:\n${JSON.stringify(r.data, null, 2)}`);
        })
        .catch(() => {
          dataChunks.push("ASSIGNMENTS DATA: unavailable");
        })
    );
  }

  if (body.fetchSchedule) {
    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    fetches.push(
      schoolApi
        .get(`/rest-api/student/schedule?startDate=${today}&endDate=${today}`, {
          headers: { Cookie: cookies },
          responseType: "json",
        })
        .then((r) => {
          dataChunks.push(`SCHEDULE DATA:\n${JSON.stringify(r.data, null, 2)}`);
        })
        .catch(() => {
          dataChunks.push("SCHEDULE DATA: unavailable");
        })
    );
  }

  if (body.fetchLunch && body.week) {
    fetches.push(
      schoolApi
        .get(`/rest-api/lunchmenu/week/${body.week}`, {
          headers: { Cookie: cookies },
          responseType: "json",
        })
        .then((r) => {
          dataChunks.push(`LUNCH MENU DATA:\n${JSON.stringify(r.data, null, 2)}`);
        })
        .catch(() => {
          dataChunks.push("LUNCH MENU DATA: unavailable");
        })
    );
  }

  if (body.fetchNews) {
    fetches.push(
      schoolApi
        .get("/jsp/student/right_student_startpage.jsp", {
          headers: { Cookie: cookies },
          responseType: "arraybuffer",
        })
        .then((r) => {
          const html = decodeHtmlResponse(r.data as Buffer);
          const $ = cheerio.load(html);
          const articles = $("#news_con_content table tr")
            .map((_, el) => {
              const a = $(el).find("a.toplist-item");
              if (!a.length) return null;
              return {
                title: a.find(".heading_bold").text().trim(),
                preview: a.find("div").last().text().trim() || null,
              };
            })
            .get()
            .filter(Boolean);
          dataChunks.push(`NEWS DATA:\n${JSON.stringify(articles, null, 2)}`);
        })
        .catch(() => {
          dataChunks.push("NEWS DATA: unavailable");
        })
    );
  }

  await Promise.all(fetches);

  // ---------------------------------------------------------------------------
  // Build prompt and call AI
  // ---------------------------------------------------------------------------
  const userMessage = dataChunks.length
    ? `Here is the relevant school data:\n\n${dataChunks.join("\n\n")}`
    : "No additional data was fetched. Please provide a general helpful response based on the system instruction.";

  try {
    const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (genAI.models as any).generateContent({
      model: "gemini-2.5-flash-lite",
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      config: {
        systemInstruction:
          body.systemPrompt +
          " Be concise. Use markdown bullet points where appropriate. Do not include preambles.",
      },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const parts: any[] = result.candidates?.[0]?.content?.parts ?? [];
    const text = parts.find((p) => p.text)?.text?.trim() ?? "No response received.";

    trackAiMessage();
    return NextResponse.json({ success: true, data: text });
  } catch (err) {
    console.error("[ai/insight] Error:", (err as Error).message);
    return NextResponse.json(
      { success: false, message: "AI request failed.", error: (err as Error).message },
      { status: 500 }
    );
  }
}
