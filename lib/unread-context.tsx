"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface UnreadContextValue {
  totalUnread: number;
  unreadByConvo: Record<string, number>;
  markRead: (conversationId: string) => void;
  setUnread: (conversationId: string, count: number) => void;
}

const UnreadContext = createContext<UnreadContextValue>({
  totalUnread: 0,
  unreadByConvo: {},
  markRead: () => {},
  setUnread: () => {},
});

export function UnreadProvider({ children }: { children: React.ReactNode }) {
  const [unreadByConvo, setUnreadByConvo] = useState<Record<string, number>>({});

  const markRead = useCallback((conversationId: string) => {
    setUnreadByConvo(prev => {
      if (!prev[conversationId]) return prev;
      const next = { ...prev };
      delete next[conversationId];
      return next;
    });
  }, []);

  const setUnread = useCallback((conversationId: string, count: number) => {
    setUnreadByConvo(prev => {
      if (prev[conversationId] === count) return prev;
      if (count === 0) {
        const next = { ...prev };
        delete next[conversationId];
        return next;
      }
      return { ...prev, [conversationId]: count };
    });
  }, []);

  const totalUnread = Object.values(unreadByConvo).reduce((a, b) => a + b, 0);

  return (
    <UnreadContext.Provider value={{ totalUnread, unreadByConvo, markRead, setUnread }}>
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnread() {
  return useContext(UnreadContext);
}
