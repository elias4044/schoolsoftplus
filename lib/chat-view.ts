import type { RTConversation, RTMessage } from './useMessages';

export type InboxFilter = 'all' | 'unread' | 'groups' | 'favorites';

export function downloadConversationTranscript(
  name: string,
  messages: RTMessage[],
  encrypted: boolean,
  decrypted: Record<string, string>
) {
  const text = buildConversationTranscript(name, messages, encrypted, decrypted);
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `schoolsoftplus-${name.replace(/[^a-z0-9_-]/gi, '-').slice(0, 60) || 'conversation'}.txt`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function buildConversationTranscript(
  name: string,
  messages: RTMessage[],
  encrypted: boolean,
  decrypted: Record<string, string>
) {
  const lines = messages
    .filter((message) => !message.deletedAt && !message.sending)
    .map((message) => {
      const content = encrypted
        ? (decrypted[message.id] ?? '[Encrypted message - unlock the conversation to include it]')
        : message.content;
      const card = message.shareCard;
      const shared = card
        ? `\n[Shared ${card.type}: ${'title' in card ? card.title : card.assignmentTitle}]`
        : '';
      return `[${new Date(message.createdAt).toISOString()}] ${message.senderDisplayName}: ${content}${shared}`;
    });
  return `Schoolsoft+ / ${name}\nExport of the latest loaded messages\n\n${lines.join('\n\n')}\n`;
}

export function isConversationUnread(conversation: RTConversation, userId: string) {
  return (
    Boolean(conversation.lastSenderUserId) &&
    conversation.lastSenderUserId !== userId &&
    conversation.lastAt > (conversation.lastReadAt[userId] ?? 0)
  );
}

export function mergeMessageTimeline(
  messages: RTMessage[],
  pending: RTMessage[],
  conversationId: string | null
) {
  const liveIds = new Set(messages.map((message) => message.id));
  return [...messages, ...pending.filter((message) => !liveIds.has(message.id))]
    .filter((message) => message.conversationId === conversationId && message.deletedAt === null)
    .sort((first, second) => first.createdAt - second.createdAt);
}

export function searchConversationMessages(
  messages: RTMessage[],
  query: string,
  encrypted: boolean,
  decrypted: Record<string, string>
) {
  const term = query.trim().toLocaleLowerCase();
  if (!term) return [];
  return messages
    .filter((message) => {
      const content = encrypted ? decrypted[message.id] : message.content;
      return (
        content !== undefined &&
        (content.toLocaleLowerCase().includes(term) ||
          message.senderDisplayName.toLocaleLowerCase().includes(term) ||
          (message.shareCard &&
            ('title' in message.shareCard
              ? message.shareCard.title
              : message.shareCard.assignmentTitle
            )
              .toLocaleLowerCase()
              .includes(term)))
      );
    })
    .map((message) => ({
      ...message,
      content: encrypted ? decrypted[message.id] : message.content,
    }));
}

export function getDraftKey(userId: string, conversationId: string) {
  return `chat-draft:${encodeURIComponent(userId)}:${encodeURIComponent(conversationId)}`;
}
