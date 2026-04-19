import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { createSchoolsoftClient, decodeHtmlResponse, getSessionCookies } from "@/app/api/lib/schoolsoft";
import { handleApiError } from "@/app/api/lib/apiError";

export async function GET(req: NextRequest) {
  const sess = getSessionCookies(req);
  if (!sess) {
    return NextResponse.json(
      { success: false, error: "Not authenticated." },
      { status: 401 }
    );
  }

  const { cookieString: cookies, school } = sess;
  const api = createSchoolsoftClient(school);

  try {
    const response = await api.get(
      "/jsp/student/right_student_startpage.jsp",
      {
        headers: { Cookie: cookies },
        responseType: "arraybuffer",
      }
    );

    const html = decodeHtmlResponse(response.data as Buffer);
    const $ = cheerio.load(html);

    const homework = $("#week_tests_con_content table tr")
      .map((_, el) => {
        const anchor = $(el).find("a.list");
        if (!anchor.length) return null;
        return {
          dateAndSubject: anchor.find("div.heading_bold").text().trim(),
          title: anchor.find("div").eq(1).text().trim(),
          content: anchor
            .find("p.tinymce-p")
            .map((_, p) => $(p).text().trim())
            .get()
            .filter(Boolean),
        };
      })
      .get()
      .filter(Boolean);

    const tests = $("#week_results_con_content table tr")
      .map((_, el) => {
        const anchor = $(el).find("a.list");
        if (!anchor.length) return null;
        return {
          title: anchor.find("div.heading_bold").text().trim(),
          description: anchor.find("div.comment").text().trim(),
          link: anchor.attr("href"),
        };
      })
      .get()
      .filter(Boolean);

    return NextResponse.json({ success: true, data: { homework, tests } });
  } catch (error) {
    return handleApiError(error, "startpage");
  }
}
