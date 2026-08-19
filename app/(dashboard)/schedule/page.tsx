"use client";

import { useEffect, useState, useMemo, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Printer,
  RotateCw,
  Search,
  X,
  Columns3,
  LayoutGrid,
  Calendar,
  Table,
  Filter,
  Users,
  Clock,
  Sparkles,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import {
  type ScheduleLesson,
  type DaySchedule,
  type ScheduleViewMode,
  type PrintOptions,
  DAYS,
  getWeekBounds,
  localDateKey,
  timeToMinutes,
  parseApiTimeStr,
  calculateTimetableClusters,
} from "@/components/schedule/schedule-types";
import { ScheduleTimetable } from "@/components/schedule/ScheduleTimetable";
import { ScheduleColumnsView } from "@/components/schedule/ScheduleColumnsView";
import { ScheduleDayView } from "@/components/schedule/ScheduleDayView";
import { ScheduleListView } from "@/components/schedule/ScheduleListView";
import { SchedulePrintModal } from "@/components/schedule/SchedulePrintModal";
import { SchedulePrintView } from "@/components/schedule/SchedulePrintView";

function SchedulePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Week offset state (0 = current week, -1 = last week, +1 = next week)
  const [weekOffset, setWeekOffset] = useState(0);
  const { monday, week, label, year } = getWeekBounds(weekOffset);

  // Data state
  const [rawLessons, setRawLessons] = useState<any[]>([]);
  const [teachingGroups, setTeachingGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // View & Filter state
  const [viewMode, setViewMode] = useState<ScheduleViewMode>("timetable");
  const [selectedGroup, setSelectedGroup] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [printModalOpen, setPrintModalOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Print options state
  const [printOptions, setPrintOptions] = useState<PrintOptions>({
    layout: "timetable",
    orientation: "landscape",
    colorTheme: "bw",
    showTeachers: true,
    showRooms: true,
    showGroups: true,
    showTimes: true,
    selectedDay: "all",
    title: "School Schedule",
    subtitle: label,
  });

  // Keep print subtitle updated with current week label
  useEffect(() => {
    setPrintOptions((prev) => ({
      ...prev,
      subtitle: label,
    }));
  }, [label]);

  // Fetch schedule
  const fetchSchedule = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      try {
        const query = selectedGroup !== "all" ? `&group=${encodeURIComponent(selectedGroup)}` : "";
        const res = await apiFetch<{
          success: boolean;
          schedule?: any[];
          teachingGroups?: string[];
        }>(`/api/schedule?week=${week}${query}`);

        const list = Array.isArray(res?.schedule) ? res.schedule : [];
        setRawLessons(list);

        if (res?.teachingGroups && res.teachingGroups.length > 0) {
          setTeachingGroups(res.teachingGroups);
        } else {
          // Extract groups from lessons
          const groups = new Set<string>();
          list.forEach((l) => {
            if (l.teachingGroup) groups.add(l.teachingGroup);
          });
          setTeachingGroups(Array.from(groups).sort());
        }
      } catch (err: any) {
        setError(err?.message || "Failed to load schedule.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [week, selectedGroup]
  );

  useEffect(() => {
    fetchSchedule();
  }, [fetchSchedule]);

  // Process lessons into mapped typed lessons
  const mappedLessons: ScheduleLesson[] = useMemo(() => {
    return rawLessons.map((ev) => {
      const startStr = parseApiTimeStr(ev.startDate ?? ev.start);
      const endStr = parseApiTimeStr(ev.endDate ?? ev.end);
      const dateStr = ev.startDate ? localDateKey(new Date(ev.startDate)) : "";
      const startMin = timeToMinutes(startStr);
      const endMin = timeToMinutes(endStr);
      const durMin = Math.max(15, endMin - startMin);

      return {
        eventId: ev.eventId ?? `${startStr}-${endStr}-${ev.name}`,
        name: ev.name ?? ev.title ?? ev.subject ?? "Lesson",
        subject: ev.subject,
        teacher: ev.teacher || ev.teacherName || undefined,
        room: ev.room || ev.location || undefined,
        teachingGroup: ev.teachingGroup || undefined,
        start: startStr,
        end: endStr,
        date: dateStr,
        startMinutes: startMin,
        endMinutes: endMin,
        durationMinutes: durMin,
        eventColor: ev.eventColor,
        category: ev.category,
        status: ev.status,
      };
    });
  }, [rawLessons]);

  // Filter lessons by group if needed
  const filteredLessons = useMemo(() => {
    if (selectedGroup === "all") return mappedLessons;
    return mappedLessons.filter(
      (l) =>
        l.teachingGroup?.toLowerCase() === selectedGroup.toLowerCase() ||
        l.name.toLowerCase().includes(selectedGroup.toLowerCase())
    );
  }, [mappedLessons, selectedGroup]);

  // Build 5 DaySchedule structures
  const now = new Date();
  const todayKey = localDateKey(now);

  const days: DaySchedule[] = useMemo(() => {
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() + i);
      const key = localDateKey(d);

      const dayLessons = filteredLessons
        .filter((l) => l.date === key)
        .sort((a, b) => a.startMinutes - b.startMinutes);

      const positioned = calculateTimetableClusters(dayLessons);

      return {
        key,
        dayName: DAYS[i],
        shortDate: d.toLocaleDateString("en-SE", { month: "short", day: "numeric" }),
        fullDate: d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
        isToday: key === todayKey,
        isPast: d < now && key !== todayKey,
        lessons: dayLessons,
        positionedLessons: positioned,
      };
    });
  }, [monday, filteredLessons, todayKey, now]);

  const totalLessons = useMemo(() => {
    return days.reduce((acc, d) => acc + d.lessons.length, 0);
  }, [days]);

  // Count concurrent classes
  const concurrentLessonsCount = useMemo(() => {
    let count = 0;
    days.forEach((d) => {
      d.positionedLessons.forEach((pos) => {
        if (pos.totalCols > 1) count++;
      });
    });
    return count;
  }, [days]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes((e.target as HTMLElement).tagName)) {
        if (e.key === "Escape") (e.target as HTMLElement).blur();
        return;
      }

      if (e.key === "ArrowLeft" || e.key === "h") {
        setWeekOffset((o) => o - 1);
      } else if (e.key === "ArrowRight" || e.key === "l") {
        setWeekOffset((o) => o + 1);
      } else if (e.key === "t" || e.key === "T") {
        setWeekOffset(0);
      } else if ((e.key === "p" || e.key === "P") && (e.metaKey || e.ctrlKey || !e.altKey)) {
        e.preventDefault();
        setPrintModalOpen(true);
      } else if (e.key === "1") {
        setViewMode("timetable");
      } else if (e.key === "2") {
        setViewMode("columns");
      } else if (e.key === "3") {
        setViewMode("day");
      } else if (e.key === "4") {
        setViewMode("list");
      } else if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape") {
        if (printModalOpen) setPrintModalOpen(false);
        else if (searchQuery) setSearchQuery("");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [printModalOpen, searchQuery]);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen overflow-hidden bg-background">
      {/* ── Top Header & Controls Bar ──────────────────────────── */}
      <header
        id="schedule-interactive-ui-header"
        className="px-4 md:px-6 py-3 border-b border-border bg-surface-1 shrink-0 z-10 no-print"
      >
        <div className="flex flex-col gap-3">
          {/* Row 1: Title, Week Controls & Action Tools */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Title & Total count */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <CalendarDays className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  Schedule
                  {!loading && totalLessons > 0 && (
                    <Badge variant="outline" className="text-[10px] bg-surface-2 border-border font-semibold">
                      {totalLessons} lessons
                    </Badge>
                  )}
                </h1>
              </div>
            </div>

            {/* Week Navigation Center */}
            <div className="flex items-center gap-1.5 bg-surface-2/80 p-1 rounded-xl border border-border">
              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-1"
                onClick={() => setWeekOffset((o) => o - 1)}
                title="Previous Week (← or H)"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className={`h-7 px-2.5 rounded-lg text-xs font-semibold ${
                  weekOffset === 0
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                    : "text-foreground hover:bg-surface-1"
                }`}
                onClick={() => setWeekOffset(0)}
                title="Jump to Current Week (T)"
              >
                This Week
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-1"
                onClick={() => setWeekOffset((o) => o + 1)}
                title="Next Week (→ or L)"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>

              <span className="text-xs font-semibold text-foreground/90 px-2 hidden sm:inline-block border-l border-border/80 ml-1">
                {label}
              </span>
            </div>

            {/* Right Tools: View Mode Switcher, Refresh & Print */}
            <div className="flex items-center gap-2">
              {/* View Switcher Tabs */}
              <div className="flex items-center p-0.5 rounded-xl bg-surface-2 border border-border">
                {[
                  { id: "timetable", label: "Timetable", icon: Columns3, keyHint: "1" },
                  { id: "columns", label: "Week", icon: LayoutGrid, keyHint: "2" },
                  { id: "day", label: "Day", icon: Calendar, keyHint: "3" },
                  { id: "list", label: "List", icon: Table, keyHint: "4" },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = viewMode === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setViewMode(tab.id as ScheduleViewMode)}
                      className={`relative px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                        isActive
                          ? "text-primary-foreground font-bold"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                      title={`${tab.label} View (Press ${tab.keyHint})`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeScheduleView"
                          className="absolute inset-0 rounded-lg bg-primary"
                          transition={{ type: "spring", stiffness: 450, damping: 32 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1">
                        <Icon className="w-3.5 h-3.5" />
                        <span className="hidden lg:inline">{tab.label}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Refresh Button */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchSchedule(true)}
                disabled={loading || refreshing}
                className="w-8 h-8 rounded-xl border-border bg-surface-2 text-muted-foreground hover:text-foreground"
                title="Refresh schedule"
              >
                <RotateCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
              </Button>

              {/* Print Button */}
              <Button
                size="sm"
                onClick={() => setPrintModalOpen(true)}
                className="h-8 px-3 rounded-xl text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                title="Print Schedule / Save PDF (P or ⌘P)"
              >
                <Printer className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Print</span>
              </Button>
            </div>
          </div>

          {/* Row 2: Class/Group Selector, Search & Concurrent Notice */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-0.5">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
              {/* Class / Teaching Group Dropdown */}
              {teachingGroups.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <select
                      value={selectedGroup}
                      onChange={(e) => setSelectedGroup(e.target.value)}
                      className="bg-surface-2 border border-border rounded-xl pl-3 pr-7 py-1 text-xs font-semibold text-foreground outline-none focus:border-primary/50 cursor-pointer appearance-none"
                    >
                      <option value="all">All Classes & Groups</option>
                      {teachingGroups.map((grp) => (
                        <option key={grp} value={grp}>
                          {grp}
                        </option>
                      ))}
                    </select>
                    <Filter className="w-3 h-3 text-muted-foreground absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              )}

              {/* Search Subject Input */}
              <div className="relative w-48 sm:w-64">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find subject, room, teacher… (/)"
                  className="w-full bg-surface-2 border border-border rounded-xl pl-7 pr-7 py-1 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Concurrent Classes Indicator Tag */}
            {concurrentLessonsCount > 0 && (
              <div className="hidden md:flex items-center gap-1.5 text-[11px] font-medium text-primary px-2.5 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                <Layers className="w-3 h-3" />
                <span>Supports parallel classes (Languages & Electives)</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Main Schedule Content Area ─────────────────────────── */}
      <main
        id="schedule-interactive-ui"
        className="flex-1 p-3 md:p-5 overflow-hidden flex flex-col no-print"
      >
        {loading ? (
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {DAYS.map((d) => (
              <div key={d} className="rounded-2xl border border-border bg-surface-0 p-4 space-y-3 animate-pulse">
                <div className="h-4 w-24 rounded bg-surface-2 mb-4" />
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 rounded-xl bg-surface-1" />
                ))}
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-surface-0 rounded-2xl border border-border">
            <p className="text-xs text-destructive mb-3">{error}</p>
            <Button size="sm" onClick={() => fetchSchedule()} className="text-xs">
              Retry
            </Button>
          </div>
        ) : (
          <div className="flex-1 min-h-0">
            {viewMode === "timetable" && (
              <ScheduleTimetable
                days={days}
                searchQuery={searchQuery}
                selectedGroup={selectedGroup}
              />
            )}

            {viewMode === "columns" && (
              <ScheduleColumnsView
                days={days}
                searchQuery={searchQuery}
                selectedGroup={selectedGroup}
              />
            )}

            {viewMode === "day" && (
              <ScheduleDayView
                days={days}
                searchQuery={searchQuery}
                selectedGroup={selectedGroup}
              />
            )}

            {viewMode === "list" && (
              <ScheduleListView
                days={days}
                searchQuery={searchQuery}
                selectedGroup={selectedGroup}
              />
            )}
          </div>
        )}
      </main>

      {/* Print Modal Customizer */}
      <SchedulePrintModal
        open={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        days={days}
        weekLabel={label}
        options={printOptions}
        onOptionsChange={setPrintOptions}
      />

      {/* Print Document Rendered exclusively for @media print */}
      <SchedulePrintView
        days={days}
        options={printOptions}
        weekLabel={label}
      />
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 max-w-5xl mx-auto space-y-4">
          <div className="h-8 w-48 bg-surface-2 rounded-lg animate-pulse" />
          <div className="h-64 w-full bg-surface-1 rounded-2xl border border-border animate-pulse" />
        </div>
      }
    >
      <SchedulePageContent />
    </Suspense>
  );
}
