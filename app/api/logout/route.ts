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

  res.cookies.set("ssp_jsessionid", "", expired);
  res.cookies.set("ssp_hash",       "", expired);
  res.cookies.set("ssp_usertype",   "", expired);
  res.cookies.set("ssp_school",     "", { ...expired, httpOnly: false });
  res.cookies.set("ssp_username",   "", { ...expired, httpOnly: false });

  return res;
}
