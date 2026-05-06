"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  X,
  CheckCheck,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationCenter, type AppNotification, type NotifType } from "@/lib/notification-context";
import { Button } from "@/components/ui/button";

/* ── Helpers ─────────────────────────────────────────────────── */
function notifIcon(type: NotifType) {
  switch (type) {
    case "success": return <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />;
    case "error":   return <AlertCircle  className="w-4 h-4 text-red-400   shrink-0" />;
    case "warning": return <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />;
    case "message": return <MessageSquare className="w-4 h-4 shrink-0" style={{ color: "oklch(0.65 0.22 278)" }} />;
    default:        return <Info          className="w-4 h-4 text-blue-400  shrink-0" />;
  }
}

function notifBorderColor(type: NotifType): string {
  switch (type) {
    case "success": return "oklch(0.62 0.19 145 / 35%)";
    case "error":   return "oklch(0.60 0.22 25  / 35%)";
    case "warning": return "oklch(0.76 0.19 65  / 35%)";
    case "message": return "oklch(0.65 0.22 278 / 35%)";
    default:        return "oklch(0.60 0.16 250 / 35%)";
  }
}

function timeAgo(ts: number): string {
  const d = Date.now() - ts;
  if (d < 60_000)        return "just now";
  if (d < 3_600_000)     return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000)    return `${Math.floor(d / 3_600_000)}h ago`;
  return `${Math.floor(d / 86_400_000)}d ago`;
}

/* ── Single toast card ───────────────────────────────────────── */
function Toast({ notif }: { notif: AppNotification }) {
  const { dismissNotification } = useNotificationCenter();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.92 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.88 }}
      transition={{ type: "spring", damping: 22, stiffness: 300 }}
      className="flex items-start gap-3 px-4 py-3 rounded-xl shadow-xl w-80 max-w-[min(90vw,20rem)]"
      style={{
        background: "var(--card)",
        border: `1px solid ${notifBorderColor(notif.type)}`,
      }}
    >
      {notifIcon(notif.type)}

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold leading-snug truncate">{notif.title}</p>
        {notif.message && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
        )}
        {notif.action && (
          <button
            onClick={() => { notif.action!.onClick(); dismissNotification(notif.id); }}
            className="mt-1.5 text-xs font-semibold hover:underline"
            style={{ color: "oklch(0.65 0.22 278)" }}
          >
            {notif.action.label}
          </button>
        )}
      </div>

      <button
        onClick={() => dismissNotification(notif.id)}
        className="shrink-0 w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

/* ── Toast stack (fixed, bottom-right) ─────────────────────────
   Place once inside the layout — renders all active transient toasts.
───────────────────────────────────────────────────────────── */
export function NotificationToasts() {
  const { notifications } = useNotificationCenter();
  // Show the 5 most-recent unread toasts (newest at bottom of visual stack)
  const toasts = notifications.filter((n) => !n.read).slice(0, 5).reverse();

  return (
    <div
      className="fixed z-200 flex flex-col gap-2 pointer-events-none"
      style={{ top: "1rem", right: "1rem" }}
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((n) => (
          <div key={n.id} className="pointer-events-auto">
            <Toast notif={n} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ── Notification bell + history panel ─────────────────────────
   Drop inside any header bar.
───────────────────────────────────────────────────────────── */
export function NotificationBell({ className }: { className?: string }) {
  const {
    notifications,
    unreadCount,
    markAllRead,
    clearAll,
    dismissNotification,
  } = useNotificationCenter();
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setOpen((v) => !v);
    if (!open) markAllRead();
  };

  return (
    <div className={cn("relative", className)}>
      <button
        onClick={handleOpen}
        className="relative flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 min-w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-white px-0.5"
            style={{ background: "oklch(0.65 0.22 278)" }}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-90"
              onClick={() => setOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -8 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute right-0 top-full md:left-0 md:right-auto md:top-auto md:bottom-full mt-2 w-80 rounded-2xl shadow-2xl z-100 overflow-hidden"
              style={{
                background: "var(--card)",
                border: "1px solid oklch(1 0 0 / 10%)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/7">
                <div className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5" style={{ color: "oklch(0.65 0.22 278)" }} />
                  <span className="text-xs font-semibold">Notifications</span>
                </div>
                {notifications.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-6 h-6"
                      onClick={markAllRead}
                      title="Mark all read"
                    >
                      <CheckCheck className="w-3 h-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-6 h-6 text-muted-foreground hover:text-destructive"
                      onClick={clearAll}
                      title="Clear all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Notification list */}
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 gap-2">
                    <Bell className="w-8 h-8 text-muted-foreground/20" />
                    <p className="text-xs text-muted-foreground">No notifications yet</p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {notifications.map((n) => (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="border-b border-white/5 last:border-0"
                      >
                        <div
                          className={cn(
                            "flex items-start gap-3 px-4 py-3",
                            !n.read && "bg-primary/3"
                          )}
                        >
                          {notifIcon(n.type)}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold leading-snug">{n.title}</p>
                            {n.message && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                                {n.message}
                              </p>
                            )}
                            <p className="text-[9px] text-muted-foreground/50 mt-1">
                              {timeAgo(n.createdAt)}
                            </p>
                            {n.action && (
                              <button
                                onClick={() => { n.action!.onClick(); setOpen(false); }}
                                className="mt-1 text-[10px] font-semibold hover:underline"
                                style={{ color: "oklch(0.65 0.22 278)" }}
                              >
                                {n.action.label}
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => dismissNotification(n.id)}
                            className="shrink-0 w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
