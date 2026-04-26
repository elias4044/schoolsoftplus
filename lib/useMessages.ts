"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  collection,
  query,
  where,
  orderBy,
  limitToLast,
  onSnapshot,
  Unsubscribe,
} from "firebase/firestore";
import { clientDb } from "./firebase";
import { useFirebaseAuth } from "./useFirebaseAuth";

/* ── Types (mirrored from messagingDb.ts) ──────────────── */
export interface ReplyTo {
  messageId: string;
  content: string;
  senderDisplayName: string;
}

export interface NoteShareCard {
  type: "note";
  noteId: string;
  title: string;
  preview: string;
  fullContent?: string;  // full raw markdown stored at share time
  status: "draft" | "published" | "archived";
  sharedAt: number;
}

export interface GradeShareCard {
  type: "grade";
  assignmentId: number;
  assignmentTitle: string;
  subjectName: string;
  assignmentType: string;
  grade: string;
  confidence: "confirmed" | "estimated";
  totalPoints: string | null;
  sharedAt: number;
}

export type ShareCard = NoteShareCard | GradeShareCard;

export interface RTMessage {
  id: string;
  conversationId: string;
  senderUsername: string;
  senderDisplayName: string;
  content: string;
  edited: boolean;
  editedAt: number | null;
  pinned: boolean;
  deletedAt: number | null;
  createdAt: number;
  reactions: Record<string, string[]>;
  replyTo: ReplyTo | null;
  shareCard: ShareCard | null;
  isNew?: boolean;
}

export interface RTConversation {
  id: string;
  type: "dm" | "group";
  participants: string[];
  participantNames: Record<string, string>;
  participantPfpUrls: Record<string, string>;
  groupName: string | null;
  groupDescription: string | null;
  adminUsername: string | null;
  lastMessage: string;
  lastSenderUsername: string;
  lastAt: number;
  createdAt: number;
}

/* ── useConversations ─────────────────────────────────── */
export function useConversations(username: string) {
  const { fbUser, ready } = useFirebaseAuth();
  const [conversations, setConversations] = useState<RTConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const unsubRef = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    if (!ready || !fbUser || !username) return;

    setLoading(true);
    const q = query(
      collection(clientDb, "conversations_v1"),
      where("participants", "array-contains", username),
      orderBy("lastAt", "desc")
    );

    unsubRef.current = onSnapshot(q, snap => {
      const convos: RTConversation[] = snap.docs.map(doc => {
        const d = doc.data();
        return {
          id:                  doc.id,
          type:                (d.type === "group" ? "group" : "dm") as "dm" | "group",
          participants:        d.participants       ?? [],
          participantNames:    d.participantNames   ?? {},
          participantPfpUrls:  d.participantPfpUrls ?? {},
          groupName:           d.groupName          ?? null,
          groupDescription:    d.groupDescription   ?? null,
          adminUsername:       d.adminUsername       ?? null,
          lastMessage:         d.lastMessage        ?? "",
          lastSenderUsername:  d.lastSenderUsername ?? "",
          lastAt:              d.lastAt             ?? 0,
          createdAt:           d.createdAt          ?? 0,
        };
      });
      setConversations(convos);
      setLoading(false);
    }, err => {
      console.error("[useConversations] snapshot error:", err);
      setLoading(false);
    });

    return () => { unsubRef.current?.(); };
  }, [ready, fbUser, username]);

  return { conversations, loading };
}

/* ── useMessages ──────────────────────────────────────── */
export function useMessages(conversationId: string | null) {
  const { fbUser, ready } = useFirebaseAuth();
  const [messages, setMessages] = useState<RTMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const unsubRef = useRef<Unsubscribe | null>(null);
  const knownIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false);

  const applyUpdate = useCallback((msgs: RTMessage[]) => {
    if (!initialLoadDoneRef.current) {
      // First snapshot — mark all as NOT new (they're historical)
      initialLoadDoneRef.current = true;
      knownIdsRef.current = new Set(msgs.map(m => m.id));
      setMessages(msgs.map(m => ({ ...m, isNew: false })));
    } else {
      // Subsequent snapshots — flag genuinely new IDs
      const result = msgs.map(m => {
        if (!knownIdsRef.current.has(m.id)) {
          knownIdsRef.current.add(m.id);
          return { ...m, isNew: true };
        }
        return { ...m, isNew: false };
      });
      setMessages(result);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    unsubRef.current?.();
    unsubRef.current = null;
    setMessages([]);
    knownIdsRef.current = new Set();
    initialLoadDoneRef.current = false;

    if (!ready || !fbUser || !conversationId) return;

    setLoading(true);
    const q = query(
      collection(clientDb, "messages_v1"),
      where("conversationId", "==", conversationId),
      orderBy("createdAt", "asc"),
      limitToLast(100)
    );

    unsubRef.current = onSnapshot(q, snap => {
      const msgs: RTMessage[] = snap.docs.map(doc => {
        const d = doc.data();
        return {
          id:                  doc.id,
          conversationId:      d.conversationId      ?? "",
          senderUsername:      d.senderUsername      ?? "",
          senderDisplayName:   d.senderDisplayName   ?? "",
          content:             d.content             ?? "",
          edited:              d.edited              ?? false,
          editedAt:            d.editedAt            ?? null,
          pinned:              d.pinned              ?? false,
          deletedAt:           d.deletedAt           ?? null,
          createdAt:           d.createdAt           ?? 0,
          reactions:           d.reactions           ?? {},
          replyTo:             d.replyTo             ?? null,
          shareCard:           d.shareCard            ?? null,
        };
      });
      applyUpdate(msgs);
    }, err => {
      console.error("[useMessages] snapshot error:", err);
      setLoading(false);
    });

    return () => { unsubRef.current?.(); };
  }, [ready, fbUser, conversationId, applyUpdate]);

  return { messages, loading };
}
