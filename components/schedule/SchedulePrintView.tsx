"use client";

import {
  type DaySchedule,
  type PrintOptions,
  DAY_START_HOUR,
  DAY_END_HOUR,
  TOTAL_DAY_MINUTES,
  formatDuration,
  getSubjectStyle,
} from "./schedule-types";

interface SchedulePrintViewProps {
  days: DaySchedule[];
  options: PrintOptions;
  weekLabel: string;
}

export function SchedulePrintView({ days, options, weekLabel }: SchedulePrintViewProps) {
  const filteredDays =
    options.selectedDay === "all"
      ? days
      : days.filter((d) => d.key === options.selectedDay);

  const isLandscape = options.orientation === "landscape";
  const isBw = options.colorTheme === "bw";

  return (
    <div
      id="schedule-print-document"
      className="hidden print:block font-sans text-black bg-white p-4 w-full"
      style={{
        color: "#000000",
        backgroundColor: "#ffffff",
      }}
    >
      {/* Print Document Header */}
      <div className="flex items-start justify-between border-b-2 border-black pb-2 mb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-black">
            {options.title || "School Schedule"}
          </h1>
          <p className="text-xs text-gray-700 mt-0.5">
            {options.subtitle || weekLabel}
          </p>
        </div>

        <div className="text-right text-[11px] text-gray-600">
          <p className="font-semibold text-black">SchoolSoft+</p>
          <p>Generated {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
        </div>
      </div>

      {/* ── 1. TIMETABLE GRID PRINT LAYOUT ───────────────────────── */}
      {options.layout === "timetable" && (
        <div className="w-full border border-black text-xs">
          {/* Day Headers */}
          <div className={`grid grid-cols-${filteredDays.length} border-b border-black bg-gray-100 font-bold text-center`}>
            {filteredDays.map((day) => (
              <div key={day.key} className="py-1.5 px-2 border-r last:border-r-0 border-black">
                <span className="text-xs">{day.dayName}</span>
                <span className="text-[10px] text-gray-600 ml-1">({day.shortDate})</span>
              </div>
            ))}
          </div>

          {/* Day Columns */}
          <div className={`grid grid-cols-${filteredDays.length} divide-x divide-black min-h-[500px]`}>
            {filteredDays.map((day) => (
              <div key={day.key} className="p-1 space-y-1.5 bg-white">
                {day.lessons.length === 0 ? (
                  <p className="text-[10px] text-gray-400 text-center py-6">No lessons</p>
                ) : (
                  day.lessons.map((lesson, idx) => {
                    const style = getSubjectStyle(lesson.name, lesson.eventColor);
                    return (
                      <div
                        key={`${lesson.eventId}-${idx}`}
                        className={`p-1.5 rounded border text-[11px] leading-tight ${
                          isBw
                            ? "border-gray-800 bg-gray-50 text-black"
                            : "border-gray-300 bg-gray-50/80 text-black"
                        }`}
                        style={
                          !isBw
                            ? {
                                borderLeftWidth: "4px",
                                borderLeftColor: style.accent,
                              }
                            : {
                                borderLeftWidth: "3px",
                                borderLeftColor: "#000000",
                              }
                        }
                      >
                        <div className="flex items-start justify-between gap-1">
                          <span className="font-bold text-black truncate">{lesson.name}</span>
                          {options.showTimes && (
                            <span className="text-[9px] font-mono text-gray-700 whitespace-nowrap">
                              {lesson.start}–{lesson.end}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-2 text-[10px] text-gray-700 mt-0.5">
                          {options.showRooms && lesson.room && (
                            <span>Sal {lesson.room}</span>
                          )}
                          {options.showTeachers && lesson.teacher && (
                            <span>{lesson.teacher}</span>
                          )}
                          {options.showGroups && lesson.teachingGroup && (
                            <span className="font-semibold text-black">[{lesson.teachingGroup}]</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 2. AGENDA / DAY BY DAY PRINT LAYOUT ──────────────────── */}
      {options.layout === "agenda" && (
        <div className="space-y-4">
          {filteredDays.map((day) => (
            <div key={day.key} className="border border-black rounded overflow-hidden">
              <div className="bg-gray-100 px-3 py-1 border-b border-black flex items-center justify-between font-bold text-xs">
                <span>{day.dayName}</span>
                <span className="text-gray-600 text-[10px]">{day.shortDate} ({day.lessons.length} lessons)</span>
              </div>

              <div className="p-2 divide-y divide-gray-200">
                {day.lessons.length === 0 ? (
                  <p className="text-[10px] text-gray-400 py-2 text-center">No lessons scheduled</p>
                ) : (
                  day.lessons.map((lesson, idx) => (
                    <div key={`${lesson.eventId}-${idx}`} className="py-1.5 flex items-center justify-between gap-3 text-xs">
                      <div className="w-24 shrink-0 font-mono text-gray-800 text-[11px]">
                        {lesson.start} – {lesson.end}
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-black">{lesson.name}</span>
                        {options.showGroups && lesson.teachingGroup && (
                          <span className="text-[10px] text-gray-600 ml-1.5">({lesson.teachingGroup})</span>
                        )}
                      </div>

                      <div className="text-right text-[11px] text-gray-700 space-x-2 shrink-0">
                        {options.showRooms && lesson.room && <span>Sal {lesson.room}</span>}
                        {options.showTeachers && lesson.teacher && <span>{lesson.teacher}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── 3. COMPACT TABLE PRINT LAYOUT ────────────────────────── */}
      {options.layout === "compact" && (
        <table className="w-full border-collapse border border-black text-[11px] text-left">
          <thead>
            <tr className="bg-gray-100 border-b border-black font-bold text-black">
              <th className="p-1.5 border-r border-black">Day</th>
              <th className="p-1.5 border-r border-black">Time</th>
              <th className="p-1.5 border-r border-black">Subject</th>
              {options.showRooms && <th className="p-1.5 border-r border-black">Room</th>}
              {options.showTeachers && <th className="p-1.5 border-r border-black">Teacher</th>}
              {options.showGroups && <th className="p-1.5">Group</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {filteredDays.flatMap((day) =>
              day.lessons.map((lesson, idx) => (
                <tr key={`${day.key}-${lesson.eventId}-${idx}`} className="border-b border-gray-200">
                  <td className="p-1.5 font-semibold border-r border-gray-300 whitespace-nowrap">
                    {day.dayName.slice(0, 3)} {day.shortDate}
                  </td>
                  <td className="p-1.5 font-mono border-r border-gray-300 whitespace-nowrap">
                    {lesson.start}–{lesson.end}
                  </td>
                  <td className="p-1.5 font-bold border-r border-gray-300">
                    {lesson.name}
                  </td>
                  {options.showRooms && (
                    <td className="p-1.5 border-r border-gray-300 whitespace-nowrap">
                      {lesson.room || "—"}
                    </td>
                  )}
                  {options.showTeachers && (
                    <td className="p-1.5 border-r border-gray-300 whitespace-nowrap">
                      {lesson.teacher || "—"}
                    </td>
                  )}
                  {options.showGroups && (
                    <td className="p-1.5 whitespace-nowrap font-mono text-[10px]">
                      {lesson.teachingGroup || "—"}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}

      {/* Print Footer Note */}
      <div className="mt-4 pt-2 border-t border-gray-300 flex items-center justify-between text-[9px] text-gray-500">
        <span>SchoolSoft+ Schedule Export</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  );
}
