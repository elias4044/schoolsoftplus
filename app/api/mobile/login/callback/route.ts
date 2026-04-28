import { NextResponse } from "next/server";

/*
  This callback route is no longer used.

  SchoolSoft redirects directly to the app deep-link URI after login,
  e.g.  com.yourapp://auth?code=hWuaGr&state=3OxPx2Npca

  The app extracts the code, verifies the state, then calls
  POST /api/mobile/token with { code, verifier, school }.
*/
export function GET() {
  return NextResponse.json(
    { error: "This endpoint is no longer in use. See POST /api/mobile/token." },
    { status: 410 }
  );
}
