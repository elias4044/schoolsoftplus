"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { DashboardGrid } from "@/components/widgets/DashboardGrid";
import { AddWidgetPanel } from "@/components/widgets/AddWidgetPanel";
import { useWidgetLayout } from "@/lib/widgets/useWidgetLayout";

/* -- Page ------------------------------------------------- */
export default function DashboardPage() {
  const { session } = useAuth();
  const { layout, hydrated, reorder, resize, remove, add, reset } = useWidgetLayout();
  const [editing, setEditing] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const greeting = getGreeting(session?.name ?? session?.username);

  if (!hydrated) return null;

  return (
    <div className="p-6 max-w-350 mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{greeting}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{formatDate(new Date())}</p>
        </div>
        <div className="flex items-center gap-2">
          {editing && (
            <>
              <Button variant="ghost" size="sm" className="text-xs gap-1.5"
                onClick={() => setAddOpen(true)}>
                <Plus className="w-3.5 h-3.5" /> Add widget
              </Button>
              <Button variant="ghost" size="sm" className="text-xs gap-1.5 text-muted-foreground"
                onClick={reset}>
                <RotateCcw className="w-3.5 h-3.5" /> Reset
              </Button>
            </>
          )}
          <Button
            size="sm"
            onClick={() => setEditing(e => !e)}
            className="text-xs gap-1.5"
            style={editing ? { background: "oklch(0.65 0.22 278 / 20%)", color: "oklch(0.75 0.15 278)" } : {}}
          >
            <Pencil className="w-3.5 h-3.5" />
            {editing ? "Done" : "Edit layout"}
          </Button>
        </div>
      </motion.div>

      <DashboardGrid
        widgets={layout.widgets}
        editing={editing}
        onReorder={reorder}
        onResize={resize}
        onRemove={remove}
      />

      <AddWidgetPanel
        open={addOpen}
        onClose={() => setAddOpen(false)}
        existingWidgets={layout.widgets}
        onAdd={add}
      />
    </div>
  );
}

/* -- Helpers ---------------------------------------------- */
function getGreeting(name?: string): string {
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  return name ? `${greet}, ${name.split(" ")[0]}!` : `${greet}!`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-SE", { weekday: "long", month: "long", day: "numeric" });
}
