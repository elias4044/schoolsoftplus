'use client';

/**
 * ShareConversationPicker  (v2)
 *
 * Bottom-sheet on mobile, centred modal on desktop.
 * Shows a live preview of the card being shar  co  const lastPreview = (c: typeof conversations[0]) => {
    const t = c.lastMessage;
    if (!t) return null;
    return t.length > 40 ? t.slice(0, 40) + "â€¦" : t;
  };astPreview = (c: typeof conversations[0]) => {
    const t = c.lastMessage;
    if (!t) return null;
    return t.length > 40 ? t.slice(0, 40) + "â€¦" : t;
  };hen lets the user
 * tap one or more conversations to send into.
 * The server validates ownership ï¿½ the client sends only an ID.
 */
import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  BarChart2,
  Check,
  ChevronRight,
  Layers,
  Loader2,
  MessageSquare,
  Search,
  StickyNote,
  Users,
  X,
} from 'lucide-react';

import { useConversations } from '@/lib/useMessages';
import { useSession } from '@/lib/useSession';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

/* -- Public types ----------------------------------------- */
export type ShareCardRef =
  | { type: 'note'; noteId: string; noteTitle?: string; notePreview?: string; noteStatus?: string }
  | {
      type: 'grade';
      assignmentId: number | string;
      assignmentTitle?: string;
      subjectName?: string;
      grade?: string;
    }
  | {
      type: 'flashdeck';
      deckId: string;
      deckTitle: string;
      deckCardCount: number;
      deckColor: string;
      deckDescription?: string;
    };

interface Props {
  card: ShareCardRef;
  onClose: () => void;
}

/* -- Helpers ----------------------------------------------- */
function initials(name: string) {
  return (
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??'
  );
}

const GRADE_COLORS: Record<string, { bg: string; color: string }> = {
  A: { bg: 'oklch(0.65 0.22 278 / 20%)', color: 'oklch(0.80 0.18 278)' },
  B: { bg: 'oklch(0.65 0.20 245 / 20%)', color: 'oklch(0.78 0.17 245)' },
  C: { bg: 'oklch(0.65 0.18 210 / 20%)', color: 'oklch(0.78 0.16 210)' },
  D: { bg: 'oklch(0.65 0.20 175 / 20%)', color: 'oklch(0.75 0.18 175)' },
  E: { bg: 'oklch(0.65 0.22 148 / 20%)', color: 'oklch(0.72 0.18 148)' },
  F: { bg: 'oklch(1 0 0 / 8%)', color: 'oklch(0.55 0 0)' },
};

const PICKER_DECK_COLORS: Record<string, { from: string; to: string }> = {
  violet: { from: 'oklch(0.65 0.22 278)', to: 'oklch(0.55 0.25 295)' },
  rose: { from: 'oklch(0.68 0.22 10)', to: 'oklch(0.58 0.26 340)' },
  amber: { from: 'oklch(0.78 0.17 75)', to: 'oklch(0.68 0.20 55)' },
  emerald: { from: 'oklch(0.70 0.18 148)', to: 'oklch(0.60 0.22 165)' },
  sky: { from: 'oklch(0.72 0.17 220)', to: 'oklch(0.62 0.22 240)' },
  slate: { from: 'oklch(0.60 0.04 255)', to: 'oklch(0.48 0.05 265)' },
};

/* -- Preview panels ---------------------------------------- */
function NotePreview({ card }: { card: Extract<ShareCardRef, { type: 'note' }> }) {
  const statusColor =
    card.noteStatus === 'published'
      ? 'oklch(0.72 0.18 148)'
      : card.noteStatus === 'archived'
        ? 'oklch(0.55 0.02 260)'
        : 'oklch(0.75 0.10 80)';
  return (
    <div
      className="mx-4 mb-1 overflow-hidden rounded-xl border"
      style={{ background: 'oklch(1 0 0 / 4%)', borderColor: 'oklch(1 0 0 / 10%)' }}
    >
      <div
        className="flex items-center gap-2.5 border-b px-3.5 py-2.5"
        style={{ borderColor: 'oklch(1 0 0 / 8%)' }}
      >
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
          style={{ background: 'oklch(0.75 0.10 80 / 20%)' }}
        >
          <StickyNote className="h-3 w-3" style={{ color: 'oklch(0.75 0.10 80)' }} />
        </div>
        <span className="flex-1 truncate text-xs font-semibold">
          {card.noteTitle || 'Untitled note'}
        </span>
        {card.noteStatus && (
          <span
            className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium"
            style={{ background: `${statusColor}20`, color: statusColor }}
          >
            {card.noteStatus}
          </span>
        )}
      </div>
      {card.notePreview ? (
        <p className="text-muted-foreground line-clamp-2 px-3.5 py-2 text-[11px] leading-relaxed">
          {card.notePreview}
        </p>
      ) : (
        <p className="text-muted-foreground px-3.5 py-2 text-[11px] italic">No content yet</p>
      )}
    </div>
  );
}

