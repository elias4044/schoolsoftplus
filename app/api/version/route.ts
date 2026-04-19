import { NextResponse } from "next/server";
import { APP_VERSION } from "@/app/api/lib/version";

export async function GET() {
  return NextResponse.json({ version: APP_VERSION });
}
