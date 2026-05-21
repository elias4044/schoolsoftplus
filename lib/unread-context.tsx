"use client";

import React, { createContext, useContext, useCallback, useRef, useState } from "react";
import { useSession } from "./useSession";

interface UnreadContextValue {
  loading: boolean;
  currentConversationId: string | null;
  isUnread: boolean;
  markRead: (conversationId: string) => void;
  setCurrentConversation: (conversationId: string | null) => void;
}

const UnreadContext = createContext<UnreadContextValue>({
  loading: false,
  currentConversationId: null,
  isUnread: false,
  markRead: () => {},
  setCurrentConversation: () => {},
});

interface UnreadProviderProps {
  children: React.ReactNode;
}

export function UnreadProvider({ children }: UnreadProviderProps) {
  const { session } = useSession();
  const username = session?.username ?? "";

  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [optimisticReadAt, setOptimisticReadAt] = useState<Record<string, number>>({});

  // Deduplicate: track last time we fired markRead per conversation
  const lastMarkedRef = useRef<Record<string, number>>({});

  const isUnread = currentConversationId
    ? (optimisticReadAt[currentConversationId] ?? 0) === 0
    : false;

  const markRead = useCallback((conversationId: string) => {
    if (!username) return;

    // Don't re-mark if we already did within the last 5 seconds
    const now = Date.now();
    if ((lastMarkedRef.current[conversationId] ?? 0) > now - 5000) return;
    lastMarkedRef.current[conversationId] = now;

    setOptimisticReadAt(prev => ({ ...prev, [conversationId]: now }));

    fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "mark_read" }),
    }).catch(() => { /* ignore during auth transitions */ });
  }, [username]);

  const setCurrentConversation = useCallback((conversationId: string | null) => {
    setCurrentConversationId(conversationId);
    // When switching away, clear the optimistic read state for the old convo
    // so the next open re-evaluates freshly
  }, []);

  return (
    <UnreadContext.Provider value={{
      loading: false,
      currentConversationId,
      isUnread,
      markRead,
      setCurrentConversation,
    }}>
      {children}
    </UnreadContext.Provider>
  );
}

export function useUnread() {
  return useContext(UnreadContext);
}