"use client";

import { useEffect, useRef, useCallback } from "react";
import type { RTConversation, RTMessage } from "./useMessages";

export function useNotifications(
  conversations: RTConversation[],
  messages: RTMessage[],
  activeConvoId: string | null,
  username: string
) {
  const permissionRef = useRef<NotificationPermission>("default");
  const prevConvosRef = useRef<Map<string, number>>(new Map());
  const prevMsgIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return;
    const result = await Notification.requestPermission();
    permissionRef.current = result;
    return result;
  }, []);

  // Initialize permission state
  useEffect(() => {
    if (typeof Notification !== "undefined") {
      permissionRef.current = Notification.permission;
    }
  }, []);

  // Track unread from conversation lastAt changes
  useEffect(() => {
    if (!username) return;
    if (!initializedRef.current) {
      // Seed the map without firing notifications
      for (const c of conversations) {
        prevConvosRef.current.set(c.id, c.lastAt);
      }
      initializedRef.current = true;
      return;
    }

    for (const c of conversations) {
      const prev = prevConvosRef.current.get(c.id) ?? 0;
      // New message in this convo from someone else, and not active
      if (
        c.lastAt > prev &&
        c.lastSenderUsername !== username &&
        c.id !== activeConvoId
      ) {
        fireNotification(
          c.participantNames[c.lastSenderUsername] || c.lastSenderUsername,
          c.lastMessage
        );
      }
      prevConvosRef.current.set(c.id, c.lastAt);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, activeConvoId, username]);

  // Track new messages in active convo when tab is hidden
  useEffect(() => {
    for (const m of messages) {
      if (!prevMsgIdsRef.current.has(m.id)) {
        prevMsgIdsRef.current.add(m.id);
        // Don't notify for initial batch
        if (m.isNew && m.senderUsername !== username && document.hidden) {
          fireNotification(m.senderDisplayName, m.content);
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, username]);

  return { requestPermission };
}

function fireNotification(sender: string, body: string) {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;
  if (!document.hidden) return; // only fire when tab is not focused

  try {
    new Notification(`Message from ${sender}`, {
      body: body.slice(0, 100),
      icon: "/logo.png",
      badge: "/logo.png",
      tag: `msg-${sender}`, // group notifications per sender
    });
  } catch {
    // ignore – Safari restricts Notification constructor
  }
}
