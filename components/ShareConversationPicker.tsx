"use client";

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

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Search, Check, Loader2, StickyNote, BarChart2,
  Users, AlertCircle, MessageSquare, ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useConversations } from "@/lib/useMessages";
import { useSession } from "@/lib/useSession";

/* -- Public types ----------------------------------------- */
export type ShareCardRef =
  | { type: "note";  noteId: string;  noteTitle?: string; notePreview?: string; noteStatus?: string }
  | { type: "grade"; assignmentId: number | string; assignmentTitle?: string; subjectName?: string; grade?: string };

interface Props {
  card: ShareCardRef;
  onClose: () => void;
}

/* -- Helpers ----------------------------------------------- */
function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "??";
}

const GRADE_COLORS: Record<string, { bg: string; color: string }> = {
  A: { bg: "oklch(0.65 0.22 278 / 20%)", color: "oklch(0.80 0.18 278)" },
  B: { bg: "oklch(0.65 0.20 245 / 20%)", color: "oklch(0.78 0.17 245)" },
  C: { bg: "oklch(0.65 0.18 210 / 20%)", color: "oklch(0.78 0.16 210)" },
  D: { bg: "oklch(0.65 0.20 175 / 20%)", color: "oklch(0.75 0.18 175)" },
  E: { bg: "oklch(0.65 0.22 148 / 20%)", color: "oklch(0.72 0.18 148)" },
  F: { bg: "oklch(1 0 0 / 8%)",           color: "oklch(0.55 0 0)"      },
};

/* -- Preview panels ---------------------------------------- */
function NotePreview({ card }: { card: Extract<ShareCardRef, { type: "note" }> }) {
  const statusColor =
    card.noteStatus === "published" ? "oklch(0.72 0.18 148)" :
    card.noteStatus === "archived"  ? "oklch(0.55 0.02 260)" :
    "oklch(0.75 0.10 80)";
  return (
    <div
      className="mx-4 mb-1 rounded-xl border overflow-hidden"
      style={{ background: "oklch(1 0 0 / 4%)", borderColor: "oklch(1 0 0 / 10%)" }}
    >
      <div
        className="flex items-center gap-2.5 px-3.5 py-2.5 border-b"
        style={{ borderColor: "oklch(1 0 0 / 8%)" }}
      >
        <div
          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "oklch(0.75 0.10 80 / 20%)" }}
        >
          <StickyNote className="w-3 h-3" style={{ color: "oklch(0.75 0.10 80)" }} />
        </div>
        <span className="text-xs font-semibold flex-1 truncate">
          {card.noteTitle || "Untitled note"}
        </span>
        {card.noteStatus && (
          <span
            className="text-[9px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
            style={{ background: `${statusColor}20`, color: statusColor }}
          >
            {card.noteStatus}
          </span>
        )}
      </div>
      {card.notePreview ? (
        <p className="px-3.5 py-2 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
          {card.notePreview}
        </p>
      ) : (
        <p className="px-3.5 py-2 text-[11px] text-muted-foreground italic">No content yet</p>
      )}
    </div>
  );
}

function GradePreview({ card }: { card: Extract<ShareCardRef, { type: "grade" }> }) {
  const g = card.grade ?? "ï¿½";
  const gc = GRADE_COLORS[g] ?? GRADE_COLORS.F;
  return (
    <div
      className="mx-4 mb-1 rounded-xl border overflow-hidden"
      style={{ background: "oklch(1 0 0 / 4%)", borderColor: "oklch(1 0 0 / 10%)" }}
    >
      <div className="flex items-center gap-3 px-3.5 py-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-xl shrink-0"
          style={{ background: gc.bg, color: gc.color }}
        >
          {g}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold truncate">
            {card.assignmentTitle || "Assignment"}
          </p>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">
            {card.subjectName || "Subject"}
          </p>
        </div>
        <div
          className="flex items-center gap-1 shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full"
          style={{ background: "oklch(0.65 0.22 278 / 12%)", color: "oklch(0.75 0.15 278)" }}
        >
          <BarChart2 className="w-2.5 h-2.5" />
          Grade card
        </div>
      </div>
    </div>
  );
}

