"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Check, ChevronLeft, ChevronRight, Copy, Leaf, UtensilsCrossed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { staggerContainer, fadeUp } from "@/components/dashboard-card";
import { apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface ApiDish {
  dishType?: string;
  dish?: string;
}

interface ApiDay {
  dayId: number;
  dishes?: ApiDish[];
}

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

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const VEGETARIAN_START = /^veg(etarisk|etarian|ansk|an)?\b/i;

function getWeek(offset: number) {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7) + offset * 7);
  monday.setHours(0, 0, 0, 0);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const thursday = new Date(monday);
  thursday.setDate(monday.getDate() + 3);
  const year = thursday.getFullYear();

  const jan4 = new Date(year, 0, 4);
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const week = 1 + Math.round((monday.getTime() - firstMonday.getTime()) / (7 * 86_400_000));

  const fmt = (d: Date) => d.toLocaleDateString("en-SE", { month: "short", day: "numeric" });

  return { monday, week, year, range: `${fmt(monday)} – ${fmt(friday)}` };
}

function parseDishes(day?: ApiDay): Dish[] {
  return (day?.dishes ?? []).flatMap((ds) => {
    const type = ds.dishType?.trim() || undefined;
    return (ds.dish ?? "")
      .split(/\r?\n\r?\n/)
      .map((s) => s.replace(/\r?\n/g, " ").trim())
      .filter(Boolean)
      .map((text) => ({
        type,
        text,
        vegetarian: (type ? /veg/i.test(type) : false) || VEGETARIAN_START.test(text),
      }));
  });
}

export default function LunchPage() {
  const [apiDays, setApiDays] = useState<ApiDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [weekOffset, setWeekOffset] = useState(0);
  const [copied, setCopied] = useState(false);

  const { monday, week, year, range } = useMemo(() => getWeek(weekOffset), [weekOffset]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    apiFetch<{ success: boolean; data: ApiDay[] }>("/api/lunch", { params: { week, year } })
      .then((res) => {
        if (!cancelled) setApiDays(Array.isArray(res?.data) ? res.data : []);
      })
      .catch(() => {
        if (cancelled) return;
        setApiDays([]);
        setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [week, year, reloadKey]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable) return;
      if (e.key === "ArrowLeft") setWeekOffset((o) => o - 1);
      if (e.key === "ArrowRight") setWeekOffset((o) => o + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const days: MenuDay[] = useMemo(() => {
    const todayIdx = (new Date().getDay() + 6) % 7;
    return WEEKDAYS.map((name, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return {
        index: i,
        name,
        date: d.toLocaleDateString("en-SE", { month: "short", day: "numeric" }),
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
    const lines = [`Lunch menu, week ${week} (${range})`, ""];
    for (const d of days) {
      lines.push(d.name);
      if (d.dishes.length === 0) lines.push("- No menu");
      d.dishes.forEach((dish) => lines.push(`- ${dish.text}`));
      lines.push("");
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n").trim());
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
            <UtensilsCrossed className="size-6 text-brand-strong" />
            Lunch Menu
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Week {week} · {range}, {year}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={copyMenu} disabled={loading || !hasMenu}>
            {copied ? <Check className="text-success" /> : <Copy />}
            {copied ? "Copied" : "Copy"}
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
      ) : error ? (
        <EmptyState
          title="Couldn't load the menu"
          action={
            <Button variant="secondary" size="sm" onClick={() => setReloadKey((k) => k + 1)}>
              Try again
            </Button>
          }
        />
      ) : !hasMenu ? (
        <EmptyState title="No lunch menu this week" description="The menu hasn't been published for these days." />
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
    <ul className={cn(large ? "space-y-2.5" : "space-y-2")}>
      {dishes.map((dish, i) => (
        <li key={i} className={cn("flex items-start gap-2.5", large ? "text-base leading-6" : "text-sm leading-5")}>
          <span className={cn("flex w-3.5 shrink-0 items-center justify-center", large ? "h-6" : "h-5")}>
            {dish.vegetarian ? (
              <Leaf className="size-3.5 text-success" />
            ) : (
              <span className="size-1.5 rounded-full bg-brand" />
            )}
          </span>
          <span className="min-w-0 text-foreground/90">
            {showTypes && dish.type && (
              <span className="mr-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
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
          <p className="text-xs font-medium uppercase tracking-wider text-brand-strong">Today</p>
          <h2 className="text-xl font-semibold tracking-tight">
            {day.name} <span className="font-normal text-muted-foreground">· {day.date}</span>
          </h2>
        </div>
      </header>
      {day.dishes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No menu today</p>
      ) : (
        <DishList dishes={day.dishes} large />
      )}
    </section>
  );
}

function DayCard({ day }: { day: MenuDay }) {
  return (
    <section className={cn("card-base h-full p-4 transition-opacity", day.isPast && "opacity-50")}>
      <header className="mb-2.5 flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold">{day.name}</h2>
        <span className="text-xs text-muted-foreground">{day.date}</span>
      </header>
      {day.dishes.length === 0 ? (
        <p className="text-xs text-muted-foreground">No menu</p>
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
      <UtensilsCrossed className="size-8 text-muted-foreground/50" />
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}