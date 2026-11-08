'use client';

import { BookOpen, Link as LinkIcon, Paperclip, X } from 'lucide-react';

import type { RTMessage } from '@/lib/useMessages';
import { Button } from '@/components/ui/button';

export function SharedMaterials({
  messages,
  encrypted,
  onJump,
  onClose,
}: {
  messages: RTMessage[];
  encrypted: boolean;
  onJump: (messageId: string) => void;
  onClose: () => void;
}) {
  const materials = encrypted
    ? []
    : messages
        .filter((message) => message.shareCard || /https?:\/\/\S+/.test(message.content))
        .toReversed();

  return (
    <section
      aria-label="Shared materials"
      className="bg-card border-border flex max-h-[45%] shrink-0 flex-col border-b"
    >
      <div className="flex items-center justify-between gap-3 px-5 py-3">
        <div>
          <h2 className="text-sm font-semibold">Shared materials</h2>
          <p className="text-muted-foreground mt-0.5 text-xs">
            Notes, flashcards, grades and links in the latest 100 messages.
          </p>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close shared materials">
          <X className="size-4" />
        </Button>
      </div>
      <div className="grid gap-2 overflow-y-auto px-5 pb-4 sm:grid-cols-2 xl:grid-cols-3">
        {materials.map((message) => {
          const card = message.shareCard;
          const title = card
            ? card.type === 'grade'
              ? card.assignmentTitle
              : card.title
            : message.content;
          const Icon = card
            ? BookOpen
            : /\.(png|jpe?g|gif|webp)/i.test(message.content)
              ? Paperclip
              : LinkIcon;
          return (
            <button
              key={message.id}
              onClick={() => onJump(message.id)}
              className="bg-muted/50 hover:bg-muted flex min-w-0 items-center gap-3 rounded-xl p-3 text-left transition-colors"
            >
              <Icon className="text-muted-foreground size-4 shrink-0" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{title}</p>
                <p className="text-muted-foreground mt-1 truncate text-xs">
                  {message.senderDisplayName} / {new Date(message.createdAt).toLocaleDateString()}
                </p>
              </div>
            </button>
          );
        })}
        {!materials.length && (
          <p className="text-muted-foreground col-span-full py-4 text-sm">
            {encrypted
              ? 'Shared materials are unavailable in encrypted conversations.'
              : 'Share a note, flashcard deck or link to find it here later.'}
          </p>
        )}
      </div>
    </section>
  );
}
