"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  LayoutDashboard,
  CalendarDays,
  UtensilsCrossed,
  Newspaper,
  BookOpen,
  ClipboardList,
  StickyNote,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Bot,
  Timer,
  Menu,
  X,
  UserCircle,
  MessageSquare,
  GitPullRequest,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useUnread } from "@/lib/unread-context";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ChangelogModal } from "@/components/ChangelogModal";

import { Comfortaa } from "next/font/google";

const comfortaa = Comfortaa({ subsets: ["latin"] });

/* -- Nav item config -------------------------------------- */
const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, shortcut: "Alt+1" },
  { href: "/schedule",  label: "Schedule",  icon: CalendarDays,    shortcut: "Alt+2" },
  { href: "/lunch",     label: "Lunch Menu", icon: UtensilsCrossed, shortcut: "Alt+3" },
  { href: "/news",      label: "News",       icon: Newspaper,       shortcut: "Alt+4" },
  { href: "/subjects",  label: "Subjects",   icon: BookOpen,        shortcut: "Alt+5" },
  { href: "/countdown", label: "Countdown",  icon: Timer,           shortcut: "Alt+6" },
] as const;

const BOTTOM_NAV = [
  { href: "/notes",    label: "Notes",    icon: StickyNote,     shortcut: "Alt+N" },
  { href: "/messages", label: "Messages", icon: MessageSquare,  shortcut: "Alt+M" },
  { href: "/feedback", label: "Feedback", icon: GitPullRequest, shortcut: "Alt+F" },
  { href: "/profile",  label: "Profile",  icon: UserCircle,     shortcut: "Alt+P" },
  { href: "/settings", label: "Settings", icon: Settings,       shortcut: "Alt+," },
] as const;

/* -- Keyboard navigation hook ----------------------------- */
function useKeyboardNav(onAiOpen?: () => void, onLogout?: () => void) {
  const router = useRouter();

  const handler = useCallback(
    (e: KeyboardEvent) => {
      // Ignore when typing in an input/textarea/contenteditable
      const tag = (e.target as HTMLElement).tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if ((e.target as HTMLElement).isContentEditable) return;

      if (!e.altKey) return;

      switch (e.key) {
        case "1": e.preventDefault(); router.push("/dashboard"); break;
        case "2": e.preventDefault(); router.push("/schedule");  break;
        case "3": e.preventDefault(); router.push("/lunch");     break;
        case "4": e.preventDefault(); router.push("/news");      break;
        case "5": e.preventDefault(); router.push("/subjects");  break;
        case "6": e.preventDefault(); router.push("/countdown"); break;
        case "n":
        case "N": e.preventDefault(); router.push("/notes");     break;
        case "m":
        case "M": e.preventDefault(); router.push("/messages");  break;
        case "f":
        case "F": e.preventDefault(); router.push("/feedback");  break;
        case "p":
        case "P": e.preventDefault(); router.push("/profile");   break;
        case ",": e.preventDefault(); router.push("/settings");  break;
        case "a":
        case "A": e.preventDefault(); onAiOpen?.();              break;
        case "q":
        case "Q": e.preventDefault(); onLogout?.();              break;
      }
    },
    [router, onAiOpen, onLogout]
  );

  useEffect(() => {
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handler]);
}

/* -- Component -------------------------------------------- */
interface SidebarProps {
  onAiOpen?: () => void;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ onAiOpen, mobileOpen = false, onMobileClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { session, logout } = useAuth();

