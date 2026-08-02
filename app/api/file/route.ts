// Get files/images from SchoolSoft. Useful for "news".
import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "../lib/schoolsoft";
import { handleApiError } from "../lib/apiError";
import axios from "axios";

const baseURL = "https://sms.schoolsoft.se/engelska/eva/api/v1/resource/"; // attachment|image/[id]

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const id = searchParams.get("id");
  const responseType = searchParams.get("responseType"); // Direct file, temp URL or redirect - "url" for temp url, "redirect" for redirect.

  if (!id) {
    return NextResponse.json(
      {
        error: "Missing 'id' search parameter",
      },
      { status: 400 },
    );
  }

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

  try {
    let fileType = "attachment";
    if (type?.toLowerCase() === "image") fileType = "image";

    const res = await axios.get(
      `${baseURL}/${fileType}/${id}`,
      {
        headers: {
          Authorization: "Bearer " + sess.token,
        },
        maxRedirects: 0,
        validateStatus: (status) => status === 303 || status === 404,
      },
    );
    const headers = res.headers;
    if (res.status !== 303) {
      if (res.status === 404) {
        return NextResponse.json(
          { error: "Resource not found" },
          { status: 404 },
        );
      } else {
        throw new Error(
          "Did not recognise SchoolSoft response: " + JSON.stringify(res.data),
        );
      }
    }

    if (!headers.location) {
      throw new Error("No location was provided by SchoolSoft");
    }

    if (responseType === "url") {
      return NextResponse.json({
        url: headers.location,
      });
    }

    if (responseType === "redirect") {
      return NextResponse.redirect(new URL(headers.location), 303);
    }

    const asset = await axios.get(headers.location);
    return new NextResponse(asset.data);
  } catch (err) {
    return handleApiError(err, "file");
  }
}
