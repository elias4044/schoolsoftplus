export type WidgetSize = '1x1' | '2x1' | '4x1' | '1x2' | '2x2' | '4x2';

export const WIDGET_IDS = [
  'homework',
  'schedule',
  'notes',
  'lunch',
  'news',
  'weather',
  'countdown',
  'messages',
  'next-lesson',
  'results',
  'bookings',
  'shortcuts',
] as const;

export type WidgetId = (typeof WIDGET_IDS)[number];

export const MAX_WIDGETS = 30;

export const DASHBOARD_ACCENTS = ['theme', 'lagoon', 'orchid', 'coral', 'gold'] as const;
export const DASHBOARD_DENSITIES = ['compact', 'comfortable', 'spacious'] as const;

export interface DashboardAppearance {
  accent: (typeof DASHBOARD_ACCENTS)[number];
  density: (typeof DASHBOARD_DENSITIES)[number];
  showPlanner: boolean;
}

export const DEFAULT_DASHBOARD_APPEARANCE: DashboardAppearance = {
  accent: 'theme',
  density: 'comfortable',
  showPlanner: true,
};

export interface WidgetInstance {
  instanceId: string;
  widgetId: WidgetId;
  size: WidgetSize;
  highlighted?: boolean;
}

export interface DashboardLayout {
  version: number;
  widgets: WidgetInstance[];
  appearance?: DashboardAppearance;
}
