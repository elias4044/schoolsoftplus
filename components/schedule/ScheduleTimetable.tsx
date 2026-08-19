"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, MapPin, User, Users, Info, X, Calendar, Layers } from "lucide-react";
import {
  type DaySchedule,
  type ScheduleLesson,
  type PositionedLesson,
  DAY_START_HOUR,
  DAY_END_HOUR,
  TOTAL_DAY_MINUTES,
  timeToMinutes,
  minutesToTime,
  formatDuration,
  getSubjectStyle,
} from "./schedule-types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ScheduleTimetableProps {
  days: DaySchedule[];
  searchQuery?: string;
  selectedGroup?: string;
  onSelectLesson?: (lesson: ScheduleLesson) => void;
}

export function ScheduleTimetable({
  days,
  searchQuery = "",
  selectedGroup = "all",
  onSelectLesson,
}: ScheduleTimetableProps) {
  const [selectedLesson, setSelectedLesson] = useState<ScheduleLesson | null>(null);
  const [nowMinutes, setNowMinutes] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });

  // Keep live time updated every minute
  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setNowMinutes(d.getHours() * 60 + d.getMinutes());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const timeSlots = Array.from(
    { length: DAY_END_HOUR - DAY_START_HOUR + 1 },
    (_, i) => DAY_START_HOUR + i
  );

  const isCurrentTimeInRange =
    nowMinutes >= DAY_START_HOUR * 60 && nowMinutes <= DAY_END_HOUR * 60;
  const currentTimeTopPct = isCurrentTimeInRange
    ? ((nowMinutes - DAY_START_HOUR * 60) / TOTAL_DAY_MINUTES) * 100
    : null;

  const handleCardClick = (lesson: ScheduleLesson) => {
    setSelectedLesson(lesson);
    if (onSelectLesson) onSelectLesson(lesson);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface-0 rounded-2xl border border-border">
      {/* Timetable Scroll Container */}
      <div className="flex-1 overflow-x-auto overflow-y-auto relative min-w-[760px]">
        {/* Header Row: Days */}
        <div className="sticky top-0 z-20 flex border-b border-border bg-surface-1/95 backdrop-blur-md">
          {/* Time Column Header Spacer */}
          <div className="w-14 sm:w-16 shrink-0 py-2.5 px-2 text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-r border-border/80">
            Time
          </div>

          {/* 5 Day Headers */}
          <div className="flex-1 grid grid-cols-5 divide-x divide-border">
            {days.map((day) => (
              <div
                key={day.key}
                className={`py-2 px-2.5 text-center transition-colors ${
                  day.isToday ? "bg-primary/10" : ""
                }`}
              >
                <div className="flex items-center justify-center gap-1.5">
                  <span
                    className={`text-xs font-bold ${
                      day.isToday ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {day.dayName}
                  </span>
                  {day.isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  )}
                </div>
                <span className="text-[10px] text-muted-foreground">{day.shortDate}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Grid Body */}
        <div className="flex relative" style={{ height: "720px" }}>
          {/* Left Time Axis */}
          <div className="w-14 sm:w-16 shrink-0 border-r border-border/80 bg-surface-1/40 select-none relative">
            {timeSlots.map((hour) => {
              const topPct =
                ((hour * 60 - DAY_START_HOUR * 60) / TOTAL_DAY_MINUTES) * 100;
              return (
                <div
                  key={hour}
                  className="absolute left-0 right-0 -translate-y-1/2 flex items-center justify-center text-[10px] font-mono text-muted-foreground/70"
                  style={{ top: `${topPct}%` }}
                >
                  {String(hour).padStart(2, "0")}:00
                </div>
              );
            })}
          </div>

          {/* 5 Day Columns Grid */}
          <div className="flex-1 grid grid-cols-5 divide-x divide-border relative">
            {/* Horizontal Hour Lines */}
            {timeSlots.map((hour) => {
              const topPct =
                ((hour * 60 - DAY_START_HOUR * 60) / TOTAL_DAY_MINUTES) * 100;
              return (
                <div
                  key={hour}
                  className="absolute left-0 right-0 border-t border-border/40 pointer-events-none"
                  style={{ top: `${topPct}%` }}
                />
              );
            })}

            {/* Half-Hour subtle dashed lines */}
            {timeSlots.slice(0, -1).map((hour) => {
              const topPct =
                ((hour * 60 + 30 - DAY_START_HOUR * 60) / TOTAL_DAY_MINUTES) * 100;
              return (
                <div
                  key={`half-${hour}`}
                  className="absolute left-0 right-0 border-t border-dashed border-border/20 pointer-events-none"
                  style={{ top: `${topPct}%` }}
                />
              );
            })}

            {/* Day Columns */}
            {days.map((day) => {
              return (
                <div
                  key={day.key}
                  className={`relative h-full transition-colors ${
                    day.isToday ? "bg-primary/[0.02]" : ""
                  }`}
                >
                  {/* Live Time Red/Primary Indicator Line (Today only) */}
                  {day.isToday && currentTimeTopPct !== null && (
                    <div
                      className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
                      style={{ top: `${currentTimeTopPct}%` }}
                    >
                      <span className="w-2 h-2 rounded-full bg-primary -ml-1 shadow-sm" />
                      <div className="h-[2px] bg-primary flex-1 opacity-90 shadow-sm" />
                    </div>
                  )}

                  {/* Render Positioned Lessons */}
                  {day.positionedLessons.map((pos) => {
                    const { lesson, topPct, heightPct, leftPct, widthPct, totalCols } = pos;
                    const isConcurrent = totalCols > 1;
                    const style = getSubjectStyle(lesson.name, lesson.eventColor);

                    const isOngoing =
                      day.isToday &&
                      nowMinutes >= lesson.startMinutes &&
                      nowMinutes < lesson.endMinutes;

                    const matchesSearch =
                      !searchQuery ||
                      lesson.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      lesson.teacher?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      lesson.room?.toLowerCase().includes(searchQuery.toLowerCase());

                    return (
                      <motion.div
                        key={lesson.eventId}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{
                          opacity: matchesSearch ? 1 : 0.25,
                          scale: 1,
                        }}
                        transition={{ type: "spring", stiffness: 450, damping: 30 }}
                        onClick={() => handleCardClick(lesson)}
                        whileHover={{
                          scale: 1.01,
                          zIndex: 25,
                          transition: { duration: 0.15 },
                        }}
                        className={`absolute rounded-xl p-2 cursor-pointer transition-shadow select-none overflow-hidden flex flex-col justify-between border ${
                          isOngoing
                            ? "ring-2 ring-primary shadow-lg z-10"
                            : "hover:shadow-md"
                        }`}
                        style={{
                          top: `${topPct}%`,
                          height: `calc(${heightPct}% - 3px)`,
                          left: `calc(${leftPct}% + 2px)`,
                          width: `calc(${widthPct}% - 4px)`,
                          backgroundColor: style.bg,
                          borderColor: isOngoing ? "var(--primary)" : style.border,
                        }}
                      >
                        {/* Top Accent Strip */}
                        <div
                          className="absolute top-0 left-0 right-0 h-1"
                          style={{ backgroundColor: style.accent }}
                        />

                        {/* Card Header: Subject & Concurrent Pill */}
                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-1 mb-0.5">
                            <h4
                              className="text-[11px] sm:text-xs font-bold leading-tight truncate"
                              style={{ color: style.text }}
                              title={lesson.name}
                            >
                              {lesson.name}
                            </h4>

                            {isOngoing && (
                              <span className="shrink-0 text-[8px] font-bold uppercase px-1 py-0.2 rounded bg-primary text-primary-foreground">
                                Now
                              </span>
                            )}
                          </div>

                          {/* Room & Teacher */}
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground/90">
                            {lesson.room && (
                              <span className="flex items-center gap-0.5 font-medium">
                                <MapPin className="w-2.5 h-2.5 opacity-80" />
                                {lesson.room}
                              </span>
                            )}
                            {lesson.teacher && !isConcurrent && (
                              <span className="flex items-center gap-0.5 truncate">
                                <User className="w-2.5 h-2.5 opacity-80" />
                                {lesson.teacher}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Card Footer: Time & Group */}
                        <div className="flex items-center justify-between gap-1 text-[9px] text-muted-foreground/80 mt-auto pt-1">
                          <span className="font-mono tabular-nums">
                            {lesson.start}–{lesson.end}
                          </span>

                          {isConcurrent && (
                            <span
                              className="px-1 py-0.2 rounded text-[8px] font-semibold"
                              style={{ backgroundColor: style.badgeBg, color: style.accent }}
                              title={`${totalCols} classes running at this time`}
                            >
                              {lesson.teachingGroup || "Parallel"}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Lesson Details Modal / Sheet */}
      <AnimatePresence>
        {selectedLesson && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-2xl space-y-5 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setSelectedLesson(null)}
                className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-surface-2"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Modal Header */}
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border"
                  style={{
                    backgroundColor: getSubjectStyle(selectedLesson.name, selectedLesson.eventColor).bg,
                    borderColor: getSubjectStyle(selectedLesson.name, selectedLesson.eventColor).border,
                  }}
                >
                  <Calendar
                    className="w-5 h-5"
                    style={{ color: getSubjectStyle(selectedLesson.name, selectedLesson.eventColor).accent }}
                  />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-foreground leading-snug">
                    {selectedLesson.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedLesson.date} · {formatDuration(selectedLesson.durationMinutes)}
                  </p>
                </div>
              </div>

              {/* Details List */}
              <div className="p-4 rounded-xl bg-surface-1 border border-border space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Time
                  </span>
                  <span className="font-semibold text-foreground tabular-nums">
                    {selectedLesson.start} – {selectedLesson.end}
                  </span>
                </div>

                {selectedLesson.room && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> Room / Location
                    </span>
                    <span className="font-semibold text-foreground">
                      {selectedLesson.room}
                    </span>
                  </div>
                )}

                {selectedLesson.teacher && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Teacher
                    </span>
                    <span className="font-semibold text-foreground">
                      {selectedLesson.teacher}
                    </span>
                  </div>
                )}

                {selectedLesson.teachingGroup && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Class / Group
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-surface-2">
                      {selectedLesson.teachingGroup}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Footer action */}
              <Button
                variant="outline"
                className="w-full text-xs"
                onClick={() => setSelectedLesson(null)}
              >
                Close
              </Button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
