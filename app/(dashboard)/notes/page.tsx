"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  StickyNote, Plus, Search, X, Loader2,
  FileText, Archive, Globe,
} from "lucide-react";
import NoteEditor, { type Note } from "@/components/NoteEditor";
import { apiFetch } from "@/lib/api-client";
import type { NoteStatus } from "@/app/api/lib/notesDb";
import { cn } from "@/lib/utils";
import { useCallback } from "react";

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
  return md
    .replace(/[#*_`~>[\]!]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export default function NotesPage() {
  const [notes, setNotes]       = useState<Note[]>([]);
  const [loading, setLoading]   = useState(true);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch]     = useState("");
  const [mobileView, setMobileView] = useState<"list" | "editor">("list");
  const searchRef               = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiFetch<{ notes: Note[] }>("/api/notes")
      .then(d => {
        const ns = Array.isArray(d.notes) ? d.notes : [];
        setNotes(ns);
        if (ns.length > 0) setSelected(ns[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = notes.filter(n =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    stripMd(n.content).toLowerCase().includes(search.toLowerCase())
  );

  const createNote = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const res = await apiFetch<{ note: Note }>("/api/notes", {
        method: "POST",
        body: JSON.stringify({ title: "Untitled", content: "", status: "draft" }) as unknown as BodyInit,
      });
      setNotes(n => [res.note, ...n]);
      setSelected(res.note.id);
      setMobileView("editor");
    } finally { setCreating(false); }
  };

  const handleUpdate = (updated: Note) => {
    setNotes(ns => ns.map(n => n.id === updated.id ? updated : n));
  };

  const handleDelete = (id: string) => {
    const remaining = notes.filter(n => n.id !== id);
    setNotes(remaining);
    setSelected(remaining[0]?.id ?? null);
    setMobileView("list");
  };

  const selectNote = useCallback((id: string) => {
    setSelected(id);
    setMobileView("editor");
  }, []);

  const activeNote = notes.find(n => n.id === selected) ?? null;

  return (
    <div className="flex h-full overflow-hidden">
      {/* ===== Note list panel ===== */}
      <div
        className={cn(
          // Mobile: full width, toggled by mobileView
          "flex flex-col border-r",
          "w-full md:w-64 md:shrink-0",
          // On mobile hide when viewing editor
          mobileView === "editor" ? "hidden md:flex" : "flex",
        )}
        style={{ borderColor: "oklch(1 0 0 / 8%)" }}
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-3 shrink-0">
          <StickyNote className="w-4 h-4 text-primary shrink-0" />
          <span className="font-semibold text-sm flex-1">Notes</span>
          <button
            onClick={createNote}
            disabled={creating}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors hover:bg-white/6"
            title="New note"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </button>
        </div>

        {/* Search */}
        <div className="px-2 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full bg-white/5 border border-white/8 rounded-lg pl-7 pr-7 py-1.5 text-xs outline-none focus:border-primary/40 placeholder:text-muted-foreground/40"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-1.5 pb-2 space-y-0.5">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse mx-1 mb-1" />
            ))
          ) : filtered.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-8">
              {search ? "No matches." : "No notes yet."}
            </p>
          ) : (
            <AnimatePresence initial={false}>
              {filtered.map(note => {
                const Icon = STATUS_ICON[note.status];
                const isActive = selected === note.id;
                return (
                  <motion.button
                    key={note.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                    onClick={() => selectNote(note.id)}
                    className={cn(
                      "w-full text-left rounded-lg px-3 py-2.5 transition-colors group",
                      isActive
                        ? "bg-primary/12 border border-primary/20"
                        : "hover:bg-white/5 border border-transparent"
                    )}
                  >
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Icon
                        className="w-2.5 h-2.5 shrink-0"
                        style={{ color: STATUS_COLOR[note.status] }}
                      />
                      <span className={cn(
                        "text-xs font-medium truncate flex-1",
                        isActive ? "text-foreground" : "text-foreground/80"
                      )}>
                        {note.title || "Untitled"}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate leading-snug pl-4">
                      {stripMd(note.content) || "Empty"}
                    </p>
                  </motion.button>
                );
              })}
            </AnimatePresence>
          )}
        </div>

        {/* Bottom: note count */}
        <div
          className="px-4 py-2 border-t text-[10px] text-muted-foreground shrink-0"
          style={{ borderColor: "oklch(1 0 0 / 6%)" }}
        >
          {notes.length} note{notes.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* ===== Editor pane ===== */}
      <div
        className={cn(
          "flex-1 min-w-0 flex flex-col",
          // On mobile hide when viewing list
          mobileView === "list" ? "hidden md:flex" : "flex",
        )}
      >
        <AnimatePresence mode="wait">
          {activeNote ? (
            <motion.div
              key={activeNote.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <NoteEditor
                note={activeNote}
                onUpdate={handleUpdate}
                onDelete={() => handleDelete(activeNote.id)}
                onBack={() => setMobileView("list")}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center gap-3 text-muted-foreground"
            >
              <StickyNote className="w-10 h-10 opacity-20" />
              <p className="text-sm">Select a note or create a new one</p>
              <button
                onClick={createNote}
                disabled={creating}
                className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl transition-colors text-primary hover:bg-primary/10"
              >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                New note
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
