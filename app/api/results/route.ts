import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { createSchoolsoftClient, decodeHtmlResponse, getSessionCookies } from "@/app/api/lib/schoolsoft";
import { handleApiError } from "@/app/api/lib/apiError";

// -- GET /api/results?requestId=xxx&subjectId=0
//    GET /api/results?testId=xxx&gradeSubject=0&archive=0
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const testId = searchParams.get("testId");

  return testId
    ? getTestGradingCriteria(req, searchParams)
    : getTestResults(req, searchParams);
}

async function getTestResults(
  req: NextRequest,
  params: URLSearchParams
): Promise<NextResponse> {
  const requestId = params.get("requestId");
  const subjectId = params.get("subjectId") ?? "0";

  const sess = getSessionCookies(req);
  if (!sess) {
    return NextResponse.json(
      { success: false, error: "Not authenticated." },
      { status: 401 }
    );
  }
  if (!requestId) {
    return NextResponse.json(
      { success: false, error: "requestId query parameter is required." },
      { status: 400 }
    );
  }

  const { cookieString: cookies, school } = sess;
  const api = createSchoolsoftClient(school);

  try {
    const url = `/jsp/student/right_student_test_results.jsp?action=view&subject=${subjectId}&requestid=${requestId}`;
    const response = await api.get(url, {
      headers: { Cookie: cookies },
      responseType: "arraybuffer",
    });

    const html = decodeHtmlResponse(response.data as Buffer);
    const $ = cheerio.load(html);

    const accordionGroup = $(`#accordion-group${requestId}`);
    if (!accordionGroup.length) {
      return NextResponse.json(
        { success: false, error: "Test result not found." },
        { status: 404 }
      );
    }

    const result = {
      date: accordionGroup.find(".accordion-heading-left div").first().text().trim(),
      title: accordionGroup.find(".preview-block").text().trim(),
      status: accordionGroup.find(".accordion-heading-date").text().trim(),
      type: accordionGroup.find(".accordion-inner .heading_bold").first().text().trim(),
      grade: accordionGroup.find('.heading_bold:contains("Grade")').next("div").text().trim(),
      comments: accordionGroup
        .find('.heading_bold:contains("Student Comments")')
        .next("div")
        .text()
        .trim(),
      description: accordionGroup
        .find('.heading_bold:contains("Description")')
        .next("div")
        .text()
        .trim(),
      creator: accordionGroup
        .find('.heading_bold:contains("Created by")')
        .next("div")
        .text()
        .trim(),
    };

    return NextResponse.json({ success: true, result });
  } catch (error) {
    return handleApiError(error, "getTestResults");
  }
}

async function getTestGradingCriteria(
  req: NextRequest,
  params: URLSearchParams
): Promise<NextResponse> {
  const testId = params.get("testId")!;
  const gradeSubject = params.get("gradeSubject") ?? "0";
  const archive = params.get("archive") ?? "0";

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
    const url = `/jsp/student/right_student_ability_ajax.jsp?action=listtest&test=${testId}&gradesubject=${gradeSubject}&archive=${archive}&_=${Date.now()}`;
    const response = await api.get(url, {
      headers: { Cookie: cookies },
      responseType: "arraybuffer",
    });

    const html = decodeHtmlResponse(response.data as Buffer);
    const $ = cheerio.load(html);

    const criteria = $("table.longlist tr.value")
      .map((_, row) => {
        const nameCell = $(row).find("td:first-child");
        const nameText = nameCell.find("b").text().trim();

        const processCell = (pos: number) => {
          const cell = $(row).find(`td:nth-child(${pos})`);
          const div = cell.find("div.green, div.yellow").first();
          if (!div.length) return null;
          const cls = div.attr("class") ?? "";
          const status = cls.includes("green")
            ? "achieved"
            : cls.includes("yellow")
            ? "partial"
            : "none";
          return { text: div.text().trim(), status };
        };

        return {
          name: nameText,
          description: nameCell.text().replace(nameText, "").trim(),
          levels: { E: processCell(2), C: processCell(3), A: processCell(4) },
        };
      })
      .get();

    return NextResponse.json({ success: true, criteria });
  } catch (error) {
    return handleApiError(error, "getTestGradingCriteria");
  }
}
