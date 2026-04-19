"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { WIDGET_REGISTRY, sizeToClasses, SIZE_LABELS } from "@/lib/widgets/registry";
import type { WidgetInstance, WidgetSize } from "@/lib/widgets/types";

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

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: instance.instanceId, disabled: !editing });

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
        "relative rounded-xl overflow-visible flex flex-col min-h-0",
        isDragging && "opacity-60 ring-2 ring-primary/40"
      )}
    >
      {/* Card background */}
      <div
        className="absolute inset-0 rounded-xl"
        style={{ background: "var(--card)", border: "1px solid oklch(1 0 0 / 7%)" }}
      />

      {/* Edit-mode overlay controls */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-xl ring-1 ring-primary/30 z-10 pointer-events-none"
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="relative z-20 flex items-center gap-1.5 px-3 pt-3 pb-1 shrink-0">
        {/* Drag handle — only visible in edit mode */}
        <AnimatePresence>
          {editing && (
            <motion.button
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors shrink-0"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </AnimatePresence>

        <div
          className="flex items-center justify-center w-5 h-5 rounded-md shrink-0"
          style={{ background: "oklch(0.65 0.22 278 / 15%)" }}
        >
          <Icon className="w-3 h-3 text-primary" />
        </div>
        <h2 className="text-xs font-semibold text-foreground/90 flex-1 truncate">{meta.label}</h2>

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
                onClick={() => setSizeOpen(o => !o)}
                className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10"
              >
                {instance.size} <ChevronDown className="w-2.5 h-2.5" />
              </button>

              <AnimatePresence>
                {sizeOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -4, scale: 0.95 }}
                    className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-white/10 shadow-xl overflow-hidden z-50"
                    style={{ background: "var(--card)" }}
                    onMouseLeave={() => setSizeOpen(false)}
                  >
                    {meta.allowedSizes.map(s => (
                      <button
                        key={s}
                        onClick={() => { onResize(instance.instanceId, s); setSizeOpen(false); }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs hover:bg-white/5 transition-colors flex items-center justify-between",
                          s === instance.size && "text-primary"
                        )}
                      >
                        <span>{SIZE_LABELS[s]}</span>
                        <span className="text-[10px] text-muted-foreground">{s}</span>
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
              className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 px-3 pb-3 pt-1 min-h-0 overflow-hidden">
        {children}
      </div>
    </div>
  );
}
