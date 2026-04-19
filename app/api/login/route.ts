import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { db } from "@/app/api/lib/firebaseAdmin";
import { trackLoginEvent } from "@/app/api/lib/statsHelper";

const SCHOOLSOFT_LOGIN_URL = "https://sms.schoolsoft.se/{school}/jsp/Login.jsp";

export async function POST(req: NextRequest) {
  let body: { username?: string; password?: string; usertype?: string };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid JSON body." },
      { status: 400 }
    );
  }

  const { username, password, usertype = "1" } = body;

  if (!username || !password) {
    return NextResponse.json(
      { success: false, message: "Username and password are required." },
      { status: 400 }
    );
  }

  const school = req.headers.get("x-school") ?? "engelska";
  const loginUrl = SCHOOLSOFT_LOGIN_URL.replace("{school}", school);

  const time = new Date().toLocaleString("sv-SE", {
    timeZone: "Europe/Stockholm",
  });

  try {
    // -- Attempt SchoolSoft login ----------------------------------------------
    const form = new URLSearchParams({
      action: "login",
      ssusername: username,
      sspassword: password,
      usertype,
    });

    // Allow any status through so we can inspect the response and return
    // a proper 401 for failed logins instead of letting axios throw.
    const response = await axios.post(loginUrl, form.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        Referer: loginUrl,
        Origin: "https://sms.schoolsoft.se",
      },
      maxRedirects: 0,
      validateStatus: () => true,
    });

    // SchoolSoft returns a 302 redirect on successful login. If we get any
    // other status code (commonly 200 with a page that contains an error
    // message), treat it as an authentication failure and return 401.
    if (response.status !== 302) {
      console.warn(`[login] unexpected status ${response.status} from ${loginUrl}`);
      return NextResponse.json(
        { success: false, message: "Login failed. Check your credentials." },
        { status: 401 }
      );
    }

    const setCookie: string[] = response.headers["set-cookie"] ?? [];
    const sessionCookie = setCookie.find((c) => c.includes("JSESSIONID="));
    const hashCookie = setCookie.find((c) => c.includes("hash="));
    const usertypeCookie = setCookie.find((c) => c.includes("usertype="));

    // For debugging print the hash and session
    console.log(`[login] sessionCookie: ${sessionCookie}`);
    console.log(`[login] hashCookie: ${hashCookie}`);
    console.log(`[login] usertypeCookie: ${usertypeCookie}`);

    // -- Update Firestore stats ------------------------------------------------
    const statsRef = db.collection("stats").doc("loginStats");

    await db.runTransaction(async (tx) => {
      const doc = await tx.get(statsRef);

      type UserEntry = {
        username: string;
        first_login: string;
        last_login: string;
        login_count: number;
        data: { goals: unknown[]; notes: unknown[] };
      };

      type StatsData = {
        total_logins: number;
        total_successful_logins: number;
        total_api_calls: number;
        unique_logins: number;
        failed_logins: number;
        users: UserEntry[];
      };

      const base: StatsData = {
        total_logins: 0,
        total_successful_logins: 0,
        total_api_calls: 0,
        unique_logins: 0,
        failed_logins: 0,
        users: [],
      };

      const data: StatsData = doc.exists
        ? { ...base, ...(doc.data() as StatsData) }
        : base;

      data.total_logins += 1;
      data.total_api_calls += 1;

      if (sessionCookie && hashCookie) {
        data.total_successful_logins += 1;

        const lowerUsername = username.toLowerCase();
        const existingIndex = data.users.findIndex(
          (u) => u.username === lowerUsername
        );

        if (existingIndex === -1) {
          data.unique_logins += 1;
          data.users.push({
            username: lowerUsername,
            first_login: time,
            last_login: time,
            login_count: 1,
            data: { goals: [], notes: [] },
          });
        } else {
          data.users[existingIndex].last_login = time;
          data.users[existingIndex].login_count += 1;
          data.users[existingIndex].data ??= { goals: [], notes: [] };
          data.users[existingIndex].data.goals ??= [];
          data.users[existingIndex].data.notes ??= [];
        }
      } else {
        data.failed_logins = (data.failed_logins ?? 0) + 1;
      }

      doc.exists ? tx.update(statsRef, data) : tx.set(statsRef, data);
    });

    // Fire-and-forget histogram stats (hour, day, school, peak date)
    if (sessionCookie && hashCookie) {
      trackLoginEvent(school);
    }

    if (sessionCookie && hashCookie) {
      // Extract only the raw value (everything after the first '=') from the
      // first segment of each Set-Cookie header, e.g.:
      //   "JSESSIONID=ABC123; Path=/; HttpOnly" → "ABC123"
      //   "hash=XYZ; Path=/"                   → "XYZ"
      const extractValue = (raw: string) => raw.split(";")[0].split("=").slice(1).join("=");

      const jsessionidVal = extractValue(sessionCookie);
      const hashVal       = extractValue(hashCookie);
      const usertypeVal   = usertypeCookie ? extractValue(usertypeCookie) : "";

      const response = NextResponse.json({ success: true });

      const cookieOpts = {
        httpOnly: true,
        sameSite: "lax" as const,
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      };
      response.cookies.set("ssp_jsessionid", jsessionidVal, cookieOpts);
      response.cookies.set("ssp_hash",       hashVal,       cookieOpts);
      if (usertypeVal) response.cookies.set("ssp_usertype", usertypeVal, cookieOpts);
      response.cookies.set("ssp_school",   school,     { ...cookieOpts, httpOnly: false });
      response.cookies.set("ssp_username", username!,  { ...cookieOpts, httpOnly: false });

      return response;
    }

    return NextResponse.json(
      { success: false, message: "Login failed — cookies missing." },
      { status: 401 }
    );
  } catch (err) {
    console.error("[login] Error:", (err as Error).message);
    return NextResponse.json(
      { success: false, message: "Server error." },
      { status: 500 }
    );
  }
}
