import Link from 'next/link';
import { ArrowUpRight, BookOpen, Layers, MessageSquare, StickyNote } from 'lucide-react';

const shortcuts = [
  { href: '/subjects', label: 'Subjects', detail: 'Coursework and results', icon: BookOpen },
  { href: '/notes', label: 'Notes', detail: 'Personal study notes', icon: StickyNote },
  { href: '/flashcards', label: 'Flashcards', detail: 'Practice your decks', icon: Layers },
  { href: '/messages', label: 'Messages', detail: 'Open conversations', icon: MessageSquare },
];

export default function ShortcutsWidget() {
  return (
    <div className="widgetShortcuts grid grid-cols-2 gap-1.5">
      {shortcuts.map(({ href, label, detail, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          prefetch={false}
          className="widgetFeatureLink focus-visible:ring-ring flex min-h-11 min-w-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset"
        >
          <Icon aria-hidden className="text-muted-foreground size-4 shrink-0" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{label}</span>
            <span className="widgetShortcutDetail text-muted-foreground truncate text-xs">
              {detail}
            </span>
          </span>
          <ArrowUpRight
            aria-hidden
            className="widgetShortcutArrow text-muted-foreground size-3.5 shrink-0"
          />
        </Link>
      ))}
    </div>
  );
}
