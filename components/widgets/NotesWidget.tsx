'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Archive, FileText, Globe, Loader2, Plus, StickyNote } from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import type { WidgetSize } from '@/lib/widgets/types';
import type { NoteStatus } from '@/app/api/lib/notesDb';

interface Note {
  id: string;
  title: string;
  content: string;
  status: NoteStatus;
  updatedAt: number;
}
interface Props {
  size: WidgetSize;
}

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

export default function NotesWidget({ size }: Props) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    apiFetch<{ notes: Note[] }>('/api/notes')
      .then((d) => setNotes(Array.isArray(d.notes) ? d.notes : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const compact = size === '1x1' || size === '2x1' || size === '4x1';
  const limit = compact ? 3 : 8;

  return (
    <div className="flex h-full flex-col gap-2">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between">
        <span className="text-muted-foreground text-xs font-medium">Recent notes</span>
        <button
          onClick={() => router.push('/notes')}
          className="text-muted-foreground hover:text-foreground p-0.5 transition-colors"
          title="New note"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="flex-1 space-y-1.5">
          {[1, 2].map((i) => (
            <div key={i} className="h-7 animate-pulse rounded bg-white/5" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2">
          <StickyNote className="h-6 w-6 opacity-30" />
          <p className="text-xs">No notes yet</p>
          <button
            onClick={() => router.push('/notes')}
            className="text-primary text-xs hover:underline"
          >
            Create one
          </button>
        </div>
      ) : (
        <div className="flex-1 space-y-1 overflow-y-auto">
          {notes.slice(0, limit).map((note, i) => {
            const Icon = STATUS_ICON[note.status];
            return (
              <motion.button
                key={note.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => router.push(`/notes?id=${note.id}`)}
                className="group w-full rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/6"
              >
                <div className="flex items-center gap-1.5">
                  <Icon
                    className="h-2.5 w-2.5 shrink-0"
                    style={{ color: STATUS_COLOR[note.status] }}
                  />
                  <span className="text-foreground/85 group-hover:text-foreground flex-1 truncate text-xs font-medium transition-colors">
                    {note.title || 'Untitled'}
                  </span>
                </div>
                {!compact && (
                  <p className="text-muted-foreground mt-0.5 truncate pl-4 text-[10px]">
                    {stripMd(note.content) || 'Empty'}
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
          onClick={() => router.push('/notes')}
          className="text-muted-foreground hover:text-foreground shrink-0 text-center text-[10px] transition-colors"
        >
          +{notes.length - limit} more
        </button>
      )}
    </div>
  );
}
