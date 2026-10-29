'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Archive,
  FileText,
  Globe,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  StickyNote,
  Upload,
  X,
} from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import NoteEditor, { type Note } from '@/components/NoteEditor';
import ShareConversationPicker, { type ShareCardRef } from '@/components/ShareConversationPicker';
import type { NoteStatus } from '@/app/api/lib/notesDb';

const STATUS_ICON: Record<NoteStatus, React.ElementType> = {
  draft: FileText,
  published: Globe,
  archived: Archive,
};
const STATUS_COLOR: Record<NoteStatus, string> = {
  draft: 'oklch(0.75 0.10 80)',
  published: 'oklch(0.72 0.18 148)',
  archived: 'oklch(0.55 0.02 260)',
};

function stripMd(md: string) {
  return md
    .replace(/[#*_`~>[\]!]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list');
  const [shareCard, setShareCard] = useState<ShareCardRef | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  function openSharePicker(note: Note) {
    setShareCard({
      type: 'note',
      noteId: note.id,
      noteTitle: note.title || 'Untitled',
      notePreview: stripMd(note.content).slice(0, 200) || undefined,
      noteStatus: note.status,
    });
  }

  useEffect(() => {
    apiFetch<{ notes: Note[] }>('/api/notes')
      .then((d) => {
        const ns = Array.isArray(d.notes) ? d.notes : [];
        setNotes(ns);
        if (ns.length > 0) setSelected(ns[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      stripMd(n.content).toLowerCase().includes(search.toLowerCase())
  );

  const createNote = async () => {
    if (creating) return;
    setCreating(true);
    try {
      const res = await apiFetch<{ note: Note }>('/api/notes', {
        method: 'POST',
        body: JSON.stringify({
          title: 'Untitled',
          content: '',
          status: 'draft',
        }) as unknown as BodyInit,
      });
      setNotes((n) => [res.note, ...n]);
      setSelected(res.note.id);
      setMobileView('editor');
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = (updated: Note) => {
    setNotes((ns) => ns.map((n) => (n.id === updated.id ? updated : n)));
  };

  const handleDelete = (id: string) => {
    const remaining = notes.filter((n) => n.id !== id);
    setNotes(remaining);
    setSelected(remaining[0]?.id ?? null);
    setMobileView('list');
  };

  const duplicateNote = async (note: Note) => {
    try {
      const res = await apiFetch<{ note: Note }>('/api/notes', {
        method: 'POST',
        body: JSON.stringify({
          title: `${note.title || 'Untitled'} (copy)`,
          content: note.content,
          status: 'draft' as NoteStatus,
        }) as unknown as BodyInit,
      });
      setNotes((n) => [res.note, ...n]);
      setSelected(res.note.id);
      setMobileView('editor');
    } catch {
      /* ignore */
    }
  };

  const handleImportFile = async (file: File) => {
    const text = await file.text();
    const lines = text.split('\n');
    const firstLine = lines.find((l) => l.trim()) ?? '';
    const title =
      firstLine.replace(/^#+\s*/, '').trim() || file.name.replace(/\.(md|txt|markdown)$/i, '');
    try {
      const res = await apiFetch<{ note: Note }>('/api/notes', {
        method: 'POST',
        body: JSON.stringify({
          title,
          content: text,
          status: 'draft' as NoteStatus,
        }) as unknown as BodyInit,
      });
      setNotes((n) => [res.note, ...n]);
      setSelected(res.note.id);
      setMobileView('editor');
    } catch {
      /* ignore */
    }
  };

  const selectNote = useCallback((id: string) => {
    setSelected(id);
    setMobileView('editor');
  }, []);

  const activeNote = notes.find((n) => n.id === selected) ?? null;

  return (
    <>
      <div className="flex h-full overflow-hidden">
        {/* Note list panel */}
        <div
          className={cn(
            // Mobile: full width, toggled by mobileView
            'flex flex-col border-r',
            'w-full md:w-64 md:shrink-0',
            // On mobile hide when viewing editor
            mobileView === 'editor' ? 'hidden md:flex' : 'flex'
          )}
          style={{ borderColor: 'oklch(1 0 0 / 8%)' }}
        >
          {/* Header */}
          <div className="flex shrink-0 items-center gap-2 px-3 py-3">
            <StickyNote className="text-primary h-4 w-4 shrink-0" />
            <span className="flex-1 text-sm font-semibold">Notes</span>
            {/* Import file */}
            <input
              ref={importInputRef}
              type="file"
              accept=".md,.txt,.markdown"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImportFile(file);
                  e.target.value = '';
                }
              }}
            />
            <button
              onClick={() => importInputRef.current?.click()}
              className="text-muted-foreground hover:text-foreground rounded-lg p-1 transition-colors hover:bg-white/6"
              title="Import note from file"
            >
              <Upload className="h-4 w-4" />
            </button>
            <button
              onClick={createNote}
              disabled={creating}
              className="text-muted-foreground hover:text-foreground rounded-lg p-1 transition-colors hover:bg-white/6"
              title="New note"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Search */}
          <div className="shrink-0 px-2 pb-2">
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-3 w-3 -translate-y-1/2" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search…"
                className="focus:border-primary/40 placeholder:text-muted-foreground/40 w-full rounded-lg border border-white/8 bg-white/5 py-1.5 pr-7 pl-7 text-xs outline-none"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="flex-1 space-y-0.5 overflow-y-auto px-1.5 pb-2">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="mx-1 mb-1 h-14 animate-pulse rounded-lg bg-white/5" />
              ))
            ) : filtered.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center text-xs">
                {search ? 'No matches.' : 'No notes yet.'}
              </p>
            ) : (
              <AnimatePresence initial={false}>
                {filtered.map((note) => {
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
                        'group w-full rounded-lg px-3 py-2.5 text-left transition-colors',
                        isActive
                          ? 'bg-primary/12 border-primary/20 border'
                          : 'border border-transparent hover:bg-white/5'
                      )}
                    >
                      <div className="mb-0.5 flex items-center gap-1.5">
                        <Icon
                          className="h-2.5 w-2.5 shrink-0"
                          style={{ color: STATUS_COLOR[note.status] }}
                        />
                        <span
                          className={cn(
                            'flex-1 truncate text-xs font-medium',
                            isActive ? 'text-foreground' : 'text-foreground/80'
                          )}
                        >
                          {note.title || 'Untitled'}
                        </span>
                        {/* Share to messages button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openSharePicker(note);
                          }}
                          className="text-muted-foreground hover:text-primary rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-white/10"
                          title="Share to messages"
                        >
                          <MessageSquare className="h-2.5 w-2.5" />
                        </button>
                      </div>
                      <p className="text-muted-foreground truncate pl-4 text-[10px] leading-snug">
                        {stripMd(note.content) || 'Empty'}
                      </p>
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            )}
          </div>

          {/* Bottom: note count */}
          <div
            className="text-muted-foreground shrink-0 border-t px-4 py-2 text-[10px]"
            style={{ borderColor: 'oklch(1 0 0 / 6%)' }}
          >
            {notes.length} note{notes.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Editor pane  */}
        <div
          className={cn(
            'flex min-w-0 flex-1 flex-col',
            // On mobile hide when viewing list
            mobileView === 'list' ? 'hidden md:flex' : 'flex'
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
                  onDuplicate={() => duplicateNote(activeNote)}
                  onBack={() => setMobileView('list')}
                  onShareToMessages={() => openSharePicker(activeNote)}
                />
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3"
              >
                <StickyNote className="h-10 w-10 opacity-20" />
                <p className="text-sm">Select a note or create a new one</p>
                <button
                  onClick={createNote}
                  disabled={creating}
                  className="text-primary hover:bg-primary/10 flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm transition-colors"
                >
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  New note
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Share to messages picker */}
      <AnimatePresence>
        {shareCard && (
          <ShareConversationPicker card={shareCard} onClose={() => setShareCard(null)} />
        )}
      </AnimatePresence>
    </>
  );
}
