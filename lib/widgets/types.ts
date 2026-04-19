// col x row (on the 4-column grid)
export type WidgetSize = '1x1' | '2x1' | '4x1' | '1x2' | '2x2' | '4x2';

export type WidgetId =
  | 'homework'
  | 'schedule'
  | 'notes'
  | 'lunch'
  | 'news'
  | 'weather'
  | 'countdown';

export interface WidgetInstance {
  instanceId: string;
  widgetId: WidgetId;
  size: WidgetSize;
}

export interface DashboardLayout {
  version: number;
  widgets: WidgetInstance[];
}
