import { NextRequest, NextResponse } from "next/server";
import { getSessionCookies } from "@/app/api/lib/schoolsoft";
import { authUser } from "@/app/api/lib/auth";

const REPO = "elias4044/schoolsoftplus";
const API  = `https://api.github.com/repos/${REPO}/issues`;

/* Allowed label sets by type */
const TYPE_LABELS: Record<string, string[]> = {
  bug:      ["bug"],
  feature:  ["enhancement", "feature request"],
  question: ["question"],
};

export async function POST(req: NextRequest) {
  /* ── Auth ──────────────────────────────────────── */
  const sess = getSessionCookies(req);
  if (!sess) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const { cookieString, school, username } = sess;

  if (!(await authUser(cookieString, school))) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  /* ── Validate token ────────────────────────────── */
  if (!process.env.GITHUB_TOKEN) {
    return NextResponse.json(
      { error: "Server is not configured for issue creation. Please contact the admin." },
      { status: 503 }
    );
  }

  /* ── Parse body ────────────────────────────────── */
  let body: { title?: string; body?: string; type?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const { title, body: rawBody, type = "question" } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }
  if (title.trim().length > 256) {
    return NextResponse.json({ error: "Title is too long (max 256 chars)." }, { status: 400 });
  }

  const labels = TYPE_LABELS[type] ?? TYPE_LABELS.question;

  /* ── Build issue body ──────────────────────────── */
  const attribution = `\n\n---\n*Submitted via SchoolSoft+ by **${username}** (school: \`${school}\`)*`;
  const issueBody   = (rawBody?.trim() ?? "") + attribution;

  /* ── Create issue ──────────────────────────────── */
  const upstream = await fetch(API, {
    method:  "POST",
    headers: {
      Accept:                "application/vnd.github+json",
      Authorization:         `Bearer ${process.env.GITHUB_TOKEN}`,
      "X-GitHub-Api-Version":"2022-11-28",
      "Content-Type":        "application/json",
      "User-Agent":          "schoolsoftplus-app",
    },
    body: JSON.stringify({ title: title.trim(), body: issueBody, labels }),
  });

  if (!upstream.ok) {
    const err = await upstream.json().catch(() => ({}));
    console.error("[github/issues/create] GitHub error:", err);
    return NextResponse.json(
      { error: "Failed to create issue. Please try again later." },
      { status: 502 }
    );
  }

  const issue = await upstream.json();

  return NextResponse.json({
    success: true,
    number:   issue.number,
    html_url: issue.html_url,
  });
}
