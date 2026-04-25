"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bold, Italic, Heading1, Heading2, Code, Link2, List, Quote,
  Eye, Edit3, CheckCircle, Share2, Check, Copy, X, Loader2,
  ArrowLeft, Sparkles, Wand2, FileText, MessageSquare, ChevronDown,
  AlignLeft, Minimize2, Maximize2, List as ListIcon, Type, Pencil,
  RotateCcw, ThumbsUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import type { NoteStatus } from "@/app/api/lib/notesDb";
import type { NoteAiAction } from "@/app/api/ai/note/route";

export interface Note {
  id: string;
  title: string;
  content: string;
  status: NoteStatus;
  shareToken: string | null;
  createdAt: number;
  updatedAt: number;
}

interface Props {
  note: Note;
  onUpdate: (updated: Note) => void;
  onDelete: () => void;
  onBack?: () => void;
}

// ---------------------------------------------------------------------------
// AI action definitions
// ---------------------------------------------------------------------------
type AiActionGroup = {
  label: string;
  actions: {
    key: NoteAiAction;
    label: string;
    icon: React.ElementType;
    /** true = operates on selected text only, false = whole note, null = both */
    selectionOnly?: boolean;
    appliesTo: "selection" | "note" | "both";
  }[];
};

const AI_ACTION_GROUPS: AiActionGroup[] = [
  {
    label: "Editing",
    actions: [
      { key: "improve",  label: "Improve writing",  icon: Wand2,         appliesTo: "both" },
      { key: "grammar",  label: "Fix grammar",       icon: Check,         appliesTo: "both" },
      { key: "expand",   label: "Expand",            icon: Maximize2,     appliesTo: "both" },
      { key: "shorten",  label: "Shorten",           icon: Minimize2,     appliesTo: "both" },
    ],
  },
  {
    label: "Tone",
    actions: [
      { key: "formal",  label: "Make formal",    icon: FileText,      appliesTo: "both" },
      { key: "casual",  label: "Make casual",    icon: MessageSquare, appliesTo: "both" },
    ],
  },
  {
    label: "Generate",
    actions: [
      { key: "continue",  label: "Continue writing", icon: Pencil,        appliesTo: "note" },
      { key: "bullets",   label: "Key points",       icon: ListIcon,      appliesTo: "both" },
      { key: "summarize", label: "Summarize",         icon: AlignLeft,     appliesTo: "note" },
      { key: "title",     label: "Suggest title",     icon: Type,          appliesTo: "note" },
      { key: "explain",   label: "Explain",           icon: MessageSquare, appliesTo: "both" },
    ],
  },
];

const STATUS_CONFIG: Record<NoteStatus, { label: string; color: string; bg: string; border: string }> = {
  draft:     { label: "Draft",     color: "oklch(0.75 0.10 80)",  bg: "oklch(0.75 0.10 80 / 12%)",  border: "oklch(0.75 0.10 80 / 25%)" },
  published: { label: "Published", color: "oklch(0.72 0.18 148)", bg: "oklch(0.72 0.18 148 / 12%)", border: "oklch(0.72 0.18 148 / 25%)" },
  archived:  { label: "Archived",  color: "oklch(0.55 0.02 260)", bg: "oklch(0.55 0.02 260 / 12%)", border: "oklch(0.55 0.02 260 / 20%)" },
};

/* ---- Markdown toolbar helpers ---- */
function wrapSelection(
  ta: HTMLTextAreaElement,
  before: string,
  after = before,
  defaultText = "text"
) {
  const { selectionStart: s, selectionEnd: e, value } = ta;
  const sel = value.slice(s, e) || defaultText;
  const newVal = value.slice(0, s) + before + sel + after + value.slice(e);
  const newCursor = s + before.length + sel.length;
  Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")!
    .set!.call(ta, newVal);
  ta.dispatchEvent(new Event("input", { bubbles: true }));
  ta.setSelectionRange(newCursor, newCursor);
  ta.focus();
}

