'use client';

import {
  isValidElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlignLeft,
  ArrowDownToLine,
  ArrowLeft,
  Bold,
  Braces,
  CaseSensitive,
  Check,
  ChevronDown,
  ChevronUp,
  Code,
  Columns2,
  Copy,
  CopyPlus,
  Download,
  Expand,
  Eye,
  FileText,
  Heading1,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Keyboard,
  Link2,
  List,
  ListChecks,
  List as ListIcon,
  ListOrdered,
  Loader2,
  Maximize2,
  MessageSquare,
  Minimize2,
  Minus,
  MoreHorizontal,
  Pencil,
  PenLine,
  Quote,
  Redo2,
  Search,
  Send,
  Share2,
  Shrink,
  Sparkles,
  Strikethrough,
  Table2,
  ThumbsUp,
  Trash2,
  Type,
  Undo2,
  Wand2,
  X,
} from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { apiFetch } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { NoteAiAction } from '@/app/api/ai/note/route';
import type { NoteStatus } from '@/app/api/lib/notesDb';

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
  onDuplicate?: () => void;
  onBack?: () => void;
  onShareToMessages?: () => void;
}

type View = 'edit' | 'split' | 'preview';

const MOD =
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform) ? '⌘' : 'Ctrl';

// ---------------------------------------------------------------------------
// Pure text transforms (value, selStart, selEnd) -> new value + selection
// ---------------------------------------------------------------------------
type Edit = { value: string; s: number; e: number };
type Transform = (v: string, s: number, e: number) => Edit;

const wrapT =
  (before: string, after = before, ph = 'text'): Transform =>
  (v, s, e) => {
    const sel = v.slice(s, e);
    // Markers sit just outside the selection -> unwrap
    if (
      s >= before.length &&
      v.slice(s - before.length, s) === before &&
      v.slice(e, e + after.length) === after
    ) {
      return {
        value: v.slice(0, s - before.length) + sel + v.slice(e + after.length),
        s: s - before.length,
        e: e - before.length,
      };
    }
    // Markers are inside the selection -> unwrap
    if (
      sel.length >= before.length + after.length &&
      sel.startsWith(before) &&
      sel.endsWith(after)
    ) {
      const inner = sel.slice(before.length, sel.length - after.length);
      return { value: v.slice(0, s) + inner + v.slice(e), s, e: s + inner.length };
    }
    const text = sel || ph;
    return {
      value: v.slice(0, s) + before + text + after + v.slice(e),
      s: s + before.length,
      e: s + before.length + text.length,
    };
  };

function lineRange(v: string, s: number, e: number) {
  const start = s === 0 ? 0 : v.lastIndexOf('\n', s - 1) + 1;
  const end = e > s && v[e - 1] === '\n' ? e - 1 : e;
  const idx = v.indexOf('\n', end);
  return { start, end: idx === -1 ? v.length : idx };
}

const linePrefixT =
  (make: (i: number) => string, detect: RegExp, strip: RegExp): Transform =>
  (v, s, e) => {
    const { start, end } = lineRange(v, s, e);
    const lines = v.slice(start, end).split('\n');
    const bodies = lines.map((l) => {
      const indent = /^\s*/.exec(l)![0];
      return { indent, body: l.slice(indent.length) };
    });
    const filled = bodies.filter((b) => b.body.trim());
    const allHave = filled.length > 0 && filled.every((b) => detect.test(b.body));
    let n = 0;
    const out = bodies
      .map(({ indent, body }) => {
        if (!body.trim()) return indent + body;
        if (allHave) return indent + body.replace(strip, '');
        return indent + make(n++) + body.replace(strip, '');
      })
      .join('\n');
    return { value: v.slice(0, start) + out + v.slice(end), s: start, e: start + out.length };
  };