/* -- Main -------------------------------------------------- */
export default function ShareConversationPicker({ card, onClose }: Props) {
  const { session } = useSession();
  const username = session?.username ?? "";
  const { conversations, loading: convosLoading } = useConversations(username);

  const [filter, setFilter]   = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [sent, setSent]       = useState<Set<string>>(new Set());
  const [errors, setErrors]   = useState<Record<string, string>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const partnerName = (c: typeof conversations[0]) => {
    if (c.type === "group") return c.groupName ?? "Group";
    const other = c.participants.find(p => p !== username) ?? "";
    return c.participantNames[other] || other;
  };

  const lastPreview = (c: typeof conversations[0]) => {
    const t = c.lastMessage;
    if (!t) return null;
    return t.length > 40 ? t.slice(0, 40) + "ï¿½" : t;
  };

  const filtered = conversations.filter(c =>
    partnerName(c).toLowerCase().includes(filter.toLowerCase())
  );

  const sendToConvo = async (conversationId: string) => {
    if (sending || sent.has(conversationId)) return;
    setSending(conversationId);
    setErrors(prev => { const n = { ...prev }; delete n[conversationId]; return n; });

    const shareCard =
      card.type === "note"
        ? { type: "note",  noteId: card.noteId }
        : { type: "grade", assignmentId: card.assignmentId };

    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shareCard }),
      });
      const data = await res.json();
      if (data.success) {
        setSent(prev => new Set([...prev, conversationId]));
      } else {
        setErrors(prev => ({ ...prev, [conversationId]: data.error ?? "Failed to send" }));
      }
    } catch {
      setErrors(prev => ({ ...prev, [conversationId]: "Network error" }));
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
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0,  scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-white/10 bg-card shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "88dvh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle ï¿½ mobile only */}
        <div className="flex justify-center pt-3 sm:hidden shrink-0">
          <div className="w-8 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
          <div>
            <h2 className="text-sm font-bold leading-tight">
              {card.type === "note" ? "Share note to messages" : "Share grade to messages"}
            </h2>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {sentCount > 0
                ? `? Sent to ${sentCount} conversation${sentCount !== 1 ? "s" : ""}`
                : "Pick one or more conversations"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-white/8 hover:bg-white/14 transition-colors text-muted-foreground hover:text-foreground shrink-0 ml-3"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Preview */}
        <div className="pt-3 pb-1 shrink-0">
          {card.type === "note"  && <NotePreview  card={card} />}
          {card.type === "grade" && <GradePreview card={card} />}
        </div>

        {/* Divider */}
        <div className="mx-4 my-2 h-px bg-white/7 shrink-0" />

        {/* Search */}
        <div className="px-4 pb-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Search conversationsï¿½"
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs outline-none focus:border-primary/40 placeholder:text-muted-foreground/50 transition-colors"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {convosLoading ? (
            <div className="flex flex-col gap-1.5 px-4 py-1">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-14 rounded-xl bg-white/4 animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
              <MessageSquare className="w-8 h-8 opacity-20" />
              <p className="text-xs">{filter ? "No conversations match." : "No conversations yet."}</p>
            </div>
          ) : (
            <div className="px-2 pb-2 space-y-0.5">
              {filtered.map(convo => {
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
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all",
                      isSent
                        ? "bg-primary/8 cursor-default"
                        : error
                        ? "bg-destructive/8 hover:bg-destructive/12"
                        : "hover:bg-white/7 active:bg-white/12"
                    )}
                  >
                    <Avatar className="w-10 h-10 shrink-0">
                      <AvatarFallback
                        className="text-xs font-bold"
                        style={{
                          background: isSent
                            ? "linear-gradient(135deg, oklch(0.65 0.22 278 / 35%), oklch(0.55 0.25 295 / 35%))"
                            : "oklch(1 0 0 / 8%)",
                          color: isSent ? "oklch(0.80 0.15 278)" : "oklch(0.65 0.02 260)",
                        }}
                      >
                        {convo.type === "group"
                          ? <Users className="w-4 h-4" />
                          : initials(name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className={cn("text-sm font-medium truncate", isSent && "text-primary")}>
                        {name}
                      </p>
                      {error ? (
                        <p className="text-[10px] text-destructive flex items-center gap-1 mt-0.5">
                          <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                          {error}
                        </p>
                      ) : preview ? (
                        <p className="text-[10px] text-muted-foreground truncate mt-0.5">{preview}</p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {convo.type === "group"
                            ? `${convo.participants.length} members`
                            : convo.participants.find(p => p !== username) ?? ""}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 w-7 h-7 flex items-center justify-center">
                      {isSending ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      ) : isSent ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 20 }}
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: "oklch(0.65 0.22 278 / 20%)" }}
                        >
                          <Check className="w-3 h-3 text-primary" />
                        </motion.div>
                      ) : error ? (
                        <AlertCircle className="w-4 h-4 text-destructive" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/30" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-white/7 shrink-0">
          <AnimatePresence mode="wait">
            {sentCount > 0 ? (
              <motion.button
                key="done"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-colors"
                style={{ background: "oklch(0.65 0.22 278 / 20%)", color: "oklch(0.80 0.15 278)" }}
              >
                <Check className="w-4 h-4" />
                Done
              </motion.button>
            ) : (
              <motion.p
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[10px] text-center text-muted-foreground"
              >
                {card.type === "note"
                  ? "Sends the note title and a short preview. You can share to multiple conversations."
                  : "The grade is verified live from SchoolSoft before sending."}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

