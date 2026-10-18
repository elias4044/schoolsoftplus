'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Printer, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  DAYS,
  DAYS_SHORT,
  durationLabel,
  formatMinutes,
  getTimeRange,
  layoutLessons,
  lessonAccent,
  localDateKey,
  type Lesson,
} from '@/lib/schedule-utils';

type Layout = 'timetable' | 'list';
type Paper = 'a4' | 'a3' | 'letter';
type Orientation = 'landscape' | 'portrait';
type Margin = 'narrow' | 'normal' | 'wide';
type LessonStyle = 'color' | 'light' | 'mono';
type TextSize = 'small' | 'medium' | 'large';
type TimeRange = 'auto' | 'custom';

export interface PrintSettings {
  layout: Layout;
  paper: Paper;
  orientation: Orientation;
  margin: Margin;
  title: string;
  subtitle: string;
  showTitle: boolean;
  showWeek: boolean;
  days: boolean[];
  timeRange: TimeRange;
  startHour: number;
  endHour: number;
  lessonStyle: LessonStyle;
  textSize: TextSize;
  showTime: boolean;
  showDuration: boolean;
  showRoom: boolean;
  showTeacher: boolean;
  showGroup: boolean;
  showGrid: boolean;
  showFooter: boolean;
  hiddenSubjects: string[];
}

const DEFAULT_SETTINGS: PrintSettings = {
  layout: 'timetable',
  paper: 'a4',
  orientation: 'landscape',
  margin: 'normal',
  title: 'Schedule',
  subtitle: '',
  showTitle: true,
  showWeek: true,
  days: [true, true, true, true, true],
  timeRange: 'auto',
  startHour: 8,
  endHour: 16,
  lessonStyle: 'color',
  textSize: 'medium',
  showTime: true,
  showDuration: false,
  showRoom: true,
  showTeacher: true,
  showGroup: false,
  showGrid: true,
  showFooter: true,
  hiddenSubjects: [],
};

const PRESETS: { label: string; patch: Partial<PrintSettings> }[] = [
  {
    label: 'Classic',
    patch: {
      layout: 'timetable',
      paper: 'a4',
      orientation: 'landscape',
      lessonStyle: 'color',
      textSize: 'medium',
      showTime: true,
      showDuration: false,
      showRoom: true,
      showTeacher: true,
      showGroup: false,
      showGrid: true,
    },
  },
  {
    label: 'Wall poster',
    patch: {
      layout: 'timetable',
      paper: 'a3',
      orientation: 'landscape',
      lessonStyle: 'color',
      textSize: 'large',
      showTime: false,
      showRoom: true,
      showTeacher: false,
      showGroup: false,
      showGrid: true,
    },
  },
  {
    label: 'Ink saver',
    patch: {
      layout: 'timetable',
      lessonStyle: 'mono',
      showGrid: true,
      showFooter: false,
    },
  },
  {
    label: 'Compact list',
    patch: {
      layout: 'list',
      orientation: 'portrait',
      lessonStyle: 'light',
      textSize: 'medium',
      showTime: true,
      showRoom: true,
      showTeacher: true,
    },
  },
];

const PAPER_MM: Record<Paper, [number, number]> = {
  a4: [210, 297],
  a3: [297, 420],
  letter: [215.9, 279.4],
};
const PAPER_CSS: Record<Paper, string> = { a4: 'A4', a3: 'A3', letter: 'letter' };
const MARGIN_MM: Record<Margin, number> = { narrow: 6, normal: 10, wide: 16 };
const TEXT_PT: Record<TextSize, number> = { small: 8, medium: 10, large: 12 };
const STORAGE_KEY = 'schedule:print-settings:v1';
const PRINT_FALLBACK = '#64748b';

function mmToPx(mm: number) {
  return (mm * 96) / 25.4;
}

function usePrintSettings() {
  const [settings, setSettings] = useState<PrintSettings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setSettings({
          ...DEFAULT_SETTINGS,
          ...parsed,
          days:
            Array.isArray(parsed.days) && parsed.days.length === 5
              ? parsed.days
              : DEFAULT_SETTINGS.days,
        });
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {}
  }, [settings, ready]);

  const update = (patch: Partial<PrintSettings>) => setSettings((s) => ({ ...s, ...patch }));
  const reset = () => setSettings(DEFAULT_SETTINGS);

  return { settings, update, reset };
}

