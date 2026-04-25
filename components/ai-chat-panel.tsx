"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Bot, Loader2, Sparkles, BookOpen, UtensilsCrossed,
  Newspaper, Calendar, ClipboardList, Copy, Check, RefreshCw,
  ChevronRight, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiFetch, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface InsightResult {
  id: string;
  actionKey: string;
  title: string;
  content: string;
  timestamp: Date;
}

interface QuickAction {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  prompt: string;
  fetchData?: () => Promise<unknown>;
}

interface AiChatPanelProps {
  open: boolean;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getWeek(): { week: string; year: string } {
  const now = new Date();
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((+d - +yearStart) / 86400000 + 1) / 7);
  return { week: String(week), year: String(d.getUTCFullYear()) };
}

// ---------------------------------------------------------------------------
// Quick action definitions
// ---------------------------------------------------------------------------
const QUICK_ACTIONS: QuickAction[] = [
  {
    key: "assignments_week",
    label: "This Week's Assignments",
    description: "AI summary of what's due",
    icon: ClipboardList,
    color: "oklch(0.72 0.18 148)",
    prompt: "summarize_assignments",
  },
  {
    key: "schedule_today",
    label: "Today's Schedule",
    description: "Your lessons at a glance",
    icon: Calendar,
    color: "oklch(0.65 0.22 278)",
    prompt: "summarize_schedule",
  },
  {
    key: "lunch_week",
    label: "Lunch This Week",
    description: "Menu overview for the week",
    icon: UtensilsCrossed,
    color: "oklch(0.75 0.18 45)",
    prompt: "summarize_lunch",
  },
  {
    key: "school_news",
    label: "School News",
    description: "What's happening at school",
    icon: Newspaper,
    color: "oklch(0.72 0.18 200)",
    prompt: "summarize_news",
  },
  {
    key: "study_tips",
    label: "Study Tips",
    description: "Based on your upcoming work",
    icon: BookOpen,
    color: "oklch(0.75 0.15 320)",
    prompt: "study_tips",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export function AiChatPanel({ open, onClose }: AiChatPanelProps) {
  const [results, setResults]     = useState<InsightResult[]>([]);
  const [loading, setLoading]     = useState<string | null>(null); // action key
  const [error, setError]         = useState<string | null>(null);
  const [copied, setCopied]       = useState<string | null>(null);
  const endRef                    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [results, open]);

  const runAction = useCallback(async (action: QuickAction) => {
    if (loading) return;
    setLoading(action.key);
    setError(null);

    const { week, year } = getWeek();
    const today = new Date().toLocaleDateString("sv-SE");

    // Build a focused prompt based on the action
    let systemPrompt = "";
    let dataPayload: Record<string, unknown> = {};

    switch (action.prompt) {
      case "summarize_assignments":
        systemPrompt =
          `You are a concise school assistant. Summarize the student's upcoming assignments ` +
          `for week ${week}. Be brief, use bullet points, highlight deadlines. ` +
          `If no assignments, say so encouragingly. Today is ${today}.`;
        dataPayload = { fetchAssignments: true, week, year };
        break;
      case "summarize_schedule":
        systemPrompt =
          `You are a concise school assistant. Summarize today's (${today}) schedule ` +
          `in a clear, friendly way. List lessons with times. If nothing today, check tomorrow.`;
        dataPayload = { fetchSchedule: true };
        break;
      case "summarize_lunch":
        systemPrompt =
          `You are a helpful school assistant. List this week's (week ${week}) lunch menu ` +
          `in a clean, readable format. Be brief per day. Highlight anything interesting.`;
        dataPayload = { fetchLunch: true, week };
        break;
      case "summarize_news":
        systemPrompt =
          `You are a school news digest. Summarize the latest school news articles ` +
          `in 3-5 bullet points. Be concise and informative. Today is ${today}.`;
        dataPayload = { fetchNews: true };
        break;
      case "study_tips":
        systemPrompt =
          `You are a helpful study coach. Give 4-5 practical, specific study tips ` +
          `tailored to a student with upcoming school assignments. ` +
          `Focus on time management, focus techniques, and stress reduction. Today is ${today}.`;
        dataPayload = { fetchAssignments: true, week, year };
        break;
    }

    try {
      const res = await apiFetch<{ data: string }>("/api/ai/insight", {
        method: "POST",
        body: JSON.stringify({ systemPrompt, ...dataPayload }) as unknown as BodyInit,
      });

      setResults(prev => [
        ...prev,
        {
          id: crypto.randomUUID(),
          actionKey: action.key,
          title: action.label,
          content: res.data,
          timestamp: new Date(),
        },
      ]);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Something went wrong. Please try again.";
      setError(msg);
    } finally {
      setLoading(null);
    }
  }, [loading]);

  function copyResult(id: string, text: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="panel"
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 35 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md z-50 flex flex-col"
            style={{ background: "var(--surface-1)" }}
          >
            {/* Top accent */}
            <div
              className="absolute top-0 inset-x-0 h-px"
              style={{
                background: "linear-gradient(90deg, transparent, oklch(0.65 0.22 278 / 70%), transparent)",
              }}
            />

            {/* Header */}
            <div className="flex items-center gap-3 px-4 h-14 border-b border-border shrink-0">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg"
                style={{
                  background: "linear-gradient(135deg, oklch(0.65 0.22 278 / 25%), oklch(0.55 0.25 295 / 25%))",
                }}
              >
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">AI Insights</p>
                <p className="text-[10px] text-muted-foreground">Focused school intelligence</p>
              </div>
              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Quick action cards */}
            <div className="px-4 pt-4 pb-2 shrink-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium mb-2.5">
                Quick Actions
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {QUICK_ACTIONS.map(action => {
                  const Icon = action.icon;
                  const isLoading = loading === action.key;
                  return (
                    <button
                      key={action.key}
                      onClick={() => runAction(action)}
                      disabled={!!loading}
                      className={cn(
                        "flex flex-col gap-1.5 p-2.5 rounded-xl border text-left transition-all",
                        "hover:bg-white/5 active:scale-[0.97]",
                        isLoading ? "border-primary/30" : "border-white/8",
                        loading && !isLoading ? "opacity-50 cursor-not-allowed" : ""
                      )}
                      style={isLoading ? { background: "oklch(0.65 0.22 278 / 6%)" } : {}}
                    >
                      <div className="flex items-center gap-1.5">
                        <div
                          className="flex items-center justify-center w-5 h-5 rounded-md shrink-0"
                          style={{ background: `${action.color}20` }}
                        >
                          {isLoading
                            ? <Loader2 className="w-2.5 h-2.5 animate-spin" style={{ color: action.color }} />
                            : <Icon className="w-2.5 h-2.5" style={{ color: action.color }} />
                          }
                        </div>
                        <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/40 ml-auto" />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-foreground/90 leading-tight">{action.label}</p>
                        <p className="text-[9px] text-muted-foreground/60 leading-tight mt-0.5">{action.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="mx-4 my-1 border-t border-border" />

            {/* Results */}
            <ScrollArea className="flex-1 px-4 py-2">
              {/* Error */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-start gap-2 text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2.5 mb-3"
                  >
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span className="flex-1">{error}</span>
                    <button onClick={() => setError(null)} className="shrink-0">
                      <X className="w-3 h-3" />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {results.length === 0 && !loading && (
                <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
                  <div
                    className="flex items-center justify-center w-12 h-12 rounded-2xl"
                    style={{ background: "oklch(0.65 0.22 278 / 10%)" }}
                  >
                    <Bot className="w-5 h-5 text-primary/60" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground/70">No insights yet</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      Tap a quick action above to get started
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3 pb-4">
                <AnimatePresence initial={false}>
                  {[...results].reverse().map(result => {
                    const action = QUICK_ACTIONS.find(a => a.key === result.actionKey);
                    const Icon = action?.icon ?? Sparkles;
                    const color = action?.color ?? "oklch(0.65 0.22 278)";
                    return (
                      <motion.div
                        key={result.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.25 }}
                        className="rounded-xl border overflow-hidden"
                        style={{ borderColor: "oklch(1 0 0 / 8%)", background: "var(--surface-2)" }}
                      >
                        {/* Card header */}
                        <div
                          className="flex items-center gap-2 px-3 py-2 border-b"
                          style={{ borderColor: "oklch(1 0 0 / 6%)", background: `${color}08` }}
                        >
                          <div
                            className="flex items-center justify-center w-5 h-5 rounded-md shrink-0"
                            style={{ background: `${color}20` }}
                          >
                            <Icon className="w-2.5 h-2.5" style={{ color }} />
                          </div>
                          <span className="text-xs font-medium text-foreground/90 flex-1">{result.title}</span>
                          <span className="text-[9px] text-muted-foreground/50">
                            {result.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                        {/* Content */}
                        <div className="px-3 py-2.5">
                          <p className="text-xs text-foreground/85 leading-relaxed whitespace-pre-wrap">
                            {result.content}
                          </p>
                        </div>

                        {/* Footer */}
                        <div
                          className="flex items-center gap-2 px-3 py-1.5 border-t"
                          style={{ borderColor: "oklch(1 0 0 / 6%)" }}
                        >
                          <button
                            onClick={() => action && runAction(action)}
                            disabled={!!loading}
                            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                            Refresh
                          </button>
                          <div className="flex-1" />
                          <button
                            onClick={() => copyResult(result.id, result.content)}
                            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {copied === result.id
                              ? <><Check className="w-2.5 h-2.5 text-green-400" /> Copied</>
                              : <><Copy className="w-2.5 h-2.5" /> Copy</>
                            }
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
              <div ref={endRef} />
            </ScrollArea>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

