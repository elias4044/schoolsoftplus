export interface ScheduleLesson {
  eventId: number | string;
  name: string;
  subject?: string;
  teacher?: string;
  room?: string;
  teachingGroup?: string;
  start: string; // "HH:MM"
  end: string; // "HH:MM"
  date: string; // "YYYY-MM-DD"
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  eventColor?: string;
  category?: string;
  status?: number;
}

export interface PositionedLesson {
  lesson: ScheduleLesson;
  topPct: number;
  heightPct: number;
  leftPct: number;
  widthPct: number;
  colIndex: number;
  totalCols: number;
}

export interface DaySchedule {
  key: string;
  dayName: string;
  shortDate: string;
  fullDate: string;
  isToday: boolean;
  isPast: boolean;
  lessons: ScheduleLesson[];
  positionedLessons: PositionedLesson[];
}

export type ScheduleViewMode = "timetable" | "columns" | "day" | "list";

export interface PrintOptions {
  layout: "timetable" | "agenda" | "compact";
  orientation: "landscape" | "portrait";
  colorTheme: "bw" | "accent" | "dark";
  showTeachers: boolean;
  showRooms: boolean;
  showGroups: boolean;
  showTimes: boolean;
  selectedDay: string | "all"; // "all" or "YYYY-MM-DD"
  title: string;
  subtitle: string;
}

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
export const DAY_START_HOUR = 8; // 08:00
export const DAY_END_HOUR = 17; // 17:00
export const TOTAL_DAY_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60; // 540 minutes

/* ── Time Helpers ────────────────────────────────────────── */
export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatDuration(durationMinutes: number): string {
  if (durationMinutes <= 0) return "";
  const h = Math.floor(durationMinutes / 60);
  const m = durationMinutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseApiTimeStr(raw?: string): string {
  if (!raw) return "";
  const d = new Date(raw);
  return isNaN(d.getTime()) ? "" : d.toTimeString().slice(0, 5);
}

/* ── ISO Week Helpers ────────────────────────────────────── */
export function isoWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7));
  const week1 = new Date(d.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((d.getTime() - week1.getTime()) / 86_400_000 - 3 + ((week1.getDay() + 6) % 7)) / 7
    )
  );
}

export function getWeekBounds(offset: number) {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff + offset * 7);
  monday.setHours(0, 0, 0, 0);

  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);

  const week = isoWeek(monday);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-SE", { month: "short", day: "numeric" });

  return {
    monday,
    friday,
    week,
    year: monday.getFullYear(),
    label: `Week ${week} · ${fmt(monday)} – ${fmt(friday)}, ${monday.getFullYear()}`,
  };
}

/* ── Subject Color Tokens (No Gradients) ─────────────────── */
export interface SubjectStyle {
  bg: string;
  border: string;
  text: string;
  accent: string;
  badgeBg: string;
}

