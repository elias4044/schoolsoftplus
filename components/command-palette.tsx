'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BarChart3,
  BookOpen,
  Bot,
  CalendarDays,
  Check,
  ChevronRight,
  Code2,
  Copy,
  FileText,
  Gift,
  GitPullRequest,
  GraduationCap,
  Layers,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MessageSquare,
  Newspaper,
  Palette,
  Plus,
  Printer,
  Search,
  Send,
  Settings,
  Sliders,
  Sparkles,
  StickyNote,
  Timer,
  Trophy,
  UserCircle,
  Users,
  UtensilsCrossed,
} from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { useNotificationCenter } from '@/lib/notification-context';
import { THEMES, useAppTheme, type AccentColor, type AppTheme } from '@/lib/theme-context';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';

export const COMMAND_PALETTE_EVENT = 'ssp:open-command-palette';

export function triggerCommandPalette() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_EVENT));
  }
}

interface CommandPaletteProps {
  onAiOpen?: () => void;
  onChangelogOpen?: () => void;
}

const ACCENT_OPTIONS: { id: AccentColor; label: string; color: string }[] = [
  { id: 'violet', label: 'Violet', color: '#a855f7' },
  { id: 'blue', label: 'Blue', color: '#3b82f6' },
  { id: 'sky', label: 'Sky', color: '#0284c7' },
  { id: 'emerald', label: 'Emerald', color: '#10b981' },
  { id: 'lime', label: 'Lime', color: '#84cc16' },
  { id: 'amber', label: 'Amber', color: '#f59e0b' },
  { id: 'orange', label: 'Orange', color: '#f97316' },
  { id: 'red', label: 'Red', color: '#ef4444' },
  { id: 'pink', label: 'Pink', color: '#ec4899' },
];

