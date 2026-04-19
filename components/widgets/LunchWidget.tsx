"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import type { WidgetSize } from "@/lib/widgets/types";

interface LunchDay { day: string; meals: string[] }
interface Props { size: WidgetSize }

function getWeekInfo(offset: number) {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - startOfYear.getTime()) / 86400000);
  const week = String(Math.ceil((dayOfYear + startOfYear.getDay() + 1) / 7) + offset).padStart(2, "0");
  const year = String(now.getFullYear());
  const d = new Date(now);
  d.setDate(d.getDate() + offset * 7);
  const label = `Week ${week}, ${year}`;
  return { week, year, label };
}

export default function LunchWidget({ size }: Props) {
  const [menu, setMenu]     = useState<LunchDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset]   = useState(0);

  const { week, year, label } = getWeekInfo(offset);

  useEffect(() => {
    setLoading(true);
    type ApiDish = { dish?: string };
    type ApiDay  = { dayId: number; dishes?: ApiDish[] };
    const weekdays = ["Monday","Tuesday","Wednesday","Thursday","Friday"];

    apiFetch<{ success: boolean; data: ApiDay[] }>("/api/lunch", { params: { week, year } })
      .then(res => {
        const arr = Array.isArray(res?.data) ? res.data : [];
        setMenu(arr.map(d => ({
          day: weekdays[(d.dayId ?? 1) - 1] ?? `Day ${d.dayId}`,
          meals: (d.dishes ?? [])
            .flatMap(ds => (ds.dish ?? "").split(/\r?\n\r?\n/))
            .map(s => s.replace(/\r?\n/g, " ").trim())
            .filter(Boolean),
        })));
      })
      .catch(() => setMenu([]))
      .finally(() => setLoading(false));
  }, [week, year]);

  const today = new Date().toLocaleDateString("en-SE", { weekday: "long" });
  const compact = size === "2x1" || size === "1x2" || size === "1x1";

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="w-5 h-5" onClick={() => setOffset(o => o - 1)}>
            <ChevronLeft className="w-3 h-3" />
          </Button>
          <Button variant="ghost" size="icon" className="w-5 h-5" onClick={() => setOffset(o => o + 1)}>
            <ChevronRight className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse" />)}
        </div>
      ) : menu.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">No menu available.</p>
      ) : (
        <div className="space-y-2 overflow-y-auto flex-1">
          {(compact ? menu.filter(d => d.day === today) || menu.slice(0,2) : menu).map(day => (
            <div key={day.day}
              className={`rounded-lg p-2.5 ${day.day === today ? "bg-brand-dim border border-primary/20" : "bg-white/3"}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs font-semibold">{day.day}</p>
                {day.day === today && (
                  <Badge className="text-[9px] px-1.5 py-0"
                    style={{ background:"oklch(0.65 0.22 278 / 20%)", color:"oklch(0.75 0.15 278)", border:"1px solid oklch(0.65 0.22 278 / 30%)" }}>
                    Today
                  </Badge>
                )}
              </div>
              {day.meals.length === 0 ? (
                <p className="text-[10px] text-muted-foreground">No menu</p>
              ) : (
                <ul className="space-y-0.5">
                  {day.meals.map((m, i) => (
                    <li key={i} className="text-[11px] text-foreground/80 flex items-start gap-1.5">
                      <span className="text-primary/50 shrink-0 mt-0.5">·</span>{m}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
