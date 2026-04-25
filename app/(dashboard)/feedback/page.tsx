"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bug,
  Lightbulb,
  MessageCircle,
  ExternalLink,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  CheckCircle2,
  AlertCircle,
  Tag,
  Clock,
  User2,
  MessageSquare,
  Filter,
  Search,
  Plus,
  GitPullRequest,
  ArrowUpRight,
  Inbox,
  Send,
  ArrowLeft,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { staggerContainer, fadeUp } from "@/components/dashboard-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

/* ── Constants ─────────────────────────────────────────── */
const REPO_URL = "https://github.com/elias4044/schoolsoftplus";

/* ── Label colour map ───────────────────────────────────── */
const LABEL_COLOURS: Record<string, string> = {
  bug:               "oklch(0.65 0.22 25)",
  "feature request": "oklch(0.65 0.22 278)",
  enhancement:       "oklch(0.65 0.20 200)",
  question:          "oklch(0.65 0.18 160)",
  documentation:     "oklch(0.65 0.14 60)",
  duplicate:         "oklch(0.55 0.05 0)",
  "help wanted":     "oklch(0.65 0.20 140)",
  "good first issue":"oklch(0.60 0.20 100)",
  wontfix:           "oklch(0.45 0.05 0)",
};

function labelColour(name: string, ghColor?: string): string {
  return LABEL_COLOURS[name.toLowerCase()] ?? (ghColor ? `#${ghColor}` : "oklch(0.55 0.08 278)");
}

/* ── Templates ──────────────────────────────────────────── */
const TEMPLATES = [
  {
    id:     "bug",
    label:  "Bug Report",
    icon:   Bug,
    colour: "oklch(0.65 0.22 25)",
    bg:     "oklch(0.65 0.22 25 / 10%)",
    border: "oklch(0.65 0.22 25 / 25%)",
    desc:   "Something isn't working as expected",
    placeholder: "Describe what happened, steps to reproduce, and what you expected to see.",
    defaultBody:
`## Describe the bug
A clear description of what the bug is.

## Steps to reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected behaviour
What you expected to happen.

## Environment
- Browser: 
- OS: `,
  },
  {
    id:     "feature",
    label:  "Feature Request",
    icon:   Lightbulb,
    colour: "oklch(0.75 0.18 278)",
    bg:     "oklch(0.65 0.22 278 / 10%)",
    border: "oklch(0.65 0.22 278 / 25%)",
    desc:   "Suggest an idea or improvement",
    placeholder: "Describe the feature you'd like and why it would be useful.",
    defaultBody:
`## Is your feature request related to a problem?
Describe what problem this solves.

## Describe the solution you'd like
A clear description of what you want to happen.

## Alternatives considered
Any other solutions you've thought about.`,
  },
  {
    id:     "question",
    label:  "Question / Other",
    icon:   MessageCircle,
    colour: "oklch(0.65 0.20 160)",
    bg:     "oklch(0.65 0.20 160 / 10%)",
    border: "oklch(0.65 0.20 160 / 25%)",
    desc:   "Ask something or start a discussion",
    placeholder: "What would you like to know or discuss?",
    defaultBody: `## Question\nWhat would you like to know?\n\n## Context\nAny additional context.`,
  },
] as const;

type TemplateId = (typeof TEMPLATES)[number]["id"];

/* ── GitHub Issue type ──────────────────────────────────── */
interface GHLabel { name: string; color: string }
interface GHIssue {
  id:         number;
  number:     number;
  title:      string;
  html_url:   string;
  state:      "open" | "closed";
  created_at: string;
  comments:   number;
  user:       { login: string };
  labels:     GHLabel[];
}

/* ── Helpers ────────────────────────────────────────────── */
function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

