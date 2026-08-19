"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  MapPin,
  User,
  Users,
  Sparkles,
  CheckCircle2,
  Coffee,
  ChevronRight,
  Layers,
} from "lucide-react";
import {
  type DaySchedule,
  type ScheduleLesson,
  formatDuration,
  getSubjectStyle,
} from "./schedule-types";
import { Badge } from "@/components/ui/badge";

interface ScheduleDayViewProps {
  days: DaySchedule[];
  searchQuery?: string;
  selectedGroup?: string;
  onSelectLesson?: (lesson: ScheduleLesson) => void;
}

export function ScheduleDayView({
  days,
  searchQuery = "",
  selectedGroup = "all",
  onSelectLesson,
}: ScheduleDayViewProps) {
  // Default to today or first day
  const todayIndex = days.findIndex((d) => d.isToday);
  const [selectedDayKey, setSelectedDayKey] = useState<string>(
    days[todayIndex !== -1 ? todayIndex : 0]?.key ?? ""
  );

  const currentDay = useMemo(() => {
    return days.find((d) => d.key === selectedDayKey) ?? days[0];
  }, [days, selectedDayKey]);

  const nowMinutes = (() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  })();

  // Group lessons by startMinutes to easily detect concurrent slots
  const timeSlots = useMemo(() => {
    if (!currentDay) return [];
    const map = new Map<string, ScheduleLesson[]>();

    currentDay.lessons.forEach((l) => {
      const key = `${l.start}-${l.end}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(l);
    });

    return Array.from(map.entries()).map(([timeKey, slotLessons]) => ({
      timeKey,
      start: slotLessons[0].start,
      end: slotLessons[0].end,
      startMinutes: slotLessons[0].startMinutes,
      endMinutes: slotLessons[0].endMinutes,
      durationMinutes: slotLessons[0].durationMinutes,
      lessons: slotLessons,
      isConcurrent: slotLessons.length > 1,
    })).sort((a, b) => a.startMinutes - b.startMinutes);
  }, [currentDay]);

  // Find ongoing or next lesson
  const statusInfo = useMemo(() => {
    if (!currentDay || !currentDay.isToday || currentDay.lessons.length === 0) {
      return null;
    }

    const ongoing = currentDay.lessons.find(
      (l) => nowMinutes >= l.startMinutes && nowMinutes < l.endMinutes
    );

    if (ongoing) {
      const remaining = ongoing.endMinutes - nowMinutes;
      const elapsed = nowMinutes - ongoing.startMinutes;
      const progress = Math.min(100, Math.max(0, (elapsed / ongoing.durationMinutes) * 100));
      return {
        type: "ongoing" as const,
        lesson: ongoing,
        message: `Ends in ${remaining}m`,
        progress,
      };
    }

    const next = currentDay.lessons.find((l) => l.startMinutes > nowMinutes);
    if (next) {
      const until = next.startMinutes - nowMinutes;
      return {
        type: "next" as const,
        lesson: next,
        message: until > 60 ? `Starts at ${next.start}` : `Starts in ${until}m`,
        progress: 0,
      };
    }

    return {
      type: "done" as const,
      lesson: null,
      message: "Done for today!",
      progress: 100,
    };
  }, [currentDay, nowMinutes]);

  return (
    <div className="flex flex-col h-full bg-surface-0 rounded-2xl border border-border overflow-hidden">
      {/* Day Selector Tabs Bar */}
      <div className="p-3 border-b border-border bg-surface-1 shrink-0 flex items-center justify-between gap-2 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 min-w-full sm:min-w-0">
          {days.map((day) => {
            const isSelected = day.key === selectedDayKey;
            return (
              <button
                key={day.key}
                type="button"
                onClick={() => setSelectedDayKey(day.key)}
                className={`relative px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shrink-0 active:scale-95 ${
                  isSelected
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground bg-surface-2/60 hover:bg-surface-2 border border-border"
                }`}
              >
                {isSelected && (
                  <motion.div
                    layoutId="activeScheduleDay"
                    className="absolute inset-0 rounded-xl bg-primary"
                    transition={{ type: "spring", stiffness: 450, damping: 32 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <span>{day.dayName}</span>
                  <span className={`text-[10px] ${isSelected ? "opacity-90" : "text-muted-foreground"}`}>
                    {day.shortDate}
                  </span>
                  {day.isToday && (
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-primary-foreground" : "bg-primary"}`} />
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground shrink-0 pr-1">
          <span>{currentDay?.lessons.length ?? 0} lessons</span>
        </div>
      </div>

      {/* Main Agenda Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 max-w-4xl mx-auto w-full">
        {/* Status Card (Today only) */}
        {currentDay?.isToday && statusInfo && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`p-4 rounded-2xl border relative overflow-hidden ${
              statusInfo.type === "ongoing"
                ? "bg-primary/10 border-primary/30"
                : statusInfo.type === "next"
                ? "bg-surface-1 border-border"
                : "bg-surface-1/60 border-border"
            }`}
          >
            {statusInfo.type === "ongoing" && statusInfo.lesson && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                    Ongoing Lesson
                  </span>
                  <span className="text-xs font-mono font-semibold text-primary">
                    {statusInfo.message}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-foreground">
                      {statusInfo.lesson.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {statusInfo.lesson.room ? `Room ${statusInfo.lesson.room}` : ""}
                      {statusInfo.lesson.room && statusInfo.lesson.teacher ? " · " : ""}
                      {statusInfo.lesson.teacher ?? ""}
                    </p>
                  </div>

                  <span className="text-xs text-muted-foreground font-mono">
                    {statusInfo.lesson.start}–{statusInfo.lesson.end}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-full bg-surface-2 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500 rounded-full"
                    style={{ width: `${statusInfo.progress}%` }}
                  />
                </div>
              </div>
            )}

            {statusInfo.type === "next" && statusInfo.lesson && (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-surface-2 border border-border flex items-center justify-center text-primary">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Up Next
                    </span>
                    <h4 className="text-sm font-bold text-foreground">
                      {statusInfo.lesson.name}
                    </h4>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-semibold text-primary">
                    {statusInfo.message}
                  </span>
                  <p className="text-[10px] text-muted-foreground">
                    {statusInfo.lesson.room ? `Room ${statusInfo.lesson.room}` : ""}
                  </p>
                </div>
              </div>
            )}

            {statusInfo.type === "done" && (
              <div className="flex items-center gap-3 py-1">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-foreground">All lessons finished for today</h4>
                  <p className="text-xs text-muted-foreground">Great work! You have completed all classes for {currentDay.dayName}.</p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Timeline Lessons */}
        {timeSlots.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground space-y-2">
            <Coffee className="w-10 h-10 mx-auto opacity-30 stroke-[1.5]" />
            <h3 className="text-sm font-semibold text-foreground">No lessons scheduled</h3>
            <p className="text-xs text-muted-foreground">Enjoy your free day or break!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {timeSlots.map((slot, idx) => {
              const isOngoing =
                currentDay?.isToday &&
                nowMinutes >= slot.startMinutes &&
                nowMinutes < slot.endMinutes;

              // Check gap between previous slot to show break
              const prevSlot = idx > 0 ? timeSlots[idx - 1] : null;
              const gapMinutes = prevSlot ? slot.startMinutes - prevSlot.endMinutes : 0;
              const showBreak = gapMinutes >= 15;

              return (
                <div key={slot.timeKey} className="space-y-3">
                  {/* Break / Gap Block */}
                  {showBreak && (
                    <div className="flex items-center gap-3 py-1 px-4 text-xs text-muted-foreground/60">
                      <div className="h-px bg-border/80 flex-1" />
                      <span className="flex items-center gap-1.5 text-[11px] font-medium">
                        <Coffee className="w-3 h-3" />
                        {gapMinutes >= 35 ? "Lunch Break" : "Break"} ({formatDuration(gapMinutes)})
                      </span>
                      <div className="h-px bg-border/80 flex-1" />
                    </div>
                  )}

                  {/* Slot Container */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3 p-3.5 rounded-2xl bg-surface-1 border border-border relative">
                    {/* Time Column */}
                    <div className="sm:w-28 shrink-0 flex sm:flex-col items-center sm:items-start justify-between sm:justify-start gap-1 pb-2 sm:pb-0 border-b sm:border-b-0 sm:border-r border-border/60 sm:pr-3">
                      <span className="text-xs font-bold text-foreground font-mono tabular-nums">
                        {slot.start} – {slot.end}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-medium">
                        {formatDuration(slot.durationMinutes)}
                      </span>
                      {isOngoing && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-primary text-primary-foreground mt-1">
                          Now
                        </span>
                      )}
                    </div>

                    {/* Lesson / Concurrent Lessons Cards */}
                    <div className="flex-1 min-w-0">
                      {slot.isConcurrent && (
                        <div className="flex items-center gap-1 text-[10px] font-semibold text-primary mb-2">
                          <Layers className="w-3 h-3" />
                          <span>Parallel Classes ({slot.lessons.length} options)</span>
                        </div>
                      )}

                      <div className={`grid gap-2.5 ${slot.isConcurrent ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
                        {slot.lessons.map((lesson) => {
                          const style = getSubjectStyle(lesson.name, lesson.eventColor);
                          const matches =
                            !searchQuery ||
                            lesson.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            lesson.teacher?.toLowerCase().includes(searchQuery.toLowerCase());

                          return (
                            <motion.div
                              key={lesson.eventId}
                              whileHover={{ scale: 1.01 }}
                              whileTap={{ scale: 0.99 }}
                              onClick={() => onSelectLesson?.(lesson)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                                matches ? "opacity-100" : "opacity-30"
                              }`}
                              style={{
                                backgroundColor: style.bg,
                                borderColor: style.border,
                              }}
                            >
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <h4
                                  className="text-sm font-bold leading-snug truncate"
                                  style={{ color: style.text }}
                                >
                                  {lesson.name}
                                </h4>

                                {lesson.teachingGroup && (
                                  <Badge
                                    variant="outline"
                                    className="text-[9px] font-semibold uppercase shrink-0"
                                    style={{
                                      backgroundColor: style.badgeBg,
                                      color: style.accent,
                                      borderColor: style.border,
                                    }}
                                  >
                                    {lesson.teachingGroup}
                                  </Badge>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                {lesson.room && (
                                  <span className="flex items-center gap-1 font-medium text-foreground/80">
                                    <MapPin className="w-3 h-3 opacity-70" />
                                    {lesson.room}
                                  </span>
                                )}
                                {lesson.teacher && (
                                  <span className="flex items-center gap-1">
                                    <User className="w-3 h-3 opacity-70" />
                                    {lesson.teacher}
                                  </span>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
