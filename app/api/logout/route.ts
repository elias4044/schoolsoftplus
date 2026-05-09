import { NextResponse } from "next/server";

// -- POST /api/logout  --------------------------------------------------------
// Clears all SSP session cookies, effectively logging the user out.
export async function POST() {
  const res = NextResponse.json({ success: true });

  const expired = {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };

  // Classic session cookies
  res.cookies.set("ssp_jsessionid", "", expired);
  res.cookies.set("ssp_hash",       "", expired);
  res.cookies.set("ssp_usertype",   "", expired);
  res.cookies.set("ssp_school",     "", { ...expired, httpOnly: false });
  res.cookies.set("ssp_username",   "", { ...expired, httpOnly: false });

  // AuthV2-specific cookies
  res.cookies.set("ssp_ss_token",          "", expired);
  res.cookies.set("ssp_ss_refresh_token",  "", expired);
  res.cookies.set("ssp_ss_token_expires",  "", { ...expired, httpOnly: false });
  res.cookies.set("ssp_auth_type",         "", { ...expired, httpOnly: false });
  res.cookies.set("ssp_ss_orgid",          "", { ...expired, httpOnly: false });
  res.cookies.set("ssp_v2_pkce",           "", expired);

  return res;
}

