'use client';

import { useCallback, useMemo, useSyncExternalStore } from 'react';

const changeEvent = 'schoolsoftplus-chat-favorites';

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(changeEvent, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(changeEvent, callback);
  };
}

function readIds(value: string) {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function useChatFavorites(userId: string) {
  const key = `chat-favorites:${userId}`;
  const getSnapshot = useCallback(() => {
    try {
      return localStorage.getItem(key) ?? '[]';
    } catch {
      return '[]';
    }
  }, [key]);
  const value = useSyncExternalStore(subscribe, getSnapshot, () => '[]');
  const favorites = useMemo(() => new Set(readIds(value)), [value]);
  const toggleFavorite = (conversationId: string) => {
    const next = new Set(readIds(getSnapshot()));
    if (next.has(conversationId)) next.delete(conversationId);
    else next.add(conversationId);
    try {
      localStorage.setItem(key, JSON.stringify([...next]));
      window.dispatchEvent(new Event(changeEvent));
      return true;
    } catch {
      return false;
    }
  };
  return { favorites, toggleFavorite };
}
