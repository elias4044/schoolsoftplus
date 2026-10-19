'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Copy, Leaf, UtensilsCrossed } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fadeUp, staggerContainer } from '@/lib/animations';
import { useCachedResource } from '@/lib/cache';
import {
  fetchLunch,
  getWeek,
  lunchKey,
  prefetchLunchWeeks,
  type ApiDay,
} from '@/lib/cache/lunch';
import { cn } from '@/lib/utils';

// types
interface Dish {
  type?: string;
  text: string;
  vegetarian: boolean;
}

interface MenuDay {
  index: number;
  name: string;
  date: string;
  isToday: boolean;
  isPast: boolean;
  dishes: Dish[];
}

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const VEGETARIAN_START = /^veg(etarisk|etarian|ansk|an)?\b/i;

function parseDishes(day?: ApiDay): Dish[] {
  return (day?.dishes ?? []).flatMap((ds) => {
    const type = ds.dishType?.trim() || undefined;
    return (ds.dish ?? '')
      .split(/\r?\n\r?\n/)
      .map((s) => s.replace(/\r?\n/g, ' ').trim())
      .filter(Boolean)
      .map((text) => ({
        type,
        text,
        vegetarian: (type ? /veg/i.test(type) : false) || VEGETARIAN_START.test(text),
      }));
  });
}