export function CommandPalette({ onAiOpen, onChangelogOpen }: CommandPaletteProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [subView, setSubView] = React.useState<'main' | 'themes' | 'accents'>('main');
  const router = useRouter();
  const { session, logout } = useAuth();
  const { theme, accent, setTheme, setAccent } = useAppTheme();
  const notificationCenter = useNotificationCenter();

  // Reset subview when dialog closes
  React.useEffect(() => {
    if (!open) {
      setSubView('main');
      setSearch('');
    }
  }, [open]);

  // Global keyboard shortcut: Cmd+K / Ctrl+K and '/' outside of inputs
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) || target.isContentEditable);

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      if (e.key === '/' && !isInput && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
        return;
      }

      // Handle backspace navigation in subviews if search is empty
      if (e.key === 'Backspace' && search === '' && subView !== 'main') {
        e.preventDefault();
        setSubView('main');
      }
    };

    const handleCustomOpen = () => setOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener(COMMAND_PALETTE_EVENT, handleCustomOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener(COMMAND_PALETTE_EVENT, handleCustomOpen);
    };
  }, [search, subView]);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    // Slight tick to let dialog close smoothly before triggering navigation
    setTimeout(() => {
      command();
    }, 10);
  }, []);

  const handleCopyLink = React.useCallback(() => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      notificationCenter.success('Link copied', 'Current page URL copied to clipboard.');
    }
  }, [notificationCenter]);

  const handleCopyReferral = React.useCallback(() => {
    if (typeof window !== 'undefined') {
      const refCode = session?.username ?? '';
      const url = `${window.location.origin}/join?ref=${refCode}`;
      navigator.clipboard.writeText(url);
      notificationCenter.success('Referral link copied', 'Share with classmates to earn points!');
    }
  }, [session?.username, notificationCenter]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div className="relative flex items-center">
        {subView !== 'main' && (
          <button
            onClick={() => {
              setSubView('main');
              setSearch('');
            }}
            className="text-muted-foreground hover:bg-muted hover:text-foreground ml-3.5 flex items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium transition-colors"
            title="Back to all commands"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span className="capitalize">{subView}</span>
          </button>
        )}
        <CommandInput
          value={search}
          onValueChange={setSearch}
          placeholder={
            subView === 'themes'
              ? 'Search theme presets (e.g. Midnight, Ocean, Plum)...'
              : subView === 'accents'
                ? 'Search accent colors (e.g. Violet, Sky, Emerald)...'
                : 'Type a command or search pages, actions, themes...'
          }
          className="pr-12"
          wrapperClassName="flex-1"
        />
        <div className="pointer-events-none absolute top-1/2 right-3.5 flex -translate-y-1/2 items-center gap-1.5 select-none">
          <kbd className="border-border/60 bg-muted/60 text-muted-foreground hidden h-5 items-center rounded border px-1.5 font-mono text-[10px] font-medium sm:inline-flex">
            ESC
          </kbd>
        </div>
      </div>

      <CommandList>
        <CommandEmpty>
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Search className="text-muted-foreground/40 mb-2 h-8 w-8 stroke-[1.5]" />
            <p className="text-foreground text-sm font-medium">No matching results found</p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              Try searching for &quot;Schedule&quot;, &quot;Lunch&quot;, &quot;AI&quot;, or
              &quot;Theme&quot;
            </p>
          </div>
        </CommandEmpty>

        {/*  THEMES SUBVIEW  */}
        {subView === 'themes' && (
          <CommandGroup heading="Select Theme Preset">
            {THEMES.map((t) => {
              const isCurrent = theme === t.id;
              return (
                <CommandItem
                  key={t.id}
                  value={`theme ${t.label} ${t.id}`}
                  onSelect={() => {
                    setTheme(t.id);
                    notificationCenter.success(`Theme updated`, `Theme changed to ${t.label}.`);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="border-border/60 size-4 shrink-0 rounded-full border shadow-sm"
                      style={{ background: t.bg }}
                    />
                    <span className="font-medium">{t.label}</span>
                  </div>
                  {isCurrent && (
                    <span className="text-brand flex items-center gap-1 text-xs font-medium">
                      Active
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/*  ACCENTS SUBVIEW  */}
        {subView === 'accents' && (
          <CommandGroup heading="Select Accent Color">
            {ACCENT_OPTIONS.map((a) => {
              const isCurrent = accent === a.id;
              return (
                <CommandItem
                  key={a.id}
                  value={`accent ${a.label} ${a.id}`}
                  onSelect={() => {
                    setAccent(a.id);
                    notificationCenter.success(`Accent color updated`, `Accent set to ${a.label}.`);
                    setOpen(false);
                  }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="border-border/40 size-4 shrink-0 rounded-full border shadow-sm"
                      style={{ background: a.color }}
                    />
                    <span className="font-medium">{a.label}</span>
                  </div>
                  {isCurrent && (
                    <span className="text-brand flex items-center gap-1 text-xs font-medium">
                      Active
                      <Check className="h-3.5 w-3.5" />
                    </span>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {/*  MAIN VIEW  */}
        {subView === 'main' && (
          <>
            {/* Universal Page Navigation */}
            <CommandGroup heading="Navigation">
              <CommandItem
                value="dashboard home overview widgets"
                onSelect={() => runCommand(() => router.push('/dashboard'))}
              >
                <div className="bg-muted/70 text-foreground flex size-7 items-center justify-center rounded-lg">
                  <LayoutDashboard className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Dashboard</span>
                  <span className="text-muted-foreground text-xs">
                    Overview, timetable preview & widgets
                  </span>
                </div>
                <CommandShortcut>Alt+1</CommandShortcut>
              </CommandItem>

              <CommandItem
                value="schedule timetable classes lessons calendar"
                onSelect={() => runCommand(() => router.push('/schedule'))}
              >
                <div className="bg-muted/70 text-foreground flex size-7 items-center justify-center rounded-lg">
                  <CalendarDays className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Schedule</span>
                  <span className="text-muted-foreground text-xs">
                    Weekly lessons, rooms and teacher times
                  </span>
                </div>
                <CommandShortcut>Alt+2</CommandShortcut>
              </CommandItem>

              <CommandItem
                value="lunch menu food meals cafeteria"
                onSelect={() => runCommand(() => router.push('/lunch'))}
              >
                <div className="bg-muted/70 text-foreground flex size-7 items-center justify-center rounded-lg">
                  <UtensilsCrossed className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Lunch Menu</span>
                  <span className="text-muted-foreground text-xs">
                    Today and weekly school lunch menu
                  </span>
                </div>
                <CommandShortcut>Alt+3</CommandShortcut>
              </CommandItem>

              <CommandItem
                value="news announcements bulletins posts"
                onSelect={() => runCommand(() => router.push('/news'))}
              >
                <div className="bg-muted/70 text-foreground flex size-7 items-center justify-center rounded-lg">
                  <Newspaper className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">News & Bulletins</span>
                  <span className="text-muted-foreground text-xs">
                    School updates and attachments
                  </span>
                </div>
                <CommandShortcut>Alt+4</CommandShortcut>
              </CommandItem>

              <CommandItem
                value="subjects courses results assignments tests"
                onSelect={() => runCommand(() => router.push('/subjects'))}
              >
                <div className="bg-muted/70 text-foreground flex size-7 items-center justify-center rounded-lg">
                  <BookOpen className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Subjects & Courses</span>
                  <span className="text-muted-foreground text-xs">
                    Grades, assignment criteria and results
                  </span>
                </div>
                <CommandShortcut>Alt+5</CommandShortcut>
              </CommandItem>

              <CommandItem
                value="countdown breaks holidays exams vacation summer"
                onSelect={() => runCommand(() => router.push('/countdown'))}
              >
                <div className="bg-muted/70 text-foreground flex size-7 items-center justify-center rounded-lg">
                  <Timer className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Countdown</span>
                  <span className="text-muted-foreground text-xs">
                    Break, holiday and graduation timers
                  </span>
                </div>
                <CommandShortcut>Alt+6</CommandShortcut>
              </CommandItem>

              <CommandItem
                value="class staff classmates mentors teachers directory"
                onSelect={() => runCommand(() => router.push('/class'))}
              >
                <div className="bg-muted/70 text-foreground flex size-7 items-center justify-center rounded-lg">
                  <GraduationCap className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Class & Staff</span>
                  <span className="text-muted-foreground text-xs">
                    Classmates list, mentors and educators
                  </span>
                </div>
                <CommandShortcut>Alt+7</CommandShortcut>
              </CommandItem>

              <CommandItem
                value="final grades betyg merit points statistics predictions"
                onSelect={() => runCommand(() => router.push('/final-grades'))}
              >
                <div className="bg-muted/70 text-foreground flex size-7 items-center justify-center rounded-lg">
                  <Trophy className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Final Grades</span>
                  <span className="text-muted-foreground text-xs">
                    Merit points calculator & grade tracker
                  </span>
                </div>
                <CommandShortcut>Alt+8</CommandShortcut>
              </CommandItem>

              <CommandItem
                value="notes editor notebook study memos"
                onSelect={() => runCommand(() => router.push('/notes'))}
              >
                <div className="bg-muted/70 text-foreground flex size-7 items-center justify-center rounded-lg">
                  <StickyNote className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Notes</span>
                  <span className="text-muted-foreground text-xs">
                    Personal notes and markdown editor
                  </span>
                </div>
                <CommandShortcut>Alt+N</CommandShortcut>
              </CommandItem>

              <CommandItem
                value="flashcards study review spaced repetition quiz"
                onSelect={() => runCommand(() => router.push('/flashcards'))}
              >
                <div className="bg-muted/70 text-foreground flex size-7 items-center justify-center rounded-lg">
                  <Layers className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Flashcards</span>
                  <span className="text-muted-foreground text-xs">Interactive revision decks</span>
                </div>
                <CommandShortcut>Alt+K</CommandShortcut>
              </CommandItem>

              <CommandItem
                value="messages inbox conversations mail"
                onSelect={() => runCommand(() => router.push('/messages'))}
              >
                <div className="bg-muted/70 text-foreground flex size-7 items-center justify-center rounded-lg">
                  <MessageSquare className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Messages</span>
                  <span className="text-muted-foreground text-xs">
                    SchoolSoft communications inbox
                  </span>
                </div>
                <CommandShortcut>Alt+M</CommandShortcut>
              </CommandItem>

              <CommandItem
                value="people user search students directory"
                onSelect={() => runCommand(() => router.push('/people'))}
              >
                <div className="bg-muted/70 text-foreground flex size-7 items-center justify-center rounded-lg">
                  <Users className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">People</span>
                  <span className="text-muted-foreground text-xs">Search students and faculty</span>
                </div>
                <CommandShortcut>Alt+U</CommandShortcut>
              </CommandItem>

              <CommandItem
                value="referrals rewards points invite leaderboard"
                onSelect={() => runCommand(() => router.push('/referrals'))}
              >
                <div className="bg-muted/70 text-foreground flex size-7 items-center justify-center rounded-lg">
                  <Gift className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Referrals</span>
                  <span className="text-muted-foreground text-xs">
                    Invites, leaderboard and perks
                  </span>
                </div>
                <CommandShortcut>Alt+R</CommandShortcut>
              </CommandItem>

              <CommandItem
                value="profile account user passkeys security"
                onSelect={() => runCommand(() => router.push('/profile'))}
              >
                <div className="bg-muted/70 text-foreground flex size-7 items-center justify-center rounded-lg">
                  <UserCircle className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Profile</span>
                  <span className="text-muted-foreground text-xs">
                    Account info, school info and passkeys
                  </span>
                </div>
                <CommandShortcut>Alt+P</CommandShortcut>
              </CommandItem>

              <CommandItem
                value="settings preferences appearance options themes"
                onSelect={() => runCommand(() => router.push('/settings'))}
              >
                <div className="bg-muted/70 text-foreground flex size-7 items-center justify-center rounded-lg">
                  <Settings className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Settings</span>
                  <span className="text-muted-foreground text-xs">
                    App preferences, theme and account
                  </span>
                </div>
                <CommandShortcut>Alt+,</CommandShortcut>
              </CommandItem>

              <CommandItem
                value="feedback bugs report issues suggest features"
                onSelect={() => runCommand(() => router.push('/feedback'))}
              >
                <div className="bg-muted/70 text-foreground flex size-7 items-center justify-center rounded-lg">
                  <GitPullRequest className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Feedback</span>
                  <span className="text-muted-foreground text-xs">
                    Submit feedback or report an issue
                  </span>
                </div>
                <CommandShortcut>Alt+F</CommandShortcut>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            {/* Quick Actions */}
            <CommandGroup heading="Quick Actions">
              <CommandItem
                value="ai assistant chat ask help bot"
                onSelect={() => runCommand(() => onAiOpen?.())}
              >
                <div className="bg-brand-soft text-brand flex size-7 items-center justify-center rounded-lg">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Ask AI Assistant</span>
                  <span className="text-muted-foreground text-xs">
                    Get homework help, summarize news & notes
                  </span>
                </div>
                <CommandShortcut>Alt+A</CommandShortcut>
              </CommandItem>

              <CommandItem
                value="new note create write memo"
                onSelect={() => runCommand(() => router.push('/notes?new=true'))}
              >
                <div className="bg-muted/80 text-foreground flex size-7 items-center justify-center rounded-lg">
                  <Plus className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Create New Note</span>
                  <span className="text-muted-foreground text-xs">Draft a personal study note</span>
                </div>
              </CommandItem>

              <CommandItem
                value="compose message send chat teacher student"
                onSelect={() => runCommand(() => router.push('/messages?compose=true'))}
              >
                <div className="bg-muted/80 text-foreground flex size-7 items-center justify-center rounded-lg">
                  <Send className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Compose Message</span>
                  <span className="text-muted-foreground text-xs">
                    Send a direct message or reply
                  </span>
                </div>
              </CommandItem>

              <CommandItem
                value="print schedule export pdf timetable"
                onSelect={() => runCommand(() => router.push('/schedule?print=true'))}
              >
                <div className="bg-muted/80 text-foreground flex size-7 items-center justify-center rounded-lg">
                  <Printer className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Print Schedule</span>
                  <span className="text-muted-foreground text-xs">
                    Clean printable or PDF export
                  </span>
                </div>
              </CommandItem>

              <CommandItem
                value="copy page link url share"
                onSelect={() => runCommand(handleCopyLink)}
              >
                <div className="bg-muted/80 text-foreground flex size-7 items-center justify-center rounded-lg">
                  <Copy className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Copy Page Link</span>
                  <span className="text-muted-foreground text-xs">
                    Copy current URL to clipboard
                  </span>
                </div>
              </CommandItem>

              <CommandItem
                value="copy referral link invite classmates share code"
                onSelect={() => runCommand(handleCopyReferral)}
              >
                <div className="bg-muted/80 text-foreground flex size-7 items-center justify-center rounded-lg">
                  <Gift className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Copy Referral Link</span>
                  <span className="text-muted-foreground text-xs">
                    Invite friends and earn rewards
                  </span>
                </div>
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />
            {/* Appearance & Themes */}
            <CommandGroup heading="Appearance">
              <CommandItem
                value="change switch theme colors midnight abyss dim ocean slate"
                onSelect={() => {
                  setSubView('themes');
                  setSearch('');
                }}
              >
                <div className="bg-muted/70 text-foreground flex size-7 items-center justify-center rounded-lg">
                  <Palette className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Switch Theme Preset...</span>
                  <span className="text-muted-foreground text-xs">
                    Current: <span className="text-foreground font-medium capitalize">{theme}</span>
                  </span>
                </div>
                <ChevronRight className="text-muted-foreground/60 ml-auto h-4 w-4" />
              </CommandItem>

              <CommandItem
                value="change accent color violet emerald blue orange amber"
                onSelect={() => {
                  setSubView('accents');
                  setSearch('');
                }}
              >
                <div className="bg-muted/70 text-foreground flex size-7 items-center justify-center rounded-lg">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Switch Accent Color...</span>
                  <span className="text-muted-foreground text-xs">
                    Current:{' '}
                    <span className="text-foreground font-medium capitalize">{accent}</span>
                  </span>
                </div>
                <ChevronRight className="text-muted-foreground/60 ml-auto h-4 w-4" />
              </CommandItem>
            </CommandGroup>

            <CommandSeparator />

            {/* General & About */}
            <CommandGroup heading="About & Community">
              <CommandItem
                value="changelog release notes what is new updates"
                onSelect={() =>
                  runCommand(() => {
                    if (onChangelogOpen) {
                      onChangelogOpen();
                    } else {
                      router.push('/changelog');
                    }
                  })
                }
              >
                <div className="bg-muted/70 text-foreground flex size-7 items-center justify-center rounded-lg">
                  <Megaphone className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">What&apos;s New (Changelog)</span>
                  <span className="text-muted-foreground text-xs">
                    Recent changes and version history
                  </span>
                </div>
              </CommandItem>

              <CommandItem
                value="stats platform telemetry usage"
                onSelect={() => runCommand(() => router.push('/stats'))}
              >
                <div className="bg-muted/70 text-foreground flex size-7 items-center justify-center rounded-lg">
                  <BarChart3 className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Platform Statistics</span>
                  <span className="text-muted-foreground text-xs">
                    Live SchoolSoft+ usage metrics
                  </span>
                </div>
              </CommandItem>

              <CommandItem
                value="open source github code repo contribute"
                onSelect={() => runCommand(() => router.push('/open-source'))}
              >
                <div className="bg-muted/70 text-foreground flex size-7 items-center justify-center rounded-lg">
                  <Code2 className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Open Source</span>
                  <span className="text-muted-foreground text-xs">
                    Source code repository & contributions
                  </span>
                </div>
              </CommandItem>

              <CommandItem
                value="terms privacy policy legal"
                onSelect={() => runCommand(() => router.push('/terms'))}
              >
                <div className="bg-muted/70 text-foreground flex size-7 items-center justify-center rounded-lg">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Terms & Privacy</span>
                  <span className="text-muted-foreground text-xs">
                    Terms of service and privacy statement
                  </span>
                </div>
              </CommandItem>

              <CommandItem
                value="sign out logout disconnect account"
                onSelect={() => runCommand(() => logout())}
                className="text-destructive data-[selected=true]:text-destructive"
              >
                <div className="bg-destructive/10 text-destructive flex size-7 items-center justify-center rounded-lg">
                  <LogOut className="h-4 w-4" />
                </div>
                <div className="flex flex-col">
                  <span className="font-medium">Sign Out</span>
                  <span className="text-muted-foreground text-xs">
                    Exit current SchoolSoft+ session
                  </span>
                </div>
                <CommandShortcut>Alt+Q</CommandShortcut>
              </CommandItem>
            </CommandGroup>
          </>
        )}
      </CommandList>

      {/*  APPLE / SPOTLIGHT STYLE FOOTER  */}
      <div className="border-border/40 bg-muted/20 text-muted-foreground flex items-center justify-between border-t px-3.5 py-2 text-[11px] select-none">
        <div className="flex items-center gap-2">
          <span className="text-foreground/80 font-semibold">SchoolSoft+</span>
          <span className="text-muted-foreground/50">·</span>
          <span>Quick Navigation</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="border-border/60 bg-muted/60 rounded border px-1 py-0.5 font-mono text-[9px]">
              ↑↓
            </kbd>
            <span>Navigate</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="border-border/60 bg-muted/60 rounded border px-1 py-0.5 font-mono text-[9px]">
              ↵
            </kbd>
            <span>Select</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="border-border/60 bg-muted/60 rounded border px-1 py-0.5 font-mono text-[9px]">
              esc
            </kbd>
            <span>Close</span>
          </span>
        </div>
      </div>
    </CommandDialog>
  );
}
