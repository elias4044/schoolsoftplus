'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check, LayoutGrid, Palette, Plus, SlidersHorizontal } from 'lucide-react';

import { useAuth, type AuthSession } from '@/lib/auth-context';
import { DEFAULT_DASHBOARD_APPEARANCE } from '@/lib/widgets/types';
import {
  DASHBOARD_PRESETS,
  useWidgetLayout,
  type DashboardPreset,
} from '@/lib/widgets/useWidgetLayout';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddWidgetPanel } from '@/components/widgets/AddWidgetPanel';
import { DashboardAppearancePanel } from '@/components/widgets/DashboardAppearancePanel';
import { DashboardGrid } from '@/components/widgets/DashboardGrid';
import { SchoolWeekPlanner } from '@/components/widgets/SchoolWeekPlanner';

import './dashboard.css';

export default function DashboardPage() {
  const { session } = useAuth();
  return session ? <StudentDashboard key={session.userId} session={session} /> : null;
}

function StudentDashboard({ session }: { session: AuthSession }) {
  const {
    layout,
    ready,
    status,
    reorder,
    resize,
    remove,
    add,
    applyPreset,
    retry,
    setAppearance,
    toggleHighlight,
  } = useWidgetLayout(session.userId);
  const [editing, setEditing] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [preset, setPreset] = useState<DashboardPreset | null>(null);
  const reducedMotion = useReducedMotion();
  const name = (session.name ?? session.username)?.trim().split(/\s+/)[0];
  const appearance = layout.appearance ?? DEFAULT_DASHBOARD_APPEARANCE;

  return (
    <div
      className="studentDashboard mx-auto max-w-[83rem] px-4 pt-5 pb-12 sm:px-7 sm:pt-8 lg:px-9"
      data-accent={appearance.accent}
      data-density={appearance.density}
    >
      <header className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 sm:mb-5">
        <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-[1.75rem]">
          Dashboard
        </h1>
        <Button
          variant={editing ? 'default' : 'outline'}
          size="lg"
          disabled={!ready}
          onClick={() => {
            setEditing(!editing);
            setPreset(null);
            setAppearanceOpen(false);
          }}
        >
          {editing ? <Check /> : <SlidersHorizontal />}
          {editing ? 'Done' : 'Customize'}
        </Button>
      </header>

      {(editing || status === 'error' || status === 'load-error') && (
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.2 }}
          className="bg-card border-border mb-4 grid gap-3 rounded-2xl border p-3 sm:p-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            {editing && (
              <div className="flex flex-wrap gap-1.5">
                <Button size="lg" variant="soft" onClick={() => setLibraryOpen(true)}>
                  <Plus /> Add widgets
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="lg" variant="ghost">
                      <LayoutGrid /> Layout presets
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {(Object.keys(DASHBOARD_PRESETS) as DashboardPreset[]).map((option) => (
                      <DropdownMenuItem key={option} onSelect={() => setPreset(option)}>
                        {option}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  size="lg"
                  variant={appearanceOpen ? 'outline' : 'ghost'}
                  aria-expanded={appearanceOpen}
                  aria-controls={appearanceOpen ? 'dashboard-appearance' : undefined}
                  onClick={() => setAppearanceOpen(!appearanceOpen)}
                >
                  <Palette /> Appearance
                </Button>
              </div>
            )}
            <p role="status" className="text-muted-foreground px-1 text-xs">
              {status === 'saving' && 'Saving layout...'}
              {status === 'saved' && 'Layout saved'}
              {status === 'loading' && 'Checking saved layout...'}
              {status === 'error' && 'Could not sync your layout.'}
              {status === 'load-error' && 'Could not load your saved layout.'}
              {status === 'ready' && editing && 'Drag a widget or use its options to move it.'}
              {(status === 'error' || status === 'load-error') && (
                <button
                  className="text-foreground ml-2 min-h-9 underline underline-offset-4"
                  onClick={retry}
                >
                  Retry
                </button>
              )}
            </p>
          </div>
          {editing && appearanceOpen && (
            <DashboardAppearancePanel appearance={appearance} onChange={setAppearance} />
          )}
          {preset && (
            <div className="border-border flex w-full flex-wrap items-center gap-2 border-t pt-2">
              <p className="min-w-40 flex-1 text-sm">Replace this layout with {preset}?</p>
              <Button variant="ghost" size="sm" onClick={() => setPreset(null)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  applyPreset(preset);
                  setPreset(null);
                }}
              >
                Apply preset
              </Button>
            </div>
          )}
        </motion.div>
      )}

      {ready && appearance.showPlanner && <SchoolWeekPlanner name={name} />}

      {!ready ? (
        <div role="status" className="grid gap-3.5 @min-[38rem]:grid-cols-2">
          <span className="sr-only">Loading dashboard layout</span>
          {[0, 1].map((item) => (
            <div key={item} className="bg-card border-border h-44 rounded-2xl border" />
          ))}
        </div>
      ) : layout.widgets.length ? (
        <DashboardGrid
          widgets={layout.widgets}
          editing={editing}
          onReorder={reorder}
          onResize={resize}
          onRemove={remove}
          onToggleHighlight={toggleHighlight}
        />
      ) : (
        <div className="border-border rounded-2xl border border-dashed px-5 py-10 text-center">
          <h2 className="text-base font-semibold">Your dashboard is empty</h2>
          <p className="text-muted-foreground mt-1 text-sm">Choose what you want to see here.</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => {
              setEditing(true);
              setLibraryOpen(true);
            }}
          >
            <Plus /> Add widgets
          </Button>
        </div>
      )}

      {libraryOpen && (
        <AddWidgetPanel
          open
          onClose={() => setLibraryOpen(false)}
          existingWidgets={layout.widgets}
          onAdd={add}
        />
      )}
    </div>
  );
}
