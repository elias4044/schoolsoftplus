'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, UtensilsCrossed } from 'lucide-react';

import { readCache, useCachedResource } from '@/lib/cache';
import { fetchLunch, getWeek, lunchKey, type ApiDay } from '@/lib/cache/lunch';
import { DAYS, DAYS_SHORT } from '@/lib/schedule-utils';
import { Button } from '@/components/ui/button';

import { WidgetContent, WidgetNotice, WidgetTag } from './WidgetContent';

export default function LunchWidget() {
  const [offset, setOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const { week, year, range } = getWeek(offset);
  const key = lunchKey(year, week);
  const today = ((new Date().getDay() + 6) % 7) + 1;
  const preferredDay = selectedDay ?? (offset === 0 && today <= 5 ? today : 1);

  function moveWeek(delta: number) {
    setOffset((value) => value + delta);
    setSelectedDay(null);
  }

  return (
    <>
      <div className="widgetToolbar">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Previous lunch week"
          onClick={() => moveWeek(-1)}
        >
          <ChevronLeft />
        </Button>
        <span className="text-center tabular-nums" aria-live="polite">
          {range}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Next lunch week"
          onClick={() => moveWeek(1)}
        >
          <ChevronRight />
        </Button>
      </div>
      <LunchMenu
        key={key}
        year={year}
        week={week}
        preferredDay={preferredDay}
        today={offset === 0 ? today : null}
        onSelectDay={setSelectedDay}
      />
    </>
  );
}

function LunchMenu({
  year,
  week,
  preferredDay,
  today,
  onSelectDay,
}: {
  year: number;
  week: number;
  preferredDay: number;
  today: number | null;
  onSelectDay: (day: number) => void;
}) {
  const key = lunchKey(year, week);
  const resource = useCachedResource<ApiDay[]>(key, (force) => {
    const cached = readCache<ApiDay[]>(key);
    return !force && cached && Date.now() - cached.savedAt < 60_000
      ? Promise.resolve(cached.data)
      : fetchLunch(year, week);
  });
  return (
    <WidgetContent resource={resource} empty="No lunch menu for this week.">
      {(menu) => {
        const days = [...menu].sort((a, b) => a.dayId - b.dayId);
        const day = days.find((item) => item.dayId === preferredDay) ?? days[0];
        if (!day) return null;
        const label = (id: number) => DAYS[id - 1] ?? `Day ${id}`;
        const meals = (day.dishes ?? [])
          .flatMap(({ dish }) => (dish ?? '').split(/\r?\n\r?\n/))
          .map((dish) => dish.replace(/\s+/g, ' ').trim())
          .filter(Boolean);
        return (
          <>
            <div role="group" aria-label="Lunch day" className="widgetWeekdays">
              {days.map(({ dayId }) => (
                <button
                  key={dayId}
                  type="button"
                  className="widgetControl"
                  aria-label={label(dayId)}
                  aria-current={dayId === today ? 'date' : undefined}
                  aria-pressed={dayId === day.dayId}
                  onClick={() => onSelectDay(dayId)}
                >
                  {DAYS_SHORT[dayId - 1] ?? dayId}
                </button>
              ))}
            </div>
            <div className="mt-2.5 space-y-1.5">
              <p className="flex items-center justify-between gap-2 text-sm font-semibold">
                {label(day.dayId)}
                {day.dayId === today && <WidgetTag active>Today</WidgetTag>}
              </p>
              {meals.length ? (
                <ul className="divide-border/70 divide-y">
                  {meals.map((meal, index) => (
                    <li key={index} className="flex items-start gap-2 py-2 text-sm leading-snug">
                      <UtensilsCrossed
                        aria-hidden
                        className="text-muted-foreground mt-0.5 size-3.5 shrink-0"
                      />
                      {meal}
                    </li>
                  ))}
                </ul>
              ) : (
                <WidgetNotice>No meals listed for this day.</WidgetNotice>
              )}
            </div>
          </>
        );
      }}
    </WidgetContent>
  );
}