function buildPrintData(lessons: Lesson[], monday: Date, s: PrintSettings) {
  const hidden = new Set(s.hiddenSubjects);

  const days = DAYS.map((label, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    const key = localDateKey(d);
    return {
      index: i,
      label,
      short: DAYS_SHORT[i],
      date: d.toLocaleDateString('en-SE', { month: 'short', day: 'numeric' }),
      lessons: lessons.filter((l) => l.date === key && !hidden.has(l.name)),
    };
  }).filter((d) => s.days[d.index]);

  let range = getTimeRange(days.flatMap((d) => d.lessons));
  if (s.timeRange === 'custom' && s.endHour > s.startHour) {
    range = { start: s.startHour * 60, end: s.endHour * 60 };
  }

  return {
    range,
    days: days.map((d) => ({
      ...d,
      items: layoutLessons(d.lessons).filter((i) => i.end > range.start && i.start < range.end),
    })),
  };
}

type PrintData = ReturnType<typeof buildPrintData>;

function lessonText(l: Lesson, s: PrintSettings) {
  const duration = durationLabel(l.start, l.end);
  const timeParts = [
    s.showTime ? `${l.start}–${l.end}` : null,
    s.showDuration ? duration : null,
  ].filter(Boolean);
  const details = [
    s.showRoom ? l.room : null,
    s.showTeacher ? l.teacher : null,
    s.showGroup ? l.teachingGroup : null,
  ].filter(Boolean);

  return {
    time: timeParts.length ? timeParts.join(' · ') : null,
    details: details.length ? details.join(' · ') : null,
  };
}

function blockStyle(style: LessonStyle, accent: string): React.CSSProperties {
  if (style === 'mono') {
    return {
      background: '#f4f4f5',
      border: '1px solid #a1a1aa',
      boxShadow: 'inset 3px 0 0 #18181b',
    };
  }
  if (style === 'light') {
    return {
      background: '#fff',
      border: '1px solid #d4d4d8',
      boxShadow: `inset 3px 0 0 ${accent}`,
    };
  }
  return {
    background: `color-mix(in srgb, ${accent} 22%, #fff)`,
    border: `1px solid color-mix(in srgb, ${accent} 45%, #fff)`,
    boxShadow: `inset 3px 0 0 ${accent}`,
  };
}

const SHEET_CSS = `
.sp-sheet{box-sizing:border-box;display:flex;flex-direction:column;background:#fff;color:#111;font-family:var(--font-geist-sans),system-ui,sans-serif;color-scheme:light;overflow:hidden;-webkit-print-color-adjust:exact;print-color-adjust:exact;break-after:avoid;page-break-after:avoid}
.sp-sheet *{box-sizing:border-box}
.sp-head{margin-bottom:1em}
.sp-title{margin:0;font-size:2em;font-weight:700;letter-spacing:-0.02em;line-height:1.1}
.sp-sub{margin:.3em 0 0;color:#555}
.sp-empty{flex:1;display:flex;align-items:center;justify-content:center;color:#888}
.sp-tt{flex:1;min-height:0;display:grid;grid-template-columns:3.4em repeat(var(--cols),minmax(0,1fr));grid-template-rows:auto minmax(0,1fr)}
.sp-dayhead{padding:0 .5em .5em;font-weight:600;font-size:1.1em}
.sp-dayhead small{display:block;font-weight:400;color:#777;font-size:.8em}
.sp-gutter{position:relative}
.sp-gl{position:absolute;right:.6em;transform:translateY(-50%);font-size:.8em;color:#888;font-variant-numeric:tabular-nums}
.sp-col{position:relative;border-left:1px solid #e4e4e7;border-bottom:1px solid #e4e4e7}
.sp-hl{position:absolute;left:0;right:0;border-top:1px solid #e4e4e7}
.sp-block{position:absolute;overflow:hidden;border-radius:.35em;padding:.3em .5em .3em .65em;line-height:1.2;font-size:.9em}
.sp-block b,.sp-lcard b{display:block;font-weight:600;font-size:1.05em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sp-block span,.sp-lcard span{display:block;color:#444;font-size:.9em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sp-list{flex:1;min-height:0;display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));gap:.9em;align-items:start}
.sp-lday{display:flex;flex-direction:column;gap:.4em;min-width:0}
.sp-lday h3{margin:0 0 .2em;padding-bottom:.35em;border-bottom:2px solid #111;font-size:1.1em;font-weight:700}
.sp-lday h3 small{margin-left:.4em;font-weight:400;color:#777;font-size:.8em}
.sp-lcard{border-radius:.4em;padding:.45em .6em .45em .75em;line-height:1.25;break-inside:avoid}
.sp-foot{display:flex;justify-content:space-between;margin-top:.8em;color:#999;font-size:.75em}
`;

