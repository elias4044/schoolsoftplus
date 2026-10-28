'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Plus, X } from 'lucide-react';

import { WIDGET_REGISTRY } from '@/lib/widgets/registry';
import type { WidgetId, WidgetInstance } from '@/lib/widgets/types';

interface Props {
  open: boolean;
  onClose: () => void;
  existingWidgets: WidgetInstance[];
  onAdd: (id: WidgetId) => void;
}

export function AddWidgetPanel({ open, onClose, existingWidgets, onAdd }: Props) {
  const activeIds = new Set(existingWidgets.map((w) => w.widgetId));

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, x: 320 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 320 }}
            transition={{ type: 'spring', stiffness: 340, damping: 32 }}
            className="fixed top-0 right-0 bottom-0 z-50 flex w-72 flex-col"
            style={{ background: 'var(--card)', borderLeft: '1px solid oklch(1 0 0 / 8%)' }}
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/7 px-5 py-4">
              <h2 className="text-sm font-semibold">Add Widget</h2>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {(Object.values(WIDGET_REGISTRY) as (typeof WIDGET_REGISTRY)[WidgetId][]).map(
                (meta) => {
                  const Icon = meta.icon;
                  const active = activeIds.has(meta.id);
                  return (
                    <button
                      key={meta.id}
                      onClick={() => {
                        onAdd(meta.id);
                        onClose();
                      }}
                      className="group flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all"
                      style={{
                        background: 'oklch(1 0 0 / 3%)',
                        border: '1px solid oklch(1 0 0 / 7%)',
                      }}
                    >
                      <div className="bg-brand-dim mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
                        <Icon className="text-primary h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-foreground flex items-center gap-2 text-xs font-medium">
                          {meta.label}
                          {active && (
                            <span className="text-muted-foreground text-[10px] font-normal">
                              (on dashboard)
                            </span>
                          )}
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-[10px] leading-relaxed">
                          {meta.description}
                        </p>
                      </div>
                      <div className="mt-1 shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                        <Plus className="text-primary h-3.5 w-3.5" />
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