function prependLine(ta: HTMLTextAreaElement, prefix: string) {
  const { selectionStart: s, value } = ta;
  const lineStart = value.lastIndexOf("\n", s - 1) + 1;
  const line = value.slice(lineStart, s);
  const alreadyHas = line.startsWith(prefix);
  const newVal = alreadyHas
    ? value.slice(0, lineStart) + line.slice(prefix.length) + value.slice(s)
    : value.slice(0, lineStart) + prefix + value.slice(lineStart);
  Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")!
    .set!.call(ta, newVal);
  ta.dispatchEvent(new Event("input", { bubbles: true }));
  const newCursor = s + (alreadyHas ? -prefix.length : prefix.length);
  ta.setSelectionRange(newCursor, newCursor);
  ta.focus();
}

type ToolbarAction = {
  icon: React.ElementType;
  label: string;
  action: (ta: HTMLTextAreaElement) => void;
};

const TOOLBAR: ToolbarAction[] = [
  { icon: Bold,     label: "Bold (Ctrl+B)",   action: ta => wrapSelection(ta, "**", "**", "bold text") },
  { icon: Italic,   label: "Italic (Ctrl+I)", action: ta => wrapSelection(ta, "_", "_", "italic text") },
  { icon: Heading1, label: "Heading 1",       action: ta => prependLine(ta, "# ") },
  { icon: Heading2, label: "Heading 2",       action: ta => prependLine(ta, "## ") },
  { icon: Code,     label: "Inline code",     action: ta => wrapSelection(ta, "`", "`", "code") },
  { icon: Link2,    label: "Link",            action: ta => wrapSelection(ta, "[", "](url)", "link text") },
  { icon: List,     label: "List item",       action: ta => prependLine(ta, "- ") },
  { icon: Quote,    label: "Blockquote",      action: ta => prependLine(ta, "> ") },
];

