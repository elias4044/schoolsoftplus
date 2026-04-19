"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { apiFetch } from "@/lib/api-client";
import type { WidgetSize } from "@/lib/widgets/types";

interface NewsItem { id: string; title: string; preview?: string | null }
interface Props { size: WidgetSize }

export default function NewsWidget({ size }: Props) {
  const [news, setNews]     = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<{ success: boolean; data: NewsItem[] }>("/api/news")
      .then(res => setNews(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const limit = size === "2x2" ? 4 : 8;

  if (loading) return (
    <div className="space-y-3">
      {[1,2,3].map(i => (
        <div key={i} className="rounded-xl bg-white/3 p-3 space-y-1.5 animate-pulse">
          <div className="h-3 w-1/2 rounded bg-white/5" />
          <div className="h-2.5 w-full rounded bg-white/5" />
        </div>
      ))}
    </div>
  );

  if (news.length === 0) return <p className="text-xs text-muted-foreground text-center py-6">No news available.</p>;

  return (
    <div className="space-y-2 h-full overflow-y-auto">
      {news.slice(0, limit).map((item, i) => (
        <motion.div
          key={item.id ?? i}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          className="rounded-lg border border-white/7 bg-white/2 p-2.5 hover:border-white/15 transition-colors"
        >
          <p className="text-xs font-medium text-foreground leading-snug">{item.title}</p>
          {item.preview && size !== "2x1" && (
            <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{item.preview}</p>
          )}
        </motion.div>
      ))}
    </div>
  );
}
