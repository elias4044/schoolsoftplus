'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowUpDown,
  BookOpen,
  CheckCircle2,
  Circle,
  Columns2,
  Filter,
  Inbox,
  LayoutGrid,
  Newspaper,
  Paperclip,
  RotateCw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  stripHtml,
  type NewsSummary,
  type SortOrder,
  type ViewMode,
} from '@/components/news/news-types';
import { NewsCard } from '@/components/news/NewsCard';
import { NewsDetailReader } from '@/components/news/NewsDetailReader';

function NewsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // News list state
  const [news, setNews] = useState<NewsSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Selection & View state
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const [modalOpen, setModalOpen] = useState(false);

  // Filter state
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [hasAttachmentsOnly, setHasAttachmentsOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [readMap, setReadMap] = useState<Record<number, boolean>>({});

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch news list
  const fetchNews = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await apiFetch<NewsSummary[] | { data: NewsSummary[] }>('/api/news');
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setNews(list);

      // Initialize read status map
      const initialReadMap: Record<number, boolean> = {};
      list.forEach((item) => {
        initialReadMap[item.id] = item.read ?? false;
      });
      setReadMap((prev) => ({ ...initialReadMap, ...prev }));
    } catch (err: any) {
      setError(err?.message || 'Failed to load news announcements.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  // Synchronize URL query parameter with selectedId
  useEffect(() => {
    const idParam = searchParams.get('id');
    if (idParam) {
      const parsed = parseInt(idParam, 10);
      if (!isNaN(parsed)) {
        setSelectedId(parsed);
        if (viewMode === 'grid') setModalOpen(true);
        setMobileView('detail');
      }
    }
  }, [searchParams, viewMode]);

  // Set default selected news on desktop split view
  useEffect(() => {
    if (viewMode === 'split' && selectedId === null && news.length > 0 && !loading) {
      setSelectedId(news[0].id);
    }
  }, [news, selectedId, viewMode, loading]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    news.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return ['all', ...Array.from(set)];
  }, [news]);

  // Filter and sort items
  const filteredNews = useMemo(() => {
    return news
      .filter((item) => {
        // Category filter
        if (selectedCategory !== 'all' && item.category !== selectedCategory) {
          return false;
        }

        // Unread filter
        const isRead = readMap[item.id] ?? item.read;
        if (unreadOnly && isRead) {
          return false;
        }

        // Attachments filter
        if (hasAttachmentsOnly && !item.hasAttachment) {
          return false;
        }

        // Search query
        if (search.trim()) {
          const q = search.toLowerCase();
          const titleMatch = item.title?.toLowerCase().includes(q);
          const authorMatch = item.author?.name?.toLowerCase().includes(q);
          const categoryMatch = item.category?.toLowerCase().includes(q);
          const snippetMatch = stripHtml(item.description).toLowerCase().includes(q);
          if (!titleMatch && !authorMatch && !categoryMatch && !snippetMatch) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.creDate || a.toDate || 0).getTime();
        const dateB = new Date(b.creDate || b.toDate || 0).getTime();
        return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
      });
  }, [news, selectedCategory, unreadOnly, hasAttachmentsOnly, search, sortOrder, readMap]);

  // Total unread count
  const unreadCount = useMemo(() => {
    return news.filter((item) => !(readMap[item.id] ?? item.read)).length;
  }, [news, readMap]);

  const handleSelectNews = (id: number) => {
    setSelectedId(id);
    setMobileView('detail');
    if (viewMode === 'grid') {
      setModalOpen(true);
    }
    // Update read state locally
    setReadMap((prev) => ({ ...prev, [id]: true }));
  };

  const handleToggleRead = (id: number, isRead: boolean) => {
    setReadMap((prev) => ({ ...prev, [id]: isRead }));
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is currently typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        if (e.key === 'Escape') {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      if (e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'Escape') {
        if (modalOpen) {
          setModalOpen(false);
        } else if (search) {
          setSearch('');
        } else if (mobileView === 'detail') {
          setMobileView('list');
        }
      } else if (e.key === 'j' || e.key === 'ArrowDown') {
        if (filteredNews.length > 0) {
          const currentIndex = filteredNews.findIndex((item) => item.id === selectedId);
          const nextIndex = currentIndex < filteredNews.length - 1 ? currentIndex + 1 : 0;
          handleSelectNews(filteredNews[nextIndex].id);
        }
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        if (filteredNews.length > 0) {
          const currentIndex = filteredNews.findIndex((item) => item.id === selectedId);
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredNews.length - 1;
          handleSelectNews(filteredNews[prevIndex].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [filteredNews, selectedId, modalOpen, search, mobileView]);

  const selectedSummary = useMemo(() => {
    return news.find((item) => item.id === selectedId) || null;
  }, [news, selectedId]);

  return (
    <div className="bg-background flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden md:h-screen">
      {/*  Top Header  */}
      <header className="border-border bg-surface-1 z-10 shrink-0 border-b px-4 py-3.5 md:px-6">
        <div className="flex flex-col gap-3">
          {/* Title row & Top Tools */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="bg-primary/10 border-primary/20 text-primary flex h-8 w-8 items-center justify-center rounded-xl border">
                <Newspaper className="h-4 w-4" />
              </div>
              <div>
                <h1 className="text-foreground flex items-center gap-2 text-lg font-bold tracking-tight md:text-xl">
                  News
                  {unreadCount > 0 && (
                    <Badge className="bg-primary text-primary-foreground h-4 px-1.5 py-0 text-[10px] font-semibold">
                      {unreadCount} new
                    </Badge>
                  )}
                </h1>
              </div>
            </div>

            {/* Right Controls: View Mode & Refresh */}
            <div className="flex items-center gap-1.5">
              {/* View Switcher */}
              <div className="bg-surface-2 border-border hidden items-center rounded-lg border p-0.5 sm:flex">
                <button
                  type="button"
                  onClick={() => setViewMode('split')}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                    viewMode === 'split'
                      ? 'bg-surface-1 text-foreground border-border border shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Split view (List + Reader)"
                >
                  <Columns2 className="h-3.5 w-3.5" />
                  <span>Split</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition-all ${
                    viewMode === 'grid'
                      ? 'bg-surface-1 text-foreground border-border border shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Grid Feed view"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>Grid</span>
                </button>
              </div>

              {/* Refresh button */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchNews(true)}
                disabled={loading || refreshing}
                className="border-border bg-surface-2 text-muted-foreground hover:text-foreground h-8 w-8 rounded-lg"
                title="Refresh news"
              >
                <RotateCw
                  className={`h-3.5 w-3.5 ${refreshing ? 'text-primary animate-spin' : ''}`}
                />
              </Button>
            </div>
          </div>

          {/* Search bar & Filter Pills */}
          <div className="flex flex-col items-stretch justify-between gap-2.5 md:flex-row md:items-center">
            {/* Search Input */}
            <div className="relative max-w-md flex-1">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search news, teachers, keywords… (press /)"
                className="bg-surface-2 border-border text-foreground placeholder:text-muted-foreground/50 focus:border-primary/50 w-full rounded-xl border py-1.5 pr-8 pl-8.5 text-xs transition-colors outline-none"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <kbd className="text-muted-foreground/60 bg-surface-1 border-border/60 pointer-events-none absolute top-1/2 right-2.5 hidden -translate-y-1/2 rounded border px-1.5 py-0.5 font-mono text-[10px] md:inline-block">
                  /
                </kbd>
              )}
            </div>

            {/* Quick Filter Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Category Pills */}
              <div className="flex scrollbar-none items-center gap-1 overflow-x-auto pb-1 md:pb-0">
                {categories.map((cat) => {
                  const isCatActive = selectedCategory === cat;
                  const count =
                    cat === 'all' ? news.length : news.filter((n) => n.category === cat).length;

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`relative rounded-lg px-2.5 py-1 text-xs font-medium whitespace-nowrap capitalize transition-all active:scale-95 ${
                        isCatActive
                          ? 'text-primary-foreground font-semibold'
                          : 'text-muted-foreground hover:text-foreground bg-surface-2/60 hover:bg-surface-2 border-border border'
                      }`}
                    >
                      {isCatActive && (
                        <motion.div
                          layoutId="activeNewsCategory"
                          className="bg-primary absolute inset-0 rounded-lg"
                          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1">
                        {cat}
                        <span
                          className={`text-[10px] ${isCatActive ? 'opacity-90' : 'text-muted-foreground/80'}`}
                        >
                          ({count})
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="bg-border mx-0.5 hidden h-4 w-px lg:block" />

              {/* Unread toggle */}
              <button
                type="button"
                onClick={() => setUnreadOnly(!unreadOnly)}
                className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                  unreadOnly
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'bg-surface-2/60 border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Circle
                  className={`h-2.5 w-2.5 ${unreadOnly ? 'fill-primary text-primary' : ''}`}
                />
                <span>Unread</span>
              </button>

              {/* Attachments toggle */}
              <button
                type="button"
                onClick={() => setHasAttachmentsOnly(!hasAttachmentsOnly)}
                className={`flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                  hasAttachmentsOnly
                    ? 'bg-primary/15 border-primary/40 text-primary'
                    : 'bg-surface-2/60 border-border text-muted-foreground hover:text-foreground'
                }`}
              >
                <Paperclip className="h-3 w-3" />
                <span>Files</span>
              </button>

              {/* Sort Order */}
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                className="bg-surface-2/60 border-border text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium"
                title={`Sort: ${sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}`}
              >
                <ArrowUpDown className="h-3 w-3" />
                <span className="capitalize">{sortOrder}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/*  Main View Content  */}
      {viewMode === 'split' ? (
        /*  SPLIT MASTER-DETAIL VIEW  */
        <div className="flex flex-1 overflow-hidden">
          {/* Left Master List */}
          <div
            className={`border-border bg-surface-0/60 flex w-full shrink-0 flex-col overflow-hidden border-r md:w-80 lg:w-[380px] xl:w-[420px] ${
              mobileView === 'detail' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* List count summary */}
            <div className="bg-surface-1/40 border-border/60 text-muted-foreground flex shrink-0 items-center justify-between border-b px-4 py-2 text-[11px]">
              <span>
                Showing {filteredNews.length} of {news.length} articles
              </span>
              {(search || selectedCategory !== 'all' || unreadOnly || hasAttachmentsOnly) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setSelectedCategory('all');
                    setUnreadOnly(false);
                    setHasAttachmentsOnly(false);
                  }}
                  className="text-primary font-medium hover:underline"
                >
                  Reset filters
                </button>
              )}
            </div>

            {/* List scroll area */}
            <div className="flex-1 space-y-2 overflow-y-auto p-2 md:p-3">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-surface-1 border-border animate-pulse space-y-2 rounded-xl border p-3.5"
                  >
                    <div className="flex justify-between">
                      <div className="bg-surface-2 h-3 w-16 rounded" />
                      <div className="bg-surface-2 h-3 w-12 rounded" />
                    </div>
                    <div className="bg-surface-2 h-4 w-3/4 rounded" />
                    <div className="bg-surface-2 h-3 w-full rounded" />
                    <div className="bg-surface-2 h-3 w-1/2 rounded" />
                  </div>
                ))
              ) : error ? (
                <div className="space-y-3 px-4 py-12 text-center">
                  <p className="text-destructive text-xs">{error}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fetchNews()}
                    className="text-xs"
                  >
                    Retry
                  </Button>
                </div>
              ) : filteredNews.length === 0 ? (
                <div className="text-muted-foreground space-y-2 px-4 py-16 text-center">
                  <Inbox className="mx-auto h-8 w-8 stroke-[1.5] opacity-30" />
                  <p className="text-foreground/80 text-xs font-medium">No articles found</p>
                  <p className="text-muted-foreground text-[11px]">
                    Try adjusting your search query or filters.
                  </p>
                </div>
              ) : (
                filteredNews.map((item) => (
                  <NewsCard
                    key={item.id}
                    item={item}
                    view="list"
                    isSelected={selectedId === item.id}
                    onClick={() => handleSelectNews(item.id)}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right Reader Panel */}
          <div
            className={`bg-surface-0 flex min-w-0 flex-1 flex-col overflow-hidden ${
              mobileView === 'list' ? 'hidden md:flex' : 'flex'
            }`}
          >
            <NewsDetailReader
              newsId={selectedId}
              initialSummary={selectedSummary}
              onBack={() => setMobileView('list')}
              onToggleRead={handleToggleRead}
              isRead={selectedId ? readMap[selectedId] : undefined}
            />
          </div>
        </div>
      ) : (
        /*  GRID FEED VIEW  */
        <div className="bg-surface-0 flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl space-y-4">
            {/* Summary info bar */}
            <div className="text-muted-foreground flex items-center justify-between pb-1 text-xs">
              <span>
                Showing {filteredNews.length} of {news.length} articles
              </span>
              {(search || selectedCategory !== 'all' || unreadOnly || hasAttachmentsOnly) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch('');
                    setSelectedCategory('all');
                    setUnreadOnly(false);
                    setHasAttachmentsOnly(false);
                  }}
                  className="text-primary font-medium hover:underline"
                >
                  Reset filters
                </button>
              )}
            </div>

            {/* Grid list */}
            {loading ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-surface-1 border-border flex h-52 animate-pulse flex-col justify-between space-y-3 rounded-2xl border p-5"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <div className="bg-surface-2 h-4 w-20 rounded-full" />
                        <div className="bg-surface-2 h-3 w-16 rounded" />
                      </div>
                      <div className="bg-surface-2 h-5 w-3/4 rounded-lg" />
                      <div className="bg-surface-2 h-3 w-full rounded" />
                      <div className="bg-surface-2 h-3 w-5/6 rounded" />
                    </div>
                    <div className="bg-surface-2 h-6 w-1/3 rounded-full" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="space-y-3 py-16 text-center">
                <p className="text-destructive text-sm">{error}</p>
                <Button size="sm" variant="outline" onClick={() => fetchNews()} className="text-xs">
                  Retry
                </Button>
              </div>
            ) : filteredNews.length === 0 ? (
              <div className="text-muted-foreground space-y-2 py-24 text-center">
                <Inbox className="mx-auto h-10 w-10 stroke-[1.5] opacity-30" />
                <p className="text-foreground text-sm font-semibold">No news articles found</p>
                <p className="text-muted-foreground text-xs">
                  Try clearing your filters or search keywords.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredNews.map((item) => (
                  <NewsCard
                    key={item.id}
                    item={item}
                    view="grid"
                    isSelected={selectedId === item.id}
                    onClick={() => handleSelectNews(item.id)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Grid Mode Modal Reader */}
          <AnimatePresence>
            {modalOpen && selectedId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 lg:p-10">
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setModalOpen(false)}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />

                {/* Modal Window */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: 12 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className="bg-surface-0 border-border relative z-10 flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border shadow-2xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <NewsDetailReader
                    newsId={selectedId}
                    initialSummary={selectedSummary}
                    onBack={() => setModalOpen(false)}
                    onToggleRead={handleToggleRead}
                    isRead={selectedId ? readMap[selectedId] : undefined}
                  />
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export default function NewsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl space-y-4 p-8">
          <div className="bg-surface-2 h-8 w-48 animate-pulse rounded-lg" />
          <div className="bg-surface-1 border-border h-32 w-full animate-pulse rounded-2xl border" />
        </div>
      }
    >
      <NewsContent />
    </Suspense>
  );
}
