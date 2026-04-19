"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Plus } from "lucide-react";
import { WIDGET_REGISTRY } from "@/lib/widgets/registry";
import type { WidgetId, WidgetInstance } from "@/lib/widgets/types";

interface Props {
  open: boolean;
  onClose: () => void;
  existingWidgets: WidgetInstance[];
  onAdd: (id: WidgetId) => void;
}

export function AddWidgetPanel({ open, onClose, existingWidgets, onAdd }: Props) {
  const activeIds = new Set(existingWidgets.map(w => w.widgetId));

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
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-72 flex flex-col"
            style={{ background: "var(--card)", borderLeft: "1px solid oklch(1 0 0 / 8%)" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/7 shrink-0">
              <h2 className="text-sm font-semibold">Add Widget</h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {(Object.values(WIDGET_REGISTRY) as typeof WIDGET_REGISTRY[WidgetId][]).map(meta => {
                const Icon = meta.icon;
                const active = activeIds.has(meta.id);
                return (
                  <button
                    key={meta.id}
                    onClick={() => { onAdd(meta.id); onClose(); }}
                    className="w-full text-left rounded-xl p-3 border transition-all flex items-start gap-3 group"
                    style={{
                      background: "oklch(1 0 0 / 3%)",
                      border: "1px solid oklch(1 0 0 / 7%)",
                    }}
                  >
                    <div
                      className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0 mt-0.5"
                      style={{ background: "oklch(0.65 0.22 278 / 15%)" }}
                    >
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground flex items-center gap-2">
                        {meta.label}
                        {active && (
                          <span className="text-[10px] text-muted-foreground font-normal">(on dashboard)</span>
                        )}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{meta.description}</p>
                    </div>
                    <div className="shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Plus className="w-3.5 h-3.5 text-primary" />
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
