'use client';

import { Download, MoreHorizontal, Pin, Search, Star } from 'lucide-react';

import { downloadConversationTranscript } from '@/lib/chat-view';
import type { RTMessage } from '@/lib/useMessages';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ConversationTools({
  name,
  messages,
  encrypted,
  decrypted,
  favorite,
  onToggleFavorite,
  onSearch,
  onShowPinned,
}: {
  name: string;
  messages: RTMessage[];
  encrypted: boolean;
  decrypted: Record<string, string>;
  favorite: boolean;
  onToggleFavorite: () => void;
  onSearch: () => void;
  onShowPinned: () => void;
}) {
  const exportConversation = () =>
    downloadConversationTranscript(name, messages, encrypted, decrypted);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Conversation tools">
          <MoreHorizontal className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={onSearch}>
          <Search />
          Search messages
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onShowPinned}>
          <Pin />
          Pinned messages
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onToggleFavorite}>
          <Star className={favorite ? 'fill-current' : ''} />
          {favorite ? 'Remove from favorites' : 'Add to favorites'}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-muted-foreground text-xs font-normal">
          Latest 100 loaded messages
        </DropdownMenuLabel>
        <DropdownMenuItem onSelect={exportConversation} disabled={!messages.length}>
          <Download />
          Download conversation
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
