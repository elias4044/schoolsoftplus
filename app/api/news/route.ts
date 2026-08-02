// NOTE: Old route has been moved to /api/news/legacy

import { NextRequest, NextResponse } from "next/server";

import * as cheerio from "cheerio";
import {
  createSchoolsoftClient,
  decodeHtmlResponse,
  requireSession,
  getSessionCookies,
} from "@/app/api/lib/schoolsoft";
import { handleApiError } from "@/app/api/lib/apiError";

// -- GET /api/news  ------------------------------------------------------------
export async function GET(req: NextRequest) {
  // Updated to use AuthV2

  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get("orgid") ?? 18; // 18 is IES Halmstad's OrgID.

  const sess = await requireSession(req);

  if (!sess) {
    return NextResponse.json(
      { success: false, error: "Not authenticated." },
      { status: 401 },
    );
  }

  if (!sess.token) {
    return NextResponse.json(
      {
        success: false,
        error:
          "This route requires AuthV2 (https://developer.ssp.elias4044.com/docs/auth-v2). The legacy route is available at /api/news/legacy",
      },
      { status: 401 },
    );
  }

  if (!sess.user?.userId) {
    return NextResponse.json(
      {
        success: false,
        error: "UserId was not found.",
      },
      { status: 400 },
    );
  }

  const api = createSchoolsoftClient(sess.school);

  try {
    const res = await api.get(
      `/eva/api/v2/student/${sess.user.userId}/schools/${orgId}/news`,
      { headers: { Authorization: "Bearer " + sess.token } },
    );

    // Example res:
    // Note that the description is pure HTML
    /* [
        {
          "id": 332375,
          "title": "Summer reading or sum!",
          "description": "\nTHis is some <strong>awesome</strong> news",
          "toDate": "2026-08-27T22:00:00.000+00:00",
          "category": "IES News",
          "author": {
            "id": 3020,
            "name": "Teacher",
            "picture": "teacher3020.jpg.jpg"
          },
          "read": true,
          "response": false,
          "hasAttachment": true,
          "creDate": "2026-05-27T06:47:29.000+00:00",
          "newsConfirm": null
        },
        ...
    ]*/
    return NextResponse.json(res.data);
  } catch (err) {
    return handleApiError(err, "news");
  }
}
