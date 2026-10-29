'use client';

import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  Circle,
  Clock,
  Copy,
  Download,
  Eye,
  Paperclip,
  Printer,
  School,
  Share2,
  Sparkles,
  User,
  Users,
} from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import {
  formatNewsDate,
  getAuthorInitials,
  getExpiryStatus,
  getReadingTime,
  type NewsDetail,
  type NewsSummary,
} from './news-types';
import { NewsAttachmentCard } from './NewsAttachmentCard';
import { NewsImageLightbox } from './NewsImageLightbox';

// import { extractNumbersDirectlyAfter } from "./NewsCard"; // not needed

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
          setError(err?.message || 'Failed to load news details. Please try again.');
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
      if (target.tagName === 'IMG') {
        const img = target as HTMLImageElement;
        const src = img.getAttribute('src');
        if (src) {
          e.preventDefault();
          setLightboxImage({ src, title: img.alt || 'News Image' });
        }
      }
    };

    container.addEventListener('click', handleImageClick);
    return () => {
      container.removeEventListener('click', handleImageClick);
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
      <div className="bg-surface-0 flex h-full flex-1 flex-col items-center justify-center p-8 text-center">
        <div className="bg-surface-1 border-border text-muted-foreground mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border">
          <BookOpen className="h-7 w-7 stroke-[1.5]" />
        </div>
        <h3 className="text-foreground mb-1 text-base font-semibold">Select an article</h3>
        <p className="text-muted-foreground max-w-sm text-xs">
          Choose a news article from the list to read full announcements, view images, and download
          attachments.
        </p>
      </div>
    );
  }

  // Loading skeleton
  if (loading) {
    return (
      <>
        <div className="bg-surface-0/95 border-border sticky top-0 z-20 flex items-center justify-between border-b px-4 py-3 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-2">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                disabled
                className="text-muted-foreground hover:text-foreground hover:bg-surface-2 -ml-2 gap-1 text-xs"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Back</span>
              </Button>
            )}

            <Badge
              variant="outline"
              className="bg-surface-2 text-muted-foreground border-border text-[10px] font-semibold tracking-wider uppercase"
            >
              <div className="bg-surface-2 h-5 w-12 animate-pulse rounded-full" />
            </Badge>

            <span className="text-muted-foreground hidden items-center gap-1 text-xs sm:inline-flex">
              • <BookOpen className="ml-1 h-3 w-3" />
            </span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              disabled
              className="text-muted-foreground hover:text-foreground hover:bg-surface-2 h-8 px-2.5 text-xs"
              title="Copy article link"
            >
              {copiedLink ? (
                <Check className="mr-1 h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Share2 className="mr-1 h-3.5 w-3.5" />
              )}
              <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Share'}</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              disabled
              className="text-muted-foreground hover:text-foreground hover:bg-surface-2 hidden h-8 w-8 md:inline-flex"
              title="Print announcement"
            >
              <Printer className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="bg-surface-0 mx-auto w-full max-w-3xl flex-1 justify-center space-y-6 overflow-y-auto p-6 px-4 py-6 md:p-8 md:px-8 md:py-8">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-muted-foreground mb-2 -ml-2 gap-1.5 text-xs md:hidden"
            >
              <ChevronLeft className="h-4 w-4" /> Back to list
            </Button>
          )}

          <div className="flex items-center gap-2">
            <div className="bg-surface-2 h-5 w-24 animate-pulse rounded-full" />
            <div className="bg-surface-2 h-5 w-28 animate-pulse rounded-full" />
          </div>

          <div className="space-y-2">
            <div className="bg-surface-2 h-8 w-3/4 animate-pulse rounded-lg" />
            <div className="bg-surface-2 h-8 w-1/2 animate-pulse rounded-lg" />
          </div>

          <div className="bg-surface-1 border-border flex items-center gap-3 rounded-xl border p-4">
            <div className="bg-surface-2 h-10 w-10 animate-pulse rounded-full" />
            <div className="flex-1 space-y-1.5">
              <div className="bg-surface-2 h-4 w-32 animate-pulse rounded" />
              <div className="bg-surface-2 h-3 w-48 animate-pulse rounded" />
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <div className="bg-surface-2 h-4 w-full animate-pulse rounded" />
            <div className="bg-surface-2 h-4 w-full animate-pulse rounded" />
            <div className="bg-surface-2 h-4 w-5/6 animate-pulse rounded" />
            <div className="bg-surface-2 mt-4 h-32 w-full animate-pulse rounded-xl" />
          </div>
        </div>
      </>
    );
  }

  // Error state
  if (error || !news) {
    return (
      <div className="bg-surface-0 flex h-full flex-1 flex-col items-center justify-center p-8 text-center">
        <div className="bg-destructive/10 border-destructive/20 text-destructive mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h3 className="text-foreground mb-1 text-sm font-semibold">Failed to load news</h3>
        <p className="text-muted-foreground mb-4 max-w-sm text-xs">
          {error || 'Article could not be found.'}
        </p>
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
                .catch((err) => setError(err?.message || 'Error loading'))
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
    <div className="bg-surface-0 relative flex h-full flex-1 flex-col overflow-y-auto">
      {/* Article Navigation & Actions Bar */}
      <div className="bg-surface-0/95 border-border sticky top-0 z-20 flex items-center justify-between border-b px-4 py-3 backdrop-blur-md md:px-8">
        <div className="flex items-center gap-2">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-muted-foreground hover:text-foreground hover:bg-surface-2 -ml-2 gap-1 text-xs"
            >
              <ChevronLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
          )}

          {news.category && (
            <Badge
              variant="outline"
              className="bg-surface-2 text-muted-foreground border-border text-[10px] font-semibold tracking-wider uppercase"
            >
              {news.category}
            </Badge>
          )}

          <span className="text-muted-foreground hidden items-center gap-1 text-xs sm:inline-flex">
            • <BookOpen className="ml-1 h-3 w-3" /> {readingTime}
          </span>
        </div>

        {/* Right Toolbar Actions */}
        <div className="flex items-center gap-1.5">
          {onToggleRead && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onToggleRead(news.id, !controlledIsRead)}
              className="text-muted-foreground hover:text-foreground hover:bg-surface-2 h-8 px-2.5 text-xs"
              title={controlledIsRead ? 'Mark as unread' : 'Mark as read'}
            >
              {controlledIsRead ? (
                <>
                  <CheckCircle2 className="text-primary mr-1 h-3.5 w-3.5" />
                  <span className="hidden md:inline">Read</span>
                </>
              ) : (
                <>
                  <Circle className="text-muted-foreground mr-1 h-3.5 w-3.5" />
                  <span className="hidden md:inline">Unread</span>
                </>
              )}
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
            className="text-muted-foreground hover:text-foreground hover:bg-surface-2 h-8 px-2.5 text-xs"
            title="Copy article link"
          >
            {copiedLink ? (
              <Check className="mr-1 h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <Share2 className="mr-1 h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{copiedLink ? 'Copied' : 'Share'}</span>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrint}
            className="text-muted-foreground hover:text-foreground hover:bg-surface-2 hidden h-8 w-8 md:inline-flex"
            title="Print announcement"
          >
            <Printer className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Main Article Content Container */}
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 md:px-8 md:py-8">
        {/* Article Header */}
        <div className="space-y-4">
          <h1 className="text-foreground text-xl leading-tight font-bold tracking-tight md:text-3xl">
            {news.title}
          </h1>

          {/* Author & Publication Details Card */}
          <div className="bg-surface-1 border-border flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-4">
            <div className="flex items-center gap-3">
              <Avatar className="border-border h-11 w-11 shrink-0 border text-xs font-bold">
                {news.author?.id && (
                  <AvatarImage src={`/api/news/pfp?id=${news.author.id}`} alt={news.author.name} />
                )}
                <AvatarFallback className="bg-surface-2 text-foreground font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-foreground text-sm font-semibold">
                    {news.author?.name || 'School Staff'}
                  </span>
                  <span className="py-0.2 bg-surface-2 text-muted-foreground rounded px-1.5 text-[10px] font-medium">
                    Staff
                  </span>
                </div>
                <div className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                  <span className="flex items-center gap-1" title={createdDate.full}>
                    <Calendar className="h-3 w-3" />
                    {createdDate.full || createdDate.relative}
                  </span>
                  {expiryInfo.label && (
                    <span
                      className={`flex items-center gap-1 font-medium ${
                        expiryInfo.expiresSoon
                          ? 'text-amber-400'
                          : expiryInfo.isExpired
                            ? 'text-destructive'
                            : 'text-muted-foreground'
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
                <Badge
                  variant="outline"
                  className="bg-surface-2 border-border text-foreground/80 text-[10px]"
                >
                  Students
                </Badge>
              )}
              {news.toParent && (
                <Badge
                  variant="outline"
                  className="bg-surface-2 border-border text-foreground/80 text-[10px]"
                >
                  Parents
                </Badge>
              )}
              {news.toTeacher && (
                <Badge
                  variant="outline"
                  className="bg-surface-2 border-border text-foreground/80 text-[10px]"
                >
                  Teachers
                </Badge>
              )}
            </div>
          </div>

          {/* Group Recipients Chips */}
          {groups.length > 0 && (
            <div className="bg-surface-1/50 border-border/60 flex items-start gap-2 rounded-xl border p-3 text-xs">
              <Users className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
              <div className="flex flex-1 flex-wrap items-center gap-1">
                <span className="text-muted-foreground mr-1 text-[11px]">Recipients:</span>
                {visibleGroups.map((group, idx) => (
                  <span
                    key={idx}
                    className="py-0.2 bg-surface-2 text-foreground/80 border-border/40 rounded border px-1.5 text-[10px] font-medium"
                  >
                    {group}
                  </span>
                ))}
                {groups.length > 8 && (
                  <button
                    onClick={() => setShowAllGroups(!showAllGroups)}
                    className="text-primary ml-1 text-[10px] font-semibold hover:underline"
                  >
                    {showAllGroups ? 'Show less' : `+${groups.length - 8} more`}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Separator */}
        <div className="bg-border h-px w-full" />

        {/* Rich HTML Content Body */}
        <div
          ref={contentRef}
          className="news-content-prose text-foreground/90 space-y-4 text-sm leading-relaxed md:text-base"
          dangerouslySetInnerHTML={{ __html: news.description }}
        />

        {/* Attachments Section */}
        {hasAttachments && (
          <div className="border-border space-y-3 border-t pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-foreground flex items-center gap-2 text-sm font-bold">
                <Paperclip className="text-primary h-4 w-4" />
                Attachments ({news.attachments?.length})
              </h3>
              <span className="text-muted-foreground text-[11px]">
                Click image to preview or download
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
