"use client";

import { motion, AnimatePresence, LayoutGroup, MotionConfig } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  UtensilsCrossed,
  Newspaper,
  BookOpen,
  StickyNote,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bot,
  Timer,
  X,
  UserCircle,
  MessageSquare,
  GitPullRequest,
  Megaphone,
  Users,
  GraduationCap,
  Layers,
  Gift,
  Trophy,
  Search,
} from "lucide-react";
import { Comfortaa } from "next/font/google";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChangelogModal } from "@/components/ChangelogModal";
import { triggerCommandPalette } from "@/components/command-palette";

const comfortaa = Comfortaa({ subsets: ["latin"] });

const spring = { type: "spring", stiffness: 420, damping: 34, mass: 0.7 } as const;
const widthSpring = { type: "spring", stiffness: 260, damping: 30 } as const;

const NAV_ITEMS = [
  { href: "/dashboard",    label: "Dashboard",     icon: LayoutDashboard, shortcut: "Alt+1" },
  { href: "/schedule",     label: "Schedule",      icon: CalendarDays,    shortcut: "Alt+2" },
  { href: "/lunch",        label: "Lunch Menu",    icon: UtensilsCrossed, shortcut: "Alt+3" },
  { href: "/news",         label: "News",          icon: Newspaper,       shortcut: "Alt+4" },
  { href: "/subjects",     label: "Subjects",      icon: BookOpen,        shortcut: "Alt+5" },
  { href: "/countdown",    label: "Countdown",     icon: Timer,           shortcut: "Alt+6" },
  { href: "/class",        label: "Class & Staff", icon: GraduationCap,   shortcut: "Alt+7" },
  { href: "/final-grades", label: "Final Grades",  icon: Trophy,          shortcut: "Alt+8" },
] as const;

const BOTTOM_NAV = [
  { href: "/notes",      label: "Notes",      icon: StickyNote,     shortcut: "Alt+N" },
  { href: "/flashcards", label: "Flashcards", icon: Layers,         shortcut: "Alt+K" },
  { href: "/messages",   label: "Messages",   icon: MessageSquare,  shortcut: "Alt+M" },
  { href: "/people",     label: "People",     icon: Users,          shortcut: "Alt+U" },
  { href: "/referrals",  label: "Referrals",  icon: Gift,           shortcut: "Alt+R" },
  { href: "/profile",    label: "Profile",    icon: UserCircle,     shortcut: "Alt+P" },
  { href: "/settings",   label: "Settings",   icon: Settings,       shortcut: "Alt+," },
  { href: "/feedback",   label: "Feedback",   icon: GitPullRequest, shortcut: "Alt+F" },
] as const;

const SHORTCUT_ROUTES: Record<string, string> = {
  "1": "/dashboard",
  "2": "/schedule",
  "3": "/lunch",
  "4": "/news",
  "5": "/subjects",
  "6": "/countdown",
  "7": "/class",
  "8": "/final-grades",
  n: "/notes",
  k: "/flashcards",
  m: "/messages",
  u: "/people",
  r: "/referrals",
  p: "/profile",
  ",": "/settings",
  f: "/feedback",
};

function useKeyboardNav(onAiOpen?: () => void, onLogout?: () => void) {
  const router = useRouter();

  const handler = useCallback(
    (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      if (target.isContentEditable) return;
      if (!e.altKey) return;

      const key = e.key.toLowerCase();
      const route = SHORTCUT_ROUTES[key];

      if (route) {
        e.preventDefault();
        router.push(route);
      } else if (key === "a") {
        e.preventDefault();
        onAiOpen?.();
      } else if (key === "q") {
        e.preventDefault();
        onLogout?.();
      }
    },
    [router, onAiOpen, onLogout]
  );

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}