export default function NoteEditor({ note, onUpdate, onDelete, onBack }: Props) {
  const [title, setTitle]       = useState(note.title);
  const [content, setContent]   = useState(note.content);
  const [status, setStatus]     = useState<NoteStatus>(note.status);
  const [preview, setPreview]   = useState(false);
  const [saving, setSaving]     = useState<"idle" | "saving" | "saved">("idle");
  const [deleting, setDeleting] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(note.shareToken);
  const [shareCopied, setShareCopied] = useState(false);
  const [sharingLoading, setSharingLoading] = useState(false);

  // AI state
  const [aiPanelOpen, setAiPanelOpen]   = useState(false);
  const [aiLoading, setAiLoading]       = useState<NoteAiAction | null>(null);
  const [aiResult, setAiResult]         = useState<{ action: NoteAiAction; text: string; appliedTo: "selection" | "note" } | null>(null);
  const [aiError, setAiError]           = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);
  const [previousContent, setPreviousContent] = useState<string | null>(null); // for undo

  const taRef   = useRef<HTMLTextAreaElement>(null);
  const saveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset state when note changes
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setStatus(note.status);
    setShareToken(note.shareToken);
    setSaving("idle");
  }, [note.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = useCallback(
    async (t: string, c: string, s: NoteStatus) => {
      setSaving("saving");
      try {
        const updated = await apiFetch<{ note: Note }>(`/api/notes/${note.id}`, {
          method: "PUT",
          body: { title: t, content: c, status: s } as unknown as BodyInit,
        });
        onUpdate(updated.note);
        setSaving("saved");
        setTimeout(() => setSaving("idle"), 1800);
      } catch {
        setSaving("idle");
      }
    },
    [note.id, onUpdate]
  );

  // Debounced auto-save
  const scheduleSave = useCallback(
    (t: string, c: string, s: NoteStatus) => {
      if (saveRef.current) clearTimeout(saveRef.current);
      setSaving("idle");
      saveRef.current = setTimeout(() => save(t, c, s), 1200);
    },
    [save]
  );

  function handleTitleChange(v: string) {
    setTitle(v);
    scheduleSave(v, content, status);
  }
  function handleContentChange(v: string) {
    setContent(v);
    scheduleSave(title, v, status);
  }
  function handleStatusChange(s: NoteStatus) {
    setStatus(s);
    save(title, content, s);
  }

  // Keyboard shortcuts in textarea
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!taRef.current) return;
    if (e.ctrlKey || e.metaKey) {
      if (e.key === "b") { e.preventDefault(); wrapSelection(taRef.current, "**", "**", "bold text"); }
      if (e.key === "i") { e.preventDefault(); wrapSelection(taRef.current, "_", "_", "italic text"); }
      if (e.key === "k") { e.preventDefault(); wrapSelection(taRef.current, "[", "](url)", "link text"); }
    }
    // Tab → indent
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = taRef.current;
      const s = ta.selectionStart;
      const newVal = ta.value.slice(0, s) + "  " + ta.value.slice(s);
      Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")!
        .set!.call(ta, newVal);
      ta.dispatchEvent(new Event("input", { bubbles: true }));
      ta.setSelectionRange(s + 2, s + 2);
    }
  }

  // Share
  async function handleShare() {
    setSharingLoading(true);
    try {
      const res = await apiFetch<{ token: string }>(`/api/notes/${note.id}/share`, { method: "POST" });
      setShareToken(res.token);
      onUpdate({ ...note, title, content, status, shareToken: res.token });
    } finally { setSharingLoading(false); }
  }

  async function handleRevokeShare() {
    setSharingLoading(true);
    try {
      await apiFetch(`/api/notes/${note.id}/share`, { method: "DELETE" });
      setShareToken(null);
      onUpdate({ ...note, title, content, status, shareToken: null });
    } finally { setSharingLoading(false); }
  }

  function copyShareLink() {
    if (!shareToken) return;
    navigator.clipboard.writeText(`${window.location.origin}/shared/${shareToken}`);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }

  async function handleDelete() {
    if (!confirm("Delete this note? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await apiFetch(`/api/notes/${note.id}`, { method: "DELETE" });
      onDelete();
    } finally { setDeleting(false); }
  }

  // ---------------------------------------------------------------------------
  // Track text selection in the textarea
  // ---------------------------------------------------------------------------
  function handleTextareaSelect() {
    if (!taRef.current) return;
    const { selectionStart: s, selectionEnd: e, value } = taRef.current;
    if (s !== e) {
      setSelectedText(value.slice(s, e));
      setSelectionRange({ start: s, end: e });
    } else {
      setSelectedText("");
      setSelectionRange(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Run an AI action
  // ---------------------------------------------------------------------------
  async function runAiAction(action: NoteAiAction) {
    if (!content && !selectedText) {
      setAiError("Note is empty. Start writing first.");
      return;
    }
    setAiLoading(action);
    setAiError(null);
    setAiResult(null);

    const hasSelection = !!selectedText && !!selectionRange;
    // For "note-only" actions, always operate on the whole note
    const actionDef = AI_ACTION_GROUPS.flatMap(g => g.actions).find(a => a.key === action);
    const useSelection = hasSelection && actionDef?.appliesTo !== "note";

    try {
      const res = await apiFetch<{ result: string; action: string }>("/api/ai/note", {
        method: "POST",
        body: JSON.stringify({
          action,
          content,
          title,
          selection: useSelection ? selectedText : undefined,
        }) as unknown as BodyInit,
      });
      setAiResult({
        action,
        text: res.result,
        appliedTo: useSelection ? "selection" : "note",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "AI request failed.";
      setAiError(msg);
    } finally {
      setAiLoading(null);
    }
  }

  // ---------------------------------------------------------------------------
  // Accept the AI result
  // ---------------------------------------------------------------------------
  function acceptAiResult() {
    if (!aiResult) return;
    setPreviousContent(content);

    if (aiResult.action === "title") {
      // Special case: update title field
      handleTitleChange(aiResult.text);
      setAiResult(null);
      return;
    }

    if (aiResult.action === "continue") {
      // Append to the end
      const newContent = content + (content.endsWith("\n") ? "\n" : "\n\n") + aiResult.text;
      handleContentChange(newContent);
    } else if (aiResult.action === "summarize" || aiResult.action === "explain" || aiResult.action === "bullets") {
      if (aiResult.appliedTo === "selection" && selectionRange) {
        // Replace selection
        const newContent =
          content.slice(0, selectionRange.start) +
          aiResult.text +
          content.slice(selectionRange.end);
        handleContentChange(newContent);
      } else {
        // Replace entire content
        handleContentChange(aiResult.text);
      }
    } else {
      // For improve, grammar, expand, shorten, formal, casual, etc.
      if (aiResult.appliedTo === "selection" && selectionRange) {
        const newContent =
          content.slice(0, selectionRange.start) +
          aiResult.text +
          content.slice(selectionRange.end);
        handleContentChange(newContent);
      } else {
        handleContentChange(aiResult.text);
      }
    }

    setAiResult(null);
    setSelectedText("");
    setSelectionRange(null);
  }

  function undoAiChange() {
    if (previousContent === null) return;
    handleContentChange(previousContent);
    setPreviousContent(null);
  }

  const st = STATUS_CONFIG[status];

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ---- Top bar ---- */}
      <div
        className="flex flex-wrap items-center gap-x-2 gap-y-1 px-3 py-2 border-b shrink-0"
        style={{ borderColor: "oklch(1 0 0 / 8%)" }}
      >
        {/* Back button — mobile only */}
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/6 transition-colors shrink-0"
            aria-label="Back to list"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}

        {/* Status selector */}
        <div className="flex items-center gap-1">
          {(["draft", "published", "archived"] as NoteStatus[]).map(s => {
            const sc = STATUS_CONFIG[s];
            const active = status === s;
            return (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className="text-[10px] px-2 py-0.5 rounded-full transition-all"
                style={{
                  background: active ? sc.bg : "transparent",
                  color: active ? sc.color : "oklch(0.55 0 0)",
                  border: `1px solid ${active ? sc.border : "transparent"}`,
                }}
              >
                {sc.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 min-w-0" />

        {/* Right-side actions — wrap on narrow screens */}
        <div className="flex items-center gap-1 flex-wrap">
          {/* Save indicator */}
          <div className="text-[10px] text-muted-foreground flex items-center gap-1 min-w-12">
            {saving === "saving" && <><Loader2 className="w-2.5 h-2.5 animate-spin" /> Saving</>}
            {saving === "saved"  && <><Check className="w-2.5 h-2.5 text-green-400" /> Saved</>}
          </div>

          {/* AI button */}
          <button
            onClick={() => { setAiPanelOpen(o => !o); setAiResult(null); setAiError(null); }}
            className={cn(
              "flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg transition-all",
              aiPanelOpen
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            style={{
              background: aiPanelOpen
                ? "linear-gradient(135deg, oklch(0.65 0.22 278 / 18%), oklch(0.55 0.25 295 / 18%))"
                : "oklch(1 0 0 / 5%)",
              border: `1px solid ${aiPanelOpen ? "oklch(0.65 0.22 278 / 30%)" : "transparent"}`,
            }}
            title="AI Writing Tools"
          >
            <Sparkles className="w-2.5 h-2.5" />
            AI Tools
            <ChevronDown className={cn("w-2.5 h-2.5 transition-transform", aiPanelOpen && "rotate-180")} />
          </button>

          {/* Undo AI button */}
          {previousContent !== null && (
            <button
              onClick={undoAiChange}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              style={{ background: "oklch(1 0 0 / 5%)" }}
              title="Undo AI change"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              Undo AI
            </button>
          )}

          {/* Share */}
          {shareToken ? (
            <>
              <button
                onClick={copyShareLink}
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg transition-colors"
                style={{ background: "oklch(0.65 0.22 278 / 15%)", color: "oklch(0.75 0.15 278)" }}
                title="Copy share link"
              >
                {shareCopied ? <><Check className="w-2.5 h-2.5" /> Copied!</> : <><Copy className="w-2.5 h-2.5" /> Copy link</>}
              </button>
              <button
                onClick={handleRevokeShare}
                disabled={sharingLoading}
                className="text-[10px] text-muted-foreground hover:text-destructive transition-colors px-1"
                title="Revoke share link"
              >
                <X className="w-3 h-3" />
              </button>
            </>
          ) : (
            <button
              onClick={handleShare}
              disabled={sharingLoading}
              className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
              style={{ background: "oklch(1 0 0 / 5%)" }}
              title="Share note"
            >
              {sharingLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Share2 className="w-2.5 h-2.5" />}
              Share
            </button>
          )}

          {/* Preview toggle */}
          <button
            onClick={() => setPreview(p => !p)}
            className={cn(
              "flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg transition-colors",
              preview
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            style={{ background: preview ? "oklch(0.65 0.22 278 / 12%)" : "oklch(1 0 0 / 5%)" }}
          >
            {preview ? <><Edit3 className="w-2.5 h-2.5" /> Edit</> : <><Eye className="w-2.5 h-2.5" /> Preview</>}
          </button>

          {/* Delete */}
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-muted-foreground hover:text-destructive transition-colors p-1"
            title="Delete note"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* ---- AI Panel ---- */}
      <AnimatePresence>
        {aiPanelOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden shrink-0"
            style={{ borderBottom: "1px solid oklch(1 0 0 / 8%)" }}
          >
            <div className="px-4 py-3 space-y-3" style={{ background: "oklch(0.65 0.22 278 / 4%)" }}>
              {/* Context hint */}
              {selectedText ? (
                <div className="flex items-center gap-2 text-[10px] text-primary/80">
                  <Sparkles className="w-3 h-3 shrink-0" />
                  <span>
                    <span className="font-medium">Selection active</span>
                    {" — "}actions will apply to the selected text
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Sparkles className="w-3 h-3 shrink-0" />
                  <span>Select text to target a specific part, or apply to the whole note</span>
                </div>
              )}

              {/* Action groups */}
              <div className="flex flex-wrap gap-3">
                {AI_ACTION_GROUPS.map(group => (
                  <div key={group.label} className="flex flex-col gap-1.5 min-w-0">
                    <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60 font-medium px-0.5">
                      {group.label}
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {group.actions.map(({ key, label, icon: Icon, appliesTo }) => {
                        const disabled =
                          !!aiLoading ||
                          (appliesTo === "selection" && !selectedText) ||
                          (!content && !selectedText);
                        const isRunning = aiLoading === key;
                        return (
                          <button
                            key={key}
                            onClick={() => runAiAction(key)}
                            disabled={disabled}
                            className={cn(
                              "flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg transition-all",
                              "border",
                              disabled && !isRunning
                                ? "opacity-40 cursor-not-allowed border-transparent text-muted-foreground"
                                : isRunning
                                  ? "border-primary/40 text-primary"
                                  : "border-white/10 text-foreground/80 hover:text-foreground hover:border-white/20 hover:bg-white/5"
                            )}
                            style={isRunning ? { background: "oklch(0.65 0.22 278 / 12%)" } : {}}
                          >
                            {isRunning
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Icon className="w-3 h-3 shrink-0" />
                            }
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Error */}
              {aiError && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2"
                >
                  <X className="w-3 h-3 shrink-0" />
                  {aiError}
                  <button onClick={() => setAiError(null)} className="ml-auto"><X className="w-2.5 h-2.5" /></button>
                </motion.div>
              )}

              {/* Result preview */}
              <AnimatePresence>
                {aiResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="rounded-xl border overflow-hidden"
                    style={{ borderColor: "oklch(0.65 0.22 278 / 25%)", background: "oklch(0.65 0.22 278 / 6%)" }}
                  >
                    {/* Result header */}
                    <div
                      className="flex items-center justify-between px-3 py-1.5 border-b"
                      style={{ borderColor: "oklch(0.65 0.22 278 / 15%)" }}
                    >
                      <span className="text-[10px] text-primary/80 flex items-center gap-1.5">
                        <Sparkles className="w-2.5 h-2.5" />
                        AI suggestion
                        <span className="text-muted-foreground">
                          ({aiResult.appliedTo === "selection" ? "selection" : "full note"})
                        </span>
                      </span>
                      <button onClick={() => setAiResult(null)} className="text-muted-foreground hover:text-foreground">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    {/* Result content */}
                    <div className="px-3 py-2 max-h-40 overflow-y-auto">
                      <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed font-mono">
                        {aiResult.text}
                      </p>
                    </div>
                    {/* Accept / Discard */}
                    <div
                      className="flex items-center gap-2 px-3 py-2 border-t"
                      style={{ borderColor: "oklch(0.65 0.22 278 / 15%)" }}
                    >
                      <button
                        onClick={acceptAiResult}
                        className="flex items-center gap-1.5 text-[11px] px-3 py-1 rounded-lg text-white transition-colors"
                        style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 278), oklch(0.55 0.25 295))" }}
                      >
                        <ThumbsUp className="w-3 h-3" />
                        {aiResult.action === "title" ? "Use as title" :
                         aiResult.action === "continue" ? "Append to note" :
                         aiResult.action === "summarize" || aiResult.action === "explain" || aiResult.action === "bullets"
                           ? (aiResult.appliedTo === "selection" ? "Replace selection" : "Replace note")
                           : (aiResult.appliedTo === "selection" ? "Replace selection" : "Replace note")}
                      </button>
                      <button
                        onClick={() => setAiResult(null)}
                        className="text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
                      >
                        Discard
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Title ---- */}
      <div className="px-6 pt-5 pb-2 shrink-0">
        <input
          value={title}
          onChange={e => handleTitleChange(e.target.value)}
          placeholder="Untitled"
          className="w-full bg-transparent text-2xl font-bold tracking-tight outline-none placeholder:text-muted-foreground/40 text-foreground"
        />
      </div>

      {/* ---- Toolbar (edit mode only) ---- */}
      {!preview && (
        <div
          className="flex items-center gap-0.5 px-4 py-1.5 border-b shrink-0 overflow-x-auto scrollbar-none"
          style={{ borderColor: "oklch(1 0 0 / 6%)" }}
        >
          {TOOLBAR.map(({ icon: Icon, label, action }) => (
            <button
              key={label}
              title={label}
              onMouseDown={e => {
                e.preventDefault(); // keep focus in textarea
                if (taRef.current) action(taRef.current);
              }}
              className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-white/6 transition-colors"
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>
      )}

      {/* ---- Editor / Preview ---- */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {preview ? (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full overflow-y-auto px-6 py-4"
          >
            {content ? (
              <div className="prose prose-invert prose-sm max-w-none leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {content}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm italic">Nothing to preview yet.</p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="editor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full"
          >
            <textarea
              ref={taRef}
              value={content}
              onChange={e => handleContentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onSelect={handleTextareaSelect}
              onMouseUp={handleTextareaSelect}
              placeholder={"Start writing in Markdown…\n\n# Heading\n**bold**, _italic_, `code`\n\n- list item\n> blockquote"}
              className="w-full h-full resize-none bg-transparent text-sm text-foreground/90 leading-relaxed outline-none px-6 py-4 font-mono placeholder:text-muted-foreground/30 placeholder:font-sans"
              spellCheck
            />
          </motion.div>
        )}
      </div>

      {/* ---- Shared-note info bar ---- */}
      {shareToken && (
        <div
          className="shrink-0 flex items-center gap-2 px-4 py-2 border-t text-[10px]"
          style={{ borderColor: "oklch(1 0 0 / 8%)", background: "oklch(0.65 0.22 278 / 6%)" }}
        >
          <CheckCircle className="w-3 h-3 text-primary shrink-0" />
          <span className="text-muted-foreground flex-1 truncate">
            Shared at <span className="text-foreground/70 font-mono">{`${typeof window !== "undefined" ? window.location.origin : ""}/shared/${shareToken}`}</span>
          </span>
        </div>
      )}
    </div>
  );
}
