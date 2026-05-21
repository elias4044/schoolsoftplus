"use client";

import { motion } from "framer-motion";
import { MessageSquare, ChevronRight, Lock, Users } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";
import type { WidgetSize } from "@/lib/widgets/types";
import { useConversations, type RTConversation } from "@/lib/useMessages";

interface Props { size: WidgetSize }

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function ConvAvatar({ conv, myUsername }: { conv: RTConversation; myUsername: string }) {
  if (conv.type === "group") {
    return (
      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ background: "oklch(0.65 0.22 278 / 18%)", color: "oklch(0.75 0.22 278)" }}>
        <Users className="w-3.5 h-3.5" />
      </div>
    );
  }
  const otherUser = conv.participants.find(p => p !== myUsername) ?? myUsername;
  const name = conv.participantNames?.[otherUser] ?? otherUser;
  const pfp = conv.participantPfpUrls?.[otherUser];
  const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  if (pfp) {
    return (
      <img src={pfp} alt={name}
        className="w-8 h-8 rounded-full object-cover shrink-0"
        style={{ border: "1px solid oklch(1 0 0 / 8%)" }} />
    );
  }
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
      style={{ background: "oklch(0.65 0.22 278 / 18%)", color: "oklch(0.75 0.22 278)" }}>
      {initials}
    </div>
  );
}

export default function MessagesWidget({ size }: Props) {
  const { session } = useAuth();
  const { conversations, loading } = useConversations(session?.username ?? "");

  const myUsername = session?.username ?? "";

  const compact = size === "2x1" || size === "4x1";
  const maxShown = compact ? 3 : size === "2x2" ? 5 : 8;
  const shown = conversations.slice(0, maxShown);

  return (
    <div className="flex flex-col h-full px-4 pt-4 pb-3 gap-3">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">Messages</span>
        </div>
        <Link href="/messages" className="flex items-center gap-0.5 text-[10px] text-muted-foreground hover:text-primary transition-colors">
          Open <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex gap-1">
            {[0,1,2].map(i => (
              <motion.div key={i} className="w-1 h-1 rounded-full bg-muted-foreground/40"
                animate={{ opacity: [0.3,1,0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
            ))}
          </div>
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-1.5 text-center">
          <MessageSquare className="w-5 h-5 text-muted-foreground/30" />
          <p className="text-xs text-muted-foreground/50">No conversations yet</p>
          <Link href="/messages" className="text-[10px] text-primary hover:underline">Start one →</Link>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col gap-0.5">
          {shown.map((conv, i) => {
            const otherUser = conv.type === "dm"
              ? (conv.participants.find(p => p !== myUsername) ?? myUsername)
              : null;
            const name = conv.type === "group"
              ? (conv.groupName ?? "Group")
              : (conv.participantNames?.[otherUser!] ?? otherUser ?? "Unknown");
            const preview = conv.lastMessage
              ? (conv.lastSenderUsername === myUsername ? "You: " : "") + conv.lastMessage
              : "No messages yet";

            return (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
              >
                <Link href={`/messages?conv=${conv.id}`}
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/4 transition-colors group">
                  <ConvAvatar conv={conv} myUsername={myUsername} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-medium text-foreground/90 truncate">{name}</span>
                      <span className="text-[9px] text-muted-foreground/50 shrink-0">{timeAgo(conv.lastAt)}</span>
                    </div>
                    {!compact && (
                      <p className="text-[10px] text-muted-foreground/55 truncate flex items-center gap-1">
                        {conv.encrypted && <Lock className="w-2.5 h-2.5 shrink-0" />}
                        {preview}
                      </p>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
