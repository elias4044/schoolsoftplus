import { NextRequest, NextResponse } from "next/server";
import { getSessionCookies } from "@/app/api/lib/schoolsoft";
import { authUserWithUsername } from "@/app/api/lib/auth";
import { getLayout, saveLayout } from "@/app/api/lib/layoutDb";
import { WIDGET_REGISTRY } from "@/lib/widgets/registry";
import type { DashboardLayout, WidgetInstance } from "@/lib/widgets/types";

async function authenticate(req: NextRequest): Promise<string | null> {
  const sess = getSessionCookies(req);
  if (!sess) return null;
  const username = sess.username.toLowerCase().trim();
  if (!username) return null;
  if (!(await authUserWithUsername(sess.cookieString, username, sess.school))) return null;
  return username;
}

/** Strips any widget instances whose widgetId no longer exists in the registry */
function sanitize(layout: DashboardLayout): DashboardLayout {
  const valid: WidgetInstance[] = layout.widgets.filter(
    (w) => w.instanceId && w.widgetId && WIDGET_REGISTRY[w.widgetId]
  );
  return { ...layout, widgets: valid };
}

/** GET /api/layout — fetch the saved dashboard layout */
export async function GET(req: NextRequest) {
  const username = await authenticate(req);
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const layout = await getLayout(username);
  return NextResponse.json({ success: true, layout }); // null layout → use default on client
}

/** PUT /api/layout — save/overwrite the dashboard layout */
export async function PUT(req: NextRequest) {
  const username = await authenticate(req);
  if (!username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { layout?: DashboardLayout };
  try { body = await req.json(); } catch { body = {}; }

  if (!body.layout || !Array.isArray(body.layout.widgets)) {
    return NextResponse.json({ error: "Invalid layout payload." }, { status: 400 });
  }

  const clean = sanitize(body.layout);
  await saveLayout(username, clean);

  return NextResponse.json({ success: true, layout: clean });
}
