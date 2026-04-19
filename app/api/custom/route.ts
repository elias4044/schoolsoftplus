import { NextRequest, NextResponse } from "next/server";
import { authUser } from "@/app/api/lib/auth";
import { createSchoolsoftClient, getSessionCookies } from "@/app/api/lib/schoolsoft";
import { handleApiError } from "@/app/api/lib/apiError";

// -- ANY /api/custom  ----------------------------------------------------------
// Proxies an arbitrary path on the SchoolSoft API.
// Pass the path in the `x-url` header (e.g. "rest-api/student/ps/something").
export async function GET(req: NextRequest) {
  return proxyRequest(req, "GET");
}
export async function POST(req: NextRequest) {
  return proxyRequest(req, "POST");
}
export async function PUT(req: NextRequest) {
  return proxyRequest(req, "PUT");
}
export async function DELETE(req: NextRequest) {
  return proxyRequest(req, "DELETE");
}

async function proxyRequest(req: NextRequest, method: string): Promise<NextResponse> {
  const customURL = req.headers.get("x-url");

  if (!customURL) {
    return NextResponse.json(
      { success: false, error: "x-url header is required." },
      { status: 400 }
    );
  }

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
    let body: unknown = undefined;
    if (method !== "GET" && method !== "DELETE") {
      try {
        body = await req.json();
      } catch {
        // no body
      }
    }

    const response = await api.request({
      method,
      url: `/${customURL}`,
      headers: { Cookie: cookies },
      data: body,
      responseType: "json",
    });

    return NextResponse.json(
      { success: true, data: response.data },
      { status: response.status }
    );
  } catch (error) {
    return handleApiError(error, "custom");
  }
}
