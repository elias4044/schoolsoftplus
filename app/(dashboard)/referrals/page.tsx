'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  ChevronUp,
  Copy,
  ExternalLink,
  Gift,
  Loader2,
  Medal,
  MessageSquare,
  Share2,
  Trophy,
  Users,
} from 'lucide-react';

import { useSession } from '@/lib/useSession';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

/* ── Types ──────────────────────────────────────────────────────────────── */

interface ReferredUser {
  username: string;
  displayName: string;
  pfpUrl: string;
  joinedAt: number;
}

interface ReferralData {
  code: string;
  totalReferrals: number;
  referredUsers: ReferredUser[];
  createdAt: number;
  updatedAt: number;
}

interface LeaderboardEntry {
  rank: number;
  username: string;
  displayName: string;
  pfpUrl: string;
  schoolName: string;
  totalReferrals: number;
}

/* ── Milestones ─────────────────────────────────────────────────────────── */

const MILESTONES = [
  { min: 1, label: 'Starter', color: '#cd7f32', emoji: '🥉' },
  { min: 5, label: 'Silver', color: '#a8a9ad', emoji: '🥈' },
  { min: 10, label: 'Gold', color: '#ffd700', emoji: '🥇' },
  { min: 25, label: 'Diamond', color: '#b9f2ff', emoji: '💎' },
  { min: 50, label: 'Champion', color: '#a855f7', emoji: '👑' },
] as const;

function getMilestone(count: number) {
  return [...MILESTONES].reverse().find((m) => count >= m.min) ?? null;
}

function getNextMilestone(count: number) {
  return MILESTONES.find((m) => count < m.min) ?? null;
}

/* ── Helpers ────────────────────────────────────────────────────────────── */

function initials(name: string) {
  return (
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?'
  );
}

