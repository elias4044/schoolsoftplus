'use client';

import { useState } from 'react';
import { Plus, Search } from 'lucide-react';

import { WIDGET_REGISTRY } from '@/lib/widgets/registry';
import { MAX_WIDGETS, type WidgetId, type WidgetInstance } from '@/lib/widgets/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';

interface Props {
  open: boolean;
  onClose: () => void;
  existingWidgets: WidgetInstance[];
  onAdd: (id: WidgetId) => void;
}

export function AddWidgetPanel({ open, onClose, existingWidgets, onAdd }: Props) {
  const [query, setQuery] = useState('');
  const search = query.trim().toLowerCase();
  const widgets = Object.values(WIDGET_REGISTRY).filter((meta) =>
    `${meta.label} ${meta.description}`.toLowerCase().includes(search)
  );
  const activeIds = new Set(existingWidgets.map((widget) => widget.widgetId));
  const full = existingWidgets.length >= MAX_WIDGETS;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      title="Widget library"
    >
      <div className="relative mx-5 mb-3">
        <Search
          aria-hidden
          className="text-muted-foreground pointer-events-none absolute top-3.5 left-3 size-4"
        />
        <Input
          className="h-11 pl-9"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search widgets"
          aria-label="Search widgets"
        />
      </div>
      {full && (
        <p className="text-muted-foreground px-5 pb-2 text-sm">
          Dashboard is full. Remove a widget to add another.
        </p>
      )}
      <div className="divide-border/70 flex-1 divide-y overflow-y-auto px-5 pb-4">
        {widgets.map(({ id, icon: Icon, label, description }) => (
          <div key={id} className="flex items-center gap-3 py-2.5">
            <Icon aria-hidden className="text-muted-foreground size-4 shrink-0 self-start" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{description}</p>
            </div>
            <Button
              variant="ghost"
              size="icon-lg"
              disabled={full}
              aria-label={activeIds.has(id) ? `Add another ${label} widget` : `Add ${label}`}
              onClick={() => onAdd(id)}
            >
              <Plus />
            </Button>
          </div>
        ))}
        {!widgets.length && (
          <p className="text-muted-foreground py-5 text-sm">No widgets match your search.</p>
        )}
      </div>
    </Sheet>
  );
}
