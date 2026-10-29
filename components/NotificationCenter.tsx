'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  Info,
  MessageSquare,
  Trash2,
  X,
} from 'lucide-react';

import {
  useNotificationCenter,
  type AppNotification,
  type NotifType,
} from '@/lib/notification-context';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

/* ── Helpers ─────────────────────────────────────────────────── */
function notifIcon(type: NotifType) {
  switch (type) {
    case 'success':
      return <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />;
    case 'warning':
      return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />;
    case 'message':
      return (
        <MessageSquare className="h-4 w-4 shrink-0" style={{ color: 'oklch(0.65 0.22 278)' }} />
      );
    default:
      return <Info className="h-4 w-4 shrink-0 text-blue-400" />;
  }
}

function notifBorderColor(type: NotifType): string {
  switch (type) {
    case 'success':
      return 'oklch(0.62 0.19 145 / 35%)';
    case 'error':
      return 'oklch(0.60 0.22 25  / 35%)';
    case 'warning':
      return 'oklch(0.76 0.19 65  / 35%)';
    case 'message':
      return 'oklch(0.65 0.22 278 / 35%)';
    default:
      return 'oklch(0.60 0.16 250 / 35%)';
  }
}

function timeAgo(ts: number): string {
  const d = Date.now() - ts;
  if (d < 60_000) return 'just now';
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  if (d < 86_400_000) return `${Math.floor(d / 3_600_000)}h ago`;
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
      transition={{ type: 'spring', damping: 22, stiffness: 300 }}
      className="flex w-80 max-w-[min(90vw,20rem)] items-start gap-3 rounded-xl px-4 py-3 shadow-xl"
      style={{
        background: 'var(--card)',
        border: `1px solid ${notifBorderColor(notif.type)}`,
      }}
    >
      {notifIcon(notif.type)}

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm leading-snug font-semibold">{notif.title}</p>
        {notif.message && (
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">{notif.message}</p>
        )}
        {notif.action && (
          <button
            onClick={() => {
              notif.action!.onClick();
              dismissNotification(notif.id);
            }}
            className="mt-1.5 text-xs font-semibold hover:underline"
            style={{ color: 'oklch(0.65 0.22 278)' }}
          >
            {notif.action.label}
          </button>
        )}
      </div>

      <button
        onClick={() => dismissNotification(notif.id)}
        className="text-muted-foreground hover:text-foreground flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors"
      >
        <X className="h-3 w-3" />
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
  const toasts = notifications
    .filter((n) => !n.read)
    .slice(0, 5)
    .reverse();

  return (
    <div
      className="pointer-events-none fixed z-200 flex flex-col gap-2"
      style={{ top: '1rem', right: '1rem' }}
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
  const { notifications, unreadCount, markAllRead, clearAll, dismissNotification } =
    useNotificationCenter();
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setOpen((v) => !v);
    if (!open) markAllRead();
  };

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={handleOpen}
        className="text-muted-foreground hover:text-foreground hover:bg-sidebar-accent relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-0.5 text-[9px] font-bold text-white"
            style={{ background: 'oklch(0.65 0.22 278)' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-90" onClick={() => setOpen(false)} />

            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: -8 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="absolute top-full right-0 z-100 mt-2 w-80 overflow-hidden rounded-2xl shadow-2xl md:top-auto md:right-auto md:bottom-full md:left-0"
              style={{
                background: 'var(--card)',
                border: '1px solid oklch(1 0 0 / 10%)',
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/7 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Bell className="h-3.5 w-3.5" style={{ color: 'oklch(0.65 0.22 278)' }} />
                  <span className="text-xs font-semibold">Notifications</span>
                </div>
                {notifications.length > 0 && (
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={markAllRead}
                      title="Mark all read"
                    >
                      <CheckCheck className="h-3 w-3" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground hover:text-destructive h-6 w-6"
                      onClick={clearAll}
                      title="Clear all"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Notification list */}
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-10">
                    <Bell className="text-muted-foreground/20 h-8 w-8" />
                    <p className="text-muted-foreground text-xs">No notifications yet</p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {notifications.map((n) => (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className="border-b border-white/5 last:border-0"
                      >
                        <div
                          className={cn(
                            'flex items-start gap-3 px-4 py-3',
                            !n.read && 'bg-primary/3'
                          )}
                        >
                          {notifIcon(n.type)}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs leading-snug font-semibold">{n.title}</p>
                            {n.message && (
                              <p className="text-muted-foreground mt-0.5 line-clamp-2 text-[10px]">
                                {n.message}
                              </p>
                            )}
                            <p className="text-muted-foreground/50 mt-1 text-[9px]">
                              {timeAgo(n.createdAt)}
                            </p>
                            {n.action && (
                              <button
                                onClick={() => {
                                  n.action!.onClick();
                                  setOpen(false);
                                }}
                                className="mt-1 text-[10px] font-semibold hover:underline"
                                style={{ color: 'oklch(0.65 0.22 278)' }}
                              >
                                {n.action.label}
                              </button>
                            )}
                          </div>
                          <button
                            onClick={() => dismissNotification(n.id)}
                            className="text-muted-foreground hover:text-foreground flex h-4 w-4 shrink-0 items-center justify-center"
                          >
                            <X className="h-2.5 w-2.5" />
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
