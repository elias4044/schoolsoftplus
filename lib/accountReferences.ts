export type AccountAliases = Record<string, string>;

export function accountReference(value: string, aliases: AccountAliases): string {
  return Object.hasOwn(aliases, value) ? aliases[value] : value;
}

export function normalizeMessageIdentity<
  T extends {
    senderUserId?: string;
    senderUsername?: string;
    reactions?: Record<string, string[]>;
    shareCard?: { type: string; sharedByUserId?: string; sharedByUsername?: string } | null;
  },
>(message: T, aliases: AccountAliases) {
  const shareCard = message.shareCard;
  return {
    ...message,
    senderUserId: accountReference(message.senderUserId ?? message.senderUsername ?? '', aliases),
    reactions: Object.fromEntries(
      Object.entries(message.reactions ?? {}).map(([emoji, users]) => [
        emoji,
        [...new Set(users.map((user) => accountReference(user, aliases)))],
      ])
    ),
    shareCard:
      shareCard?.type === 'flashdeck'
        ? {
            ...shareCard,
            sharedByUserId: accountReference(
              shareCard.sharedByUserId ?? shareCard.sharedByUsername ?? '',
              aliases
            ),
          }
        : shareCard,
  };
}