const headingT =
  (level: number): Transform =>
  (v, s, e) => {
    const { start, end } = lineRange(v, s, e);
    const prefix = '#'.repeat(level) + ' ';
    const lines = v.slice(start, end).split('\n');
    const allHave = lines.filter((l) => l.trim()).every((l) => l.startsWith(prefix));
    const out = lines
      .map((l) => {
        if (!l.trim()) return l;
        const bare = l.replace(/^#{1,6}\s+/, '');
        return allHave ? bare : prefix + bare;
      })
      .join('\n');
    return { value: v.slice(0, start) + out + v.slice(end), s: start, e: start + out.length };
  };

const blockT =
  (text: string, selStart?: number, selEnd?: number): Transform =>
  (v, s, e) => {
    const before = v.slice(0, s);
    const after = v.slice(e);
    const pre = !before ? '' : before.endsWith('\n\n') ? '' : before.endsWith('\n') ? '\n' : '\n\n';
    const post = !after
      ? '\n'
      : after.startsWith('\n\n')
        ? ''
        : after.startsWith('\n')
          ? '\n'
          : '\n\n';
    const base = before.length + pre.length;
    return {
      value: before + pre + text + post + after,
      s: base + (selStart ?? text.length),
      e: base + (selEnd ?? selStart ?? text.length),
    };
  };

const codeBlockT: Transform = (v, s, e) => {
  const inner = v.slice(s, e) || 'code';
  return blockT('```\n' + inner + '\n```', 4, 4 + inner.length)(v, s, e);
};

const linkT =
  (image: boolean): Transform =>
  (v, s, e) => {
    const sel = v.slice(s, e);
    const bang = image ? '!' : '';
    const fallback = image ? 'alt text' : 'link text';
    if (/^https?:\/\/\S+$/.test(sel)) {
      const out = `${bang}[${fallback}](${sel})`;
      return {
        value: v.slice(0, s) + out + v.slice(e),
        s: s + bang.length + 1,
        e: s + bang.length + 1 + fallback.length,
      };
    }
    const text = sel || fallback;
    const out = `${bang}[${text}](url)`;
    const urlStart = s + bang.length + 1 + text.length + 2;
    return { value: v.slice(0, s) + out + v.slice(e), s: urlStart, e: urlStart + 3 };
  };

const indentT =
  (outdent: boolean): Transform =>
  (v, s, e) => {
    if (s === e && !outdent) {
      return { value: v.slice(0, s) + '  ' + v.slice(e), s: s + 2, e: s + 2 };
    }
    const { start, end } = lineRange(v, s, e);
    const out = v
      .slice(start, end)
      .split('\n')
      .map((l) => (outdent ? l.replace(/^( {1,2}|\t)/, '') : '  ' + l))
      .join('\n');
    return { value: v.slice(0, start) + out + v.slice(end), s: start, e: start + out.length };
  };

/** Continue / terminate lists and quotes on Enter. Returns null for default behaviour. */
function smartEnter(v: string, s: number, e: number): Edit | null {
  if (s !== e) return null;
  const ls = s === 0 ? 0 : v.lastIndexOf('\n', s - 1) + 1;
  const line = v.slice(ls, s);
  const m = /^(\s*)(?:([-*+])|(\d+)\.|(>))\s+(\[[ xX]\]\s+)?/.exec(line);
  if (!m) return null;
  const [full, indent, bullet, num, quote, task] = m;
  const restAfter = v.slice(s, v.indexOf('\n', s) === -1 ? v.length : v.indexOf('\n', s));
  if (line.slice(full.length).trim() === '' && restAfter.trim() === '') {
    // Empty item -> end the list
    return { value: v.slice(0, ls) + v.slice(s), s: ls, e: ls };
  }
  const marker = bullet ? `${bullet} ` : num ? `${Number(num) + 1}. ` : quote ? '> ' : '';
  const next = '\n' + indent + marker + (task ? '[ ] ' : '');
  return { value: v.slice(0, s) + next + v.slice(e), s: s + next.length, e: s + next.length };
}

function toPlainText(md: string) {
  return md
    .replace(/```[^\n]*\n([\s\S]*?)```/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/(\*\*|__|~~|`)/g, '')
    .replace(/(^|\W)[*_]([^*_\n]+)[*_](?=\W|$)/g, '$1$2');
}

const TABLE_TEMPLATE =
  '| Column 1 | Column 2 | Column 3 |\n| --- | --- | --- |\n|  |  |  |\n|  |  |  |';

// Named transforms (used by toolbar + shortcuts)
const T = {
  bold: wrapT('**', '**', 'bold text'),
  italic: wrapT('_', '_', 'italic text'),
  strike: wrapT('~~', '~~', 'strikethrough'),
  code: wrapT('`', '`', 'code'),
  h1: headingT(1),
  h2: headingT(2),
  h3: headingT(3),
  ul: linePrefixT(() => '- ', /^[-*+]\s+(?!\[[ xX]\])/, /^(?:[-*+]|\d+\.)\s+(?:\[[ xX]\]\s+)?/),
  ol: linePrefixT((i) => `${i + 1}. `, /^\d+\.\s+/, /^(?:[-*+]|\d+\.)\s+(?:\[[ xX]\]\s+)?/),
  task: linePrefixT(
    () => '- [ ] ',
    /^[-*+]\s+\[[ xX]\]\s+/,
    /^(?:[-*+]|\d+\.)\s+(?:\[[ xX]\]\s+)?/
  ),
  quote: linePrefixT(() => '> ', /^>\s?/, /^>\s?/),
  link: linkT(false),
  image: linkT(true),
  codeBlock: codeBlockT,
  table: blockT(TABLE_TEMPLATE),
  hr: blockT('---'),
};

type ToolDef = {
  key: string;
  icon: React.ElementType;
  label: string;
  shortcut?: string;
  t: Transform;
};
const TOOL_GROUPS: ToolDef[][] = [
  [
    { key: 'bold', icon: Bold, label: 'Bold', shortcut: `${MOD}+B`, t: T.bold },
    { key: 'italic', icon: Italic, label: 'Italic', shortcut: `${MOD}+I`, t: T.italic },
    {
      key: 'strike',
      icon: Strikethrough,
      label: 'Strikethrough',
      shortcut: `${MOD}+Shift+X`,
      t: T.strike,
    },
    { key: 'code', icon: Code, label: 'Inline code', shortcut: `${MOD}+E`, t: T.code },
  ],
  [
    { key: 'h1', icon: Heading1, label: 'Heading 1', t: T.h1 },
    { key: 'h2', icon: Heading2, label: 'Heading 2', t: T.h2 },
    { key: 'h3', icon: Heading3, label: 'Heading 3', t: T.h3 },
  ],
  [
    { key: 'ul', icon: List, label: 'Bullet list', t: T.ul },
    { key: 'ol', icon: ListOrdered, label: 'Numbered list', t: T.ol },
    { key: 'task', icon: ListChecks, label: 'Task list', t: T.task },
    { key: 'quote', icon: Quote, label: 'Blockquote', t: T.quote },
  ],
  [
    { key: 'link', icon: Link2, label: 'Link', shortcut: `${MOD}+K`, t: T.link },
    { key: 'image', icon: ImageIcon, label: 'Image', t: T.image },
    { key: 'codeBlock', icon: Braces, label: 'Code block', t: T.codeBlock },
    { key: 'table', icon: Table2, label: 'Table', t: T.table },
    { key: 'hr', icon: Minus, label: 'Divider', t: T.hr },
  ],
];

const SHORTCUTS: [string, string][] = [
  [`${MOD}+Z`, 'Undo'],
  [`${MOD}+Shift+Z / ${MOD}+Y`, 'Redo'],
  [`${MOD}+B`, 'Bold'],
  [`${MOD}+I`, 'Italic'],
  [`${MOD}+Shift+X`, 'Strikethrough'],
  [`${MOD}+E`, 'Inline code'],
  [`${MOD}+K`, 'Insert link'],
  [`${MOD}+F`, 'Find & replace'],
  [`${MOD}+S`, 'Save now'],
  ['Enter', 'Continue list / quote'],
  ['Tab / Shift+Tab', 'Indent / outdent'],
  ['Paste URL on selection', 'Turn selection into a link'],
  ['F3 / Shift+F3', 'Next / previous match'],
  ['Esc', 'Close find / exit fullscreen'],
];

// ---------------------------------------------------------------------------
// AI action definitions
// ---------------------------------------------------------------------------
type AiActionGroup = {
  label: string;
  actions: {
    key: NoteAiAction;
    label: string;
    icon: React.ElementType;
    appliesTo: 'selection' | 'note' | 'both';
  }[];
};

const AI_ACTION_GROUPS: AiActionGroup[] = [
  {
    label: 'Editing',
    actions: [
      { key: 'improve', label: 'Improve writing', icon: Wand2, appliesTo: 'both' },
      { key: 'grammar', label: 'Fix grammar', icon: Check, appliesTo: 'both' },
      { key: 'expand', label: 'Expand', icon: Maximize2, appliesTo: 'both' },
      { key: 'shorten', label: 'Shorten', icon: Minimize2, appliesTo: 'both' },
    ],
  },
  {
    label: 'Tone',
    actions: [
      { key: 'formal', label: 'Make formal', icon: FileText, appliesTo: 'both' },
      { key: 'casual', label: 'Make casual', icon: MessageSquare, appliesTo: 'both' },
    ],
  },
  {
    label: 'Generate',
    actions: [
      { key: 'continue', label: 'Continue writing', icon: Pencil, appliesTo: 'note' },
      { key: 'bullets', label: 'Key points', icon: ListIcon, appliesTo: 'both' },
      { key: 'summarize', label: 'Summarize', icon: AlignLeft, appliesTo: 'note' },
      { key: 'title', label: 'Suggest title', icon: Type, appliesTo: 'note' },
      { key: 'explain', label: 'Explain', icon: MessageSquare, appliesTo: 'both' },
    ],
  },
];

const STATUS_CONFIG: Record<NoteStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: 'oklch(0.75 0.10 80)' },
  published: { label: 'Published', color: 'oklch(0.72 0.18 148)' },
  archived: { label: 'Archived', color: 'oklch(0.55 0.02 260)' },
};

// ---------------------------------------------------------------------------
// Small UI helpers
// ---------------------------------------------------------------------------
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="text-muted-foreground rounded border border-white/15 bg-white/5 px-1 py-px font-mono text-[10px]">
      {children}
    </kbd>
  );
}

function IconBtn({
  label,
  shortcut,
  onClick,
  disabled,
  active,
  className,
  children,
}: {
  label: string;
  shortcut?: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          disabled={disabled}
          onMouseDown={(e) => e.preventDefault()} // keep focus/selection in the textarea
          onClick={onClick}
          className={cn(
            'text-muted-foreground hover:text-foreground h-7 w-7 shrink-0',
            active && 'bg-accent text-foreground',
            className
          )}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="flex items-center gap-2">
        {label}
        {shortcut && <Kbd>{shortcut}</Kbd>}
      </TooltipContent>
    </Tooltip>
  );
}

function nodeText(n: React.ReactNode): string {
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(nodeText).join('');
  if (isValidElement(n)) return nodeText((n.props as { children?: React.ReactNode }).children);
  return '';
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const text = nodeText(children).replace(/\n$/, '');
  const lang = isValidElement(children)
    ? /language-([\w-]+)/.exec((children.props as { className?: string }).className ?? '')?.[1]
    : undefined;
  return (
    <div className="not-prose my-4 overflow-hidden rounded-lg border border-white/10 bg-black/30">
      <div className="text-muted-foreground flex items-center justify-between border-b border-white/10 px-3 py-1 text-[10px]">
        <span className="font-mono">{lang ?? 'text'}</span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="hover:text-foreground flex items-center gap-1 transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-green-400" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" /> Copy
            </>
          )}
        </button>
      </div>
      <pre className="text-foreground/90 overflow-x-auto p-3 font-mono text-xs leading-relaxed">
        <code>{text}</code>
      </pre>
    </div>
  );
}

function MarkdownPreview({
  content,
  onToggleTask,
}: {
  content: string;
  onToggleTask: (line: number) => void;
}) {
  const components = useMemo<Components>(
    () => ({
      a: ({ node: _n, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
      img: ({ node: _n, ...props }) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img {...props} loading="lazy" className="max-w-full rounded-lg" alt={props.alt ?? ''} />
      ),
      pre: ({ node: _n, children }) => <CodeBlock>{children}</CodeBlock>,
      table: ({ node: _n, ...props }) => (
        <div className="not-prose my-4 overflow-x-auto rounded-lg border border-white/10">
          <table
            {...props}
            className="w-full border-collapse text-sm [&_td]:border-t [&_td]:border-white/10 [&_td]:px-3 [&_td]:py-1.5 [&_th]:bg-white/5 [&_th]:px-3 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-medium"
          />
        </div>
      ),
      ul: ({ node: _n, className, ...props }) => (
        <ul
          {...props}
          className={cn(className, className?.includes('contains-task-list') && 'pl-0')}
        />
      ),
      li: ({ node, className, children, ...props }) => {
        const isTask = className?.includes('task-list-item');
        return (
          <li
            {...props}
            className={cn(className, isTask && 'list-none')}
            onClick={
              isTask
                ? (e) => {
                    const t = e.target as HTMLElement;
                    if (
                      t.tagName === 'INPUT' &&
                      t.closest('li') === e.currentTarget &&
                      node?.position
                    ) {
                      onToggleTask(node.position.start.line);
                    }
                  }
                : undefined
            }
          >
            {children}
          </li>
        );
      },
      input: ({ node: _n, ...props }) =>
        props.type === 'checkbox' ? (
          <input
            {...props}
            disabled={false}
            readOnly
            onChange={() => {}}
            className="mr-2 cursor-pointer accent-[oklch(0.65_0.22_278)]"
          />
        ) : (
          <input {...props} />
        ),
    }),
    [onToggleTask]
  );

  return (
    <div className="prose prose-invert prose-sm prose-headings:tracking-tight prose-a:text-primary prose-blockquote:border-primary/40 prose-code:rounded prose-code:bg-white/8 prose-code:px-1 prose-code:py-0.5 prose-code:before:content-none prose-code:after:content-none max-w-none leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editor
// ---------------------------------------------------------------------------
export default function NoteEditor({
  note,
  onUpdate,
  onDelete,
  onDuplicate,
  onBack,
  onShareToMessages,
}: Props) {
  const [title, setTitle] = useState(note.title);
  const [content, setContent] = useState(note.content);
  const [status, setStatus] = useState<NoteStatus>(note.status);
  const [view, setView] = useState<View>('edit');
  const [saving, setSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [deleting, setDeleting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(note.shareToken);
  const [shareCopied, setShareCopied] = useState(false);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [contentCopied, setContentCopied] = useState(false);

  // history flags
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // caret / selection
  const [caret, setCaret] = useState({ line: 1, col: 1 });
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState<{ start: number; end: number } | null>(null);

  // find & replace
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [replaceWith, setReplaceWith] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [matchIndex, setMatchIndex] = useState(0);

  // AI
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState<NoteAiAction | null>(null);
  const [aiResult, setAiResult] = useState<{
    action: NoteAiAction;
    text: string;
    appliedTo: 'selection' | 'note';
  } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const taRef = useRef<HTMLTextAreaElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const findInputRef = useRef<HTMLInputElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirtyRef = useRef(false);
  const pendingSel = useRef<{ s: number; e: number } | null>(null);
  const latestRef = useRef({ title, content, status });
  latestRef.current = { title, content, status };

  // Undo/redo: snapshot stack. stack[0] is the initial state, `index` the current one.
  const hist = useRef({
    stack: [{ value: note.content, s: 0, e: 0 }] as Edit[],
    index: 0,
    lastKind: '',
    lastTime: 0,
  });

  const syncHistoryFlags = () => {
    const h = hist.current;
    setCanUndo(h.index > 0);
    setCanRedo(h.index < h.stack.length - 1);
  };

  // ---- Saving ------------------------------------------------------------
  const save = useCallback(
    async (t: string, c: string, s: NoteStatus) => {
      setSaving('saving');
      try {
        const updated = await apiFetch<{ note: Note }>(`/api/notes/${note.id}`, {
          method: 'PUT',
          body: { title: t, content: c, status: s } as unknown as BodyInit,
        });
        if (!saveTimer.current) dirtyRef.current = false;
        onUpdate(updated.note);
        setSaving('saved');
        setTimeout(() => setSaving((p) => (p === 'saved' ? 'idle' : p)), 1800);
      } catch {
        setSaving('error');
      }
    },
    [note.id, onUpdate]
  );
  const saveFnRef = useRef(save);
  saveFnRef.current = save;

  const scheduleSave = useCallback((t: string, c: string, s: NoteStatus) => {
    dirtyRef.current = true;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving('idle');
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      saveFnRef.current(t, c, s);
    }, 1000);
  }, []);

  const saveNow = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const l = latestRef.current;
    saveFnRef.current(l.title, l.content, l.status);
  }, []);

  // Reset when switching notes (and flush pending edits of the previous one)
  useEffect(() => {
    setTitle(note.title);
    setContent(note.content);
    setStatus(note.status);
    setShareToken(note.shareToken);
    setSaving('idle');
    setAiResult(null);
    setSelectedText('');
    setSelectionRange(null);
    setFindOpen(false);
    hist.current = {
      stack: [{ value: note.content, s: 0, e: 0 }],
      index: 0,
      lastKind: '',
      lastTime: 0,
    };
    syncHistoryFlags();
    dirtyRef.current = false;

    const saveForThisNote = saveFnRef.current;
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        saveTimer.current = null;
      }
      if (dirtyRef.current) {
        dirtyRef.current = false;
        const l = latestRef.current;
        saveForThisNote(l.title, l.content, l.status);
      }
    };
  }, [note.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flush on tab close
  useEffect(() => {
    const h = () => {
      if (dirtyRef.current) saveNow();
    };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [saveNow]);

  // Esc exits fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !findOpen) setFullscreen(false);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [fullscreen, findOpen]);

  // Restore caret after programmatic edits
  useLayoutEffect(() => {
    const p = pendingSel.current;
    pendingSel.current = null;
    const ta = taRef.current;
    if (p && ta) {
      ta.setSelectionRange(p.s, p.e);
      ta.focus();
    }
  }, [content]);

  // ---- History-aware content changes --------------------------------------
  const commit = useCallback(
    (value: string, s: number, e: number, kind: string, coalesce: boolean, restoreSel: boolean) => {
      const h = hist.current;
      const now = Date.now();
      const snap: Edit = { value, s, e };
      if (
        coalesce &&
        h.lastKind === kind &&
        now - h.lastTime < 800 &&
        h.index === h.stack.length - 1 &&
        h.index > 0
      ) {
        h.stack[h.index] = snap;
      } else {
        h.stack = h.stack.slice(0, h.index + 1);
        h.stack.push(snap);
        if (h.stack.length > 300) h.stack.shift();
        h.index = h.stack.length - 1;
      }
      h.lastKind = kind;
      h.lastTime = now;
      pendingSel.current = restoreSel ? { s, e } : null;
      setContent(value);
      scheduleSave(latestRef.current.title, value, latestRef.current.status);
      syncHistoryFlags();
    },
    [scheduleSave]
  );

  const restoreSnapshot = useCallback(() => {
    const h = hist.current;
    const snap = h.stack[h.index];
    h.lastKind = '';
    pendingSel.current = { s: snap.s, e: snap.e };
    setContent(snap.value);
    scheduleSave(latestRef.current.title, snap.value, latestRef.current.status);
    syncHistoryFlags();
  }, [scheduleSave]);

  const undo = useCallback(() => {
    const h = hist.current;
    if (h.index <= 0) return;
    h.index--;
    restoreSnapshot();
  }, [restoreSnapshot]);

  const redo = useCallback(() => {
    const h = hist.current;
    if (h.index >= h.stack.length - 1) return;
    h.index++;
    restoreSnapshot();
  }, [restoreSnapshot]);

  const applyTransform = useCallback(
    (t: Transform, kind = 'cmd') => {
      const ta = taRef.current;
      if (!ta) return;
      const r = t(ta.value, ta.selectionStart, ta.selectionEnd);
      commit(r.value, r.s, r.e, kind, false, true);
    },
    [commit]
  );

  function handleTitleChange(v: string) {
    setTitle(v);
    scheduleSave(v, latestRef.current.content, latestRef.current.status);
  }

  function handleStatusChange(s: NoteStatus) {
    setStatus(s);
    save(title, content, s);
  }

  // ---- Textarea events ------------------------------------------------------
  function updateCaret() {
    const ta = taRef.current;
    if (!ta) return;
    const { selectionStart: s, selectionEnd: e, value } = ta;
    const before = value.slice(0, s);
    setCaret({
      line: (before.match(/\n/g)?.length ?? 0) + 1,
      col: s - (before.lastIndexOf('\n') + 1) + 1,
    });
    if (s !== e) {
      setSelectedText(value.slice(s, e));
      setSelectionRange({ start: s, end: e });
    } else {
      setSelectedText('');
      setSelectionRange(null);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const type = (e.nativeEvent as InputEvent).inputType ?? '';
    const kind = type.startsWith('insertText')
      ? 'type'
      : type.startsWith('delete')
        ? 'delete'
        : 'other';
    const coalesce = kind === 'type' || kind === 'delete';
    commit(e.target.value, e.target.selectionStart, e.target.selectionEnd, kind, coalesce, false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    const ta = taRef.current;
    if (!ta || e.nativeEvent.isComposing) return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();

    if (mod && k === 'z') {
      e.preventDefault();
      e.shiftKey ? redo() : undo();
      return;
    }
    if (mod && k === 'y') {
      e.preventDefault();
      redo();
      return;
    }
    if (mod && !e.shiftKey && k === 'b') {
      e.preventDefault();
      applyTransform(T.bold);
      return;
    }
    if (mod && !e.shiftKey && k === 'i') {
      e.preventDefault();
      applyTransform(T.italic);
      return;
    }
    if (mod && !e.shiftKey && k === 'k') {
      e.preventDefault();
      applyTransform(T.link);
      return;
    }
    if (mod && !e.shiftKey && k === 'e') {
      e.preventDefault();
      applyTransform(T.code);
      return;
    }
    if (mod && e.shiftKey && k === 'x') {
      e.preventDefault();
      applyTransform(T.strike);
      return;
    }
    if (mod && k === 's') {
      e.preventDefault();
      saveNow();
      return;
    }
    if (mod && k === 'f') {
      e.preventDefault();
      openFind();
      return;
    }
    if (e.key === 'F3') {
      e.preventDefault();
      goToMatch(matchIndex + (e.shiftKey ? -1 : 1));
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey && !mod && !e.altKey) {
      const r = smartEnter(ta.value, ta.selectionStart, ta.selectionEnd);
      if (r) {
        e.preventDefault();
        commit(r.value, r.s, r.e, 'enter', false, true);
      }
      return;
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      applyTransform(indentT(e.shiftKey), 'indent');
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const ta = taRef.current;
    hist.current.lastKind = ''; // paste is its own undo step
    if (!ta) return;
    const text = e.clipboardData.getData('text').trim();
    if (ta.selectionStart !== ta.selectionEnd && /^https?:\/\/\S+$/.test(text)) {
      e.preventDefault();
      const { selectionStart: s, selectionEnd: en, value } = ta;
      const out = `[${value.slice(s, en)}](${text})`;
      commit(
        value.slice(0, s) + out + value.slice(en),
        s + out.length,
        s + out.length,
        'paste-link',
        false,
        true
      );
    }
  }

  function handleScroll() {
    if (view !== 'split') return;
    const ta = taRef.current,
      pv = previewRef.current;
    if (!ta || !pv) return;
    const r = ta.scrollTop / Math.max(1, ta.scrollHeight - ta.clientHeight);
    pv.scrollTop = r * (pv.scrollHeight - pv.clientHeight);
  }

  const toggleTask = useCallback(
    (line: number) => {
      const lines = latestRef.current.content.split('\n');
      const l = lines[line - 1];
      if (l == null) return;
      const n = l.replace(/\[([ xX])\]/, (_m, c: string) => (c === ' ' ? '[x]' : '[ ]'));
      if (n === l) return;
      lines[line - 1] = n;
      const ta = taRef.current;
      commit(
        lines.join('\n'),
        ta?.selectionStart ?? 0,
        ta?.selectionEnd ?? 0,
        'task',
        false,
        false
      );
    },
    [commit]
  );

  // ---- Find & replace -------------------------------------------------------
  const matches = useMemo(() => {
    if (!findQuery) return [] as number[];
    const hay = matchCase ? content : content.toLowerCase();
    const needle = matchCase ? findQuery : findQuery.toLowerCase();
    const out: number[] = [];
    let i = hay.indexOf(needle);
    while (i !== -1 && out.length < 5000) {
      out.push(i);
      i = hay.indexOf(needle, i + needle.length);
    }
    return out;
  }, [content, findQuery, matchCase]);

  useEffect(() => {
    setMatchIndex(0);
  }, [findQuery, matchCase]);

  function openFind() {
    if (view === 'preview') setView('edit');
    setFindOpen(true);
    if (selectedText && !selectedText.includes('\n')) setFindQuery(selectedText);
    setTimeout(() => {
      findInputRef.current?.focus();
      findInputRef.current?.select();
    }, 0);
  }

  function goToMatch(i: number) {
    const ta = taRef.current;
    if (!ta || matches.length === 0) return;
    const idx = ((i % matches.length) + matches.length) % matches.length;
    setMatchIndex(idx);
    const m = matches[idx];
    ta.blur(); // blur → select → focus makes the browser scroll the match into view
    ta.setSelectionRange(m, m + findQuery.length);
    ta.focus();
  }

  function replaceCurrent() {
    if (matches.length === 0) return;
    const m = matches[Math.min(matchIndex, matches.length - 1)];
    const value = content.slice(0, m) + replaceWith + content.slice(m + findQuery.length);
    commit(value, m, m + replaceWith.length, 'replace', false, false);
  }

  function replaceAll() {
    if (matches.length === 0) return;
    const esc = findQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const value = content.replace(new RegExp(esc, matchCase ? 'g' : 'gi'), () => replaceWith);
    commit(value, 0, 0, 'replace-all', false, false);
  }

  // ---- Share / export / misc ------------------------------------------------
  async function handleShare() {
    setSharingLoading(true);
    try {
      const res = await apiFetch<{ token: string }>(`/api/notes/${note.id}/share`, {
        method: 'POST',
      });
      setShareToken(res.token);
      onUpdate({ ...note, title, content, status, shareToken: res.token });
    } finally {
      setSharingLoading(false);
    }
  }

  async function handleRevokeShare() {
    setSharingLoading(true);
    try {
      await apiFetch(`/api/notes/${note.id}/share`, { method: 'DELETE' });
      setShareToken(null);
      onUpdate({ ...note, title, content, status, shareToken: null });
    } finally {
      setSharingLoading(false);
    }
  }

  const shareUrl = shareToken
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/shared/${shareToken}`
    : '';

  function copyShareLink() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  }

  function exportNote(fmt: 'md' | 'txt') {
    const text = fmt === 'md' ? `# ${title}\n\n${content}` : `${title}\n\n${toPlainText(content)}`;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(title || 'untitled').replace(/[/\\:*?"<>|]/g, '-')}.${fmt}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyContent() {
    navigator.clipboard.writeText(content);
    setContentCopied(true);
    setTimeout(() => setContentCopied(false), 2000);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await apiFetch(`/api/notes/${note.id}`, { method: 'DELETE' });
      dirtyRef.current = false;
      onDelete();
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  // ---- AI -------------------------------------------------------------------
  async function runAiAction(action: NoteAiAction) {
    if (!content && !selectedText) {
      setAiError('Note is empty. Start writing first.');
      return;
    }
    setAiLoading(action);
    setAiError(null);
    setAiResult(null);

    const actionDef = AI_ACTION_GROUPS.flatMap((g) => g.actions).find((a) => a.key === action);
    const useSelection = !!selectedText && !!selectionRange && actionDef?.appliesTo !== 'note';

    try {
      const res = await apiFetch<{ result: string; action: string }>('/api/ai/note', {
        method: 'POST',
        body: JSON.stringify({
          action,
          content,
          title,
          selection: useSelection ? selectedText : undefined,
        }) as unknown as BodyInit,
      });
      setAiResult({ action, text: res.result, appliedTo: useSelection ? 'selection' : 'note' });
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'AI request failed.');
    } finally {
      setAiLoading(null);
    }
  }

  function acceptAiResult(mode: 'replace' | 'insert' = 'replace') {
    if (!aiResult) return;
    const { action, text, appliedTo } = aiResult;
    const range = selectionRange && selectionRange.end <= content.length ? selectionRange : null;

    if (action === 'title') {
      handleTitleChange(text.trim());
    } else if (action === 'continue') {
      const joined = content + (content.endsWith('\n') ? '\n' : '\n\n') + text;
      commit(joined, joined.length, joined.length, 'ai', false, true);
    } else if (mode === 'insert') {
      const pos = appliedTo === 'selection' && range ? range.end : content.length;
      const value =
        content.slice(0, pos) +
        '\n\n' +
        text +
        (content.slice(pos).startsWith('\n') ? '' : '\n') +
        content.slice(pos);
      const end = pos + 2 + text.length;
      commit(value, end, end, 'ai', false, true);
    } else if (appliedTo === 'selection' && range) {
      const value = content.slice(0, range.start) + text + content.slice(range.end);
      commit(value, range.start, range.start + text.length, 'ai', false, true);
    } else {
      commit(text, text.length, text.length, 'ai', false, true);
    }
    setAiResult(null);
    setSelectedText('');
    setSelectionRange(null);
  }

  // ---- Derived --------------------------------------------------------------
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const readMinutes = Math.max(1, Math.round(wordCount / 220));
  const st = STATUS_CONFIG[status];
  const showEditor = view !== 'preview';
  const showPreview = view !== 'edit';
  const gutter = view === 'split' ? 'px-5' : 'px-6 md:px-[max(1.5rem,calc((100%-48rem)/2))]';

  return (
    <TooltipProvider delayDuration={350}>
      <div
        className={cn(
          'flex h-full min-h-0 flex-col',
          fullscreen && 'bg-background fixed inset-0 z-50'
        )}
      >
        {/* ---- Top bar ---- */}
        <div
          className="flex shrink-0 items-center gap-1.5 border-b px-3 py-1.5"
          style={{ borderColor: 'oklch(1 0 0 / 8%)' }}
        >
          {onBack && (
            <IconBtn label="Back to list" onClick={onBack} className="md:hidden">
              <ArrowLeft className="h-4 w-4" />
            </IconBtn>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2 text-xs">
                <span className="h-2 w-2 rounded-full" style={{ background: st.color }} />
                {st.label}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-36">
              {(Object.keys(STATUS_CONFIG) as NoteStatus[]).map((s) => (
                <DropdownMenuItem
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className="gap-2 text-xs"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: STATUS_CONFIG[s].color }}
                  />
                  {STATUS_CONFIG[s].label}
                  {s === status && <Check className="ml-auto h-3 w-3" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="min-w-0 flex-1" />

          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            value={view}
            onValueChange={(v) => v && setView(v as View)}
            className="gap-2"
          >
            <ToggleGroupItem value="edit" aria-label="Edit" title="Edit" className="h-7 px-2">
              <PenLine className="h-3.5 w-3.5" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="split"
              aria-label="Split view"
              title="Split view"
              className="hidden h-7 px-2 md:inline-flex"
            >
              <Columns2 className="h-3.5 w-3.5" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="preview"
              aria-label="Preview"
              title="Preview"
              className="h-7 px-2"
            >
              <Eye className="h-3.5 w-3.5" />
            </ToggleGroupItem>
          </ToggleGroup>

          <Separator orientation="vertical" className="mx-1 h-4" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setAiPanelOpen((o) => !o);
              setAiResult(null);
              setAiError(null);
            }}
            className={cn(
              'h-7 gap-1.5 px-2 text-xs',
              aiPanelOpen ? 'text-primary' : 'text-muted-foreground'
            )}
            style={aiPanelOpen ? { background: 'oklch(0.65 0.22 278 / 14%)' } : undefined}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">AI</span>
            <ChevronDown
              className={cn('h-3 w-3 transition-transform', aiPanelOpen && 'rotate-180')}
            />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground relative h-7 gap-1.5 px-2 text-xs"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Share</span>
                {shareToken && (
                  <span className="bg-primary absolute top-1 right-1 h-1.5 w-1.5 rounded-full" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 space-y-3">
              {shareToken ? (
                <>
                  <div>
                    <p className="text-sm font-medium">Anyone with the link can view</p>
                    <p className="text-muted-foreground text-xs">
                      Stop sharing to invalidate the link.
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Input
                      readOnly
                      value={shareUrl}
                      onFocus={(e) => e.currentTarget.select()}
                      className="h-8 font-mono text-xs"
                    />
                    <Button size="sm" className="h-8 gap-1" onClick={copyShareLink}>
                      {shareCopied ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {shareCopied ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive h-8 w-full"
                    onClick={handleRevokeShare}
                    disabled={sharingLoading}
                  >
                    {sharingLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Stop sharing
                  </Button>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-medium">Share this note</p>
                    <p className="text-muted-foreground text-xs">Create a read-only public link.</p>
                  </div>
                  <Button
                    size="sm"
                    className="h-8 w-full"
                    onClick={handleShare}
                    disabled={sharingLoading}
                  >
                    {sharingLoading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                    Create link
                  </Button>
                </>
              )}
            </PopoverContent>
          </Popover>

          {onShareToMessages && (
            <IconBtn label="Send to a conversation" onClick={onShareToMessages}>
              <Send className="h-3.5 w-3.5" />
            </IconBtn>
          )}

          <IconBtn
            label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            shortcut={fullscreen ? 'Esc' : undefined}
            onClick={() => setFullscreen((f) => !f)}
          >
            {fullscreen ? <Shrink className="h-3.5 w-3.5" /> : <Expand className="h-3.5 w-3.5" />}
          </IconBtn>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground h-7 w-7"
                aria-label="More actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              <DropdownMenuItem onClick={openFind} className="gap-2 text-xs">
                <Search className="h-3.5 w-3.5" /> Find &amp; replace
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyContent} className="gap-2 text-xs">
                {contentCopied ? (
                  <Check className="h-3.5 w-3.5 text-green-400" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}{' '}
                Copy markdown
              </DropdownMenuItem>
              {onDuplicate && (
                <DropdownMenuItem onClick={onDuplicate} className="gap-2 text-xs">
                  <CopyPlus className="h-3.5 w-3.5" /> Duplicate
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => exportNote('md')} className="gap-2 text-xs">
                <Download className="h-3.5 w-3.5" /> Export as Markdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportNote('txt')} className="gap-2 text-xs">
                <Download className="h-3.5 w-3.5" /> Export as plain text
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShortcutsOpen(true)} className="gap-2 text-xs">
                <Keyboard className="h-3.5 w-3.5" /> Keyboard shortcuts
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-destructive focus:text-destructive gap-2 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete note
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* ---- AI Panel ---- */}
        <AnimatePresence>
          {aiPanelOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="shrink-0 overflow-hidden"
              style={{ borderBottom: '1px solid oklch(1 0 0 / 8%)' }}
            >
              <div
                className="space-y-3 px-4 py-3"
                style={{ background: 'oklch(0.65 0.22 278 / 4%)' }}
              >
                <div
                  className={cn(
                    'flex items-center gap-2 text-[11px]',
                    selectedText ? 'text-primary/80' : 'text-muted-foreground'
                  )}
                >
                  <Sparkles className="h-3 w-3 shrink-0" />
                  {selectedText ? (
                    <span>
                      <span className="font-medium">Selection active</span> — actions apply to the
                      selected text
                    </span>
                  ) : (
                    <span>Select text to target part of the note, or apply to the whole thing</span>
                  )}
                </div>

                <div className="flex flex-wrap gap-4">
                  {AI_ACTION_GROUPS.map((group) => (
                    <div key={group.label} className="flex min-w-0 flex-col gap-1.5">
                      <span className="text-muted-foreground/60 px-0.5 text-[9px] font-medium tracking-wider uppercase">
                        {group.label}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {group.actions.map(({ key, label, icon: Icon, appliesTo }) => {
                          const disabled =
                            !!aiLoading ||
                            (appliesTo === 'selection' && !selectedText) ||
                            (!content && !selectedText);
                          const running = aiLoading === key;
                          return (
                            <Button
                              key={key}
                              variant="outline"
                              size="sm"
                              disabled={disabled}
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => runAiAction(key)}
                              className={cn(
                                'h-7 gap-1.5 px-2.5 text-[11px]',
                                running && 'border-primary/40 text-primary'
                              )}
                            >
                              {running ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Icon className="h-3 w-3" />
                              )}
                              {label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {aiError && (
                  <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-[11px] text-red-400">
                    <X className="h-3 w-3 shrink-0" />
                    {aiError}
                    <button onClick={() => setAiError(null)} className="ml-auto">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                <AnimatePresence>
                  {aiResult && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="overflow-hidden rounded-xl border"
                      style={{
                        borderColor: 'oklch(0.65 0.22 278 / 25%)',
                        background: 'oklch(0.65 0.22 278 / 6%)',
                      }}
                    >
                      <div
                        className="flex items-center justify-between border-b px-3 py-1.5"
                        style={{ borderColor: 'oklch(0.65 0.22 278 / 15%)' }}
                      >
                        <span className="text-primary/80 flex items-center gap-1.5 text-[11px]">
                          <Sparkles className="h-3 w-3" />
                          AI suggestion
                          <span className="text-muted-foreground">
                            ({aiResult.appliedTo === 'selection' ? 'selection' : 'full note'})
                          </span>
                        </span>
                        <button
                          onClick={() => setAiResult(null)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="max-h-40 overflow-y-auto px-3 py-2">
                        <p className="text-foreground/90 font-mono text-xs leading-relaxed whitespace-pre-wrap">
                          {aiResult.text}
                        </p>
                      </div>
                      <div
                        className="flex items-center gap-2 border-t px-3 py-2"
                        style={{ borderColor: 'oklch(0.65 0.22 278 / 15%)' }}
                      >
                        <Button
                          size="sm"
                          className="h-7 gap-1.5 text-[11px]"
                          onClick={() => acceptAiResult('replace')}
                        >
                          <ThumbsUp className="h-3 w-3" />
                          {aiResult.action === 'title'
                            ? 'Use as title'
                            : aiResult.action === 'continue'
                              ? 'Append to note'
                              : aiResult.appliedTo === 'selection'
                                ? 'Replace selection'
                                : 'Replace note'}
                        </Button>
                        {aiResult.action !== 'title' && aiResult.action !== 'continue' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 gap-1.5 text-[11px]"
                            onClick={() => acceptAiResult('insert')}
                          >
                            <ArrowDownToLine className="h-3 w-3" /> Insert below
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-muted-foreground h-7 text-[11px]"
                          onClick={() => setAiResult(null)}
                        >
                          Discard
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- Title ---- */}
        <div className={cn('shrink-0 pt-5 pb-2', gutter)}>
          <input
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                taRef.current?.focus();
              }
            }}
            placeholder="Untitled"
            className="text-foreground placeholder:text-muted-foreground/40 w-full bg-transparent text-2xl font-bold tracking-tight outline-none"
          />
        </div>

        {/* ---- Toolbar ---- */}
        {showEditor && (
          <div
            className="flex shrink-0 scrollbar-none items-center gap-0.5 overflow-x-auto border-y px-3 py-1"
            style={{ borderColor: 'oklch(1 0 0 / 6%)' }}
          >
            <IconBtn label="Undo" shortcut={`${MOD}+Z`} onClick={undo} disabled={!canUndo}>
              <Undo2 className="h-3.5 w-3.5" />
            </IconBtn>
            <IconBtn label="Redo" shortcut={`${MOD}+Shift+Z`} onClick={redo} disabled={!canRedo}>
              <Redo2 className="h-3.5 w-3.5" />
            </IconBtn>
            {TOOL_GROUPS.map((group, gi) => (
              <div key={gi} className="flex items-center gap-0.5">
                <Separator orientation="vertical" className="mx-1.5 h-4" />
                {group.map(({ key, icon: Icon, label, shortcut, t }) => (
                  <IconBtn
                    key={key}
                    label={label}
                    shortcut={shortcut}
                    onClick={() => applyTransform(t)}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </IconBtn>
                ))}
              </div>
            ))}
            <div className="flex-1" />
            <IconBtn
              label="Find & replace"
              shortcut={`${MOD}+F`}
              onClick={openFind}
              active={findOpen}
            >
              <Search className="h-3.5 w-3.5" />
            </IconBtn>
          </div>
        )}

        {/* ---- Editor / Preview ---- */}
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
          {/* Find & replace */}
          <AnimatePresence>
            {findOpen && showEditor && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.12 }}
                className="bg-popover absolute top-2 right-4 z-10 w-80 space-y-1.5 rounded-xl border p-2 shadow-xl"
                style={{ borderColor: 'oklch(1 0 0 / 10%)' }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setFindOpen(false);
                    taRef.current?.focus();
                  }
                }}
              >
                <div className="flex items-center gap-1">
                  <Input
                    ref={findInputRef}
                    value={findQuery}
                    onChange={(e) => setFindQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        goToMatch(matchIndex + (e.shiftKey ? -1 : 1));
                      }
                    }}
                    placeholder="Find"
                    className="h-7 text-xs"
                  />
                  <span className="text-muted-foreground w-12 shrink-0 text-center text-[10px] tabular-nums">
                    {findQuery
                      ? matches.length
                        ? `${Math.min(matchIndex, matches.length - 1) + 1}/${matches.length}`
                        : '0/0'
                      : ''}
                  </span>
                  <IconBtn
                    label="Match case"
                    active={matchCase}
                    onClick={() => setMatchCase((m) => !m)}
                  >
                    <CaseSensitive className="h-3.5 w-3.5" />
                  </IconBtn>
                  <IconBtn
                    label="Previous match"
                    shortcut="Shift+F3"
                    onClick={() => goToMatch(matchIndex - 1)}
                    disabled={!matches.length}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </IconBtn>
                  <IconBtn
                    label="Next match"
                    shortcut="F3"
                    onClick={() => goToMatch(matchIndex + 1)}
                    disabled={!matches.length}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </IconBtn>
                  <IconBtn label="Close" onClick={() => setFindOpen(false)}>
                    <X className="h-3.5 w-3.5" />
                  </IconBtn>
                </div>
                <div className="flex items-center gap-1">
                  <Input
                    value={replaceWith}
                    onChange={(e) => setReplaceWith(e.target.value)}
                    placeholder="Replace with"
                    className="h-7 text-xs"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    disabled={!matches.length}
                    onClick={replaceCurrent}
                  >
                    Replace
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    disabled={!matches.length}
                    onClick={replaceAll}
                  >
                    All
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {showEditor && (
            <div
              className={cn('min-h-0 min-w-0 flex-1', view === 'split' && 'md:w-1/2 md:flex-none')}
            >
              <textarea
                ref={taRef}
                value={content}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onKeyUp={updateCaret}
                onSelect={updateCaret}
                onMouseUp={updateCaret}
                onPaste={handlePaste}
                onCut={() => {
                  hist.current.lastKind = '';
                }}
                onScroll={handleScroll}
                placeholder={
                  'Start writing in Markdown…\n\n# Heading\n**bold**, _italic_, `code`\n\n- list item\n- [ ] task\n> blockquote'
                }
                spellCheck
                className={cn(
                  'text-foreground/90 caret-primary placeholder:text-muted-foreground/30 h-full w-full resize-none bg-transparent py-4 font-mono text-sm leading-7 outline-none placeholder:font-sans',
                  gutter
                )}
              />
            </div>
          )}

          {showPreview && (
            <div
              ref={previewRef}
              className={cn(
                'min-h-0 min-w-0 flex-1 overflow-y-auto py-4',
                gutter,
                view === 'split' && 'border-t md:w-1/2 md:flex-none md:border-t-0 md:border-l'
              )}
              style={view === 'split' ? { borderColor: 'oklch(1 0 0 / 8%)' } : undefined}
            >
              {content ? (
                <MarkdownPreview content={content} onToggleTask={toggleTask} />
              ) : (
                <p className="text-muted-foreground text-sm italic">Nothing to preview yet.</p>
              )}
            </div>
          )}
        </div>

        {/* ---- Status bar ---- */}
        <div
          className="text-muted-foreground flex shrink-0 items-center gap-3 border-t px-4 py-1 text-[10px] tabular-nums"
          style={{ borderColor: 'oklch(1 0 0 / 8%)' }}
        >
          <span>
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
          </span>
          <span className="hidden sm:inline">{content.length} chars</span>
          <span className="hidden sm:inline">~{readMinutes} min read</span>
          {selectedText && <span className="text-primary/80">{selectedText.length} selected</span>}
          <div className="flex-1" />
          {shareToken && (
            <span className="text-primary/80 hidden items-center gap-1 sm:flex">
              <Share2 className="h-2.5 w-2.5" /> Shared
            </span>
          )}
          {showEditor && (
            <span>
              Ln {caret.line}, Col {caret.col}
            </span>
          )}
          <span className="flex min-w-14 items-center justify-end gap-1">
            {saving === 'saving' && (
              <>
                <Loader2 className="h-2.5 w-2.5 animate-spin" /> Saving
              </>
            )}
            {saving === 'saved' && (
              <>
                <Check className="h-2.5 w-2.5 text-green-400" /> Saved
              </>
            )}
            {saving === 'error' && (
              <button onClick={saveNow} className="text-red-400 hover:underline">
                Save failed · retry
              </button>
            )}
          </span>
        </div>

        {/* ---- Dialogs ---- */}
        <Dialog open={shortcutsOpen} onOpenChange={setShortcutsOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Keyboard shortcuts</DialogTitle>
              <DialogDescription>Available while the editor is focused.</DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              {SHORTCUTS.map(([keys, desc]) => (
                <div key={desc} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-muted-foreground">{desc}</span>
                  <Kbd>{keys}</Kbd>
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent size="sm">
            <AlertDialogHeader>
              <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
                <Trash2 />
              </AlertDialogMedia>
              <AlertDialogTitle>Delete this note?</AlertDialogTitle>
              <AlertDialogDescription>
                “{title || 'Untitled'}” will be permanently deleted
                {shareToken ? ' and its share link will stop working' : ''}. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel variant={'outline'}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting} variant={'destructive'}>
                {deleting && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}
