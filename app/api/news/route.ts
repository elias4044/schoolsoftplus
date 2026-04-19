import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { authUser } from "@/app/api/lib/auth";
import { createSchoolsoftClient, decodeHtmlResponse, getSessionCookies } from "@/app/api/lib/schoolsoft";
import { handleApiError } from "@/app/api/lib/apiError";
import { trackNewsFetch } from "@/app/api/lib/statsHelper";

// -- GET /api/news  ------------------------------------------------------------
export async function GET(req: NextRequest) {
  const sess = getSessionCookies(req);
  if (!sess) {
    return NextResponse.json(
      { success: false, error: "Not authenticated." },
      { status: 401 }
    );
  }

  const { cookieString: cookies, school } = sess;

  if (!(await authUser(cookies, school))) {
    return NextResponse.json(
      { success: false, error: "Not authenticated." },
      { status: 401 }
    );
  }

  const api = createSchoolsoftClient(school);

  try {
    const response = await api.get(
      "/jsp/student/right_student_startpage.jsp",
      { headers: { Cookie: cookies }, responseType: "arraybuffer" }
    );

    const html = decodeHtmlResponse(response.data as Buffer);
    const $ = cheerio.load(html);

    const news = $("#news_con_content table tr")
      .map((_, el) => {
        const a = $(el).find("a.toplist-item");
        if (!a.length) return null;
        const href = a.attr("href") ?? "";
        const match = href.match(/requestid=(\d+)/);
        return {
          id: match ? match[1] : null,
          title: a.find(".heading_bold").text().trim(),
          preview: a.find("div").last().text().trim() || null,
        };
      })
      .get()
      .filter(Boolean);

    trackNewsFetch();
    return NextResponse.json({ success: true, data: news });
  } catch (error) {
    return handleApiError(error, "news");
  }
}