function PrintSheet({
  s,
  data,
  week,
  rangeLabel,
}: {
  s: PrintSettings;
  data: PrintData;
  week: number;
  rangeLabel: string;
}) {
  const [pw, ph] = PAPER_MM[s.paper];
  const w = s.orientation === 'landscape' ? ph : pw;
  const h = s.orientation === 'landscape' ? pw : ph;
  const fontPt = TEXT_PT[s.textSize] * (s.paper === 'a3' ? 1.4 : 1);

  const style = {
    width: `${w}mm`,
    height: `${h - 0.5}mm`,
    padding: `${MARGIN_MM[s.margin]}mm`,
    fontSize: `${fontPt}pt`,
    '--cols': data.days.length,
  } as React.CSSProperties;

  const subtitle = [s.showWeek ? `Week ${week} · ${rangeLabel}` : null, s.subtitle.trim() || null]
    .filter(Boolean)
    .join('   ·   ');
  const hasHeader = s.showTitle || subtitle;
  const total = data.range.end - data.range.start;
  const hasLessons = data.days.some((d) => d.items.length > 0);

  const hours: number[] = [];
  for (let m = Math.ceil(data.range.start / 60) * 60; m <= data.range.end; m += 60) hours.push(m);

  return (
    <div className="sp-sheet" style={style}>
      <style>{SHEET_CSS}</style>

      {hasHeader && (
        <div className="sp-head">
          {s.showTitle && <h1 className="sp-title">{s.title.trim() || 'Schedule'}</h1>}
          {subtitle && <p className="sp-sub">{subtitle}</p>}
        </div>
      )}

      {!hasLessons || data.days.length === 0 ? (
        <div className="sp-empty">No lessons to print</div>
      ) : s.layout === 'timetable' ? (
        <div className="sp-tt">
          <div />
          {data.days.map((d) => (
            <div key={d.index} className="sp-dayhead">
              {d.label}
              <small>{d.date}</small>
            </div>
          ))}

          <div className="sp-gutter">
            {hours.map((m) => (
              <span
                key={m}
                className="sp-gl"
                style={{ top: `${((m - data.range.start) / total) * 100}%` }}
              >
                {formatMinutes(m)}
              </span>
            ))}
          </div>

          {data.days.map((d) => (
            <div key={d.index} className="sp-col">
              {s.showGrid &&
                hours.map((m) => (
                  <div
                    key={m}
                    className="sp-hl"
                    style={{ top: `${((m - data.range.start) / total) * 100}%` }}
                  />
                ))}

              {d.items.map((it) => {
                const top = Math.max(it.start, data.range.start);
                const bottom = Math.min(it.end, data.range.end);
                const accent = lessonAccent(it.lesson.eventColor, PRINT_FALLBACK);
                const text = lessonText(it.lesson, s);

                return (
                  <div
                    key={it.lesson.eventId}
                    className="sp-block"
                    style={{
                      top: `calc(${((top - data.range.start) / total) * 100}% + 1px)`,
                      height: `calc(${((bottom - top) / total) * 100}% - 2px)`,
                      left: `calc(${(it.lane / it.lanes) * 100}% + 2px)`,
                      width: `calc(${100 / it.lanes}% - 4px)`,
                      ...blockStyle(s.lessonStyle, accent),
                    }}
                  >
                    <b>{it.lesson.name}</b>
                    {text.time && <span>{text.time}</span>}
                    {text.details && <span>{text.details}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className="sp-list">
          {data.days.map((d) => (
            <div key={d.index} className="sp-lday">
              <h3>
                {d.label}
                <small>{d.date}</small>
              </h3>
              {d.items.map((it) => {
                const accent = lessonAccent(it.lesson.eventColor, PRINT_FALLBACK);
                const text = lessonText(it.lesson, s);
                return (
                  <div
                    key={it.lesson.eventId}
                    className="sp-lcard"
                    style={blockStyle(s.lessonStyle, accent)}
                  >
                    <b>{it.lesson.name}</b>
                    {text.time && <span>{text.time}</span>}
                    {text.details && <span>{text.details}</span>}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {s.showFooter && (
        <div className="sp-foot">
          <span>
            Printed{' '}
            {new Date().toLocaleDateString('en-SE', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </span>
          <span>Schoolsoft+</span>
        </div>
      )}
    </div>
  );
}

function Preview({
  widthPx,
  heightPx,
  children,
}: {
  widthPx: number;
  heightPx: number;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const r = el.getBoundingClientRect();
      const padding = window.matchMedia('(min-width: 768px)').matches ? 40 : 24;
      setScale(Math.max(0.1, Math.min((r.width - padding) / widthPx, (r.height - padding) / heightPx, 1)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [widthPx, heightPx]);

  return (
    <div
      ref={ref}
      className="bg-surface-0 flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 md:p-5"
    >
      <div
        className="shrink-0 shadow-2xl ring-1 ring-black/30"
        style={{ width: widthPx * scale, height: heightPx * scale }}
      >
        <div
          style={{
            width: widthPx,
            height: heightPx,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Seg<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="bg-surface-2 grid auto-cols-fr grid-flow-col gap-0.5 rounded-lg p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'h-8 rounded-md px-2 text-xs font-medium transition-colors',
            value === o.value
              ? 'bg-brand-soft text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function SwitchRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-3 py-1.5 text-left text-sm disabled:pointer-events-none disabled:opacity-40"
    >
      <span>{label}</span>
      <span
        className={cn(
          'relative h-5 w-9 shrink-0 rounded-full transition-colors',
          checked ? 'bg-brand' : 'bg-surface-3'
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform',
            checked && 'translate-x-4'
          )}
        />
      </span>
    </button>
  );
}

const inputClass =
  'h-9 w-full rounded-lg border border-input bg-surface-1 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-brand/50 focus-visible:ring-2 focus-visible:ring-ring';

export function PrintScheduleDialog({
  open,
  onClose,
  lessons,
  monday,
  week,
  rangeLabel,
}: {
  open: boolean;
  onClose: () => void;
  lessons: Lesson[];
  monday: Date;
  week: number;
  rangeLabel: string;
}) {
  const { settings: s, update, reset } = usePrintSettings();

  const subjects = useMemo(() => Array.from(new Set(lessons.map((l) => l.name))).sort(), [lessons]);
  const data = useMemo(() => buildPrintData(lessons, monday, s), [lessons, monday, s]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  function handlePrint() {
    const previous = document.title;
    document.title = `Schedule - week ${week}`;
    const restore = () => {
      document.title = previous;
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
    window.print();
  }

  function toggleSubject(name: string, visible: boolean) {
    const hidden = new Set(s.hiddenSubjects);
    if (visible) hidden.delete(name);
    else hidden.add(name);
    update({ hiddenSubjects: Array.from(hidden) });
  }

  if (!open || typeof document === 'undefined') return null;

  const [pw, ph] = PAPER_MM[s.paper];
  const w = s.orientation === 'landscape' ? ph : pw;
  const h = s.orientation === 'landscape' ? pw : ph;

  const hourOptions = (from: number, to: number) =>
    Array.from({ length: to - from + 1 }, (_, i) => from + i);

  return createPortal(
    <>
      <style>{`
        .schedule-print-only{display:none}
        @media print{
          html,body{background:#fff !important;margin:0 !important;padding:0 !important}
          body > *:not(.schedule-print-only){display:none !important}
          .schedule-print-only{display:block !important}
          @page{size:${PAPER_CSS[s.paper]} ${s.orientation};margin:0}
        }
      `}</style>

      <div className="schedule-print-only">
        <PrintSheet s={s} data={data} week={week} rangeLabel={rangeLabel} />
      </div>

      <AnimatePresence>
        <motion.div
          key="print-dialog"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm md:p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Print schedule"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            className="border-border bg-popover text-popover-foreground flex h-dvh w-full max-w-6xl flex-col overflow-hidden border shadow-2xl md:h-full md:rounded-2xl"
          >
            <header className="border-border flex shrink-0 items-center justify-between border-b px-4 py-3">
              <div>
                <h2 className="text-base font-semibold">Print schedule</h2>
                <p className="text-muted-foreground text-xs">
                  Week {week} · {rangeLabel}
                </p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close">
                <X />
              </Button>
            </header>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
              <aside className="border-border order-2 min-h-0 w-full min-w-0 flex-1 space-y-6 overflow-x-hidden overflow-y-auto overscroll-contain border-t p-4 md:order-1 md:w-88 md:flex-none md:border-t-0 md:border-r">
                <Section
                  title="Presets"
                  action={
                    <button
                      type="button"
                      onClick={reset}
                      className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs transition-colors"
                    >
                      <RotateCcw className="size-3" />
                      Reset
                    </button>
                  }
                >
                  <div className="grid grid-cols-2 gap-1.5">
                    {PRESETS.map((p) => (
                      <Button
                        key={p.label}
                        variant="secondary"
                        size="sm"
                        onClick={() => update(p.patch)}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                </Section>

                <Section title="Layout">
                  <Seg
                    value={s.layout}
                    onChange={(layout) => update({ layout })}
                    options={[
                      { value: 'timetable', label: 'Timetable' },
                      { value: 'list', label: 'Day lists' },
                    ]}
                  />
                </Section>

                <Section title="Paper">
                  <Seg
                    value={s.paper}
                    onChange={(paper) => update({ paper })}
                    options={[
                      { value: 'a4', label: 'A4' },
                      { value: 'a3', label: 'A3' },
                      { value: 'letter', label: 'Letter' },
                    ]}
                  />
                  <Seg
                    value={s.orientation}
                    onChange={(orientation) => update({ orientation })}
                    options={[
                      { value: 'landscape', label: 'Landscape' },
                      { value: 'portrait', label: 'Portrait' },
                    ]}
                  />
                  <Seg
                    value={s.margin}
                    onChange={(margin) => update({ margin })}
                    options={[
                      { value: 'narrow', label: 'Narrow' },
                      { value: 'normal', label: 'Normal' },
                      { value: 'wide', label: 'Wide' },
                    ]}
                  />
                </Section>

                <Section title="Header">
                  <SwitchRow
                    label="Show title"
                    checked={s.showTitle}
                    onChange={(showTitle) => update({ showTitle })}
                  />
                  <input
                    className={inputClass}
                    value={s.title}
                    onChange={(e) => update({ title: e.target.value })}
                    placeholder="Title"
                    disabled={!s.showTitle}
                  />
                  <input
                    className={inputClass}
                    value={s.subtitle}
                    onChange={(e) => update({ subtitle: e.target.value })}
                    placeholder="Extra line, e.g. your name or class"
                  />
                  <SwitchRow
                    label="Show week and dates"
                    checked={s.showWeek}
                    onChange={(showWeek) => update({ showWeek })}
                  />
                </Section>

                <Section title="Days">
                  <div className="flex gap-1">
                    {DAYS_SHORT.map((d, i) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() =>
                          update({ days: s.days.map((v, idx) => (idx === i ? !v : v)) })
                        }
                        className={cn(
                          'h-8 flex-1 rounded-md text-xs font-medium transition-colors',
                          s.days[i]
                            ? 'bg-brand-soft text-foreground'
                            : 'bg-surface-2 text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </Section>

                <Section title="Time range">
                  <Seg
                    value={s.timeRange}
                    onChange={(timeRange) => update({ timeRange })}
                    options={[
                      { value: 'auto', label: 'Fit lessons' },
                      { value: 'custom', label: 'Custom' },
                    ]}
                  />
                  {s.timeRange === 'custom' && (
                    <div className="flex items-center gap-2">
                      <select
                        className={inputClass}
                        value={s.startHour}
                        onChange={(e) => update({ startHour: Number(e.target.value) })}
                      >
                        {hourOptions(0, 22).map((hr) => (
                          <option key={hr} value={hr}>
                            {formatMinutes(hr * 60)}
                          </option>
                        ))}
                      </select>
                      <span className="text-muted-foreground text-xs">to</span>
                      <select
                        className={inputClass}
                        value={s.endHour}
                        onChange={(e) => update({ endHour: Number(e.target.value) })}
                      >
                        {hourOptions(1, 24).map((hr) => (
                          <option key={hr} value={hr}>
                            {formatMinutes(hr * 60)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </Section>

                <Section title="Appearance">
                  <Seg
                    value={s.lessonStyle}
                    onChange={(lessonStyle) => update({ lessonStyle })}
                    options={[
                      { value: 'color', label: 'Colored' },
                      { value: 'light', label: 'Light' },
                      { value: 'mono', label: 'Black & white' },
                    ]}
                  />
                  <Seg
                    value={s.textSize}
                    onChange={(textSize) => update({ textSize })}
                    options={[
                      { value: 'small', label: 'Small' },
                      { value: 'medium', label: 'Medium' },
                      { value: 'large', label: 'Large' },
                    ]}
                  />
                  <SwitchRow
                    label="Hour lines"
                    checked={s.showGrid}
                    onChange={(showGrid) => update({ showGrid })}
                    disabled={s.layout === 'list'}
                  />
                  <SwitchRow
                    label="Footer"
                    checked={s.showFooter}
                    onChange={(showFooter) => update({ showFooter })}
                  />
                </Section>

                <Section title="Show on lessons">
                  <SwitchRow
                    label="Time"
                    checked={s.showTime}
                    onChange={(showTime) => update({ showTime })}
                  />
                  <SwitchRow
                    label="Duration"
                    checked={s.showDuration}
                    onChange={(showDuration) => update({ showDuration })}
                  />
                  <SwitchRow
                    label="Room"
                    checked={s.showRoom}
                    onChange={(showRoom) => update({ showRoom })}
                  />
                  <SwitchRow
                    label="Teacher"
                    checked={s.showTeacher}
                    onChange={(showTeacher) => update({ showTeacher })}
                  />
                  <SwitchRow
                    label="Teaching group"
                    checked={s.showGroup}
                    onChange={(showGroup) => update({ showGroup })}
                  />
                </Section>

                {subjects.length > 0 && (
                  <Section
                    title="Subjects"
                    action={
                      <div className="text-muted-foreground flex gap-3 text-xs">
                        <button
                          type="button"
                          className="hover:text-foreground"
                          onClick={() => update({ hiddenSubjects: [] })}
                        >
                          All
                        </button>
                        <button
                          type="button"
                          className="hover:text-foreground"
                          onClick={() => update({ hiddenSubjects: subjects })}
                        >
                          None
                        </button>
                      </div>
                    }
                  >
                    <div className="max-h-56 overflow-y-auto pr-1">
                      {subjects.map((name) => (
                        <SwitchRow
                          key={name}
                          label={name}
                          checked={!s.hiddenSubjects.includes(name)}
                          onChange={(visible) => toggleSubject(name, visible)}
                        />
                      ))}
                    </div>
                  </Section>
                )}
              </aside>

              <div className="order-1 flex h-[32dvh] min-h-[190px] max-h-[38dvh] shrink-0 md:order-2 md:h-auto md:max-h-none md:min-h-0 md:flex-1">
                <Preview widthPx={mmToPx(w)} heightPx={mmToPx(h - 0.5)}>
                  <PrintSheet s={s} data={data} week={week} rangeLabel={rangeLabel} />
                </Preview>
              </div>
            </div>

            <footer className="border-border flex shrink-0 items-center justify-between gap-3 border-t px-4 py-3">
              <p className="text-muted-foreground hidden text-xs sm:block">
                {PAPER_CSS[s.paper]} · {s.orientation} · choose &quot;Save as PDF&quot; in the print
                window to export
              </p>
              <div className="ml-auto flex gap-2">
                <Button variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button onClick={handlePrint}>
                  <Printer />
                  Print
                </Button>
              </div>
            </footer>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    </>,
    document.body
  );
}
