import type { LucideIcon } from 'lucide-react';
import {
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  Clock3,
  CloudSun,
  GraduationCap,
  LayoutGrid,
  MessageSquare,
  Newspaper,
  StickyNote,
  Timer,
  UtensilsCrossed,
} from 'lucide-react';

import type { WidgetId, WidgetSize } from './types';

export interface WidgetMeta {
  id: WidgetId;
  label: string;
  description: string;
  icon: LucideIcon;
  defaultSize: WidgetSize;
  allowedSizes: WidgetSize[];
  href?: string;
}

export const WIDGET_REGISTRY: Record<WidgetId, WidgetMeta> = {
  homework: {
    id: 'homework',
    href: '/subjects',
    label: 'Assignments',
    description: 'Assignments and tasks due this week from SchoolSoft.',
    icon: ClipboardList,
    defaultSize: '2x2',
    allowedSizes: ['2x1', '2x2', '4x1', '4x2'],
  },
  schedule: {
    id: 'schedule',
    href: '/schedule',
    label: "Today's Schedule",
    description: "Today's lessons at a glance.",
    icon: CalendarDays,
    defaultSize: '2x2',
    allowedSizes: ['1x2', '2x2', '2x1', '4x2'],
  },
  notes: {
    id: 'notes',
    href: '/notes',
    label: 'Notes',
    description: 'Personal notes stored in the cloud.',
    icon: StickyNote,
    defaultSize: '2x2',
    allowedSizes: ['1x2', '2x2', '2x1'],
  },
  lunch: {
    id: 'lunch',
    href: '/lunch',
    label: 'Lunch Menu',
    description: "This week's school lunch menu.",
    icon: UtensilsCrossed,
    defaultSize: '2x2',
    allowedSizes: ['1x2', '2x2', '4x2'],
  },
  news: {
    id: 'news',
    href: '/news',
    label: 'News',
    description: 'Latest news from school.',
    icon: Newspaper,
    defaultSize: '2x2',
    allowedSizes: ['2x2', '4x2'],
  },
  weather: {
    id: 'weather',
    label: 'Weather',
    description: 'Current weather for your location or a searched city.',
    icon: CloudSun,
    defaultSize: '2x1',
    allowedSizes: ['1x1', '2x1', '2x2', '4x1'],
  },
  countdown: {
    id: 'countdown',
    href: '/countdown',
    label: 'Countdown',
    description: 'Live countdowns to your events, exams and important dates.',
    icon: Timer,
    defaultSize: '2x1',
    allowedSizes: ['1x1', '2x1', '4x1', '2x2', '4x2'],
  },
  messages: {
    id: 'messages',
    href: '/messages',
    label: 'Messages',
    description: 'Latest conversations and unread messages.',
    icon: MessageSquare,
    defaultSize: '2x2',
    allowedSizes: ['2x1', '2x2', '4x2'],
  },
  'next-lesson': {
    id: 'next-lesson',
    label: 'Up next',
    description: 'See your current or next lesson and where to go.',
    icon: Clock3,
    href: '/schedule',
    defaultSize: '2x1',
    allowedSizes: ['2x1', '4x1'],
  },
  results: {
    id: 'results',
    label: 'Recent results',
    description: 'See newly reported assessments and open their details.',
    icon: GraduationCap,
    href: '/subjects',
    defaultSize: '2x1',
    allowedSizes: ['2x1', '2x2', '4x2'],
  },
  bookings: {
    id: 'bookings',
    label: 'School bookings',
    description: 'See booking periods for meetings and school events.',
    icon: CalendarCheck,
    defaultSize: '2x1',
    allowedSizes: ['2x1', '2x2', '4x2'],
  },
  shortcuts: {
    id: 'shortcuts',
    label: 'Quick links',
    description: 'Jump to frequently used SchoolSoft+ tools.',
    icon: LayoutGrid,
    defaultSize: '2x1',
    allowedSizes: ['2x1', '4x1'],
  },
};

// Human-readable size labels
export const SIZE_LABELS: Record<WidgetSize, string> = {
  '1x1': 'Tiny',
  '2x1': 'Wide (short)',
  '4x1': 'Full-width (short)',
  '1x2': 'Narrow',
  '2x2': 'Medium',
  '4x2': 'Full-width',
};

export function sizeToClasses(size: WidgetSize): string {
  const widths = {
    '1': '@min-[64rem]:col-span-1',
    '2': '@min-[64rem]:col-span-2',
    '4': '@min-[38rem]:col-span-2 @min-[64rem]:col-span-4',
  } as const;
  const [width] = size.split('x') as ['1' | '2' | '4'];
  return widths[width];
}
