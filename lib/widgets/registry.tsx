import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  CalendarDays,
  StickyNote,
  UtensilsCrossed,
  Newspaper,
  BarChart2,
  CloudSun,
  Timer,
} from "lucide-react";
import type { WidgetId, WidgetSize } from "./types";

export interface WidgetMeta {
  id: WidgetId;
  label: string;
  description: string;
  icon: LucideIcon;
  defaultSize: WidgetSize;
  allowedSizes: WidgetSize[];
}

export const WIDGET_REGISTRY: Record<WidgetId, WidgetMeta> = {
  homework: {
    id: "homework",
    label: "Assignments",
    description: "Assignments and tasks due this week from SchoolSoft.",
    icon: ClipboardList,
    defaultSize: "2x2",
    allowedSizes: ["2x1", "2x2", "4x1", "4x2"],
  },
  schedule: {
    id: "schedule",
    label: "Today's Schedule",
    description: "Today's lessons at a glance.",
    icon: CalendarDays,
    defaultSize: "2x2",
    allowedSizes: ["1x2", "2x2", "2x1", "4x2"],
  },
  notes: {
    id: "notes",
    label: "Notes",
    description: "Personal notes stored in the cloud.",
    icon: StickyNote,
    defaultSize: "2x2",
    allowedSizes: ["1x2", "2x2", "2x1"],
  },
  lunch: {
    id: "lunch",
    label: "Lunch Menu",
    description: "This week's school lunch menu.",
    icon: UtensilsCrossed,
    defaultSize: "2x2",
    allowedSizes: ["1x2", "2x2", "4x2"],
  },
  news: {
    id: "news",
    label: "News",
    description: "Latest news from school.",
    icon: Newspaper,
    defaultSize: "2x2",
    allowedSizes: ["2x2", "4x2"],
  },
  weather: {
    id: "weather",
    label: "Weather",
    description: "Current weather for your location or a searched city.",
    icon: CloudSun,
    defaultSize: "2x1",
    allowedSizes: ["1x1", "2x1", "2x2", "4x1"],
  },
  countdown: {
    id: "countdown",
    label: "Countdown",
    description: "Live countdowns to your events, exams and important dates.",
    icon: Timer,
    defaultSize: "2x1",
    allowedSizes: ["1x1", "2x1", "4x1", "2x2", "4x2"],
  },
};

// Human-readable size labels
export const SIZE_LABELS: Record<WidgetSize, string> = {
  "1x1": "Tiny",
  "2x1": "Wide (short)",
  "4x1": "Full-width (short)",
  "1x2": "Narrow",
  "2x2": "Medium",
  "4x2": "Full-width",
};

// Convert size token → Tailwind col/row span classes (on a 4-col grid)
export function sizeToClasses(size: WidgetSize): string {
  const map: Record<WidgetSize, string> = {
    "1x1": "col-span-1 row-span-1",
    "2x1": "col-span-2 row-span-1",
    "4x1": "col-span-4 row-span-1",
    "1x2": "col-span-1 row-span-2",
    "2x2": "col-span-2 row-span-2",
    "4x2": "col-span-4 row-span-2",
  };
  return map[size] ?? "col-span-2 row-span-2";
}
