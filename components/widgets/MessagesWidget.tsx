'use client';

import { Users } from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { useConversations } from '@/lib/useMessages';
import type { WidgetSize } from '@/lib/widgets/types';

import { WidgetNotice, WidgetRow, WidgetSkeleton } from './WidgetContent';

function timeAgo(timestamp: number) {
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60_000));
  if (minutes < 1) return 'Now';
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return `${Math.floor(minutes / 1440)}d`;
}

export default function MessagesWidget({ size }: { size: WidgetSize }) {
  const { session } = useAuth();
  const userId = session?.userId ?? '';
  const { conversations, loading, error, retry } = useConversations(userId);
  if (loading && !conversations.length) return <WidgetSkeleton label="Loading messages" />;

  return (
    <>
      {error && (
        <WidgetNotice action="Retry" onAction={retry}>
          Could not refresh conversations.
        </WidgetNotice>
      )}
      {!error && !conversations.length && (
        <WidgetNotice>No conversations yet. Open Messages to start one.</WidgetNotice>
      )}
      {conversations.slice(0, size.endsWith('x1') ? 3 : 8).map((conversation) => {
        const otherId = conversation.participantIds.find((id) => id !== userId) ?? userId;
        const group = conversation.type === 'group';
        const title = group
          ? conversation.groupName || 'Group'
          : conversation.participantNames?.[otherId] || otherId;
        const initials = title
          .trim()
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => Array.from(part)[0])
          .join('')
          .toUpperCase();
        const preview = conversation.encrypted
          ? 'Encrypted conversation'
          : conversation.lastMessage
            ? `${conversation.lastSenderUserId === userId ? 'You: ' : ''}${conversation.lastMessage}`
            : 'No messages yet';
        return (
          <WidgetRow
            key={conversation.id}
            title={title}
            detail={preview}
            leading={
              <span className="widgetAvatar" aria-hidden>
                {group ? <Users className="size-4" /> : initials}
              </span>
            }
            aside={conversation.lastAt ? timeAgo(conversation.lastAt) : undefined}
            unread={
              conversation.lastSenderUserId !== userId &&
              conversation.lastAt > (conversation.lastReadAt?.[userId] ?? 0)
            }
            href={`/messages?conv=${encodeURIComponent(conversation.id)}`}
          />
        );
      })}
    </>
  );
}
