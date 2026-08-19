"use client";

import { motion } from "framer-motion";
import { Clock, MapPin, User, Users, Layers } from "lucide-react";
import {
  type DaySchedule,
  type ScheduleLesson,
  formatDuration,
  getSubjectStyle,
} from "./schedule-types";
import { Badge } from "@/components/ui/badge";

interface ScheduleColumnsViewProps {
  days: DaySchedule[];
  searchQuery?: string;
  selectedGroup?: string;
  onSelectLesson?: (lesson: ScheduleLesson) => void;
}

export function ScheduleColumnsView({
  days,
  searchQuery = "",
  selectedGroup = "all",
  onSelectLesson,
}: ScheduleColumnsViewProps) {
  const nowMinutes = (() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  })();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 h-full overflow-y-auto pb-4">
      {days.map((day, dayIndex) => {
        // Group lessons into slots
        const timeSlots = new Map<string, ScheduleLesson[]>();
        day.lessons.forEach((l) => {
          const key = `${l.start}-${l.end}`;
          if (!timeSlots.has(key)) timeSlots.set(key, []);
          timeSlots.get(key)!.push(l);
        });

        const slotList = Array.from(timeSlots.entries()).map(([k, lessons]) => ({
          timeKey: k,
          start: lessons[0].start,
          end: lessons[0].end,
          startMinutes: lessons[0].startMinutes,
          endMinutes: lessons[0].endMinutes,
          durationMinutes: lessons[0].durationMinutes,
          lessons,
          isConcurrent: lessons.length > 1,
        })).sort((a, b) => a.startMinutes - b.startMinutes);

        return (
          <motion.div
            key={day.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: dayIndex * 0.04, duration: 0.25 }}
            className={`rounded-2xl border flex flex-col min-h-[380px] overflow-hidden ${
              day.isToday
                ? "bg-primary/[0.03] border-primary/40 shadow-sm"
                : "bg-surface-0 border-border"
            }`}
          >
            {/* Column Header */}
            <div
              className={`flex items-center justify-between px-3.5 py-3 border-b shrink-0 ${
                day.isToday ? "bg-primary/10 border-primary/20" : "bg-surface-1 border-border"
              }`}
            >
              <div>
                <div className="flex items-center gap-1.5">
                  <h3
                    className={`text-xs font-bold ${
                      day.isToday ? "text-primary" : "text-foreground"
                    }`}
                  >
                    {day.dayName}
                  </h3>
                  {day.isToday && (
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">{day.shortDate}</p>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold text-muted-foreground">
                  {day.lessons.length}
                </span>
                {day.isToday && (
                  <Badge className="text-[9px] px-1.5 py-0 bg-primary text-primary-foreground font-semibold">
                    Today
                  </Badge>
                )}
              </div>
            </div>

            {/* Lessons List in Day */}
            <div className="flex-1 p-2.5 space-y-2 overflow-y-auto">
              {slotList.length === 0 ? (
                <div className="text-center py-12 text-[11px] text-muted-foreground/50">
                  No lessons
                </div>
              ) : (
                slotList.map((slot) => {
                  const isOngoing =
                    day.isToday &&
                    nowMinutes >= slot.startMinutes &&
                    nowMinutes < slot.endMinutes;

                  return (
                    <div key={slot.timeKey} className="space-y-1.5">
                      {slot.isConcurrent && (
                        <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-primary px-1">
                          <Layers className="w-2.5 h-2.5" />
                          <span>{slot.lessons.length} Parallel Classes</span>
                        </div>
                      )}

                      {slot.lessons.map((lesson) => {
                        const style = getSubjectStyle(lesson.name, lesson.eventColor);
                        const matches =
                          !searchQuery ||
                          lesson.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lesson.teacher?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          lesson.room?.toLowerCase().includes(searchQuery.toLowerCase());

                        return (
                          <motion.div
                            key={lesson.eventId}
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onSelectLesson?.(lesson)}
                            className={`p-2.5 rounded-xl border transition-all cursor-pointer select-none relative overflow-hidden flex flex-col justify-between ${
                              isOngoing ? "ring-2 ring-primary shadow-sm" : ""
                            } ${matches ? "opacity-100" : "opacity-30"}`}
                            style={{
                              backgroundColor: style.bg,
                              borderColor: isOngoing ? "var(--primary)" : style.border,
                            }}
                          >
                            {/* Accent Bar */}
                            <div
                              className="absolute top-0 left-0 bottom-0 w-1"
                              style={{ backgroundColor: style.accent }}
                            />

                            <div className="pl-1.5">
                              {/* Subject & Now badge */}
                              <div className="flex items-start justify-between gap-1 mb-1">
                                <h4
                                  className="text-xs font-bold leading-snug truncate"
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

                              {/* Time + Duration */}
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1 font-mono">
                                <Clock className="w-2.5 h-2.5 opacity-70 shrink-0" />
                                <span>
                                  {lesson.start}–{lesson.end}
                                </span>
                                <span className="opacity-50">· {formatDuration(lesson.durationMinutes)}</span>
                              </div>

                              {/* Room, Teacher & Group */}
                              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground/90">
                                {lesson.room && (
                                  <span className="flex items-center gap-0.5 font-medium">
                                    <MapPin className="w-2.5 h-2.5 opacity-70" />
                                    {lesson.room}
                                  </span>
                                )}
                                {lesson.teacher && (
                                  <span className="flex items-center gap-0.5 truncate">
                                    <User className="w-2.5 h-2.5 opacity-70" />
                                    {lesson.teacher}
                                  </span>
                                )}
                                {lesson.teachingGroup && (
                                  <span
                                    className="px-1 py-0.2 rounded text-[8px] font-semibold mt-0.5"
                                    style={{
                                      backgroundColor: style.badgeBg,
                                      color: style.accent,
                                    }}
                                  >
                                    {lesson.teachingGroup}
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
