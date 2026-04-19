"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { StickyNote, Plus, Loader2, FileText, Globe, Archive } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useRouter } from "next/navigation";
import type { WidgetSize } from "@/lib/widgets/types";
import type { NoteStatus } from "@/app/api/lib/notesDb";

interface Note { id: string; title: string; content: string; status: NoteStatus; updatedAt: number }
interface Props { size: WidgetSize }

const STATUS_ICON: Record<NoteStatus, React.ElementType> = {
  draft:     FileText,
  published: Globe,
  archived:  Archive,
};
const STATUS_COLOR: Record<NoteStatus, string> = {
  draft:     "oklch(0.75 0.10 80)",
  published: "oklch(0.72 0.18 148)",
  archived:  "oklch(0.55 0.02 260)",
};

function stripMd(md: string) {
  return md.replace(/[#*_`~>[\]!]/g, "").replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim();
}

export default function NotesWidget({ size }: Props) {
  const [notes, setNotes]     = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    apiFetch<{ notes: Note[] }>("/api/notes")
      .then(d => setNotes(Array.isArray(d.notes) ? d.notes : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const compact = size === "1x1" || size === "2x1" || size === "4x1";
  const limit   = compact ? 3 : 8;

  return (
    <div className="flex flex-col gap-2 h-full">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <span className="text-xs font-medium text-muted-foreground">Recent notes</span>
        <button
          onClick={() => router.push("/notes")}
          className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
          title="New note"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-1.5 flex-1">
          {[1, 2].map(i => <div key={i} className="h-7 rounded bg-white/5 animate-pulse" />)}
        </div>
      ) : notes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
          <StickyNote className="w-6 h-6 opacity-30" />
          <p className="text-xs">No notes yet</p>
          <button
            onClick={() => router.push("/notes")}
            className="text-xs text-primary hover:underline"
          >
            Create one
          </button>
        </div>
      ) : (
        <div className="space-y-1 overflow-y-auto flex-1">
          {notes.slice(0, limit).map((note, i) => {
            const Icon = STATUS_ICON[note.status];
            return (
              <motion.button
                key={note.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => router.push(`/notes?id=${note.id}`)}
                className="w-full text-left rounded-lg px-2 py-1.5 hover:bg-white/6 transition-colors group"
              >
                <div className="flex items-center gap-1.5">
                  <Icon className="w-2.5 h-2.5 shrink-0" style={{ color: STATUS_COLOR[note.status] }} />
                  <span className="text-xs font-medium truncate flex-1 text-foreground/85 group-hover:text-foreground transition-colors">
                    {note.title || "Untitled"}
                  </span>
                </div>
                {!compact && (
                  <p className="text-[10px] text-muted-foreground truncate pl-4 mt-0.5">
                    {stripMd(note.content) || "Empty"}
                  </p>
                )}
              </motion.button>
            );
          })}
        </div>
      )}

      {/* Footer */}
      {notes.length > limit && (
        <button
          onClick={() => router.push("/notes")}
          className="shrink-0 text-[10px] text-muted-foreground hover:text-foreground transition-colors text-center"
        >
          +{notes.length - limit} more
        </button>
      )}
    </div>
  );
}
