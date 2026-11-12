'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, CalendarDays } from 'lucide-react';

import { useDashboardSchedule } from './ScheduleWidget';

const stockholm = 'Europe/Stockholm';
const schoolDate = new Intl.DateTimeFormat('sv-SE', { dateStyle: 'short', timeZone: stockholm });
const headingDate = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: stockholm,
});
const schoolTime = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: stockholm,
});
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const dayLength = 86_400_000;
const weekdayName = new Intl.DateTimeFormat('en-GB', { weekday: 'long', timeZone: 'UTC' });

export function SchoolWeekPlanner({ name }: { name?: string }) {
  const [now, setNow] = useState<Date | null>(null);
  const [selection, setSelection] = useState<{ week: number; date: string } | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 15_000);
    window.addEventListener('focus', update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', update);
    };
  }, []);

  const today = now ? new Date(schoolDate.format(now) + 'T00:00:00Z') : null;
  const dayIndex = today ? (today.getUTCDay() + 6) % 7 : -1;
  const monday = today ? today.getTime() - dayIndex * dayLength : null;
  const thursday = monday === null ? null : new Date(monday + 3 * dayLength);
  const week = thursday
    ? Math.ceil(
        ((thursday.getTime() - Date.UTC(thursday.getUTCFullYear(), 0, 1)) / dayLength + 1) / 7
      )
    : null;
  const activeDate = selection?.week === week ? selection?.date : today?.toISOString().slice(0, 10);

  return (
    <section className="planner" aria-label="School week planner">
      <div className="plannerIntro">
        <h2 className="plannerDate">{now ? headingDate.format(now) : 'This week'}</h2>
        <p className="plannerGreeting">
          {name ? `Hi, ${name}` : 'Your school day'}
          {now && <time dateTime={now.toISOString()}>{schoolTime.format(now)}</time>}
        </p>
      </div>
      <div className="plannerCalendar">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{week ? `Week ${week}` : 'School week'}</p>
          <Link className="plannerLink" href="/schedule">
            <CalendarDays aria-hidden className="size-4" /> Schedule{' '}
            <ArrowUpRight aria-hidden className="size-3.5" />
          </Link>
        </div>
        <ol className="plannerDays" aria-label="Days this week">
          {weekdays.map((day, index) => {
            const date = monday === null ? null : new Date(monday + index * dayLength);
            const dateKey = date?.toISOString().slice(0, 10);
            return (
              <li key={day}>
                <button
                  type="button"
                  aria-label={date ? headingDate.format(date) : day}
                  aria-current={index === dayIndex ? 'date' : undefined}
                  aria-pressed={Boolean(dateKey && activeDate === dateKey)}
                  className="plannerDay"
                  disabled={!dateKey}
                  onClick={() => {
                    if (week && dateKey)
                      setSelection(index === dayIndex ? null : { week, date: dateKey });
                  }}
                  style={{ animationDelay: `${index * 28}ms` }}
                >
                  <span className="text-xs font-medium">{day}</span>
                  <span className="text-base font-semibold tabular-nums">
                    {date?.getUTCDate() ?? '-'}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <p className="plannerPreview" role="status">
          {week && activeDate && <DayPreview key={week} week={week} date={activeDate} />}
        </p>
      </div>
    </section>
  );
}

function DayPreview({ week, date }: { week: number; date: string }) {
  const { data, loading, error } = useDashboardSchedule(week);
  if (loading) return 'Loading lessons...';
  if (error && !data) return 'Could not load lessons. Open Schedule to retry.';
  const day = weekdayName.format(new Date(date + 'T00:00:00Z'));
  const lessons = data?.filter((lesson) => lesson.date === date) ?? [];
  return (
    <span key={date} className="plannerPreviewText">
      <strong>{day}</strong>
      {lessons.length
        ? `${lessons.length} ${lessons.length === 1 ? 'lesson' : 'lessons'} / First at ${lessons[0].start}`
        : 'No lessons scheduled'}
    </span>
  );
}
