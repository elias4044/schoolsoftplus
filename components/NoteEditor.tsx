"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Bold, Italic, Heading1, Heading2, Code, Link2, List, Quote,
  Eye, Edit3, CheckCircle, Share2, Check, Copy, X, Loader2,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api-client";
import type { NoteStatus } from "@/app/api/lib/notesDb";

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
