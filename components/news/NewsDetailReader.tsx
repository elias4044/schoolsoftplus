"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Calendar,
  User,
  Users,
  Paperclip,
  Share2,
  CheckCircle2,
  Circle,
  Copy,
  Check,
  Printer,
  ChevronLeft,
  AlertCircle,
  Sparkles,
  BookOpen,
  Eye,
  Download,
  School,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api-client";
import {
  type NewsDetail,
  type NewsSummary,
  formatNewsDate,
  getAuthorInitials,
  getExpiryStatus,
  getReadingTime,
} from "./news-types";
import { NewsAttachmentCard } from "./NewsAttachmentCard";
import { NewsImageLightbox } from "./NewsImageLightbox";

interface NewsDetailReaderProps {
  newsId: number | null;
  initialSummary?: NewsSummary | null;
  onBack?: () => void;
  onToggleRead?: (id: number, read: boolean) => void;
  isRead?: boolean;
}

export function NewsDetailReader({
  newsId,
  initialSummary,
  onBack,
  onToggleRead,
  isRead: controlledIsRead,
}: NewsDetailReaderProps) {
  const [news, setNews] = useState<NewsDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxImage, setLightboxImage] = useState<{ src: string; title: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showAllGroups, setShowAllGroups] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Fetch full news item whenever newsId changes
  useEffect(() => {
    if (!newsId) {
      setNews(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    apiFetch<NewsDetail>(`/api/news/${newsId}`)
      .then((data) => {
        if (isMounted) {
          setNews(data);
          // If news has read callback and item is not read yet, mark as read
          if (onToggleRead && (data.read === false || controlledIsRead === false)) {
            onToggleRead(newsId, true);
          }
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.message || "Failed to load news details. Please try again.");
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [newsId]);

  // Intercept image clicks inside rendered HTML content to open in lightbox
  useEffect(() => {
    if (!contentRef.current) return;
    const container = contentRef.current;

    const handleImageClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "IMG") {
        const img = target as HTMLImageElement;
        const src = img.getAttribute("src");
        if (src) {
          e.preventDefault();
          setLightboxImage({ src, title: img.alt || "News Image" });
        }
      }
    };

    container.addEventListener("click", handleImageClick);
    return () => {
      container.removeEventListener("click", handleImageClick);
    };
  }, [news?.description]);

  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}/news?id=${newsId}`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // If no news selected
  if (!newsId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-surface-0 h-full">
        <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-surface-1 border border-border text-muted-foreground mb-4">
          <BookOpen className="w-7 h-7 stroke-[1.5]" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-1">Select an article</h3>
        <p className="text-xs text-muted-foreground max-w-sm">
          Choose a news article from the list to read full announcements, view images, and download attachments.
        </p>
      </div>
    );
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-surface-0 space-y-6">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="md:hidden text-xs gap-1.5 mb-2 -ml-2 text-muted-foreground"
          >
            <ChevronLeft className="w-4 h-4" /> Back to list
          </Button>
        )}

        <div className="flex items-center gap-2">
          <div className="h-5 w-24 rounded-full bg-surface-2 animate-pulse" />
          <div className="h-5 w-28 rounded-full bg-surface-2 animate-pulse" />
        </div>

        <div className="space-y-2">
          <div className="h-8 w-3/4 rounded-lg bg-surface-2 animate-pulse" />
          <div className="h-8 w-1/2 rounded-lg bg-surface-2 animate-pulse" />
        </div>

        <div className="flex items-center gap-3 p-4 rounded-xl bg-surface-1 border border-border">
          <div className="w-10 h-10 rounded-full bg-surface-2 animate-pulse" />
          <div className="space-y-1.5 flex-1">
            <div className="h-4 w-32 rounded bg-surface-2 animate-pulse" />
            <div className="h-3 w-48 rounded bg-surface-2 animate-pulse" />
          </div>
        </div>

        <div className="space-y-3 pt-4">
          <div className="h-4 w-full rounded bg-surface-2 animate-pulse" />
          <div className="h-4 w-full rounded bg-surface-2 animate-pulse" />
          <div className="h-4 w-5/6 rounded bg-surface-2 animate-pulse" />
          <div className="h-32 w-full rounded-xl bg-surface-2 animate-pulse mt-4" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !news) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-surface-0 h-full">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive mb-3">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Failed to load news</h3>
        <p className="text-xs text-muted-foreground max-w-sm mb-4">{error || "Article could not be found."}</p>
        <div className="flex items-center gap-2">
          {onBack && (
            <Button variant="outline" size="sm" onClick={onBack} className="text-xs">
              Back to list
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => {
              setLoading(true);
              setError(null);
              apiFetch<NewsDetail>(`/api/news/${newsId}`)
                .then((data) => setNews(data))
                .catch((err) => setError(err?.message || "Error loading"))
                .finally(() => setLoading(false));
            }}
            className="text-xs"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const createdDate = formatNewsDate(news.fromDate || news.toDate);
  const expiryInfo = getExpiryStatus(news.toDate);
  const readingTime = getReadingTime(news.description);
  const initials = getAuthorInitials(news.author?.name);
  const hasAttachments = news.attachments && news.attachments.length > 0;
  const groups = news.groupRecipients || [];
  const visibleGroups = showAllGroups ? groups : groups.slice(0, 8);

  return (
    <div className="flex-1 flex flex-col h-full bg-surface-0 overflow-y-auto relative">
      {/* Article Navigation & Actions Bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between px-4 md:px-8 py-3 bg-surface-0/95 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-xs gap-1 -ml-2 text-muted-foreground hover:text-foreground hover:bg-surface-2"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </Button>
          )}

          {news.category && (
            <Badge
              variant="outline"
              className="text-[10px] font-semibold uppercase tracking-wider bg-surface-2 text-muted-foreground border-border"
            >
              {news.category}
            </Badge>
          )}

          <span className="text-xs text-muted-foreground hidden sm:inline-flex items-center gap-1">
            • <BookOpen className="w-3 h-3 ml-1" /> {readingTime}
          </span>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-1.5">
          {onToggleRead && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleRead(news.id, !controlledIsRead)}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-surface-2"
              title={controlledIsRead ? "Mark as unread" : "Mark as read"}
            >
              {controlledIsRead ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary mr-1" />
                  <span className="hidden md:inline">Read</span>
                </>
              ) : (
                <>
                  <Circle className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
                  <span className="hidden md:inline">Unread</span>
                </>
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground hover:bg-surface-2"
            title="Copy article link"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400 mr-1" /> : <Share2 className="w-3.5 h-3.5 mr-1" />}
            <span className="hidden sm:inline">{copiedLink ? "Copied" : "Share"}</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrint}
            className="w-8 h-8 text-muted-foreground hover:text-foreground hover:bg-surface-2 hidden md:inline-flex"
            title="Print announcement"
          >
            <Printer className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Main Article Content Container */}
      <div className="max-w-3xl w-full mx-auto px-4 md:px-8 py-6 md:py-8 space-y-6">
        {/* Article Header */}
        <div className="space-y-4">
          <h1 className="text-xl md:text-3xl font-bold tracking-tight text-foreground leading-tight">
            {news.title}
          </h1>

          {/* Author & Publication Details Card */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-surface-1 border border-border">
            <div className="flex items-center gap-3">
              <Avatar className="w-11 h-11 text-xs font-bold border border-border shrink-0">
                {news.author?.picture && (
                  <AvatarImage src={`/api/file?id=${news.author.id}&type=image`} alt={news.author.name} />
                )}
                <AvatarFallback className="bg-surface-2 text-foreground font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">
                    {news.author?.name || "School Staff"}
                  </span>
                  <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-surface-2 text-muted-foreground">
                    Staff
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5">
                  <span className="flex items-center gap-1" title={createdDate.full}>
                    <Calendar className="w-3 h-3" />
                    {createdDate.full || createdDate.relative}
                  </span>
                  {expiryInfo.label && (
                    <span
                      className={`flex items-center gap-1 font-medium ${
                        expiryInfo.expiresSoon
                          ? "text-amber-400"
                          : expiryInfo.isExpired
                          ? "text-destructive"
                          : "text-muted-foreground"
                      }`}
                    >
                      • {expiryInfo.label}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Audience Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              {news.toStudent && (
                <Badge variant="outline" className="text-[10px] bg-surface-2 border-border text-foreground/80">
                  Students
                </Badge>
              )}
              {news.toParent && (
                <Badge variant="outline" className="text-[10px] bg-surface-2 border-border text-foreground/80">
                  Parents
                </Badge>
              )}
              {news.toTeacher && (
                <Badge variant="outline" className="text-[10px] bg-surface-2 border-border text-foreground/80">
                  Teachers
                </Badge>
              )}
            </div>
          </div>

          {/* Group Recipients Chips */}
          {groups.length > 0 && (
            <div className="p-3 rounded-xl bg-surface-1/50 border border-border/60 flex items-start gap-2 text-xs">
              <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
              <div className="flex-1 flex flex-wrap items-center gap-1">
                <span className="text-muted-foreground text-[11px] mr-1">Recipients:</span>
                {visibleGroups.map((group, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-surface-2 text-foreground/80 border border-border/40"
                  >
                    {group}
                  </span>
                ))}
                {groups.length > 8 && (
                  <button
                    onClick={() => setShowAllGroups(!showAllGroups)}
                    className="text-[10px] font-semibold text-primary hover:underline ml-1"
                  >
                    {showAllGroups ? "Show less" : `+${groups.length - 8} more`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="h-px bg-border w-full" />

        {/* Rich HTML Content Body */}
        <div
          ref={contentRef}
          className="news-content-prose text-sm md:text-base leading-relaxed text-foreground/90 space-y-4"
          dangerouslySetInnerHTML={{ __html: news.description }}
        />

        {/* Attachments Section */}
        {hasAttachments && (
          <div className="pt-6 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-primary" />
                Attachments ({news.attachments?.length})
              </h3>
              <span className="text-[11px] text-muted-foreground">Click image to preview or download</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {news.attachments?.map((attachment) => (
                <NewsAttachmentCard
                  key={attachment.fileId}
                  attachment={attachment}
                  onPreviewImage={(src, title) => setLightboxImage({ src, title })}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Image Lightbox */}
      {lightboxImage && (
        <NewsImageLightbox
          src={lightboxImage.src}
          title={lightboxImage.title}
          onClose={() => setLightboxImage(null)}
        />
      )}
    </div>
  );
}
