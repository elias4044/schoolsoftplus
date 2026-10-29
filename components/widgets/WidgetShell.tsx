'use client';

import { useRef, useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, GripVertical, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { SIZE_LABELS, sizeToClasses, WIDGET_REGISTRY } from '@/lib/widgets/registry';
import type { WidgetInstance, WidgetSize } from '@/lib/widgets/types';

import { WidgetErrorBoundary } from './WidgetErrorBoundary';

interface Props {
  instance: WidgetInstance;
  children: React.ReactNode;
  onResize: (id: string, size: WidgetSize) => void;
  onRemove: (id: string) => void;
  editing: boolean;
}

export function WidgetShell({ instance, children, onResize, onRemove, editing }: Props) {
  const meta = WIDGET_REGISTRY[instance.widgetId];
  const Icon = meta.icon;
  const [sizeOpen, setSizeOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: instance.instanceId,
    disabled: !editing,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  const gridClass = sizeToClasses(instance.size);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        gridClass,
        'relative flex min-h-0 flex-col overflow-visible rounded-xl',
        isDragging && 'ring-primary/40 opacity-60 ring-2'
      )}
    >
      {/* Card background */}
      <div
        className="absolute inset-0 rounded-xl"
        style={{ background: 'var(--card)', border: '1px solid oklch(1 0 0 / 7%)' }}
      />

      {/* Edit-mode overlay controls */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="ring-primary/30 pointer-events-none absolute inset-0 z-10 rounded-xl ring-1"
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="relative z-20 flex shrink-0 items-center gap-1.5 px-3 pt-3 pb-1">
        {/* Drag handle — only visible in edit mode */}
        <AnimatePresence>
          {editing && (
            <motion.button
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="text-muted-foreground hover:text-foreground shrink-0 cursor-grab transition-colors active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="h-3.5 w-3.5" />
            </motion.button>
          )}
        </AnimatePresence>

        <div className="bg-brand-dim flex h-5 w-5 shrink-0 items-center justify-center rounded-md">
          <Icon className="text-primary h-3 w-3" />
        </div>
        <h2 className="text-foreground/90 flex-1 truncate text-xs font-semibold">{meta.label}</h2>

        {/* Size picker */}
        <AnimatePresence>
          {editing && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative"
            >
              <button
                onClick={() => setSizeOpen((o) => !o)}
                className="text-muted-foreground hover:text-foreground flex items-center gap-0.5 rounded bg-white/5 px-1.5 py-0.5 text-[10px] transition-colors hover:bg-white/10"
              >
                {instance.size} <ChevronDown className="h-2.5 w-2.5" />
              </button>

              <AnimatePresence>
                {sizeOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    className="absolute top-full right-0 z-50 mt-1 w-44 overflow-hidden rounded-xl border border-white/10 shadow-xl"
                    style={{ background: 'var(--card)' }}
                    onMouseLeave={() => setSizeOpen(false)}
                  >
                    {meta.allowedSizes.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          onResize(instance.instanceId, s);
                          setSizeOpen(false);
                        }}
                        className={cn(
                          'flex w-full items-center justify-between px-3 py-2 text-left text-xs transition-colors hover:bg-white/5',
                          s === instance.size && 'text-primary'
                        )}
                      >
                        <span>{SIZE_LABELS[s]}</span>
                        <span className="text-muted-foreground text-[10px]">{s}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Remove button */}
        <AnimatePresence>
          {editing && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => onRemove(instance.instanceId)}
              className="text-muted-foreground hover:text-destructive shrink-0 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-0 flex-1 overflow-hidden px-3 pt-1 pb-3">
        <WidgetErrorBoundary widgetId={instance.widgetId}>{children}</WidgetErrorBoundary>
      </div>
    </div>
  );
}
