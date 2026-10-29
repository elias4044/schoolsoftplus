'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight, Lock, MessageSquare, Users } from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { useConversations, type RTConversation } from '@/lib/useMessages';
import type { WidgetSize } from '@/lib/widgets/types';

interface Props {
  size: WidgetSize;
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function ConvAvatar({ conv, myUsername }: { conv: RTConversation; myUsername: string }) {
  if (conv.type === 'group') {
    return (
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ background: 'oklch(0.65 0.22 278 / 18%)', color: 'oklch(0.75 0.22 278)' }}
      >
        <Users className="h-3.5 w-3.5" />
      </div>
    );
  }
  const otherUser = conv.participantIds.find((p) => p !== myUsername) ?? myUsername;
  const name = conv.participantNames?.[otherUser] ?? otherUser;
  const pfp = conv.participantPfpUrls?.[otherUser];
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  if (pfp) {
    return (
      <img
        src={pfp}
        alt={name}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
        style={{ border: '1px solid oklch(1 0 0 / 8%)' }}
      />
    );
  }
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold"
      style={{ background: 'oklch(0.65 0.22 278 / 18%)', color: 'oklch(0.75 0.22 278)' }}
    >
      {initials}
    </div>
  );
}

export default function MessagesWidget({ size }: Props) {
  const { session } = useAuth();
  const { conversations, loading } = useConversations(session?.userId ?? '');

  const myUsername = session?.userId ?? '';

  const compact = size === '2x1' || size === '4x1';
  const maxShown = compact ? 3 : size === '2x2' ? 5 : 8;
  const shown = conversations.slice(0, maxShown);

  return (
    <div className="flex h-full flex-col gap-3 px-4 pt-4 pb-3">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="text-primary h-3.5 w-3.5" />
          <span className="text-foreground text-xs font-semibold">Messages</span>
        </div>
        <Link
          href="/messages"
          className="text-muted-foreground hover:text-primary flex items-center gap-0.5 text-[10px] transition-colors"
        >
          Open <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="bg-muted-foreground/40 h-1 w-1 rounded-full"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </div>
      ) : conversations.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 text-center">
          <MessageSquare className="text-muted-foreground/30 h-5 w-5" />
          <p className="text-muted-foreground/50 text-xs">No conversations yet</p>
          <Link href="/messages" className="text-primary text-[10px] hover:underline">
            Start one →
          </Link>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
          {shown.map((conv, i) => {
            const otherUser =
              conv.type === 'dm'
                ? (conv.participantIds.find((p) => p !== myUsername) ?? myUsername)
                : null;
            const name =
              conv.type === 'group'
                ? (conv.groupName ?? 'Group')
                : (conv.participantNames?.[otherUser!] ?? otherUser ?? 'Unknown');
            const preview = conv.lastMessage
              ? (conv.lastSenderUserId === myUsername ? 'You: ' : '') + conv.lastMessage
              : 'No messages yet';

            return (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
              >
                <Link
                  href={`/messages?conv=${conv.id}`}
                  className="group flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/4"
                >
                  <ConvAvatar conv={conv} myUsername={myUsername} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-foreground/90 truncate text-xs font-medium">
                        {name}
                      </span>
                      <span className="text-muted-foreground/50 shrink-0 text-[9px]">
                        {timeAgo(conv.lastAt)}
                      </span>
                    </div>
                    {!compact && (
                      <p className="text-muted-foreground/55 flex items-center gap-1 truncate text-[10px]">
                        {conv.encrypted && <Lock className="h-2.5 w-2.5 shrink-0" />}
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