interface SidebarProps {
  onAiOpen?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ onAiOpen, mobileOpen = false, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout } = useAuth();

  useEffect(() => {
    onMobileClose?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useKeyboardNav(onAiOpen, logout);

  const initials = session?.name
    ? session.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : session?.username?.slice(0, 2).toUpperCase() ?? "??";

  const sidebarWidth = collapsed ? 68 : 232;

  const sidebarContent = (isMobile: boolean) => {
    const isCollapsed = !isMobile && collapsed;

    return (
      <>
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, color-mix(in oklch, var(--brand) 55%, transparent), transparent)",
          }}
        />

        <div
          className={cn(
            "flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-3",
            isCollapsed && "justify-center px-0"
          )}
        >
          <Link href="/" className="flex min-w-0 items-center gap-2.5">
            <motion.div
              whileHover={{ scale: 1.08, rotate: -4 }}
              whileTap={{ scale: 0.95 }}
              transition={spring}
              className="grid size-9 shrink-0 place-items-center"
            >
              <Image src="/logo.png" alt="SchoolSoft+ Logo" className="size-6" width={32} height={32} />
            </motion.div>
            <AnimatePresence initial={false}>
              {!isCollapsed && (
                <motion.span
                  key="wordmark"
                  className={cn(
                    "text-gradient whitespace-nowrap pt-1 text-base font-bold tracking-tight",
                    comfortaa.className
                  )}
                >
                  Schoolsoft+
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
          {isMobile && (
            <button
              onClick={onMobileClose}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
              aria-label="Close menu"
            >
              <X className="size-4" />
            </button>
          )}
        </div>

        <nav
          className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-3 pt-2"
          onMouseLeave={() => setHovered(null)}
        >
          <LayoutGroup id={isMobile ? "sidebar-mobile" : "sidebar-desktop"}>
            {/* Quick Search / Command Palette Trigger */}
            <div className="mb-2">
              {isCollapsed ? (
                <div className="flex justify-center">
                  <Tooltip delayDuration={200}>
                    <TooltipTrigger asChild>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => triggerCommandPalette()}
                        className="grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-foreground transition-colors"
                        aria-label="Quick jump (⌘K)"
                      >
                        <Search className="size-4" />
                      </motion.button>
                    </TooltipTrigger>
                    <TooltipContent side="right" sideOffset={8} className="flex items-center gap-2">
                      <span>Quick Jump</span>
                      <kbd className="rounded border border-border/60 bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                        ⌘K
                      </kbd>
                    </TooltipContent>
                  </Tooltip>
                </div>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => triggerCommandPalette()}
                  className="flex w-full items-center justify-between rounded-lg border border-sidebar-border/70 bg-sidebar-accent/35 px-2.5 py-2 text-xs text-muted-foreground transition-all duration-150 hover:border-sidebar-border hover:bg-sidebar-accent/75 hover:text-foreground group"
                  aria-label="Quick search and command palette"
                >
                  <span className="flex items-center gap-2">
                    <Search className="size-3.5 text-muted-foreground/70 group-hover:text-foreground transition-colors" />
                    <span className="font-normal">Quick jump...</span>
                  </span>
                  <kbd className="inline-flex items-center gap-0.5 rounded border border-sidebar-border/80 bg-sidebar px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground/90 shadow-2xs">
                    ⌘K
                  </kbd>
                </motion.button>
              )}
            </div>
            <SectionLabel collapsed={isCollapsed} first>Menu</SectionLabel>
            <div className="space-y-0.5">
              {NAV_ITEMS.map(item => (
                <NavItem
                  key={item.href}
                  id={item.href}
                  href={item.href}
                  label={item.label}
                  Icon={item.icon}
                  active={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
                  collapsed={isCollapsed}
                  shortcut={item.shortcut}
                  hovered={hovered}
                  onHover={setHovered}
                />
              ))}
            </div>

            <SectionLabel collapsed={isCollapsed}>More</SectionLabel>
            <div className="space-y-0.5">
              {BOTTOM_NAV.map(item => (
                <NavItem
                  key={item.href}
                  id={item.href}
                  href={item.href}
                  label={item.label}
                  Icon={item.icon}
                  active={pathname === item.href}
                  collapsed={isCollapsed}
                  shortcut={item.shortcut}
                  hovered={hovered}
                  onHover={setHovered}
                />
              ))}
              <NavItem
                id="ai"
                href="#"
                label="AI Assistant"
                Icon={Bot}
                active={false}
                collapsed={isCollapsed}
                onClick={onAiOpen}
                accent
                shortcut="Alt+A"
                hovered={hovered}
                onHover={setHovered}
              />
              <NavItem
                id="changelog"
                href="#"
                label="What's new"
                Icon={Megaphone}
                active={false}
                collapsed={isCollapsed}
                onClick={() => setChangelogOpen(true)}
                hovered={hovered}
                onHover={setHovered}
              />
            </div>
          </LayoutGroup>
        </nav>

        <div className="shrink-0 space-y-0.5 border-t border-sidebar-border p-2">
          {session && (
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/profile")}
              className={cn(
                "mb-1 flex w-full items-center gap-2.5 rounded-xl border border-sidebar-border bg-overlay p-2 text-left transition-colors hover:bg-overlay-hover",
                isCollapsed && "mx-auto size-10 justify-center border-transparent bg-transparent p-0"
              )}
            >
              <Avatar className="size-8 shrink-0 ring-1 ring-brand/30">
                <AvatarFallback className="bg-brand-soft text-xs font-semibold text-brand-strong">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-sidebar-foreground">
                    {session.name ?? session.username}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">{session.school}</p>
                </div>
              )}
            </motion.button>
          )}

          <NavItem
            id="logout"
            href="#"
            label="Sign out"
            Icon={LogOut}
            active={false}
            collapsed={isCollapsed}
            onClick={logout}
            danger
            shortcut="Alt+Q"
            hovered={hovered}
            onHover={setHovered}
          />

          {!isMobile && (
            <NavItem
              id="collapse"
              href="#"
              label={collapsed ? "Expand" : "Collapse"}
              Icon={collapsed ? ChevronRight : ChevronLeft}
              active={false}
              collapsed={isCollapsed}
              onClick={() => setCollapsed(c => !c)}
              hovered={hovered}
              onHover={setHovered}
            />
          )}
        </div>
      </>
    );
  };

  return (
    <MotionConfig reducedMotion="user">
      <ChangelogModal open={changelogOpen} onClose={() => setChangelogOpen(false)} />

      <motion.aside
        initial={false}
        animate={{ width: sidebarWidth }}
        transition={widthSpring}
        className="relative hidden h-full shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar md:flex"
      >
        {sidebarContent(false)}
      </motion.aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={onMobileClose}
            />
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar md:hidden"
            >
              {sidebarContent(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </MotionConfig>
  );
}

function SectionLabel({
  children,
  collapsed,
  first,
}: {
  children: React.ReactNode;
  collapsed: boolean;
  first?: boolean;
}) {
  if (collapsed) {
    return <div className={cn("mx-auto h-px w-6 bg-sidebar-border", first ? "mb-2 mt-1" : "my-3")} />;
  }
  return (
    <div
      className={cn(
        "px-2.5 pb-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70",
        first ? "pt-2" : "pt-5"
      )}
    >
      {children}
    </div>
  );
}

interface NavItemProps {
  id: string;
  href: string;
  label: string;
  Icon: React.ElementType;
  active: boolean;
  collapsed: boolean;
  hovered: string | null;
  onHover: (id: string | null) => void;
  onClick?: () => void;
  accent?: boolean;
  danger?: boolean;
  shortcut?: string;
  badge?: number;
}

function NavItem({
  id,
  href,
  label,
  Icon,
  active,
  collapsed,
  hovered,
  onHover,
  onClick,
  accent,
  danger,
  shortcut,
  badge,
}: NavItemProps) {
  const content = (
    <motion.div
      onClick={onClick}
      onHoverStart={() => onHover(id)}
      whileTap={{ scale: 0.97 }}
      transition={spring}
      className={cn(
        "group relative flex cursor-pointer select-none items-center gap-3 rounded-lg px-2.5 py-2 text-sm transition-colors duration-200",
        collapsed && "mx-auto size-10 justify-center px-0 py-0",
        active
          ? "font-medium text-foreground"
          : danger
          ? "text-muted-foreground hover:text-destructive"
          : accent
          ? "text-muted-foreground hover:text-foreground"
          : "text-sidebar-foreground/70 hover:text-sidebar-foreground"
      )}
    >
      <AnimatePresence initial={false}>
        {hovered === id && !active && (
          <motion.span
            key="hover"
            layoutId="sidebar-hover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={spring}
            className={cn(
              "absolute inset-0 rounded-lg",
              danger ? "bg-destructive/10" : "bg-overlay-hover"
            )}
          />
        )}
      </AnimatePresence>

      {active && (
        <>
          <motion.span
            layoutId="sidebar-active-bg"
            transition={spring}
            className="absolute inset-0 rounded-lg bg-brand-dim ring-1 ring-inset ring-brand/15"
          />
          <motion.span
            layoutId="sidebar-active-bar"
            transition={spring}
            className="absolute inset-y-2.5 left-0 w-[3px] rounded-r-full bg-brand"
          />
        </>
      )}

      <Icon
        className={cn(
          "relative z-10 shrink-0 transition-colors duration-200",
          collapsed ? "size-5" : "size-4",
          (active || accent) && "text-brand-strong"
        )}
      />

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.span
            key="label"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -6 }}
            transition={{ duration: 0.18 }}
            className="relative z-10 flex flex-1 items-center justify-between gap-2 whitespace-nowrap"
          >
            {label}
            <span className="flex items-center gap-1.5">
              {badge != null && badge > 0 && (
                <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-brand-foreground">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
              {shortcut && (
                <span className="hidden rounded border border-border px-1 py-px font-mono text-[9px] tracking-tight text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100 md:inline">
                  {shortcut}
                </span>
              )}
            </span>
          </motion.span>
        )}
      </AnimatePresence>
    </motion.div>
  );

  const wrapped =
    href === "#" ? (
      content
    ) : (
      <Link href={href} className="block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {content}
      </Link>
    );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="relative">
            {wrapped}
            {badge != null && badge > 0 && (
              <span className="pointer-events-none absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-brand text-[8px] font-bold text-brand-foreground">
                {badge > 9 ? "9+" : badge}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2 text-xs">
          {label}
          {shortcut && <span className="font-mono text-[10px] opacity-80">{shortcut}</span>}
        </TooltipContent>
      </Tooltip>
    );
  }

  return wrapped;
}