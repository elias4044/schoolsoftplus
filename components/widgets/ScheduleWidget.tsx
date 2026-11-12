'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Clock3, MapPin } from 'lucide-react';

import { readCache, useCachedResource } from '@/lib/cache';
import { fetchSchedule, scheduleKey } from '@/lib/cache/schedule';
import { getWeekBounds, localDateKey, toMinutes, type Lesson } from '@/lib/schedule-utils';
import type { WidgetSize } from '@/lib/widgets/types';

import { WidgetContent, WidgetRow, WidgetTag } from './WidgetContent';

const weekday = new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'UTC' });

export function useDashboardSchedule(week: number) {
  const key = scheduleKey(week);
  return useCachedResource<Lesson[]>(key, (force) => {
    const cached = readCache<Lesson[]>(key);
    return !force && cached && Date.now() - cached.savedAt < 60_000
      ? Promise.resolve(cached.data)
      : fetchSchedule(week);
  });
}

function useTodaySchedule() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const update = () => setNow(new Date());
    const timer = window.setInterval(update, 15_000);
    window.addEventListener('focus', update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
    };
  }, []);
  const { week } = getWeekBounds(0);
  return {
    resource: useDashboardSchedule(week),
    date: localDateKey(now),
    time: now.toTimeString().slice(0, 5),
  };
}

export default function ScheduleWidget({ size }: { size: WidgetSize }) {
  const { resource, date, time } = useTodaySchedule();
  const compact = size.endsWith('x1');
  return (
    <WidgetContent resource={resource} empty="No lessons scheduled today.">
      {(lessons) => {
        const today = lessons.filter((lesson) => lesson.date === date);
        if (!today.length) return null;
        const remaining = today.filter((lesson) => lesson.end > time);
        const visible = compact && remaining.length ? remaining : today;
        return (
          <>
            {!compact && (
              <div className="widgetToolbar">
                <span>
                  {today.length} {today.length === 1 ? 'lesson' : 'lessons'}
                </span>
                <span>
                  {remaining.length ? `${remaining.length} left today` : 'School day finished'}
                </span>
              </div>
            )}
            {visible.map((lesson) => {
              const active = lesson.start <= time && time < lesson.end;
              return (
                <WidgetRow
                  key={lesson.eventId}
                  title={lesson.name}
                  leading={
                    <span className="widgetTimelineTime" data-active={active || undefined}>
                      {lesson.start}
                      <span>{lesson.end}</span>
                    </span>
                  }
                  detail={[lesson.room, lesson.teacher].filter(Boolean).join(' / ')}
                  aside={active ? <WidgetTag active>Now</WidgetTag> : undefined}
                />
              );
            })}
          </>
        );
      }}
    </WidgetContent>
  );
}

export function NextLessonWidget() {
  const { resource, date, time } = useTodaySchedule();
  return (
    <WidgetContent resource={resource} empty="No more lessons on this week's timetable.">
      {(lessons) => {
        const lesson =
          lessons.find((entry) => entry.date === date && entry.end > time) ??
          lessons.find((entry) => entry.date > date);
        if (!lesson) return null;
        const active = lesson.date === date && lesson.start <= time;
        const day =
          lesson.date === date ? 'Today' : weekday.format(new Date(lesson.date + 'T00:00:00Z'));
        const duration = toMinutes(lesson.end) - toMinutes(lesson.start);
        const elapsed = toMinutes(time) - toMinutes(lesson.start);
        return (
          <Link
            href="/schedule"
            className="widgetFeatureLink focus-visible:ring-ring block rounded-lg px-3 py-2.5 transition-colors outline-none focus-visible:ring-2"
          >
            <span className="flex items-center justify-between gap-2">
              <WidgetTag active={active}>{active ? 'In progress' : day}</WidgetTag>
              <ArrowUpRight aria-hidden className="text-muted-foreground size-4 shrink-0" />
            </span>
            <span className="mt-1 block truncate text-xl leading-snug font-semibold tracking-tight">
              {lesson.name}
            </span>
            <span className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums">
              <span className="inline-flex items-center gap-1">
                <Clock3 aria-hidden className="size-3.5" />
                {lesson.start} - {lesson.end}
              </span>
              {lesson.room && (
                <span className="inline-flex min-w-0 items-center gap-1">
                  <MapPin aria-hidden className="size-3.5 shrink-0" />
                  <span className="truncate">{lesson.room}</span>
                </span>
              )}
            </span>
            {active && duration > 0 && (
              <progress
                className="widgetLessonProgress"
                aria-label="Lesson progress"
                value={Math.min(elapsed, duration)}
                max={duration}
              />
            )}
          </Link>
        );
      }}
    </WidgetContent>
  );
}
