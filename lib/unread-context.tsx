"use client";

import React, { createContext, useContext, useCallback, useEffect, useRef, useState } from "react";
import { useConversations, type RTConversation } from "./useMessages";
import { useSession } from "./useSession";
import { useNotificationCenter } from "./notification-context";


interface UnreadContextValue {
  loading: boolean;
  totalUnread: number;
  unreadByConvo: Record<string, number>;
  markRead: (conversationId: string) => void;
  /** All conversations — available globally without a separate hook call */
  conversations: RTConversation[];
}

const UnreadContext = createContext<UnreadContextValue>({
  loading: true,
  totalUnread: 0,
  unreadByConvo: {},
  markRead: () => {},
  conversations: [],
});

export function UnreadProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  const username = session?.username ?? "";
  const { conversations, loading } = useConversations(username);
  const { addNotification } = useNotificationCenter();

  // Optimistic local read timestamps — avoids waiting for Firestore round-trip
  const [optimisticReadAt, setOptimisticReadAt] = useState<Record<string, number>>({});

  // Track previous lastAt per convo to detect genuinely new messages
  const prevLastAtRef = useRef<Map<string, number>>(new Map());
  const initializedRef = useRef(false);

  // Compute unread: use max(firestoreLastReadAt, optimisticReadAt) per convo
  const unreadByConvo: Record<string, number> = {};
  for (const c of conversations) {
    const firestoreLastRead = (c.lastReadAt ?? {})[username] ?? 0;
    const localLastRead = optimisticReadAt[c.id] ?? 0;
    const effectiveLastRead = Math.max(firestoreLastRead, localLastRead);
    if (c.lastAt > effectiveLastRead && c.lastSenderUsername && c.lastSenderUsername !== username) {
      unreadByConvo[c.id] = 1;
    }
  }
  const totalUnread = Object.keys(unreadByConvo).length;

  // Fire in-app toasts and browser notifications for new messages from others
  useEffect(() => {
    if (!username || conversations.length === 0) return;

    if (!initializedRef.current) {
      // Seed without firing — these are messages already there on first load
      for (const c of conversations) prevLastAtRef.current.set(c.id, c.lastAt);
      initializedRef.current = true;
      return;
    }

    for (const c of conversations) {
      const prev = prevLastAtRef.current.get(c.id) ?? 0;
      if (c.lastAt > prev && c.lastSenderUsername && c.lastSenderUsername !== username) {
        const senderName = (c.participantNames ?? {})[c.lastSenderUsername] ?? c.lastSenderUsername;
        const body = c.lastMessage?.slice(0, 100) ?? "";

        // In-app notification center toast
        addNotification({
          type: "message",
          title: senderName,
          message: body,
          duration: 5000,
        });

        // Browser push notification when tab is in background
        if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
          try {
            new Notification(`Message from ${senderName}`, {
              body,
              icon: "/logo.png",
              tag: `msg-${c.id}`,
            });
          } catch { /* ignore */ }
        }
      }
      prevLastAtRef.current.set(c.id, c.lastAt);
    }
  }, [conversations, username, addNotification]);

  const markRead = useCallback((conversationId: string) => {
    if (!username) return;
    // Immediately clear the dot — don't wait for Firestore round-trip
    setOptimisticReadAt(prev => ({ ...prev, [conversationId]: Date.now() }));
    // Server-side write via Admin SDK — persists across devices
    fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read" }),
    }).catch(() => { /* ignore during auth transitions */ });
  }, [username]);

  return (
    <UnreadContext.Provider value={{ loading, totalUnread, unreadByConvo, markRead, conversations }}>
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnread() {
  return useContext(UnreadContext);
}