function GradePreview({ card }: { card: Extract<ShareCardRef, { type: 'grade' }> }) {
  const g = card.grade ?? 'ï¿½';
  const gc = GRADE_COLORS[g] ?? GRADE_COLORS.F;
  return (
    <div
      className="mx-4 mb-1 overflow-hidden rounded-xl border"
      style={{ background: 'oklch(1 0 0 / 4%)', borderColor: 'oklch(1 0 0 / 10%)' }}
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl font-black"
          style={{ background: gc.bg, color: gc.color }}
        >
          {g}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-semibold">{card.assignmentTitle || 'Assignment'}</p>
          <p className="text-muted-foreground mt-0.5 truncate text-[10px]">
            {card.subjectName || 'Subject'}
          </p>
        </div>
        <div
          className="flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
          style={{ background: 'oklch(0.65 0.22 278 / 12%)', color: 'oklch(0.75 0.15 278)' }}
        >
          <BarChart2 className="h-2.5 w-2.5" />
          Grade card
        </div>
      </div>
    </div>
  );
}

function FlashDeckPreview({ card }: { card: Extract<ShareCardRef, { type: 'flashdeck' }> }) {
  const c = PICKER_DECK_COLORS[card.deckColor] ?? PICKER_DECK_COLORS.violet;
  return (
    <div
      className="mx-4 mb-1 overflow-hidden rounded-xl border"
      style={{ background: 'oklch(1 0 0 / 4%)', borderColor: 'oklch(1 0 0 / 10%)' }}
    >
      <div
        className="flex items-center gap-2.5 border-b px-3.5 py-2.5"
        style={{ borderColor: 'oklch(1 0 0 / 8%)' }}
      >
        <div
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
          style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
        >
          <Layers className="h-3 w-3 text-white" />
        </div>
        <span className="flex-1 truncate text-xs font-semibold">{card.deckTitle}</span>
        <span
          className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium"
          style={{ background: `${c.from}22`, color: c.from }}
        >
          {card.deckCardCount} card{card.deckCardCount !== 1 ? 's' : ''}
        </span>
      </div>
      <p className="text-muted-foreground line-clamp-2 px-3.5 py-2 text-[11px] leading-relaxed">
        {card.deckDescription || 'Flashcard deck'}
      </p>
    </div>
  );
}