  // Close mobile drawer on route change
  useEffect(() => {
    onMobileClose?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useKeyboardNav(onAiOpen, logout);

  const initials = session?.name
    ? session.name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : session?.username?.slice(0, 2).toUpperCase() ?? "??";

  const sidebarWidth = collapsed ? 64 : 220;
  const { totalUnread } = useUnread();

  const sidebarContent = (isMobile: boolean) => (
    <>
      {/* Top accent line */}
      <div
        className="absolute top-0 inset-x-0 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, oklch(0.65 0.22 278 / 50%), transparent)",
        }}
      />

      {/* Logo */}
      <div className="flex items-center justify-between border-b border-sidebar-border shrink-0">
        <Link href="/"
          className={cn(
            "flex items-center gap-3 px-3 h-16",
            !isMobile && collapsed && "opacity-0 pointer-events-none"
          )}
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="flex items-center justify-center w-9 h-9 rounded-xl shrink-0"
            style={{
              background: "linear-gradient(135deg, oklch(0.65 0.22 278), oklch(0.55 0.25 295))",
            }}
          >
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </motion.div>
          <AnimatePresence>
            {(isMobile || !collapsed) && (
              <motion.span
                key="label"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className={"text-sm font-bold tracking-tight text-gradient whitespace-nowrap " + comfortaa.className}
              >
                Schoolsoft+
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
        {isMobile && (
          <button
            onClick={onMobileClose}
            className="mr-3 flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map(item => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            Icon={item.icon}
            active={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
            collapsed={!isMobile && collapsed}
            shortcut={item.shortcut}
          />
        ))}

        <Separator className="my-3 bg-sidebar-border" />

        {BOTTOM_NAV.map(item => (
          <NavItem
            key={item.href}
            href={item.href}
            label={item.label}
            Icon={item.icon}
            active={pathname === item.href}
            collapsed={!isMobile && collapsed}
            shortcut={item.shortcut}
            badge={item.href === "/messages" && pathname !== "/messages" ? totalUnread : undefined}
          />
        ))}

        {/* AI button */}
        <NavItem
          href="#"
          label="AI Assistant"
          Icon={Bot}
          active={false}
          collapsed={!isMobile && collapsed}
          onClick={onAiOpen}
          accent
          shortcut="Alt+A"
        />

        {/* What's new */}
        <NavItem
          href="#"
          label="What's new"
          Icon={Megaphone}
          active={false}
          collapsed={!isMobile && collapsed}
          onClick={() => setChangelogOpen(true)}
        />
      </nav>

      {/* User footer */}
      <div className="border-t border-sidebar-border p-2 shrink-0">
        {/* Logout */}
        <NavItem
          href="#"
          label="Sign out"
          Icon={LogOut}
          active={false}
          collapsed={!isMobile && collapsed}
          onClick={logout}
          danger
          shortcut="Alt+Q"
        />

        {/* User info */}
        {(isMobile || !collapsed) && session && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2.5 px-2 py-2 mt-1 rounded-lg cursor-pointer hover:bg-sidebar-accent transition-colors"
            onClick={() => router.push("/profile")}
          >
            <Avatar className="w-7 h-7 shrink-0">
              <AvatarFallback
                className="text-xs font-semibold"
                style={{
                  background: "linear-gradient(135deg, oklch(0.65 0.22 278 / 40%), oklch(0.55 0.25 295 / 40%))",
                  color: "oklch(0.75 0.15 278)",
                }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xs font-medium truncate text-sidebar-foreground">
                {session.name ?? session.username}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{session.school}</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Collapse toggle — desktop only */}
      {!isMobile && (
        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute right-3 top-4 z-20 flex items-center justify-center w-8 h-8 rounded-full border border-sidebar-border bg-sidebar text-muted-foreground hover:text-foreground transition-colors shadow-md"
          style={{ boxShadow: "0 2px 8px oklch(0 0 0 / 30%)" }}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      )}
    </>
  );

  return (
    <>
      {/* Changelog modal */}
      <ChangelogModal open={changelogOpen} onClose={() => setChangelogOpen(false)} />

      {/* ── Desktop sidebar ──────────────────────────────── */}
      <motion.aside
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="relative hidden md:flex flex-col h-full overflow-hidden border-r border-sidebar-border"
        style={{ background: "var(--sidebar)", minWidth: sidebarWidth }}
      >
        {sidebarContent(false)}
      </motion.aside>

      {/* ── Mobile drawer overlay ────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              onClick={onMobileClose}
            />
            {/* Drawer */}
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 left-0 z-50 w-72 flex flex-col overflow-hidden border-r border-sidebar-border md:hidden"
              style={{ background: "var(--sidebar)" }}
            >
              {sidebarContent(true)}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* -- Nav item ---------------------------------------------- */
interface NavItemProps {
  href: string;
  label: string;
  Icon: React.ElementType;
  active: boolean;
  collapsed: boolean;
  onClick?: () => void;
  accent?: boolean;
  danger?: boolean;
  shortcut?: string;
  badge?: number;
}

function NavItem({ href, label, Icon, active, collapsed, onClick, accent, danger, shortcut, badge }: NavItemProps) {
  const content = (
    <motion.div
      whileHover={{ x: collapsed ? 0 : 2 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm cursor-pointer transition-colors select-none",
        collapsed && "justify-center px-0 w-10 h-10 mx-auto",
        active
          ? "bg-white/8 text-foreground font-medium"
          : danger
          ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
          : accent
          ? "text-muted-foreground hover:text-primary hover:bg-brand-dim"
          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
      )}
      style={
        active
          ? { boxShadow: "inset 2px 0 0 oklch(0.65 0.22 278)" }
          : undefined
      }
    >
      <Icon
        className={cn(
          "shrink-0",
          collapsed ? "w-5 h-5" : "w-4 h-4",
          active && "text-primary",
          accent && "text-primary"
        )}
      />
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden whitespace-nowrap flex-1 flex items-center justify-between gap-2"
          >
            {label}
            <span className="flex items-center gap-1.5">
              {badge != null && badge > 0 && (
                <span
                  className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[9px] font-bold text-white"
                  style={{ background: "oklch(0.65 0.22 278)" }}
                >
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
              {shortcut && (
                <span className="text-[9px] font-mono tracking-tight opacity-40 shrink-0">
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
      <Link href={href} className="block">
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
              <span
                className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white pointer-events-none"
                style={{ background: "oklch(0.65 0.22 278)" }}
              >
                {badge > 9 ? "9+" : badge}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="text-xs flex items-center gap-2">
          {label}
          {shortcut && (
            <span className="font-mono text-[10px] opacity-60">{shortcut}</span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return wrapped;
}
