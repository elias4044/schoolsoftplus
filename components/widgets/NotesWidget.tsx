'use client';

import Link from 'next/link';
import { FileText, Plus } from 'lucide-react';

import type { WidgetSize } from '@/lib/widgets/types';

import { listData, useWidgetResource, WidgetContent, WidgetRow, WidgetTag } from './WidgetContent';

interface Note {
  id: string;
  title: string;
  content: string;
  status: string;
  updatedAt?: number;
}

const editedDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });

export default function NotesWidget({ size }: { size: WidgetSize }) {
  const resource = useWidgetResource('/api/notes', (data) => listData<Note>(data, 'notes'), 0);
  const compact = size.endsWith('x1');

  return (
    <WidgetContent resource={resource} empty="No notes yet.">
      {(notes) => {
        const ordered = [...notes].sort(
          (a, b) =>
            Number(a.status === 'archived') - Number(b.status === 'archived') ||
            (b.updatedAt ?? 0) - (a.updatedAt ?? 0)
        );
        return (
          <>
            {!notes.length && (
              <Link
                href="/notes"
                className="widgetFeatureLink flex min-h-16 items-center gap-3 rounded-lg px-3 py-2"
              >
                <Plus aria-hidden className="size-5 shrink-0" />
                <span>
                  <span className="block text-sm font-semibold">Open notes</span>
                  <span className="text-muted-foreground text-xs">Start your first note</span>
                </span>
              </Link>
            )}
            {ordered.slice(0, compact ? 3 : 8).map((note) => (
              <WidgetRow
                key={note.id}
                title={note.title || 'Untitled note'}
                leading={<FileText aria-hidden className="text-muted-foreground size-4" />}
                detail={
                  note.content
                    .replace(/[#*_~>[\]!]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim() || 'Empty note'
                }
                aside={
                  note.status === 'archived' ? (
                    <WidgetTag>Archived</WidgetTag>
                  ) : note.updatedAt && Number.isFinite(new Date(note.updatedAt).getTime()) ? (
                    editedDate.format(note.updatedAt)
                  ) : undefined
                }
                href={`/notes?id=${encodeURIComponent(note.id)}`}
              />
            ))}
          </>
        );
      }}
    </WidgetContent>
  );
}
