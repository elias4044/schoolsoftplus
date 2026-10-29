'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Clock, Paperclip } from 'lucide-react';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

import {
  formatNewsDate,
  getAuthorInitials,
  getExpiryStatus,
  stripHtml,
  type NewsSummary,
} from './news-types';

interface NewsCardProps {
  item: NewsSummary;
  isSelected?: boolean;
  view?: 'list' | 'grid';
  onClick: () => void;
}

// credits to claude for this ❤️
// Used to extract the teacher id from teacher pfp

// nvm didnt even need it
// export function extractNumbersDirectlyAfter(text: string, word: string): string | null { // uh text is the full text, word is the string before the searched numbers
//   const escapedWord = word.replace(/[-\/\\^\$*+?.()|[\]{}]/g, '\\$&');

//   const regex = new RegExp(`${escapedWord}:?\\s*(\\d+)`);

//   const match = text.match(regex);
//   return match ? match[1] : null;
// }

export function NewsCard({ item, isSelected = false, view = 'grid', onClick }: NewsCardProps) {
  const dateInfo = formatNewsDate(item.creDate || item.toDate);
  const expiryInfo = getExpiryStatus(item.toDate);
  const previewText = stripHtml(item.description);
  const initials = getAuthorInitials(item.author?.name);

  if (view === 'list') {
    return (
      <motion.button
        type="button"
        layout
        onClick={onClick}
        whileTap={{ scale: 0.98 }}
        className={`group relative w-full overflow-hidden rounded-xl border p-3.5 text-left transition-all ${
          isSelected
            ? 'bg-surface-2 border-primary/40 shadow-sm'
            : 'bg-surface-1/60 hover:bg-surface-2/70 border-border hover:border-white/15'
        }`}
      >
        {/* Active left indicator line */}
        {isSelected && (
          <div className="bg-primary absolute top-0 bottom-0 left-0 w-1 rounded-r-full" />
        )}

        <div className="mb-1.5 flex items-start justify-between gap-2 pl-0.5">
          <div className="flex min-w-0 items-center gap-1.5">
            {/* Unread indicator dot */}
            {!item.read && (
              <span
                className="bg-primary h-2 w-2 shrink-0 animate-pulse rounded-full"
                title="Unread"
              />
            )}
            {item.category && (
              <span className="bg-surface-2 text-muted-foreground border-border shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase">
                {item.category}
              </span>
            )}
          </div>

          <div
            className="text-muted-foreground flex shrink-0 items-center gap-1 text-[11px]"
            title={dateInfo.full}
          >
            <Clock className="h-3 w-3" />
            <span>{dateInfo.relative}</span>
          </div>
        </div>

        <h3
          className={`mb-1.5 line-clamp-2 pl-0.5 text-xs leading-snug font-semibold ${
            isSelected ? 'text-foreground' : 'text-foreground/90 group-hover:text-foreground'
          }`}
        >
          {item.title}
        </h3>

        {previewText && (
          <p className="text-muted-foreground mb-2.5 line-clamp-2 pl-0.5 text-[11px] leading-relaxed">
            {previewText}
          </p>
        )}

        {/* Footer info */}
        <div className="border-border/40 text-muted-foreground flex items-center justify-between gap-2 border-t pt-1 pl-0.5 text-[11px]">
          <div className="flex min-w-0 items-center gap-1.5">
            <Avatar className="border-border h-4 w-4 border text-[8px] font-bold">
              {item.author?.id && (
                <AvatarImage src={`/api/news/pfp?id=${item.author.id}`} alt={item.author.name} />
              )}
            </Avatar>
            <span className="text-foreground/75 max-w-30 truncate">
              {item.author?.name || 'Teacher'}
            </span>
          </div>

          {item.hasAttachment && (
            <div className="text-primary flex shrink-0 items-center gap-1 text-[10px] font-medium">
              <Paperclip className="h-3 w-3" />
              <span>Attachment</span>
            </div>
          )}
        </div>
      </motion.button>
    );
  }

  // Grid view presentation
  return (
    <motion.div
      layout
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      className={`group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border p-5 transition-all ${
        isSelected
          ? 'bg-surface-2 border-primary/50 shadow-md'
          : 'bg-surface-1 border-border hover:bg-surface-2/60 hover:border-white/20'
      }`}
    >
      <div>
        {/* Top badges */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {!item.read && (
              <span className="bg-primary text-primary-foreground inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold">
                <span className="bg-primary-foreground h-1.5 w-1.5 animate-ping rounded-full" />
                New
              </span>
            )}
            {item.category && (
              <Badge
                variant="outline"
                className="bg-surface-2 border-border text-muted-foreground text-[10px] font-medium tracking-wider uppercase"
              >
                {item.category}
              </Badge>
            )}
          </div>

          <div
            className="text-muted-foreground flex items-center gap-1 text-xs"
            title={dateInfo.full}
          >
            <Clock className="h-3.5 w-3.5" />
            <span>{dateInfo.relative}</span>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-foreground group-hover:text-primary mb-2 text-sm leading-snug font-bold transition-colors md:text-base">
          {item.title}
        </h2>

        {/* Snippet */}
        {previewText && (
          <p className="text-muted-foreground mb-4 line-clamp-3 text-xs leading-relaxed">
            {previewText}
          </p>
        )}
      </div>

      {/* Card Footer */}
      <div className="border-border/60 mt-auto flex items-center justify-between gap-2 border-t pt-3">
        <div className="flex min-w-0 items-center gap-2">
          <Avatar className="border-border h-6 w-6 border text-[9px] font-bold">
            {item.author?.id && (
              <AvatarImage src={`/api/news/pfp?id=${item.author.id}`} alt={item.author.name} />
            )}
            <AvatarFallback className="bg-surface-2 text-foreground/80 text-[8px]">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-foreground/80 max-w-[140px] truncate text-xs">
            {item.author?.name || 'School Staff'}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {expiryInfo.expiresSoon && (
            <span className="rounded border border-amber-500/20 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
              {expiryInfo.label}
            </span>
          )}

          {item.hasAttachment && (
            <div className="text-primary bg-primary/10 border-primary/20 flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium">
              <Paperclip className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Files</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
