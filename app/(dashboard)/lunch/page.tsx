"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { UtensilsCrossed, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { staggerContainer, fadeUp } from "@/components/dashboard-card";
import { apiFetch } from "@/lib/api-client";

interface LunchDay {
  day: string;
  meals: string[];
}

export default function LunchPage() {
  const [menu, setMenu] = useState<LunchDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const { week, year, label } = getWeekInfo(weekOffset);

  useEffect(() => {
    setLoading(true);

    type ApiDish = { dishType?: string; dish?: string };
    type ApiDay = { dayId: number; dishes?: ApiDish[] };

    // Map dayId 1..5 -> weekday names (assume 1 = Monday)
    const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

    apiFetch<{ success: boolean; data: ApiDay[] }>("/api/lunch", { params: { week, year } })
      .then((res) => {
        const arr = Array.isArray(res?.data) ? res.data : [];
        const mapped: LunchDay[] = arr.map((d) => {
          const dayName = weekdays[(d.dayId ?? 1) - 1] ?? `Day ${d.dayId}`;

          // Each dish string may contain multiple alternatives separated by
          // double newlines. Split on blank lines, normalize newlines, and
          // trim. We keep each alternative as its own meal entry.
          const meals = (d.dishes ?? [])
            .flatMap((ds) => (ds.dish ?? "").split(/\r?\n\r?\n/))
            .map((s) => s.replace(/\r?\n/g, " ").trim())
            .filter(Boolean);

          return { day: dayName, meals };
        });

        setMenu(mapped);
      })
      .catch(() => setMenu([]))
      .finally(() => setLoading(false));
  }, [week, year]);

  const todayName = new Date().toLocaleDateString("en-SE", { weekday: "long" });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-primary" />
            Lunch Menu
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{label}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="w-8 h-8 border-white/10 bg-white/5"
            onClick={() => setWeekOffset(o => o - 1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 bg-white/5 text-xs"
            onClick={() => setWeekOffset(0)}
          >
            This week
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="w-8 h-8 border-white/10 bg-white/5"
            onClick={() => setWeekOffset(o => o + 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </motion.div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 rounded-xl bg-card border border-white/7 animate-pulse" />
          ))}
        </div>
      ) : menu.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No lunch menu available for this week.
        </div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-3"
        >
          {menu.map((day, i) => {
            const isToday = day.day.toLowerCase() === todayName.toLowerCase();
            return (
              <motion.div
                key={i}
                variants={fadeUp}
                className="rounded-xl border p-4"
                style={{
                  border: isToday
                    ? "1px solid oklch(0.65 0.22 278 / 30%)"
                    : "1px solid oklch(1 0 0 / 7%)",
                  background: isToday ? "oklch(0.65 0.22 278 / 8%)" : "var(--card)",
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-sm font-semibold capitalize">{day.day}</p>
                  {isToday && (
                    <Badge
                      className="text-[9px] px-1.5 py-0"
                      style={{
                        background: "oklch(0.65 0.22 278 / 20%)",
                        color: "oklch(0.75 0.15 278)",
                        border: "1px solid oklch(0.65 0.22 278 / 30%)",
                      }}
                    >
                      Today
                    </Badge>
                  )}
                </div>
                {day.meals.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No menu</p>
                ) : (
                  <ul className="space-y-1">
                    {day.meals.map((meal, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-foreground/80">
                        <span className="text-primary mt-1">·</span>
                        {meal}
                      </li>
                    ))}
                  </ul>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

function getWeekInfo(offset: number) {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  const week = Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7) + offset;
  const year = now.getFullYear();
  return { week, year, label: `Week ${week}, ${year}` };
}