export default function LunchPage() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [copied, setCopied] = useState(false);

  const { monday, week, year, range } = useMemo(() => getWeek(weekOffset), [weekOffset]);


  const {
    data,
    refreshing,
    error,
    refresh,
  } = useCachedResource(lunchKey(year, week), () => fetchLunch(year, week));
  const apiDays = useMemo(() => data ?? [], [data]);
  // Nothing to show yet (also covers the frame between switching weeks and reading the cache).
  const loading = data === null && !error;
  // Only show the error state when there's no cached data to fall back on.
  const failed = error && data === null;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable)
        return;
      if (e.key === 'ArrowLeft') setWeekOffset((o) => o - 1);
      if (e.key === 'ArrowRight') setWeekOffset((o) => o + 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Once the visible week has settled, quietly warm the neighbouring weeks.
  useEffect(() => {
    if (refreshing) return;
    void prefetchLunchWeeks([weekOffset + 1, weekOffset - 1], { maxAgeMs: 60_000 });
  }, [weekOffset, refreshing]);

  const days: MenuDay[] = useMemo(() => {
    const todayIdx = (new Date().getDay() + 6) % 7;
    return WEEKDAYS.map((name, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return {
        index: i,
        name,
        date: d.toLocaleDateString('en-SE', { month: 'short', day: 'numeric' }),
        isToday: weekOffset === 0 && i === todayIdx,
        isPast: weekOffset === 0 && todayIdx <= 4 && i < todayIdx,
        dishes: parseDishes(apiDays.find((d) => d.dayId === i + 1)),
      };
    });
  }, [monday, apiDays, weekOffset]);

  const today = days.find((d) => d.isToday);
  const others = days.filter((d) => !d.isToday);
  const ordered = [...others.filter((d) => !d.isPast), ...others.filter((d) => d.isPast)];
  const hasMenu = days.some((d) => d.dishes.length > 0);

  async function copyMenu() {
    const lines = [`Lunch menu, week ${week} (${range})`, ''];
    for (const d of days) {
      lines.push(d.name);
      if (d.dishes.length === 0) lines.push('- No menu');
      d.dishes.forEach((dish) => lines.push(`- ${dish.text}`));
      lines.push('');
    }
    try {
      await navigator.clipboard.writeText(lines.join('\n').trim());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  }

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-wrap items-center justify-between gap-3"
      >
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <UtensilsCrossed className="text-brand-strong size-6" />
            Lunch Menu
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Week {week} · {range}, {year}
            {refreshing && !loading && (
              <span className="ml-2 animate-pulse text-xs opacity-60">· Updating</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={copyMenu} disabled={loading || !hasMenu}>
            {copied ? <Check className="text-success" /> : <Copy />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setWeekOffset((o) => o - 1)}
              aria-label="Previous week"
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWeekOffset(0)}
              disabled={weekOffset === 0}
            >
              This week
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              onClick={() => setWeekOffset((o) => o + 1)}
              aria-label="Next week"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <MenuSkeleton />
      ) : failed ? (
        <EmptyState
          title="Couldn't load the menu"
          action={
            <Button variant="secondary" size="sm" onClick={refresh}>
              Try again
            </Button>
          }
        />
      ) : !hasMenu ? (
        <EmptyState
          title="No lunch menu this week"
          description="The menu hasn't been published for these days."
        />
      ) : (
        <motion.div
          key={`${year}-${week}`}
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          {today && (
            <motion.div variants={fadeUp}>
              <TodayCard day={today} />
            </motion.div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            {ordered.map((day) => (
              <motion.div key={day.index} variants={fadeUp}>
                <DayCard day={day} />
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

function DishList({ dishes, large }: { dishes: Dish[]; large?: boolean }) {
  const showTypes = new Set(dishes.map((d) => d.type).filter(Boolean)).size > 1;

  return (
    <ul className={cn(large ? 'space-y-2.5' : 'space-y-2')}>
      {dishes.map((dish, i) => (
        <li
          key={i}
          className={cn(
            'flex items-start gap-2.5',
            large ? 'text-base leading-6' : 'text-sm leading-5'
          )}
        >
          <span
            className={cn('flex w-3.5 shrink-0 items-center justify-center', large ? 'h-6' : 'h-5')}
          >
            {dish.vegetarian ? (
              <Leaf className="text-success size-3.5" />
            ) : (
              <span className="bg-brand size-1.5 rounded-full" />
            )}
          </span>
          <span className="text-foreground/90 min-w-0">
            {showTypes && dish.type && (
              <span className="text-muted-foreground mr-2 text-[10px] font-medium tracking-wide uppercase">
                {dish.type}
              </span>
            )}
            {dish.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

function TodayCard({ day }: { day: MenuDay }) {
  return (
    <section className="today-card rounded-2xl border p-5 md:p-6">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-brand-strong text-xs font-medium tracking-wider uppercase">Today</p>
          <h2 className="text-xl font-semibold tracking-tight">
            {day.name} <span className="text-muted-foreground font-normal">· {day.date}</span>
          </h2>
        </div>
      </header>
      {day.dishes.length === 0 ? (
        <p className="text-muted-foreground text-sm">No menu today</p>
      ) : (
        <DishList dishes={day.dishes} large />
      )}
    </section>
  );
}

function DayCard({ day }: { day: MenuDay }) {
  return (
    <section className={cn('card-base h-full p-4 transition-opacity', day.isPast && 'opacity-50')}>
      <header className="mb-2.5 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{day.name}</h2>
        <span className="text-muted-foreground text-xs">{day.date}</span>
      </header>
      {day.dishes.length === 0 ? (
        <p className="text-muted-foreground text-xs">No menu</p>
      ) : (
        <DishList dishes={day.dishes} />
      )}
    </section>
  );
}

function MenuSkeleton() {
  return (
    <div className="space-y-3">
      <div className="card-base space-y-3 p-6">
        <div className="skeleton h-4 w-16" />
        <div className="skeleton h-6 w-40" />
        <div className="skeleton h-5 w-3/4" />
        <div className="skeleton h-5 w-2/3" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="card-base space-y-2.5 p-4">
            <div className="skeleton h-4 w-24" />
            <div className="skeleton h-4 w-full" />
            <div className="skeleton h-4 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card-base flex flex-col items-center gap-2 px-6 py-16 text-center">
      <UtensilsCrossed className="text-muted-foreground/50 size-8" />
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-muted-foreground text-xs">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}