export function getSubjectStyle(name: string, hexColor?: string): SubjectStyle {
  const n = (name || "").toLowerCase();

  // If explicit hexColor provided by SchoolSoft
  if (hexColor && /^#[0-9a-f]{6}$/i.test(hexColor)) {
    return {
      bg: "oklch(0.14 0 0)",
      border: `${hexColor}60`,
      text: "#ffffff",
      accent: hexColor,
      badgeBg: `${hexColor}25`,
    };
  }

  // Mathematics
  if (n.includes("math") || n.includes("matte") || n.includes("ma")) {
    return {
      bg: "oklch(0.15 0.03 240)",
      border: "oklch(0.65 0.18 240 / 35%)",
      text: "oklch(0.92 0.04 240)",
      accent: "oklch(0.68 0.18 240)", // blue
      badgeBg: "oklch(0.68 0.18 240 / 18%)",
    };
  }

  // Swedish
  if (n.includes("svenska") || n.includes("swedish") || n.includes("sv")) {
    return {
      bg: "oklch(0.15 0.03 70)",
      border: "oklch(0.72 0.18 70 / 35%)",
      text: "oklch(0.92 0.04 70)",
      accent: "oklch(0.75 0.18 70)", // amber
      badgeBg: "oklch(0.75 0.18 70 / 18%)",
    };
  }

  // English
  if (n.includes("english") || n.includes("engelska") || n.includes("en")) {
    return {
      bg: "oklch(0.15 0.03 280)",
      border: "oklch(0.65 0.20 280 / 35%)",
      text: "oklch(0.92 0.04 280)",
      accent: "oklch(0.68 0.20 280)", // purple
      badgeBg: "oklch(0.68 0.20 280 / 18%)",
    };
  }

  // Science (Physics, Chemistry, Biology, NO)
  if (
    n.includes("science") ||
    n.includes("fysik") ||
    n.includes("kemi") ||
    n.includes("biologi") ||
    n.includes("no") ||
    n.includes("physics") ||
    n.includes("chem")
  ) {
    return {
      bg: "oklch(0.15 0.03 148)",
      border: "oklch(0.68 0.18 148 / 35%)",
      text: "oklch(0.92 0.04 148)",
      accent: "oklch(0.68 0.18 148)", // green
      badgeBg: "oklch(0.68 0.18 148 / 18%)",
    };
  }

  // Social Sciences (History, Geography, Religion, Civics, SO)
  if (
    n.includes("historia") ||
    n.includes("geografi") ||
    n.includes("samhäll") ||
    n.includes("religion") ||
    n.includes("so") ||
    n.includes("social") ||
    n.includes("history")
  ) {
    return {
      bg: "oklch(0.15 0.03 45)",
      border: "oklch(0.70 0.16 45 / 35%)",
      text: "oklch(0.92 0.04 45)",
      accent: "oklch(0.72 0.16 45)", // orange
      badgeBg: "oklch(0.72 0.16 45 / 18%)",
    };
  }

  // Languages (Spanish, French, German, Moderna Språk, M1, M2)
  if (
    n.includes("span") ||
    n.includes("fransk") ||
    n.includes("french") ||
    n.includes("tysk") ||
    n.includes("german") ||
    n.includes("språk") ||
    n.includes("language") ||
    n.includes("m1") ||
    n.includes("m2")
  ) {
    return {
      bg: "oklch(0.15 0.03 320)",
      border: "oklch(0.68 0.18 320 / 35%)",
      text: "oklch(0.92 0.04 320)",
      accent: "oklch(0.68 0.18 320)", // pink/magenta
      badgeBg: "oklch(0.68 0.18 320 / 18%)",
    };
  }

  // Physical Education (PE, Idrott, Gym)
  if (n.includes("idrott") || n.includes("pe") || n.includes("gym") || n.includes("sport") || n.includes("hälsa")) {
    return {
      bg: "oklch(0.15 0.03 190)",
      border: "oklch(0.70 0.16 190 / 35%)",
      text: "oklch(0.92 0.04 190)",
      accent: "oklch(0.72 0.16 190)", // cyan
      badgeBg: "oklch(0.72 0.16 190 / 18%)",
    };
  }

  // Art, Crafts & Music (Bild, Slöjd, Musik)
  if (
    n.includes("bild") ||
    n.includes("art") ||
    n.includes("slöjd") ||
    n.includes("craft") ||
    n.includes("musik") ||
    n.includes("music") ||
    n.includes("hkk") ||
    n.includes("hemkunskap")
  ) {
    return {
      bg: "oklch(0.15 0.03 25)",
      border: "oklch(0.68 0.18 25 / 35%)",
      text: "oklch(0.92 0.04 25)",
      accent: "oklch(0.68 0.18 25)", // warm red/rose
      badgeBg: "oklch(0.68 0.18 25 / 18%)",
    };
  }

  // Default neutral / brand fallback
  return {
    bg: "oklch(0.14 0 0)",
    border: "oklch(1 0 0 / 12%)",
    text: "oklch(0.90 0 0)",
    accent: "oklch(0.65 0.22 278)", // brand violet
    badgeBg: "oklch(0.65 0.22 278 / 15%)",
  };
}

/* ── Overlap & Cluster Algorithm for Timetable ───────────── */
/**
 * Clusters overlapping lessons and assigns non-conflicting column indices
 * so parallel lessons (like 4 languages at once) render side-by-side perfectly.
 */
export function calculateTimetableClusters(
  lessons: ScheduleLesson[],
  dayStartMinutes = DAY_START_HOUR * 60,
  totalDayMinutes = TOTAL_DAY_MINUTES
): PositionedLesson[] {
  if (lessons.length === 0) return [];

  // Sort by start time, then duration (longest first)
  const sorted = [...lessons].sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    return b.durationMinutes - a.durationMinutes;
  });

  // Group overlapping lessons into clusters
  const clusters: ScheduleLesson[][] = [];
  let currentCluster: ScheduleLesson[] = [];
  let clusterEndMinutes = 0;

  for (const lesson of sorted) {
    if (currentCluster.length === 0) {
      currentCluster.push(lesson);
      clusterEndMinutes = lesson.endMinutes;
    } else {
      // If this lesson starts before the current cluster finishes, it overlaps
      if (lesson.startMinutes < clusterEndMinutes) {
        currentCluster.push(lesson);
        clusterEndMinutes = Math.max(clusterEndMinutes, lesson.endMinutes);
      } else {
        clusters.push(currentCluster);
        currentCluster = [lesson];
        clusterEndMinutes = lesson.endMinutes;
      }
    }
  }
  if (currentCluster.length > 0) {
    clusters.push(currentCluster);
  }

  const positioned: PositionedLesson[] = [];

  // For each cluster, assign column tracks
  for (const cluster of clusters) {
    const columns: ScheduleLesson[][] = [];

    for (const lesson of cluster) {
      let placed = false;
      // Find the first column where this lesson doesn't overlap with the last placed lesson
      for (let colIdx = 0; colIdx < columns.length; colIdx++) {
        const lastInCol = columns[colIdx][columns[colIdx].length - 1];
        if (lesson.startMinutes >= lastInCol.endMinutes) {
          columns[colIdx].push(lesson);
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([lesson]);
      }
    }

    const totalCols = columns.length;

    // Convert to percentage positions
    columns.forEach((colLessons, colIdx) => {
      colLessons.forEach((lesson) => {
        const topMinutes = Math.max(0, lesson.startMinutes - dayStartMinutes);
        const topPct = (topMinutes / totalDayMinutes) * 100;
        const heightPct = Math.max((lesson.durationMinutes / totalDayMinutes) * 100, 3); // min 3% height

        const widthPct = 100 / totalCols;
        const leftPct = colIdx * widthPct;

        positioned.push({
          lesson,
          topPct,
          heightPct,
          leftPct,
          widthPct,
          colIndex: colIdx,
          totalCols,
        });
      });
    });
  }

  return positioned;
}