function timeAgo(ms: number) {
  const secs = Math.floor((Date.now() - ms) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

/* ── Main component ─────────────────────────────────────────────────────── */

export default function ReferralsPage() {
  const { session } = useSession();
  const username = session?.username ?? '';

  const [data, setData] = useState<ReferralData | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lbLoading, setLbLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [myRank, setMyRank] = useState<number | null>(null);

  const referralUrl =
    typeof window !== 'undefined' && data ? `${window.location.origin}/join?ref=${data.code}` : '';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/referrals');
      const json = await res.json();
      if (json.success) setData(json.data);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchLeaderboard = useCallback(async () => {
    setLbLoading(true);
    try {
      const res = await fetch('/api/referrals/leaderboard?limit=10');
      const json = await res.json();
      if (json.success) {
        setLeaderboard(json.data);
      }
    } finally {
      setLbLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchLeaderboard();
  }, [fetchData, fetchLeaderboard]);

  useEffect(() => {
    if (!username || leaderboard.length === 0) return;
    const entry = leaderboard.find((e) => e.username === username.toLowerCase());
    setMyRank(entry?.rank ?? null);
  }, [username, leaderboard]);

  async function copyLink() {
    if (!referralUrl) return;
    await navigator.clipboard.writeText(referralUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareTwitter() {
    const text = encodeURIComponent(
      `Join me on SchoolSoft+, the better student dashboard! ${referralUrl}`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'noopener');
  }

  function shareWhatsApp() {
    const text = encodeURIComponent(`Join me on SchoolSoft+! Sign up with my link: ${referralUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  }

  const milestone = data ? getMilestone(data.totalReferrals) : null;
  const nextMilestone = data ? getNextMilestone(data.totalReferrals) : null;
  const progressPct =
    nextMilestone && data
      ? Math.min(100, Math.round((data.totalReferrals / nextMilestone.min) * 100))
      : 100;

  return (
    <div className="mx-auto min-h-full max-w-5xl space-y-6 p-4 md:p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Gift className="text-primary h-6 w-6" />
          Refer Friends
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Share SchoolSoft+ with your classmates and track how many people join through your link.
        </p>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="text-primary h-8 w-8 animate-spin" />
        </div>
      ) : data ? (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column */}
          <div className="space-y-5 lg:col-span-2">
            {/* Referral link card */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="border-border bg-card space-y-4 rounded-xl border p-5"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground font-semibold">Your invite link</p>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    Share this link — you get credited when a new user logs in for the first time.
                  </p>
                </div>
                {milestone && (
                  <span className="text-2xl" title={milestone.label}>
                    {milestone.emoji}
                  </span>
                )}
              </div>

              {/* Link display */}
              <div className="border-border bg-muted/40 flex items-center gap-2 rounded-lg border px-3 py-2.5">
                <code className="text-muted-foreground flex-1 truncate text-xs select-all">
                  {referralUrl ||
                    `${typeof window !== 'undefined' ? window.location.origin : ''}/join?ref=${data.code}`}
                </code>
                <button
                  onClick={copyLink}
                  className="text-primary hover:text-primary/80 flex shrink-0 items-center gap-1.5 text-xs font-medium transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>

              {/* Code display */}
              <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <span>Your code:</span>
                <code
                  className="text-foreground rounded-md px-2 py-0.5 font-mono font-bold tracking-widest"
                  style={{ background: 'color-mix(in oklch, var(--brand) 15%, transparent)' }}
                >
                  {data.code}
                </code>
              </div>

              {/* Share buttons */}
              <div className="flex flex-wrap gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={copyLink} className="gap-1.5 text-xs">
                  {copied ? <Check className="h-3 w-3" /> : <Share2 className="h-3 w-3" />}
                  {copied ? 'Copied!' : 'Copy link'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={shareTwitter}
                  className="gap-1.5 text-xs"
                >
                  Tweet
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={shareWhatsApp}
                  className="gap-1.5 text-xs"
                >
                  <MessageSquare className="h-3 w-3" />
                  WhatsApp
                </Button>
              </div>
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-3 gap-3"
            >
              {[
                {
                  label: 'Total Referrals',
                  value: data.totalReferrals,
                  icon: Users,
                  color: 'var(--primary)',
                },
                {
                  label: 'Leaderboard Rank',
                  value: myRank ? `#${myRank}` : data.totalReferrals > 0 ? 'Unranked' : '—',
                  icon: Trophy,
                  color: '#ffd700',
                },
                {
                  label: 'Milestone',
                  value: milestone ? milestone.label : 'None yet',
                  icon: Medal,
                  color: milestone ? milestone.color : 'var(--muted-foreground)',
                },
              ].map(({ label, value, icon: Icon, color }) => (
                <div
                  key={label}
                  className="border-border bg-card flex flex-col gap-2 rounded-xl border p-4"
                >
                  <Icon className="h-4 w-4" style={{ color }} />
                  <p className="text-foreground text-2xl font-bold">{value}</p>
                  <p className="text-muted-foreground text-xs">{label}</p>
                </div>
              ))}
            </motion.div>

            {/* Milestone progress */}
            {(milestone || nextMilestone) && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="border-border bg-card space-y-3 rounded-xl border p-5"
              >
                <p className="text-foreground flex items-center gap-2 text-sm font-semibold">
                  <Medal className="text-primary h-4 w-4" />
                  Milestones
                </p>
                <div className="flex flex-wrap gap-2">
                  {MILESTONES.map((m) => {
                    const achieved = data.totalReferrals >= m.min;
                    return (
                      <div
                        key={m.label}
                        className={cn(
                          'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                          achieved
                            ? 'border-transparent'
                            : 'border-border text-muted-foreground opacity-50'
                        )}
                        style={
                          achieved
                            ? {
                                background: `color-mix(in oklch, ${m.color} 15%, transparent)`,
                                color: m.color,
                                borderColor: `color-mix(in oklch, ${m.color} 30%, transparent)`,
                              }
                            : {}
                        }
                      >
                        <span>{m.emoji}</span>
                        {m.label}
                        <span className="opacity-60">({m.min}+)</span>
                      </div>
                    );
                  })}
                </div>

                {nextMilestone && (
                  <div className="space-y-1.5">
                    <div className="text-muted-foreground flex justify-between text-xs">
                      <span>
                        Progress to{' '}
                        <span className="text-foreground font-medium">
                          {nextMilestone.emoji} {nextMilestone.label}
                        </span>
                      </span>
                      <span>
                        {data.totalReferrals} / {nextMilestone.min}
                      </span>
                    </div>
                    <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: nextMilestone.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPct}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Referred users */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="border-border bg-card space-y-4 rounded-xl border p-5"
            >
              <p className="text-foreground flex items-center gap-2 text-sm font-semibold">
                <Users className="text-primary h-4 w-4" />
                People You Referred
                <Badge variant="secondary" className="ml-auto text-xs">
                  {data.referredUsers.length}
                </Badge>
              </p>

              {data.referredUsers.length === 0 ? (
                <div className="space-y-2 py-8 text-center">
                  <p className="text-muted-foreground text-sm">No referrals yet</p>
                  <p className="text-muted-foreground text-xs">
                    Share your link above to get started.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <AnimatePresence>
                    {[...data.referredUsers]
                      .sort((a, b) => b.joinedAt - a.joinedAt)
                      .map((user, i) => (
                        <motion.div
                          key={user.username}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="hover:bg-muted/40 flex items-center gap-3 rounded-lg px-3 py-2 transition-colors"
                        >
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={user.pfpUrl} />
                            <AvatarFallback
                              className="text-xs font-semibold"
                              style={{
                                background: 'color-mix(in oklch, var(--brand) 20%, transparent)',
                                color: 'var(--primary)',
                              }}
                            >
                              {initials(user.displayName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-foreground truncate text-sm font-medium">
                              {user.displayName}
                            </p>
                            <p className="text-muted-foreground text-xs">@{user.username}</p>
                          </div>
                          <p className="text-muted-foreground shrink-0 text-xs">
                            {timeAgo(user.joinedAt)}
                          </p>
                        </motion.div>
                      ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          </div>

          {/* Right column — Leaderboard */}
          <div className="space-y-5">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="border-border bg-card space-y-4 rounded-xl border p-5"
            >
              <p className="text-foreground flex items-center gap-2 text-sm font-semibold">
                <Trophy className="h-4 w-4 text-yellow-400" />
                Leaderboard
              </p>

              {lbLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="text-primary h-5 w-5 animate-spin" />
                </div>
              ) : leaderboard.length === 0 ? (
                <p className="text-muted-foreground py-6 text-center text-xs">
                  No referrals recorded yet. Be the first!
                </p>
              ) : (
                <div className="space-y-1.5">
                  {leaderboard.map((entry, i) => {
                    const isMe = entry.username === username?.toLowerCase();
                    const rankEmoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;

                    return (
                      <motion.div
                        key={entry.username}
                        initial={{ opacity: 0, x: 8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04 }}
                        className={cn(
                          'flex items-center gap-2.5 rounded-lg px-3 py-2 transition-colors',
                          isMe ? 'border-primary/30 border' : 'hover:bg-muted/40'
                        )}
                        style={
                          isMe
                            ? { background: 'color-mix(in oklch, var(--brand) 10%, transparent)' }
                            : {}
                        }
                      >
                        {/* Rank */}
                        <span className="text-muted-foreground w-6 shrink-0 text-center font-mono text-sm">
                          {rankEmoji ?? `${entry.rank}`}
                        </span>

                        <Avatar className="h-7 w-7 shrink-0">
                          <AvatarImage src={entry.pfpUrl} />
                          <AvatarFallback
                            className="text-xs font-semibold"
                            style={{
                              background: 'color-mix(in oklch, var(--brand) 20%, transparent)',
                              color: 'var(--primary)',
                            }}
                          >
                            {initials(entry.displayName)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <p className="text-foreground truncate text-xs font-medium">
                            {entry.displayName}
                            {isMe && <span className="text-primary ml-1 text-[10px]">(you)</span>}
                          </p>
                          {entry.schoolName && (
                            <p className="text-muted-foreground truncate text-[10px]">
                              {entry.schoolName}
                            </p>
                          )}
                        </div>

                        <div className="text-foreground flex shrink-0 items-center gap-1 text-xs font-bold">
                          {entry.totalReferrals}
                          <ChevronUp className="h-3 w-3 text-green-400" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {!lbLoading && leaderboard.length > 0 && myRank === null && (
                <p className="text-muted-foreground pt-1 text-center text-xs">
                  Refer someone to appear on the leaderboard.
                </p>
              )}
            </motion.div>

            {/* How it works */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="border-border bg-card space-y-3 rounded-xl border p-5"
            >
              <p className="text-foreground flex items-center gap-2 text-sm font-semibold">
                <ExternalLink className="text-primary h-4 w-4" />
                How it works
              </p>
              <ol className="space-y-2.5">
                {[
                  'Share your unique invite link with classmates.',
                  'They visit the link and click "Accept invite".',
                  'When they log in for the first time, you get credited.',
                  'Earn milestone badges as your referral count grows.',
                ].map((step, i) => (
                  <li key={i} className="text-muted-foreground flex items-start gap-2.5 text-xs">
                    <span
                      className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{
                        background: 'color-mix(in oklch, var(--brand) 20%, transparent)',
                        color: 'var(--primary)',
                      }}
                    >
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </motion.div>
          </div>
        </div>
      ) : (
        <div className="text-muted-foreground py-24 text-center text-sm">
          Failed to load referral data.
        </div>
      )}
    </div>
  );
}
