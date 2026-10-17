export interface Lesson {
  eventId: number | string;
  name: string;
  teacher?: string;
  room?: string;
  teachingGroup?: string;
  start: string;
  end: string;
  date: string;
  eventColor?: string;
  category?: string;
  status?: number;
}

export interface PositionedLesson {
  lesson: Lesson;
  start: number;
  end: number;
  lane: number;
  lanes: number;
}

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
export const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri"];

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
  const fmt = (d: Date) => d.toLocaleDateString("en-SE", { month: "short", day: "numeric" });
  const range = `${fmt(monday)} – ${fmt(friday)}, ${monday.getFullYear()}`;

  return { monday, friday, week, range, label: `Week ${week} · ${range}` };
}

export function localDateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function timeStr(raw: string) {
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? "" : d.toTimeString().slice(0, 5);
}

export function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function formatMinutes(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function durationLabel(start: string, end: string) {
  const diff = toMinutes(end) - toMinutes(start);
  if (diff <= 0) return null;
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function lessonAccent(hex: string | undefined, fallback: string): string {
  return hex && /^#[0-9a-f]{6}$/i.test(hex) ? hex : fallback;
}

export function mapScheduleEvent(ev: any): Lesson | null {
  const start = timeStr(ev?.startDate ?? "");
  const end = timeStr(ev?.endDate ?? "");
  if (!start || !end) return null;

  return {
    eventId: ev.eventId,
    name: ev.name ?? ev.title ?? ev.subject ?? "Lesson",
    teacher: ev.teacher || undefined,
    room: ev.room || undefined,
    teachingGroup: ev.teachingGroup || undefined,
    start,
    end,
    date: localDateKey(new Date(ev.startDate)),
    eventColor: ev.eventColor || undefined,
    category: ev.category,
    status: ev.status,
  };
}

export function layoutLessons(lessons: Lesson[]): PositionedLesson[] {
  const items: PositionedLesson[] = lessons
    .map((lesson) => {
      const start = toMinutes(lesson.start);
      return { lesson, start, end: Math.max(toMinutes(lesson.end), start + 1), lane: 0, lanes: 1 };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  let cluster: PositionedLesson[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;

  const flush = () => {
    cluster.forEach((i) => (i.lanes = laneEnds.length || 1));
    cluster = [];
    laneEnds = [];
    clusterEnd = -1;
  };

  for (const item of items) {
    if (cluster.length && item.start >= clusterEnd) flush();

    let lane = laneEnds.findIndex((end) => end <= item.start);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(item.end);
    } else {
      laneEnds[lane] = item.end;
    }

    item.lane = lane;
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  flush();

  return items;
}

export function getTimeRange(lessons: Lesson[]) {
  if (lessons.length === 0) return { start: 8 * 60, end: 16 * 60 };

  const starts = lessons.map((l) => toMinutes(l.start));
  const ends = lessons.map((l) => toMinutes(l.end));
  const start = Math.floor(Math.min(...starts) / 60) * 60;
  let end = Math.ceil(Math.max(...ends) / 60) * 60;
  if (end - start < 120) end = start + 120;

  return { start, end };
}