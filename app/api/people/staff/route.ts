import { NextRequest, NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { authUser } from "@/app/api/lib/auth";
import { createSchoolsoftClient, decodeHtmlResponse, requireSession, getSessionCookies } from "@/app/api/lib/schoolsoft";
import { handleApiError } from "@/app/api/lib/apiError";

export interface StaffMember {
  /** e.g. "Jeanot Loic Beetge" (normalized to "FirstName LastName" order) */
  name: string;
  /** Surname in bold, as listed by SchoolSoft, e.g. "Beetge" */
  lastName: string;
  /** Given name(s), e.g. "Jeanot Loic" */
  firstName: string;
  roles: string[];
  workphone: string | null;
  email: string | null;
  contactInfo: string | null;
  pictureUrl: string | null;
}

export interface StaffSection {
  /** e.g. "Mentors", "Teachers" — from the h3_bold heading above each table */
  section: string;
  members: StaffMember[];
}

/**
 * GET /api/people/staff
 *
 * Fetches the staff list from SchoolSoft's right_student_staff.jsp and returns
 * structured JSON organized by section (Mentors, Teachers, etc.).
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
      "/jsp/student/right_student_staff.jsp",
      { headers: { Cookie: cookies }, responseType: "arraybuffer" }
    );

    const html = decodeHtmlResponse(response.data as Buffer);
    const $ = cheerio.load(html);

    const content = $(".h2_container #_content");
    const sections: StaffSection[] = [];

    // Walk through direct children: h3_bold headings and tables alternate
    let currentSection = "Staff";
    const baseUrl = `https://sms.schoolsoft.se/${school}`;

    content.children().each((_, el) => {
      const tag = el.type === "tag" ? el.name.toLowerCase() : null;
      if (!tag) return;

      // Section heading
      if ($(el).hasClass("h3_bold") || tag === "h3") {
        currentSection = $(el).text().trim() || currentSection;
        return;
      }

      // Staff table
      if (tag === "table") {
        const members: StaffMember[] = [];

        $(el).find("tbody tr").each((_, row) => {
          const cells = $(row).find("td");
          if (cells.length < 4) return; // skip malformed rows

          // ── Name ──────────────────────────────────────────────
          // Structure: <span class="name_bold">Surname</span> FirstName(s)
          const nameCell = cells.eq(0);
          const lastName = nameCell.find(".name_bold").text().trim();
          // Full cell text minus the bold surname gives first name(s)
          const fullCellText = nameCell.text().trim();
          const firstName = fullCellText.replace(lastName, "").trim();
          const name = firstName ? `${firstName} ${lastName}` : lastName;

          // ── Roles ─────────────────────────────────────────────
          // Roles are separated by <br> tags
          cells.eq(1).find("br").replaceWith("|");
          const roles = cells.eq(1)
            .text()
            .split("|")
            .map((r) => r.trim())
            .filter(Boolean);

          // ── Workphone ─────────────────────────────────────────
          const phoneAnchor = cells.eq(2).find("a[href^='tel:']").first();
          const workphone = phoneAnchor.length
            ? phoneAnchor.text().trim() || phoneAnchor.attr("href")?.replace("tel:", "").trim() || null
            : cells.eq(2).text().trim() || null;

          // ── Email ─────────────────────────────────────────────
          const emailAnchor = cells.eq(3).find("a[href^='mailto:']").first();
          const email = emailAnchor.length
            ? emailAnchor.attr("href")?.replace("mailto:", "").trim() ?? emailAnchor.text().trim()
            : cells.eq(3).text().trim() || null;

          // ── Contact info ──────────────────────────────────────
          const contactInfo = cells.length > 4 ? cells.eq(4).text().trim() || null : null;

          // ── Picture URL ───────────────────────────────────────
          let pictureUrl: string | null = null;
          const imgCellIndex = cells.length - 1;
          const img = cells.eq(imgCellIndex).find("img").first();
          if (img.length) {
            const src = img.attr("src") ?? "";
            pictureUrl = src.startsWith("http") ? src : `${baseUrl}/${src.replace(/^\/+/, "")}`;
          }

          members.push({ name, lastName, firstName, roles, workphone, email: email || null, contactInfo, pictureUrl });
        });

        if (members.length) {
          sections.push({ section: currentSection, members });
        }
      }
    });

    // Flatten to a deduplicated list as well (handy for consumers)
    const allStaff = sections.flatMap((s) => s.members);
    // Deduplicate by email since the same teacher can appear in multiple sections
    const seen = new Set<string>();
    const uniqueStaff = allStaff.filter((m) => {
      const key = m.email ?? m.name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({ success: true, sections, staff: uniqueStaff });
  } catch (error) {
    return handleApiError(error, "Failed to fetch staff list.");
  }
}
