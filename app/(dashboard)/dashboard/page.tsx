'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import {
  CalendarDays,
  ClipboardList,
  MessageSquare,
  Moon,
  Pencil,
  Plus,
  RotateCcw,
  StickyNote,
  Sun,
  Sunrise,
  Check,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { DashboardGrid } from '@/components/widgets/DashboardGrid';
import { AddWidgetPanel } from '@/components/widgets/AddWidgetPanel';
import { useWidgetLayout } from '@/lib/widgets/useWidgetLayout';

const QUICK_ACTIONS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: 'Schedule', href: '/schedule', icon: CalendarDays },
  { label: 'Messages', href: '/messages', icon: MessageSquare },
  { label: 'Notes', href: '/notes', icon: StickyNote },
];

export default function DashboardPage() {
  const { session } = useAuth();
  const { layout, hydrated, reorder, resize, remove, add, reset } = useWidgetLayout();
  const [editing, setEditing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const now = useNow(1000);

  if (!hydrated) return null;

  const { greeting, Icon } = getGreeting(now, session?.name ?? session?.username);
  const week = getWeekProgress(now);

  return (
    <div className="relative mx-auto max-w-350 p-6">
      {/* Ambient background glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-10 h-72 overflow-hidden"
      >
        <motion.div
          className="bg-primary/20 absolute -top-24 left-1/4 h-64 w-64 rounded-full blur-3xl md:left-1/3"
          animate={{ x: [0, 40, 0], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Hero header */}
      <motion.section
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="bg-card/60 relative mb-6 overflow-hidden rounded-2xl border border-white/10 p-5 backdrop-blur-md"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-primary flex items-center gap-2 text-xs font-medium">
              <Icon className="h-3.5 w-3.5" />
              <span>{formatDate(now)}</span>
            </div>
            <h1 className="from-foreground to-foreground/60 mt-1 bg-linear-to-r bg-clip-text text-3xl font-bold tracking-tight text-transparent">
              {greeting}
            </h1>

            {/* Quick actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              {QUICK_ACTIONS.map(({ label, href, icon: ActionIcon }, i) => (
                <motion.div
                  key={href}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + i * 0.06 }}
                >
                  <Link
                    href={href}
                    className="group text-muted-foreground hover:border-primary/40 hover:bg-primary/10 hover:text-foreground flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs transition-all hover:-translate-y-0.5"
                  >
                    <ActionIcon className="text-primary h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                    {label}
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Clock + week progress */}
          <div className="flex flex-col items-end gap-2 pr-10">
            <div className="font-mono text-4xl font-semibold tracking-tight tabular-nums">
              {now.toLocaleTimeString('en-SE', { hour: '2-digit', minute: '2-digit' })}
              <span className="text-muted-foreground/50 ml-1 text-base">
                {String(now.getSeconds()).padStart(2, '0')}
              </span>
            </div>
            <div className="w-48">
              <div className="text-muted-foreground mb-1 flex justify-between text-[10px]">
                <span>Week {week.number}</span>
                <span>{Math.round(week.pct)}% done</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="bg-primary h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${week.pct}%` }}
                  transition={{ duration: 0.9, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mt-4 flex items-center justify-end gap-2 border-t border-white/5 pt-3 pr-10">
          <AnimatePresence>
            {editing && (
              <motion.div
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 12 }}
                className="flex items-center gap-2"
              >
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-white"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" /> Add widget
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-white"
                  onClick={reset}
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
          <Button
            size="sm"
            onClick={() => setEditing((e) => !e)}
            className="bg-primary/60 hover:bg-primary/80 gap-1.5 text-xs text-white"
          >
            {editing ? <Check className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
            {editing ? 'Done' : 'Edit layout'}
          </Button>
        </div>
      </motion.section>

      {/* Edit hint */}
      <AnimatePresence>
        {editing && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-primary/40 bg-primary/5 text-primary mb-4 overflow-hidden rounded-lg border border-dashed px-4 py-2 text-center text-xs"
          >
            Drag widgets to reorder, resize them, or remove ones you don't need.
          </motion.p>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className={
          editing
            ? 'ring-primary/30 rounded-2xl ring-1 ring-offset-8 ring-offset-transparent transition-shadow'
            : 'transition-shadow'
        }
      >
        <DashboardGrid
          widgets={layout.widgets}
          editing={editing}
          onReorder={reorder}
          onResize={resize}
          onRemove={remove}
        />
      </motion.div>

      <AddWidgetPanel
        open={addOpen}
        onClose={() => setAddOpen(false)}
        existingWidgets={layout.widgets}
        onAdd={add}
      />
    </div>
  );
}

function useNow(intervalMs: number): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

function getGreeting(d: Date, name?: string): { greeting: string; Icon: LucideIcon } {
  const hour = d.getHours();
  const [greet, Icon] =
    hour < 5
      ? (['Still up', Moon] as const)
      : hour < 12
        ? (['Good morning', Sunrise] as const)
        : hour < 17
          ? (['Good afternoon', Sun] as const)
          : (['Good evening', Moon] as const);
  return { greeting: name ? `${greet}, ${name.split(' ')[0]}!` : `${greet}!`, Icon };
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-SE', { weekday: 'long', month: 'long', day: 'numeric' });
}

/** ISO week number plus how far through the Mon-Sun week we are (my teacher was lwk right — math is useful)*/
function getWeekProgress(d: Date): { number: number; pct: number } {
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const number = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  const dow = (d.getDay() + 6) % 7; // Mon = 0
  const msIntoDay = d.getHours() * 3600e3 + d.getMinutes() * 60e3 + d.getSeconds() * 1e3;
  const pct = ((dow * 86400e3 + msIntoDay) / (7 * 86400e3)) * 100;
  return { number, pct };
}
