"use client";

import { motion } from "framer-motion";
import { Clock, MapPin, User, Users, Calendar } from "lucide-react";
import {
  type DaySchedule,
  type ScheduleLesson,
  formatDuration,
  getSubjectStyle,
} from "./schedule-types";
import { Badge } from "@/components/ui/badge";

interface ScheduleListViewProps {
  days: DaySchedule[];
  searchQuery?: string;
  selectedGroup?: string;
  onSelectLesson?: (lesson: ScheduleLesson) => void;
}

export function ScheduleListView({
  days,
  searchQuery = "",
  selectedGroup = "all",
  onSelectLesson,
}: ScheduleListViewProps) {
  const allLessons = days.flatMap((d) =>
    d.lessons.map((l) => ({ ...l, dayName: d.dayName, shortDate: d.shortDate, isToday: d.isToday }))
  );

  const filtered = allLessons.filter((l) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      l.teacher?.toLowerCase().includes(q) ||
      l.room?.toLowerCase().includes(q) ||
      l.teachingGroup?.toLowerCase().includes(q) ||
      l.dayName.toLowerCase().includes(q)
    );
  });

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-surface-0 rounded-2xl border border-border">
        <Calendar className="w-8 h-8 text-muted-foreground/40 mb-2" />
        <h3 className="text-sm font-semibold text-foreground">No lessons match your search</h3>
        <p className="text-xs text-muted-foreground mt-1">Try clearing your search query or filters.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-0 rounded-2xl border border-border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-1 text-muted-foreground font-semibold text-[11px]">
              <th className="py-3 px-4">Day</th>
              <th className="py-3 px-4">Time</th>
              <th className="py-3 px-4">Subject / Lesson</th>
              <th className="py-3 px-4">Room</th>
              <th className="py-3 px-4">Teacher</th>
              <th className="py-3 px-4">Group</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {filtered.map((lesson, idx) => {
              const style = getSubjectStyle(lesson.name, lesson.eventColor);
              return (
                <tr
                  key={`${lesson.eventId}-${idx}`}
                  onClick={() => onSelectLesson?.(lesson)}
                  className={`hover:bg-surface-2/60 transition-colors cursor-pointer ${
                    lesson.isToday ? "bg-primary/[0.02]" : ""
                  }`}
                >
                  {/* Day */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <span className={`font-semibold ${lesson.isToday ? "text-primary" : "text-foreground"}`}>
                        {lesson.dayName}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{lesson.shortDate}</span>
                    </div>
                  </td>

                  {/* Time */}
                  <td className="py-3 px-4 whitespace-nowrap font-mono text-muted-foreground">
                    <span>
                      {lesson.start} – {lesson.end}
                    </span>
                    <span className="text-[10px] text-muted-foreground/60 ml-1">
                      ({formatDuration(lesson.durationMinutes)})
                    </span>
                  </td>

                  {/* Subject */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: style.accent }}
                      />
                      <span className="font-bold text-foreground" style={{ color: style.text }}>
                        {lesson.name}
                      </span>
                    </div>
                  </td>

                  {/* Room */}
                  <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                    {lesson.room ? (
                      <span className="flex items-center gap-1 font-medium text-foreground/80">
                        <MapPin className="w-3 h-3 opacity-70" />
                        {lesson.room}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>

                  {/* Teacher */}
                  <td className="py-3 px-4 whitespace-nowrap text-muted-foreground">
                    {lesson.teacher ? (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 opacity-70" />
                        {lesson.teacher}
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>

                  {/* Group */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {lesson.teachingGroup ? (
                      <Badge
                        variant="outline"
                        className="text-[9px] font-semibold"
                        style={{
                          backgroundColor: style.badgeBg,
                          color: style.accent,
                          borderColor: style.border,
                        }}
                      >
                        {lesson.teachingGroup}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
