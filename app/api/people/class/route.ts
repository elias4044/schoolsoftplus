import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { authUser } from "@/app/api/lib/auth";
import { createSchoolsoftClient, decodeHtmlResponse, requireSession, getSessionCookies } from "@/app/api/lib/schoolsoft";
import { handleApiError } from "@/app/api/lib/apiError";

export interface ClassStudent {
  name: string;
  email: string | null;
  address: string | null;
}

/**
 * GET /api/people/class
 *
 * Fetches the student class list from SchoolSoft and returns a JSON array
 * of students parsed from the first table inside `.h2_container`.
 *
 * Each row in the table holds up to two students (span6left / span6right).
 */
export async function GET(req: NextRequest) {
  const sess = await requireSession(req);
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
      "/jsp/student/right_student_class.jsp",
      { headers: { Cookie: cookies }, responseType: "arraybuffer" }
    );

    const html = decodeHtmlResponse(response.data as Buffer);
    const $ = cheerio.load(html);

    // The class list lives in the first table inside .h2_container
    const table = $(".h2_container table").first();

    const students: ClassStudent[] = [];

    table.find("tr").each((_, row) => {
      // Each row can have a span6left and/or span6right cell — each holds one student
      [".span6left", ".span6right"].forEach((side) => {
        const cell = $(row).find(side).first();
        if (!cell.length) return;

        const info = cell.find(".display-info");
        if (!info.length) return;

        const name = info.find(".heading_bold").first().text().trim();
        if (!name) return; // skip empty cells / header rows

        const emailAnchor = info.find('[id="email"] a, .value-parent a[href^="mailto:"]').first();
        const email = emailAnchor.length
          ? (emailAnchor.attr("href")?.replace("mailto:", "").trim() ?? emailAnchor.text().trim())
          : null;

        const addressDiv = info.find('[id="address"]').first();
        let address: string | null = null;
        if (addressDiv.length) {
          // Replace <br> with newline, then clean up &nbsp; (\u00a0)
          addressDiv.find("br").replaceWith("\n");
          address = addressDiv.text().replace(/\u00a0/g, " ").trim() || null;
        }

        students.push({ name, email, address });
      });
    });

    return NextResponse.json({ success: true, students });
  } catch (error) {
    return handleApiError(error, "Failed to fetch class list.");
  }
}