/* -- Main -------------------------------------------------- */
export default function ShareConversationPicker({ card, onClose }: Props) {
  const { session } = useSession();
  const username = session?.username ?? '';
  const { conversations, loading: convosLoading } = useConversations(username);

  const [filter, setFilter] = useState('');
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const partnerName = (c: (typeof conversations)[0]) => {
    if (c.type === 'group') return c.groupName ?? 'Group';
    const other = c.participants.find((p) => p !== username) ?? '';
    return c.participantNames[other] || other;
  };

  const lastPreview = (c: (typeof conversations)[0]) => {
    const t = c.lastMessage;
    if (!t) return null;
    return t.length > 40 ? t.slice(0, 40) + 'ï¿½' : t;
  };

  const filtered = conversations.filter((c) =>
    partnerName(c).toLowerCase().includes(filter.toLowerCase())
  );

  const sendToConvo = async (conversationId: string) => {
    if (sending || sent.has(conversationId)) return;
    setSending(conversationId);
    setErrors((prev) => {
      const n = { ...prev };
      delete n[conversationId];
      return n;
    });

    const shareCard =
      card.type === 'note'
        ? { type: 'note', noteId: card.noteId }
        : card.type === 'grade'
          ? { type: 'grade', assignmentId: card.assignmentId }
          : { type: 'flashdeck', deckId: card.deckId };

    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shareCard }),
      });
      const data = await res.json();
      if (data.success) {
        setSent((prev) => new Set([...prev, conversationId]));
      } else {
        setErrors((prev) => ({ ...prev, [conversationId]: data.error ?? 'Failed to send' }));
      }
    } catch {
      setErrors((prev) => ({ ...prev, [conversationId]: 'Network error' }));
    } finally {
      setSending(null);
    }
  };

  const sentCount = sent.size;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="bg-card flex w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 shadow-2xl sm:max-w-md sm:rounded-2xl"
        style={{ maxHeight: '88dvh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle ï¿½ mobile only */}
        <div className="flex shrink-0 justify-center pt-3 sm:hidden">
          <div className="h-1 w-8 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-4 pt-3 pb-1">
          <div>
            <h2 className="text-sm leading-tight font-bold">
              {card.type === 'note'
                ? 'Share note to messages'
                : card.type === 'flashdeck'
                  ? 'Share deck to messages'
                  : 'Share grade to messages'}
            </h2>
            <p className="text-muted-foreground mt-0.5 text-[10px]">
              {sentCount > 0
                ? `? Sent to ${sentCount} conversation${sentCount !== 1 ? 's' : ''}`
                : 'Pick one or more conversations'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground ml-3 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/8 transition-colors hover:bg-white/14"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Preview */}
        <div className="shrink-0 pt-3 pb-1">
          {card.type === 'note' && <NotePreview card={card} />}
          {card.type === 'grade' && <GradePreview card={card} />}
          {card.type === 'flashdeck' && <FlashDeckPreview card={card} />}
        </div>

        {/* Divider */}
        <div className="mx-4 my-2 h-px shrink-0 bg-white/7" />

        {/* Search */}
        <div className="shrink-0 px-4 pb-2">
          <div className="relative">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
            <input
              ref={inputRef}
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search conversationsï¿½"
              className="focus:border-primary/40 placeholder:text-muted-foreground/50 w-full rounded-xl border border-white/10 bg-white/5 py-2 pr-3 pl-8 text-xs transition-colors outline-none"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="min-h-0 flex-1 overflow-y-auto">
          {convosLoading ? (
            <div className="flex flex-col gap-1.5 px-4 py-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-white/4" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-muted-foreground flex flex-col items-center justify-center gap-2 py-12">
              <MessageSquare className="h-8 w-8 opacity-20" />
              <p className="text-xs">
                {filter ? 'No conversations match.' : 'No conversations yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-0.5 px-2 pb-2">
              {filtered.map((convo) => {
                const name = partnerName(convo);
                const preview = lastPreview(convo);
                const isSending = sending === convo.id;
                const isSent = sent.has(convo.id);
                const error = errors[convo.id];

                return (
                  <button
                    key={convo.id}
                    onClick={() => sendToConvo(convo.id)}
                    disabled={isSending}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all',
                      isSent
                        ? 'bg-primary/8 cursor-default'
                        : error
                          ? 'bg-destructive/8 hover:bg-destructive/12'
                          : 'hover:bg-white/7 active:bg-white/12'
                    )}
                  >
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback
                        className="text-xs font-bold"
                        style={{
                          background: isSent
                            ? 'linear-gradient(135deg, oklch(0.65 0.22 278 / 35%), oklch(0.55 0.25 295 / 35%))'
                            : 'oklch(1 0 0 / 8%)',
                          color: isSent ? 'oklch(0.80 0.15 278)' : 'oklch(0.65 0.02 260)',
                        }}
                      >
                        {convo.type === 'group' ? <Users className="h-4 w-4" /> : initials(name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <p className={cn('truncate text-sm font-medium', isSent && 'text-primary')}>
                        {name}
                      </p>
                      {error ? (
                        <p className="text-destructive mt-0.5 flex items-center gap-1 text-[10px]">
                          <AlertCircle className="h-2.5 w-2.5 shrink-0" />
                          {error}
                        </p>
                      ) : preview ? (
                        <p className="text-muted-foreground mt-0.5 truncate text-[10px]">
                          {preview}
                        </p>
                      ) : (
                        <p className="text-muted-foreground mt-0.5 text-[10px]">
                          {convo.type === 'group'
                            ? `${convo.participants.length} members`
                            : (convo.participants.find((p) => p !== username) ?? '')}
                        </p>
                      )}
                    </div>

                    <div className="flex h-7 w-7 shrink-0 items-center justify-center">
                      {isSending ? (
                        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                      ) : isSent ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                          className="flex h-6 w-6 items-center justify-center rounded-full"
                          style={{ background: 'oklch(0.65 0.22 278 / 20%)' }}
                        >
                          <Check className="text-primary h-3 w-3" />
                        </motion.div>
                      ) : error ? (
                        <AlertCircle className="text-destructive h-4 w-4" />
                      ) : (
                        <ChevronRight className="text-muted-foreground/30 h-3.5 w-3.5" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="shrink-0 border-t border-white/7 px-4 py-3">
          <AnimatePresence mode="wait">
            {sentCount > 0 ? (
              <motion.button
                key="done"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors"
                style={{ background: 'oklch(0.65 0.22 278 / 20%)', color: 'oklch(0.80 0.15 278)' }}
              >
                <Check className="h-4 w-4" />
                Done
              </motion.button>
            ) : (
              <motion.p
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-muted-foreground text-center text-[10px]"
              >
                {card.type === 'note'
                  ? 'Sends the note title and a short preview. You can share to multiple conversations.'
                  : 'The grade is verified live from SchoolSoft before sending.'}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
