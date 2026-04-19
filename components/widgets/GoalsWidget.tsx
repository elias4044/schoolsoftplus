"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiFetch } from "@/lib/api-client";
import type { WidgetSize } from "@/lib/widgets/types";

interface Goal { id: string; text: string; createdAt: string }
interface Props { size: WidgetSize }

export default function GoalsWidget({ size }: Props) {
  const [goals, setGoals]   = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    apiFetch<Goal[]>("/api/goals")
      .then(d => setGoals(Array.isArray(d) ? d : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const add = async () => {
    const text = newText.trim();
    if (!text || saving) return;
    setSaving(true);
    try {
      const goal = await apiFetch<Goal>("/api/goals", {
        method: "POST",
        body: JSON.stringify({ text }) as unknown as BodyInit,
      });
      setGoals(g => [goal, ...g]);
      setNewText("");
    } finally { setSaving(false); }
  };

  const del = async (id: string) => {
    setGoals(g => g.filter(x => x.id !== id));
    await apiFetch("/api/goals", { method: "DELETE", params: { id } }).catch(() => {});
  };

  const short = size.endsWith("x1");

  return (
    <div className="flex flex-col gap-2 h-full">
      <div className="flex gap-2">
        <Input
          value={newText}
          onChange={e => setNewText(e.target.value)}
          onKeyDown={e => e.key === "Enter" && add()}
          placeholder="Add a goal…"
          className="flex-1 h-7 text-xs bg-white/5 border-white/10"
        />
        <Button size="icon" className="w-7 h-7 shrink-0" onClick={add}
          style={{ background: "oklch(0.65 0.22 278 / 30%)" }}>
          {saving ? <Loader2 className="w-3 h-3 animate-spin text-primary" /> : <Plus className="w-3 h-3 text-primary" />}
        </Button>
      </div>

      {loading ? (
        <div className="space-y-1.5">
          {[1,2].map(i => <div key={i} className="h-6 rounded bg-white/5 animate-pulse" />)}
        </div>
      ) : goals.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-3">No goals set.</p>
      ) : (
        <div className="space-y-1 overflow-y-auto flex-1">
          <AnimatePresence initial={false}>
            {goals.slice(0, short ? 3 : 20).map(goal => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-start gap-2 group py-1"
              >
                <div className="w-1.5 h-1.5 rounded-full border border-primary/50 mt-1 shrink-0" />
                <p className="flex-1 text-xs text-foreground/80 leading-relaxed">{goal.text}</p>
                <button
                  onClick={() => del(goal.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0 mt-0.5"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
