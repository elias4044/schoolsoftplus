"use client";

import { motion } from "framer-motion";
import { Paperclip, Clock, CheckCircle2, Circle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  type NewsSummary,
  stripHtml,
  formatNewsDate,
  getAuthorInitials,
  getExpiryStatus,
} from "./news-types";

interface NewsCardProps {
  item: NewsSummary;
  isSelected?: boolean;
  view?: "list" | "grid";
  onClick: () => void;
}

export function NewsCard({ item, isSelected = false, view = "grid", onClick }: NewsCardProps) {
  const dateInfo = formatNewsDate(item.creDate || item.toDate);
  const expiryInfo = getExpiryStatus(item.toDate);
  const previewText = stripHtml(item.description);
  const initials = getAuthorInitials(item.author?.name);

  if (view === "list") {
    return (
      <motion.button
        type="button"
        layout
        onClick={onClick}
        whileTap={{ scale: 0.98 }}
        className={`w-full text-left p-3.5 rounded-xl border transition-all relative overflow-hidden group ${
          isSelected
            ? "bg-surface-2 border-primary/40 shadow-sm"
            : "bg-surface-1/60 hover:bg-surface-2/70 border-border hover:border-white/15"
        }`}
      >
        {/* Active left indicator line */}
        {isSelected && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
        )}

        <div className="flex items-start justify-between gap-2 mb-1.5 pl-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            {/* Unread indicator dot */}
            {!item.read && (
              <span
                className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse"
                title="Unread"
              />
            )}
            {item.category && (
              <span className="text-[10px] font-semibold tracking-wide uppercase px-1.5 py-0.5 rounded bg-surface-2 text-muted-foreground border border-border shrink-0">
                {item.category}
              </span>
            )}
          </div>

          <div
            className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0"
            title={dateInfo.full}
          >
            <Clock className="w-3 h-3" />
            <span>{dateInfo.relative}</span>
          </div>
        </div>

        <h3
          className={`text-xs font-semibold leading-snug line-clamp-2 mb-1.5 pl-0.5 ${
            isSelected ? "text-foreground" : "text-foreground/90 group-hover:text-foreground"
          }`}
        >
          {item.title}
        </h3>

        {previewText && (
          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed mb-2.5 pl-0.5">
            {previewText}
          </p>
        )}

        {/* Footer info */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-border/40 text-[11px] text-muted-foreground pl-0.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Avatar className="w-4 h-4 text-[8px] font-bold border border-border">
              {item.author?.picture && (
                <AvatarImage src={`/api/file?id=${item.author.id}&type=image`} alt={item.author.name} />
              )}
              <AvatarFallback className="bg-surface-2 text-foreground/80">{initials}</AvatarFallback>
            </Avatar>
            <span className="truncate max-w-[120px] text-foreground/75">
              {item.author?.name || "Teacher"}
            </span>
          </div>

          {item.hasAttachment && (
            <div className="flex items-center gap-1 text-[10px] font-medium text-primary shrink-0">
              <Paperclip className="w-3 h-3" />
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
      className={`rounded-2xl border p-5 flex flex-col justify-between cursor-pointer transition-all relative overflow-hidden group ${
        isSelected
          ? "bg-surface-2 border-primary/50 shadow-md"
          : "bg-surface-1 border-border hover:border-white/20 hover:bg-surface-2/60"
      }`}
    >
      <div>
        {/* Top badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {!item.read && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-foreground animate-ping" />
                New
              </span>
            )}
            {item.category && (
              <Badge
                variant="outline"
                className="text-[10px] font-medium uppercase tracking-wider bg-surface-2 border-border text-muted-foreground"
              >
                {item.category}
              </Badge>
            )}
          </div>

          <div
            className="flex items-center gap-1 text-xs text-muted-foreground"
            title={dateInfo.full}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{dateInfo.relative}</span>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-sm md:text-base font-bold text-foreground leading-snug mb-2 group-hover:text-primary transition-colors">
          {item.title}
        </h2>

        {/* Snippet */}
        {previewText && (
          <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed mb-4">
            {previewText}
          </p>
        )}
      </div>

      {/* Card Footer */}
      <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-2 mt-auto">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar className="w-6 h-6 text-[9px] font-bold border border-border">
            {item.author?.picture && (
              <AvatarImage src={`/api/file?id=${item.author.id}&type=image`} alt={item.author.name} />
            )}
            <AvatarFallback className="bg-surface-2 text-foreground/80">{initials}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-foreground/80 truncate max-w-[140px]">
            {item.author?.name || "School Staff"}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {expiryInfo.expiresSoon && (
            <span className="text-[10px] text-amber-400 font-medium px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
              {expiryInfo.label}
            </span>
          )}

          {item.hasAttachment && (
            <div className="flex items-center gap-1 text-xs font-medium text-primary px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
              <Paperclip className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Files</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
