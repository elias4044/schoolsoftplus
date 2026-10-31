'use client';

import { Plus } from 'lucide-react';

import { WIDGET_REGISTRY } from '@/lib/widgets/registry';
import type { WidgetId, WidgetInstance } from '@/lib/widgets/types';
import { Sheet } from '@/components/ui/sheet';

interface Props {
  open: boolean;
  onClose: () => void;
  existingWidgets: WidgetInstance[];
  onAdd: (id: WidgetId) => void;
}

export function AddWidgetPanel({ open, onClose, existingWidgets, onAdd }: Props) {
  const activeIds = new Set(existingWidgets.map((w) => w.widgetId));

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
      title="Add Widget"
    >
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {(Object.values(WIDGET_REGISTRY) as (typeof WIDGET_REGISTRY)[WidgetId][]).map((meta) => {
          const Icon = meta.icon;
          const active = activeIds.has(meta.id);
          return (
            <button
              key={meta.id}
              onClick={() => {
                onAdd(meta.id);
                onClose();
              }}
              className="group hover:bg-accent focus-visible:ring-ring flex w-full items-start gap-3 rounded-xl p-3 text-left transition-colors outline-none focus-visible:ring-2"
            >
              <div className="text-muted-foreground mt-1 flex size-5 shrink-0 items-center justify-center">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-foreground flex flex-wrap items-center gap-x-2 text-sm font-medium">
                  {meta.label}
                  {active && (
                    <span className="text-muted-foreground text-xs font-normal">
                      (on dashboard)
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">
                  {meta.description}
                </p>
              </div>
              <div className="text-muted-foreground mt-1 shrink-0">
                <Plus className="text-primary h-3.5 w-3.5" />
              </div>
            </button>
          );
        })}
      </div>
    </Sheet>
  );
}
