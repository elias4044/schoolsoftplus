"use client";

import { useEffect, useState, useMemo, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Newspaper,
  Search,
  X,
  RotateCw,
  SlidersHorizontal,
  LayoutGrid,
  Columns2,
  Paperclip,
  CheckCircle2,
  Circle,
  ArrowUpDown,
  Sparkles,
  BookOpen,
  Inbox,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiFetch } from "@/lib/api-client";
import {
  type NewsSummary,
  type ViewMode,
  type SortOrder,
  stripHtml,
} from "@/components/news/news-types";
import { NewsCard } from "@/components/news/NewsCard";
import { NewsDetailReader } from "@/components/news/NewsDetailReader";

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
  const [viewMode, setViewMode] = useState<ViewMode>("split");
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [modalOpen, setModalOpen] = useState(false);

  // Filter state
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [hasAttachmentsOnly, setHasAttachmentsOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [readMap, setReadMap] = useState<Record<number, boolean>>({});

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch news list
  const fetchNews = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await apiFetch<NewsSummary[] | { data: NewsSummary[] }>("/api/news");
      const list = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
      setNews(list);

      // Initialize read status map
      const initialReadMap: Record<number, boolean> = {};
      list.forEach((item) => {
        initialReadMap[item.id] = item.read ?? false;
      });
      setReadMap((prev) => ({ ...initialReadMap, ...prev }));
    } catch (err: any) {
      setError(err?.message || "Failed to load news announcements.");
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
    const idParam = searchParams.get("id");
    if (idParam) {
      const parsed = parseInt(idParam, 10);
      if (!isNaN(parsed)) {
        setSelectedId(parsed);
        if (viewMode === "grid") setModalOpen(true);
        setMobileView("detail");
      }
    }
  }, [searchParams, viewMode]);

  // Set default selected news on desktop split view
  useEffect(() => {
    if (viewMode === "split" && selectedId === null && news.length > 0 && !loading) {
      setSelectedId(news[0].id);
    }
  }, [news, selectedId, viewMode, loading]);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    news.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return ["all", ...Array.from(set)];
  }, [news]);

  // Filter and sort items
  const filteredNews = useMemo(() => {
    return news
      .filter((item) => {
        // Category filter
        if (selectedCategory !== "all" && item.category !== selectedCategory) {
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
        return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
      });
  }, [news, selectedCategory, unreadOnly, hasAttachmentsOnly, search, sortOrder, readMap]);

  // Total unread count
  const unreadCount = useMemo(() => {
    return news.filter((item) => !(readMap[item.id] ?? item.read)).length;
  }, [news, readMap]);

  const handleSelectNews = (id: number) => {
    setSelectedId(id);
    setMobileView("detail");
    if (viewMode === "grid") {
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
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) {
        if (e.key === "Escape") {
          (e.target as HTMLElement).blur();
        }
        return;
      }

      if (e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "Escape") {
        if (modalOpen) {
          setModalOpen(false);
        } else if (search) {
          setSearch("");
        } else if (mobileView === "detail") {
          setMobileView("list");
        }
      } else if (e.key === "j" || e.key === "ArrowDown") {
        if (filteredNews.length > 0) {
          const currentIndex = filteredNews.findIndex((item) => item.id === selectedId);
          const nextIndex = currentIndex < filteredNews.length - 1 ? currentIndex + 1 : 0;
          handleSelectNews(filteredNews[nextIndex].id);
        }
      } else if (e.key === "k" || e.key === "ArrowUp") {
        if (filteredNews.length > 0) {
          const currentIndex = filteredNews.findIndex((item) => item.id === selectedId);
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : filteredNews.length - 1;
          handleSelectNews(filteredNews[prevIndex].id);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [filteredNews, selectedId, modalOpen, search, mobileView]);

  const selectedSummary = useMemo(() => {
    return news.find((item) => item.id === selectedId) || null;
  }, [news, selectedId]);

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] md:h-screen overflow-hidden bg-background">
      {/* ── Top Header ─────────────────────────────────────────── */}
      <header className="px-4 md:px-6 py-3.5 border-b border-border bg-surface-1 shrink-0 z-10">
        <div className="flex flex-col gap-3">
          {/* Title row & Top Tools */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <Newspaper className="w-4 h-4" />
              </div>
              <div>
                <h1 className="text-lg md:text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  News
                  {unreadCount > 0 && (
                    <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary text-primary-foreground font-semibold">
                      {unreadCount} new
                    </Badge>
                  )}
                </h1>
              </div>
            </div>

            {/* Right Controls: View Mode & Refresh */}
            <div className="flex items-center gap-1.5">
              {/* View Switcher */}
              <div className="hidden sm:flex items-center p-0.5 rounded-lg bg-surface-2 border border-border">
                <button
                  type="button"
                  onClick={() => setViewMode("split")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    viewMode === "split"
                      ? "bg-surface-1 text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Split view (List + Reader)"
                >
                  <Columns2 className="w-3.5 h-3.5" />
                  <span>Split</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    viewMode === "grid"
                      ? "bg-surface-1 text-foreground shadow-sm border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  title="Grid Feed view"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Grid</span>
                </button>
              </div>

              {/* Refresh button */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => fetchNews(true)}
                disabled={loading || refreshing}
                className="w-8 h-8 rounded-lg border-border bg-surface-2 text-muted-foreground hover:text-foreground"
                title="Refresh news"
              >
                <RotateCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-primary" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Search bar & Filter Pills */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search news, teachers, keywords… (press /)"
                className="w-full bg-surface-2 border border-border rounded-xl pl-8.5 pr-8 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-colors"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : (
                <kbd className="hidden md:inline-block absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground/60 bg-surface-1 px-1.5 py-0.5 rounded border border-border/60 pointer-events-none">
                  /
                </kbd>
              )}
            </div>

            {/* Quick Filter Badges */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Category Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
                {categories.map((cat) => {
                  const isCatActive = selectedCategory === cat;
                  const count =
                    cat === "all"
                      ? news.length
                      : news.filter((n) => n.category === cat).length;

                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategory(cat)}
                      className={`relative px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all whitespace-nowrap active:scale-95 ${
                        isCatActive
                          ? "text-primary-foreground font-semibold"
                          : "text-muted-foreground hover:text-foreground bg-surface-2/60 hover:bg-surface-2 border border-border"
                      }`}
                    >
                      {isCatActive && (
                        <motion.div
                          layoutId="activeNewsCategory"
                          className="absolute inset-0 rounded-lg bg-primary"
                          transition={{ type: "spring", stiffness: 450, damping: 32 }}
                        />
                      )}
                      <span className="relative z-10 flex items-center gap-1">
                        {cat}
                        <span className={`text-[10px] ${isCatActive ? "opacity-90" : "text-muted-foreground/80"}`}>
                          ({count})
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="hidden lg:block h-4 w-px bg-border mx-0.5" />

              {/* Unread toggle */}
              <button
                type="button"
                onClick={() => setUnreadOnly(!unreadOnly)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  unreadOnly
                    ? "bg-primary/15 border-primary/40 text-primary"
                    : "bg-surface-2/60 border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Circle className={`w-2.5 h-2.5 ${unreadOnly ? "fill-primary text-primary" : ""}`} />
                <span>Unread</span>
              </button>

              {/* Attachments toggle */}
              <button
                type="button"
                onClick={() => setHasAttachmentsOnly(!hasAttachmentsOnly)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                  hasAttachmentsOnly
                    ? "bg-primary/15 border-primary/40 text-primary"
                    : "bg-surface-2/60 border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Paperclip className="w-3 h-3" />
                <span>Files</span>
              </button>

              {/* Sort Order */}
              <button
                type="button"
                onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-surface-2/60 border border-border text-muted-foreground hover:text-foreground"
                title={`Sort: ${sortOrder === "newest" ? "Newest First" : "Oldest First"}`}
              >
                <ArrowUpDown className="w-3 h-3" />
                <span className="capitalize">{sortOrder}</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main View Content ──────────────────────────────────── */}
      {viewMode === "split" ? (
        /* ===== SPLIT MASTER-DETAIL VIEW ===== */
        <div className="flex-1 flex overflow-hidden">
          {/* Left Master List */}
          <div
            className={`flex flex-col w-full md:w-80 lg:w-[380px] xl:w-[420px] shrink-0 border-r border-border bg-surface-0/60 overflow-hidden ${
              mobileView === "detail" ? "hidden md:flex" : "flex"
            }`}
          >
            {/* List count summary */}
            <div className="px-4 py-2 bg-surface-1/40 border-b border-border/60 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
              <span>
                Showing {filteredNews.length} of {news.length} articles
              </span>
              {(search || selectedCategory !== "all" || unreadOnly || hasAttachmentsOnly) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedCategory("all");
                    setUnreadOnly(false);
                    setHasAttachmentsOnly(false);
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  Reset filters
                </button>
              )}
            </div>

            {/* List scroll area */}
            <div className="flex-1 overflow-y-auto p-2 md:p-3 space-y-2">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-surface-1 border border-border space-y-2 animate-pulse">
                    <div className="flex justify-between">
                      <div className="h-3 w-16 bg-surface-2 rounded" />
                      <div className="h-3 w-12 bg-surface-2 rounded" />
                    </div>
                    <div className="h-4 w-3/4 bg-surface-2 rounded" />
                    <div className="h-3 w-full bg-surface-2 rounded" />
                    <div className="h-3 w-1/2 bg-surface-2 rounded" />
                  </div>
                ))
              ) : error ? (
                <div className="text-center py-12 px-4 space-y-3">
                  <p className="text-xs text-destructive">{error}</p>
                  <Button size="sm" variant="outline" onClick={() => fetchNews()} className="text-xs">
                    Retry
                  </Button>
                </div>
              ) : filteredNews.length === 0 ? (
                <div className="text-center py-16 px-4 space-y-2 text-muted-foreground">
                  <Inbox className="w-8 h-8 mx-auto opacity-30 stroke-[1.5]" />
                  <p className="text-xs font-medium text-foreground/80">No articles found</p>
                  <p className="text-[11px] text-muted-foreground">
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
            className={`flex-1 flex flex-col min-w-0 bg-surface-0 overflow-hidden ${
              mobileView === "list" ? "hidden md:flex" : "flex"
            }`}
          >
            <NewsDetailReader
              newsId={selectedId}
              initialSummary={selectedSummary}
              onBack={() => setMobileView("list")}
              onToggleRead={handleToggleRead}
              isRead={selectedId ? readMap[selectedId] : undefined}
            />
          </div>
        </div>
      ) : (
        /* ===== GRID FEED VIEW ===== */
        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-surface-0">
          <div className="max-w-7xl mx-auto space-y-4">
            {/* Summary info bar */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
              <span>
                Showing {filteredNews.length} of {news.length} articles
              </span>
              {(search || selectedCategory !== "all" || unreadOnly || hasAttachmentsOnly) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedCategory("all");
                    setUnreadOnly(false);
                    setHasAttachmentsOnly(false);
                  }}
                  className="text-primary hover:underline font-medium"
                >
                  Reset filters
                </button>
              )}
            </div>

            {/* Grid list */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-52 rounded-2xl bg-surface-1 border border-border p-5 space-y-3 animate-pulse flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <div className="h-4 w-20 bg-surface-2 rounded-full" />
                        <div className="h-3 w-16 bg-surface-2 rounded" />
                      </div>
                      <div className="h-5 w-3/4 bg-surface-2 rounded-lg" />
                      <div className="h-3 w-full bg-surface-2 rounded" />
                      <div className="h-3 w-5/6 bg-surface-2 rounded" />
                    </div>
                    <div className="h-6 w-1/3 bg-surface-2 rounded-full" />
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-16 space-y-3">
                <p className="text-sm text-destructive">{error}</p>
                <Button size="sm" variant="outline" onClick={() => fetchNews()} className="text-xs">
                  Retry
                </Button>
              </div>
            ) : filteredNews.length === 0 ? (
              <div className="text-center py-24 space-y-2 text-muted-foreground">
                <Inbox className="w-10 h-10 mx-auto opacity-30 stroke-[1.5]" />
                <p className="text-sm font-semibold text-foreground">No news articles found</p>
                <p className="text-xs text-muted-foreground">Try clearing your filters or search keywords.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  className="relative z-10 w-full max-w-4xl h-[90vh] bg-surface-0 rounded-2xl border border-border shadow-2xl overflow-hidden flex flex-col"
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
        <div className="p-8 max-w-4xl mx-auto space-y-4">
          <div className="h-8 w-48 bg-surface-2 rounded-lg animate-pulse" />
          <div className="h-32 w-full bg-surface-1 rounded-2xl border border-border animate-pulse" />
        </div>
      }
    >
      <NewsContent />
    </Suspense>
  );
}