/* ── IssueCard ──────────────────────────────────────────── */
function IssueCard({ issue }: { issue: GHIssue }) {
  const isOpen = issue.state === "open";
  return (
    <motion.a
      variants={fadeUp}
      href={issue.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block rounded-xl border p-4 transition-colors hover:border-primary/30 hover:bg-white/3"
      style={{ borderColor: "oklch(1 0 0 / 7%)", background: "var(--card)" }}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {isOpen
            ? <CircleDot    className="w-4 h-4" style={{ color: "oklch(0.65 0.22 142)" }} />
            : <CheckCircle2 className="w-4 h-4" style={{ color: "oklch(0.65 0.18 278)" }} />}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {issue.title}
            </p>
            <ArrowUpRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {issue.labels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {issue.labels.map(l => (
                <span
                  key={l.name}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    background: `${labelColour(l.name, l.color)}22`,
                    color:       labelColour(l.name, l.color),
                    border:     `1px solid ${labelColour(l.name, l.color)}44`,
                  }}
                >
                  {l.name}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Tag           className="w-3 h-3" />#{issue.number}</span>
            <span className="flex items-center gap-1"><Clock         className="w-3 h-3" />{timeAgo(issue.created_at)}</span>
            <span className="flex items-center gap-1"><User2         className="w-3 h-3" />{issue.user.login}</span>
            {issue.comments > 0 && (
              <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{issue.comments}</span>
            )}
          </div>
        </div>
      </div>
    </motion.a>
  );
}

/* ── SubmitForm ─────────────────────────────────────────── */
interface SubmitFormProps {
  templateId: TemplateId;
  username:   string;
  onBack:     () => void;
  onSuccess:  (url: string, number: number) => void;
}

function SubmitForm({ templateId, username, onBack, onSuccess }: SubmitFormProps) {
  const tpl  = TEMPLATES.find(t => t.id === templateId)!;
  const Icon = tpl.icon;

  const [title,   setTitle]   = useState<string>("");
  const [body,    setBody]    = useState<string>(tpl.defaultBody);
  const [error,   setError]   = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async () => {
    setError(null);
    if (!title.trim()) { setError("Please enter a title."); return; }
    setSending(true);
    try {
      const res  = await fetch("/api/github/issues/create", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ title, body, type: tpl.id }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Something went wrong."); return; }
      onSuccess(data.html_url, data.number);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-4"
    >
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div
          className="flex items-center justify-center w-8 h-8 rounded-lg shrink-0"
          style={{ background: `${tpl.colour}22`, border: `1px solid ${tpl.colour}44` }}
        >
          <Icon className="w-4 h-4" style={{ color: tpl.colour }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: tpl.colour }}>{tpl.label}</p>
          <p className="text-xs text-muted-foreground">
            Submitting as <span className="text-foreground font-medium">{username}</span>
          </p>
        </div>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Title *</label>
        <Input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="Short, descriptive summary…"
          maxLength={256}
          className="bg-white/5 border-white/10 focus:border-primary/50"
          onKeyDown={e => e.key === "Enter" && submit()}
        />
        <p className="text-[10px] text-muted-foreground text-right">{title.length}/256</p>
      </div>

      {/* Body */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Details</label>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          rows={12}
          placeholder={tpl.placeholder}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-y font-mono leading-relaxed"
        />
        <p className="text-[10px] text-muted-foreground">
          Markdown is supported. Your SSP username will be appended automatically.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-2 rounded-xl p-3 text-sm"
          style={{ background: "oklch(0.65 0.22 25 / 8%)", border: "1px solid oklch(0.65 0.22 25 / 25%)", color: "oklch(0.65 0.22 25)" }}
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Submit */}
      <Button
        onClick={submit}
        disabled={sending || !title.trim()}
        className="w-full h-10 gap-2"
        style={!sending && title.trim() ? { background: tpl.colour } : undefined}
      >
        {sending
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting…</>
          : <><Send    className="w-4 h-4" /> Submit {tpl.label}</>
        }
      </Button>
    </motion.div>
  );
}

/* ── SuccessBanner ──────────────────────────────────────── */
function SuccessBanner({ url, number, onReset }: { url: string; number: number; onReset: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl p-6 text-center space-y-4"
      style={{ background: "oklch(0.65 0.22 142 / 8%)", border: "1px solid oklch(0.65 0.22 142 / 25%)" }}
    >
      <div className="flex justify-center">
        <div
          className="flex items-center justify-center w-14 h-14 rounded-full"
          style={{ background: "oklch(0.65 0.22 142 / 15%)" }}
        >
          <CheckCircle className="w-7 h-7" style={{ color: "oklch(0.65 0.22 142)" }} />
        </div>
      </div>
      <div>
        <p className="text-base font-semibold" style={{ color: "oklch(0.65 0.22 142)" }}>
          Issue #{number} submitted!
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Thank you for your feedback. You can track your issue on GitHub.
        </p>
      </div>
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs font-medium px-4 py-2 rounded-lg transition-colors"
          style={{ background: "oklch(0.65 0.22 142 / 15%)", color: "oklch(0.65 0.22 142)" }}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          View on GitHub
        </a>
        <button
          onClick={onReset}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-lg hover:bg-white/5"
        >
          Submit another
        </button>
      </div>
    </motion.div>
  );
}

/* ── Main Page ──────────────────────────────────────────── */
type Tab = "submit" | "open" | "closed";
type LabelFilter = "all" | "bug" | "feature request" | "question";
type SubmitStep = "pick" | "form" | "success";

export default function FeedbackPage() {
  const { session } = useAuth();
  const username    = session?.username ?? "unknown";

  /* Issues browsing */
  const [tab, setTab]                     = useState<Tab>("submit");
  const [issues, setIssues]               = useState<GHIssue[]>([]);
  const [loadingIssues, setLoadingIssues] = useState(false);
  const [issueError, setIssueError]       = useState<string | null>(null);
  const [page, setPage]                   = useState(1);
  const [hasNext, setHasNext]             = useState(false);
  const [labelFilter, setLabelFilter]     = useState<LabelFilter>("all");
  const [search, setSearch]               = useState("");

  /* Submission flow */
  const [step, setStep]                   = useState<SubmitStep>("pick");
  const [activeTemplate, setActiveTemplate] = useState<TemplateId>("bug");
  const [successUrl, setSuccessUrl]       = useState("");
  const [successNumber, setSuccessNumber] = useState(0);

  const fetchIssues = useCallback(async (state: "open" | "closed", pg: number, label: string) => {
    setLoadingIssues(true);
    setIssueError(null);
    try {
      const params = new URLSearchParams({ state, page: String(pg), per_page: "20" });
      if (label !== "all") params.set("labels", label);
      const res  = await fetch(`/api/github/issues?${params}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setIssues(data.issues ?? []);
      setHasNext(data.hasNext ?? false);
    } catch {
      setIssueError("Could not load issues. GitHub may be rate-limiting — try again shortly.");
    } finally {
      setLoadingIssues(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "open" || tab === "closed") {
      fetchIssues(tab === "open" ? "open" : "closed", page, labelFilter);
    }
  }, [tab, page, labelFilter, fetchIssues]);

  const switchTab   = (t: Tab)          => { setTab(t);         setPage(1); };
  const switchLabel = (l: LabelFilter)  => { setLabelFilter(l); setPage(1); };

  const filteredIssues = search.trim()
    ? issues.filter(i => i.title.toLowerCase().includes(search.toLowerCase()))
    : issues;

  /* ── Render ─────────────────────────────────────── */
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <GitPullRequest className="w-6 h-6 text-primary" />
              Feedback
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Report bugs, request features, or browse existing issues
            </p>
          </div>
          <a
            href={`${REPO_URL}/issues`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            View on GitHub
          </a>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.05 }}
        className="flex items-center gap-1 rounded-xl p-1 w-fit"
        style={{ background: "var(--card)", border: "1px solid oklch(1 0 0 / 7%)" }}
      >
        {([
          { id: "submit", label: "Submit Feedback", icon: Plus         },
          { id: "open",   label: "Open Issues",     icon: CircleDot    },
          { id: "closed", label: "Closed Issues",   icon: CheckCircle2 },
        ] as { id: Tab; label: string; icon: React.ElementType }[]).map(t => (
          <button
            key={t.id}
            onClick={() => { switchTab(t.id); if (t.id === "submit") setStep("pick"); }}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
              tab === t.id
                ? "bg-primary/15 text-primary shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
            )}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">

        {/* ── Submit tab ── */}
        {tab === "submit" && (
          <motion.div
            key="submit-root"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
          >
            <AnimatePresence mode="wait">

              {/* pick template */}
              {step === "pick" && (
                <motion.div
                  key="pick"
                  variants={staggerContainer}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, x: -20, transition: { duration: 0.15 } }}
                  className="space-y-4"
                >
                  <motion.div
                    variants={fadeUp}
                    className="flex items-start gap-3 rounded-xl p-4"
                    style={{ background: "oklch(0.65 0.22 278 / 8%)", border: "1px solid oklch(0.65 0.22 278 / 20%)" }}
                  >
                    <AlertCircle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Your feedback is submitted directly as a GitHub issue, linked to your SSP username{" "}
                      <span className="text-foreground font-medium">{username}</span>. No GitHub account needed.
                    </p>
                  </motion.div>

                  {TEMPLATES.map(tpl => {
                    const Icon = tpl.icon;
                    return (
                      <motion.button
                        key={tpl.id}
                        variants={fadeUp}
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => { setActiveTemplate(tpl.id); setStep("form"); }}
                        className="w-full text-left rounded-xl border p-5 transition-colors cursor-pointer group"
                        style={{ background: tpl.bg, border: `1px solid ${tpl.border}` }}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <div
                              className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
                              style={{ background: `${tpl.colour}22`, border: `1px solid ${tpl.colour}44` }}
                            >
                              <Icon className="w-5 h-5" style={{ color: tpl.colour }} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold" style={{ color: tpl.colour }}>{tpl.label}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{tpl.desc}</p>
                            </div>
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity shrink-0" />
                        </div>
                      </motion.button>
                    );
                  })}
                </motion.div>
              )}

              {/* fill form */}
              {step === "form" && (
                <SubmitForm
                  key="form"
                  templateId={activeTemplate}
                  username={username}
                  onBack={() => setStep("pick")}
                  onSuccess={(url, number) => {
                    setSuccessUrl(url);
                    setSuccessNumber(number);
                    setStep("success");
                  }}
                />
              )}

              {/* success */}
              {step === "success" && (
                <motion.div key="success" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <SuccessBanner
                    url={successUrl}
                    number={successNumber}
                    onReset={() => setStep("pick")}
                  />
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>
        )}

        {/* ── Issues tabs ── */}
        {(tab === "open" || tab === "closed") && (
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
            className="space-y-4"
          >
            {/* Controls */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 min-w-40">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Filter by title…"
                  className="pl-8 h-8 text-xs bg-white/5 border-white/10 focus:border-primary/50"
                />
              </div>
              <div className="flex items-center gap-1">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                {(["all", "bug", "feature request", "question"] as LabelFilter[]).map(l => (
                  <button
                    key={l}
                    onClick={() => switchLabel(l)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors capitalize",
                      labelFilter === l
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                  >
                    {l === "all" ? "All" : l}
                  </button>
                ))}
              </div>
              <button
                onClick={() => fetchIssues(tab === "open" ? "open" : "closed", page, labelFilter)}
                disabled={loadingIssues}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors disabled:opacity-40"
              >
                <RefreshCw className={cn("w-3.5 h-3.5", loadingIssues && "animate-spin")} />
              </button>
            </div>

            {/* Error */}
            {issueError && (
              <div
                className="flex items-center gap-2 rounded-xl p-4 text-sm"
                style={{ background: "oklch(0.65 0.22 25 / 8%)", border: "1px solid oklch(0.65 0.22 25 / 25%)", color: "oklch(0.65 0.22 25)" }}
              >
                <AlertCircle className="w-4 h-4 shrink-0" />
                {issueError}
              </div>
            )}

            {/* Skeletons */}
            {loadingIssues && !issueError && (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="rounded-xl border p-4 animate-pulse space-y-2" style={{ background: "var(--card)", borderColor: "oklch(1 0 0 / 7%)" }}>
                    <div className="flex items-start gap-3">
                      <div className="w-4 h-4 rounded-full bg-white/8 shrink-0 mt-0.5" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3.5 w-3/5 rounded bg-white/8" />
                        <div className="h-2.5 w-1/4 rounded bg-white/5" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty */}
            {!loadingIssues && !issueError && filteredIssues.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                <Inbox className="w-10 h-10 opacity-30" />
                <p className="text-sm">{search ? "No issues match your search." : `No ${tab} issues found.`}</p>
                {!search && (
                  <a
                    href={`${REPO_URL}/issues?q=is%3Aissue+is%3A${tab}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary/70 hover:text-primary flex items-center gap-1"
                  >
                    View on GitHub <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            {/* List */}
            {!loadingIssues && !issueError && filteredIssues.length > 0 && (
              <>
                <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-2">
                  {filteredIssues.map(issue => <IssueCard key={issue.id} issue={issue} />)}
                </motion.div>

                {!search && (
                  <div className="flex items-center justify-between pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1 || loadingIssues}
                      className="h-8 text-xs border-white/10 bg-white/5 hover:bg-white/10"
                    >
                      <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                      Previous
                    </Button>
                    <span className="text-xs text-muted-foreground">Page {page}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => p + 1)}
                      disabled={!hasNext || loadingIssues}
                      className="h-8 text-xs border-white/10 bg-white/5 hover:bg-white/10"
                    >
                      Next
                      <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
