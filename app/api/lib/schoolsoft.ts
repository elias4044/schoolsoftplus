import { NextRequest } from "next/server";
import axios from "axios";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36";

/**
 * Creates a configured Axios instance that targets a specific school's
 * SchoolSoft subdirectory. The `school` param maps to the path segment
 * that replaces "engelska" (or whatever the school's slug is).
 *
 * @example
 *   createSchoolsoftClient("engelska")
 *   // baseURL → https://sms.schoolsoft.se/engelska
 */
export function createSchoolsoftClient(school: string) {
  const baseURL = `https://sms.schoolsoft.se/${school}`;
  return axios.create({
    baseURL,
    headers: {
      "User-Agent": DEFAULT_USER_AGENT,
      Referer: `${baseURL}/`,
      Origin: "https://sms.schoolsoft.se",
    },
  });
}

/**
 * Resolves the school slug from the request headers or cookies.
 * Falls back to "engelska" if neither is provided.
 */
export function getSchool(req: NextRequest | Headers): string {
  if (req instanceof NextRequest) {
    return req.headers.get("x-school") ?? req.cookies.get("ssp_school")?.value ?? "engelska";
  }
  return req.get("x-school") ?? "engelska";
}

/**
 * Reads the SchoolSoft session cookies that were set by our login endpoint
 * and returns the cookie string to forward to SchoolSoft, plus metadata.
 *
 * Returns null if the user is not logged in (missing ssp_jsessionid cookie).
 */
export function getSessionCookies(req: NextRequest): {
  cookieString: string;
  school: string;
  username: string;
} | null {
  const jsessionid = req.cookies.get("ssp_jsessionid")?.value; // raw value, e.g. "F92FC4EC..."
  const hash       = req.cookies.get("ssp_hash")?.value;       // raw value, e.g. "d85914fa..."
  const usertype   = req.cookies.get("ssp_usertype")?.value;   // raw value, e.g. "1"
  const school     = req.cookies.get("ssp_school")?.value ?? "engelska";
  const username   = req.cookies.get("ssp_username")?.value ?? "";

  if (!jsessionid) return null;

  // Reconstruct the Cookie header SchoolSoft expects: "JSESSIONID=xxx; hash=yyy; usertype=zzz"
  const cookieString = [
    `JSESSIONID=${jsessionid}`,
    hash      ? `hash=${hash}`           : null,
    usertype  ? `usertype=${usertype}`   : null,
  ].filter(Boolean).join("; ");

  return { cookieString, school, username };
}

/** Decodes SchoolSoft's ISO-8859-1 HTML responses into a UTF-8 string. */
export function decodeHtmlResponse(buffer: Buffer | ArrayBuffer): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const iconv = require("iconv-lite") as typeof import("iconv-lite");
  const buf = buffer instanceof ArrayBuffer ? Buffer.from(buffer) : buffer;
  return iconv.decode(buf, "ISO-8859-1");
}
