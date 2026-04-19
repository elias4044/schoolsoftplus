"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Newspaper, Clock } from "lucide-react";
import { staggerContainer, fadeUp } from "@/components/dashboard-card";
import { apiFetch } from "@/lib/api-client";

interface NewsItem {
  id: string;
  title: string;
  preview?: string | null;
  date?: string;
  author?: string;
  data?: Record<string, any>;
}

export default function NewsPage() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // The API returns { success: true, data: [...] }
    apiFetch<{ success: boolean; data: NewsItem[] }>("/api/news")
      .then((res) => setNews(Array.isArray(res?.data) ? res.data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Newspaper className="w-6 h-6 text-primary" />
          News
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Latest from your school</p>
      </motion.div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="rounded-xl bg-card border border-white/7 p-5 animate-pulse space-y-2">
              <div className="h-4 w-1/2 rounded bg-white/5" />
              <div className="h-3 w-full rounded bg-white/5" />
              <div className="h-3 w-3/4 rounded bg-white/5" />
            </div>
          ))}
        </div>
      ) : news.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No news available.</div>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {news.map((item, i) => (
            <motion.div
              key={item.id ?? i}
              variants={fadeUp}
              className="rounded-xl border border-white/7 bg-card p-5 hover:border-white/15 transition-colors"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <h2 className="text-sm font-semibold text-foreground leading-snug">{item.title}</h2>
                {item.date && (
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                    <Clock className="w-3 h-3" />
                    {item.date}
                  </div>
                )}
              </div>
              {item.author && (
                <p className="text-[10px] text-muted-foreground mb-2">{item.author}</p>
              )}
              {item.preview ? (
                <p className="text-sm text-foreground/70 leading-relaxed">{item.preview}</p>
              ) : null}
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
