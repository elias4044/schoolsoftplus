import { NextRequest, NextResponse } from 'next/server';

import {
  DASHBOARD_ACCENTS,
  DASHBOARD_DENSITIES,
  MAX_WIDGETS,
  WIDGET_IDS,
  type DashboardAppearance,
  type DashboardLayout,
  type WidgetId,
} from '@/lib/widgets/types';
import { getAuthenticatedUserId } from '@/app/api/lib/authenticatedUser';
import { getLayout, saveLayout } from '@/app/api/lib/layoutDb';
import { readRouteBody } from '@/app/api/lib/requestBody';
import { InputError, isObject, nonEmptyText, withValidation } from '@/app/api/lib/routeValidation';

const sizes = ['1x1', '2x1', '4x1', '1x2', '2x2', '4x2'];

function matchesAccount(req: NextRequest, userId: string) {
  const account = new URL(req.url).searchParams.get('account');
  return account === null || account === userId;
}

export const GET = withValidation(async function GET(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId || !matchesAccount(req, userId)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return NextResponse.json(
    { success: true, layout: await getLayout(userId) },
    {
      headers: { 'Cache-Control': 'private, no-store' },
    }
  );
});

export const PUT = withValidation(async function PUT(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req);
  if (!userId || !matchesAccount(req, userId)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { layout } = await readRouteBody(req);
  if (
    !isObject(layout) ||
    !Number.isSafeInteger(layout.version) ||
    Number(layout.version) < 1 ||
    !Array.isArray(layout.widgets) ||
    layout.widgets.length > MAX_WIDGETS
  )
    throw new InputError('Invalid layout');
  const widgets = layout.widgets.map((widget) => {
    if (
      !isObject(widget) ||
      !nonEmptyText(100)(widget.instanceId) ||
      typeof widget.widgetId !== 'string' ||
      !WIDGET_IDS.includes(widget.widgetId as WidgetId) ||
      typeof widget.size !== 'string' ||
      !sizes.includes(widget.size) ||
      (widget.highlighted !== undefined && typeof widget.highlighted !== 'boolean')
    )
      throw new InputError('Invalid widget');
    return {
      instanceId: widget.instanceId,
      widgetId: widget.widgetId,
      size: widget.size,
      ...(widget.highlighted === true ? { highlighted: true } : {}),
    };
  });
  if (new Set(widgets.map((widget) => widget.instanceId)).size !== widgets.length)
    throw new InputError('Duplicate widget instance');
  const appearance = layout.appearance;
  if (
    appearance !== undefined &&
    (!isObject(appearance) ||
      !DASHBOARD_ACCENTS.includes(appearance.accent as DashboardAppearance['accent']) ||
      !DASHBOARD_DENSITIES.includes(appearance.density as DashboardAppearance['density']) ||
      typeof appearance.showPlanner !== 'boolean')
  )
    throw new InputError('Invalid dashboard appearance');
  const clean = {
    version: layout.version,
    widgets,
    ...(appearance && {
      appearance: {
        accent: appearance.accent,
        density: appearance.density,
        showPlanner: appearance.showPlanner,
      },
    }),
  } as DashboardLayout;
  await saveLayout(userId, clean);
  return NextResponse.json({ success: true, layout: clean });
});
