"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

export type NotifType = "success" | "error" | "info" | "warning" | "message";

export interface AppNotification {
  id: string;
  type: NotifType;
  title: string;
  message?: string;
  /** Auto-dismiss after this many ms. 0 = persistent. Defaults: error→0, others→4000 */
  duration?: number;
  action?: { label: string; onClick: () => void };
  createdAt: number;
  read: boolean;
}

interface NotificationContextValue {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (n: Omit<AppNotification, "id" | "createdAt" | "read">) => string;
  dismissNotification: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
  // Shorthands
  success: (title: string, message?: string, opts?: { duration?: number; action?: AppNotification["action"] }) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warn: (title: string, message?: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function useNotificationCenter(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotificationCenter must be used inside NotificationProvider");
  return ctx;
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const addNotification = useCallback(
    (n: Omit<AppNotification, "id" | "createdAt" | "read">): string => {
      const id = crypto.randomUUID();
      const notif: AppNotification = { ...n, id, createdAt: Date.now(), read: false };
      setNotifications((prev) => [notif, ...prev].slice(0, 50));

      const duration = n.duration ?? (n.type === "error" ? 0 : 4000);
      if (duration > 0) {
        const timer = setTimeout(() => {
          setNotifications((prev) => prev.filter((x) => x.id !== id));
          timersRef.current.delete(id);
        }, duration);
        timersRef.current.set(id, timer);
      }
      return id;
    },
    []
  );

  const dismissNotification = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer) { clearTimeout(timer); timersRef.current.delete(id); }
    setNotifications((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current.clear();
    setNotifications([]);
  }, []);

  const success = useCallback(
    (title: string, message?: string, opts?: { duration?: number; action?: AppNotification["action"] }) => {
      addNotification({ type: "success", title, message, ...opts });
    },
    [addNotification]
  );

  const error = useCallback(
    (title: string, message?: string) => {
      addNotification({ type: "error", title, message });
    },
    [addNotification]
  );

  const info = useCallback(
    (title: string, message?: string) => {
      addNotification({ type: "info", title, message });
    },
    [addNotification]
  );

  const warn = useCallback(
    (title: string, message?: string) => {
      addNotification({ type: "warning", title, message, duration: 5000 });
    },
    [addNotification]
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount: notifications.filter((n) => !n.read).length,
        addNotification,
        dismissNotification,
        markAllRead,
        clearAll,
        success,
        error,
        info,
        warn,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
