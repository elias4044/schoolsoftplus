import { NextRequest, NextResponse } from 'next/server';

import type { DashboardLayout } from '@/lib/widgets/types';
import { getAuthenticatedUserId } from '@/app/api/lib/authenticatedUser';
import { getLayout, saveLayout } from '@/app/api/lib/layoutDb';
import { readRouteBody } from '@/app/api/lib/requestBody';
import { InputError, isObject, nonEmptyText, withValidation } from '@/app/api/lib/routeValidation';

const widgetIds = [
  'homework',
  'schedule',
  'notes',
  'lunch',
  'news',
  'weather',
  'countdown',
  'messages',
];
const sizes = ['1x1', '2x1', '4x1', '1x2', '2x2', '4x2'];

export const GET = withValidation(async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ success: true, layout: await getLayout(userId) });
});

export const PUT = withValidation(async function PUT(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { layout } = await readRouteBody(req);
  if (
    !isObject(layout) ||
    !Number.isSafeInteger(layout.version) ||
    Number(layout.version) < 1 ||
    !Array.isArray(layout.widgets) ||
    layout.widgets.length > 30
  )
    throw new InputError('Invalid layout');
  const widgets = layout.widgets.map((widget) => {
    if (
      !isObject(widget) ||
      !nonEmptyText(100)(widget.instanceId) ||
      !widgetIds.includes(String(widget.widgetId)) ||
      !sizes.includes(String(widget.size))
    )
      throw new InputError('Invalid widget');
    return { instanceId: widget.instanceId, widgetId: widget.widgetId, size: widget.size };
  });
  if (new Set(widgets.map((widget) => widget.instanceId)).size !== widgets.length)
    throw new InputError('Duplicate widget instance');
  const clean = { version: layout.version, widgets } as DashboardLayout;
  await saveLayout(userId, clean);
  return NextResponse.json({ success: true, layout: clean });
});
