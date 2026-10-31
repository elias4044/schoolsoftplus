'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  AtSign,
  BarChart2,
  Bell,
  BellOff,
  BookOpen,
  Check,
  ChevronDown,
  ChevronLeft,
  Clock,
  Copy,
  CornerUpLeft,
  Crown,
  Download,
  Eye,
  EyeOff,
  Gift,
  Info,
  Link as LinkIcon,
  Loader2,
  Lock,
  LogOut,
  MessageSquare,
  Paperclip,
  Pencil,
  Phone,
  Pin,
  PinOff,
  Search,
  Search as SearchIcon,
  Send,
  Settings2,
  ShieldCheck,
  Smile,
  Sparkles,
  StickyNote,
  Trash2,
  User,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useCallContext } from '@/lib/call-context';
import { decryptMessage, deriveKey, encryptMessage } from '@/lib/crypto';
import { uploadImage as uploadHostedImage } from '@/lib/image-upload';
import { useUnread } from '@/lib/unread-context';
import { useActiveGroupCallForConversation } from '@/lib/useCall';
import { useFriends } from '@/lib/useFriends';
import {
  FlashDeckShareCard,
  GradeShareCard,
  NoteShareCard,
  ReplyTo,
  RTConversation,
  RTMessage,
  ShareCard,
  useConversations,
  useMessages,
} from '@/lib/useMessages';
import {
  statusColor,
  statusLabel,
  useMyPresence,
  usePresenceMap,
  type UserStatus,
} from '@/lib/usePresence';
import { useSession } from '@/lib/useSession';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { GroupCallEncryptionNotice } from '@/components/CallPanel';
import { UserProfileModal } from '@/components/UserProfileModal';

/* 
   Types
 */
type Conversation = RTConversation;
type Message = RTMessage;

interface UserSearchResult {
  username: string;
  displayName: string;
  schoolName: string;
  userType: string;
}

interface GroupInvite {
  id: string;
  conversationId: string;
  groupName: string;
  invitedUserId: string;
  invitedById: string;
  invitedByDisplayName: string;
  status: 'pending' | 'accepted' | 'declined';
  invitedAt: number;
}

const QUICK_REACTIONS = ['👍', '❤️', '❤️‍🩹', '💔', '😂', '😮', '😢', '🔥'];

/* 
   Constants
 */
const MAX_CHARS = 2000;
const WARN_CHARS = 180; // orange warning
const HARD_UI_CHARS = 200; // red + won't send without encryption
const E2EE_MAX_CHARS = 100; // hard limit in encrypted groups

/* 
   URL / image rendering helpers
 */
const IMAGE_EXTS = /\.(jpg|jpeg|png|gif|webp|svg|avif|bmp)(\?.*)?$/i;
const URL_REGEX = /(https?:\/\/[^\s<>"']+)/g;

function isImageUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return IMAGE_EXTS.test(u.pathname);
  } catch {
    return false;
  }
}

/** Splits a message string into text and URL segments, renders URLs as links/images. */
function MessageContent({ text, isMe }: { text: string; isMe: boolean }) {
  const parts = text.split(URL_REGEX);
  return (
    <>
      {parts.map((part, i) => {
        if (!URL_REGEX.test(part)) {
          // Reset lastIndex after test
          URL_REGEX.lastIndex = 0;
          return <span key={i}>{part}</span>;
        }
        URL_REGEX.lastIndex = 0;
        if (isImageUrl(part)) {
          return (
            <span key={i} className="mt-1.5 block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={part}
                alt="Image"
                loading="lazy"
                className="max-h-64 max-w-full cursor-pointer rounded-xl border border-white/10 object-contain transition-opacity hover:opacity-90"
                style={{ maxWidth: 300 }}
                onClick={() => window.open(part, '_blank', 'noopener,noreferrer')}
                onError={(e) => {
                  // Fallback: render as link if image fails to load
                  const parent = (e.target as HTMLElement).parentElement;
                  if (parent) {
                    parent.innerHTML = `<a href="${part}" target="_blank" rel="noopener noreferrer" class="underline underline-offset-2 opacity-80 hover:opacity-100 break-all">${part}</a>`;
                  }
                }}
              />
            </span>
          );
        }
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center gap-0.5 break-all underline underline-offset-2 transition-opacity hover:opacity-80',
              isMe ? 'text-white/90' : 'text-primary'
            )}
          >
            <LinkIcon className="inline h-2.5 w-2.5 shrink-0" />
            {part}
          </a>
        );
      })}
    </>
  );
}

/* 
   EmojiPicker — lightweight inline emoji grid, no external lib (claude gave me the emojis)
 */
const EMOJI_CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
  { label: 'Recent', icon: '🕐', emojis: [] }, // filled from localStorage at runtime
  {
    label: 'Smileys',
    icon: '😀',
    emojis: [
      '😀',
      '😃',
      '😄',
      '😁',
      '😆',
      '😅',
      '😂',
      '🤣',
      '☺️',
      '😊',
      '😇',
      '🙂',
      '🙃',
      '😉',
      '😌',
      '😍',
      '🥰',
      '😘',
      '😗',
      '😙',
      '😚',
      '😋',
      '😛',
      '😝',
      '😜',
      '🤪',
      '🤨',
      '🧐',
      '🤓',
      '😎',
      '🥸',
      '🤩',
      '🥳',
      '😏',
      '😒',
      '😞',
      '😔',
      '😟',
      '😕',
      '🙁',
      '☹️',
      '😣',
      '😖',
      '😫',
      '😩',
      '🥺',
      '😢',
      '😭',
      '😤',
      '😠',
      '😡',
      '🤬',
      '🤯',
      '😳',
      '🥵',
      '🥶',
      '😱',
      '😨',
      '😰',
      '😥',
      '😓',
      '🤗',
      '🤔',
      '🤭',
      '🤫',
      '🤥',
      '😶',
      '😐',
      '😑',
      '😬',
      '🙄',
      '😯',
      '😦',
      '😧',
      '😮',
      '😲',
      '🥱',
      '😴',
      '🤤',
      '😪',
      '😵',
      '🤐',
      '🥴',
      '🤢',
      '🤮',
      '🤧',
      '😷',
      '🤒',
      '🤕',
      '🤑',
      '🤠',
      '😈',
      '👿',
    ],
  },
  {
    label: 'Gestures',
    icon: '👋',
    emojis: [
      '👋',
      '🤚',
      '🖐️',
      '✋',
      '🖖',
      '👌',
      '🤌',
      '🤏',
      '✌️',
      '🤞',
      '🤟',
      '🤘',
      '🤙',
      '👈',
      '👉',
      '👆',
      '🖕',
      '👇',
      '☝️',
      '👍',
      '👎',
      '✊',
      '👊',
      '🤛',
      '🤜',
      '👏',
      '🙌',
      '👐',
      '🤲',
      '🤝',
      '🙏',
      '✍️',
      '💅',
      '🤳',
      '💪',
      '🦾',
      '🦿',
      '🦵',
      '🦶',
      '👂',
      '🦻',
      '👃',
      '🫀',
      '🫁',
      '🧠',
      '🦷',
      '🦴',
      '👀',
      '👁️',
      '👅',
      '👄',
      '🫦',
    ],
  },
  {
    label: 'Hearts',
    icon: '❤️',
    emojis: [
      '❤️',
      '🧡',
      '💛',
      '💚',
      '💙',
      '💜',
      '🖤',
      '🤍',
      '🤎',
      '💔',
      '❣️',
      '💕',
      '💞',
      '💓',
      '💗',
      '💖',
      '💘',
      '💝',
      '💟',
      '☮️',
      '✝️',
      '☪️',
      '🕉️',
      '☸️',
      '✡️',
      '🔯',
      '🕎',
      '☯️',
      '☦️',
      '🛐',
      '⛎',
      '♈',
      '♉',
      '♊',
      '♋',
      '♌',
      '♍',
      '♎',
      '♏',
      '♐',
      '♑',
      '♒',
      '♓',
      '🆔',
      '⚛️',
      '🉑',
      '☢️',
      '☣️',
      '📴',
      '📳',
      '🈶',
      '🈚',
      '🈸',
      '🈺',
      '🈷️',
      '✴️',
      '🆚',
      '💮',
      '🉐',
      '㊙️',
      '㊗️',
      '🈴',
      '🈵',
      '🈹',
      '🈲',
      '🅰️',
      '🅱️',
      '🆎',
      '🆑',
      '🅾️',
      '🆘',
      '❌',
      '⭕',
      '🛑',
      '⛔',
      '📛',
      '🚫',
    ],
  },
  {
    label: 'Animals',
    icon: '🐶',
    emojis: [
      '🐶',
      '🐱',
      '🐭',
      '🐹',
      '🐰',
      '🦊',
      '🐻',
      '🐼',
      '🐨',
      '🐯',
      '🦁',
      '🐮',
      '🐷',
      '🐸',
      '🐵',
      '🙈',
      '🙉',
      '🙊',
      '🐒',
      '🐔',
      '🐧',
      '🐦',
      '🐤',
      '🦆',
      '🦅',
      '🦉',
      '🦇',
      '🐺',
      '🐗',
      '🐴',
      '🦄',
      '🐝',
      '🐛',
      '🦋',
      '🐌',
      '🐞',
      '🐜',
      '🦟',
      '🦗',
      '🦂',
      '🐢',
      '🐍',
      '🦎',
      '🦖',
      '🦕',
      '🐙',
      '🦑',
      '🦐',
      '🦞',
      '🦀',
      '🐡',
      '🐠',
      '🐟',
      '🐬',
      '🐳',
      '🐋',
      '🦈',
      '🐊',
      '🐅',
      '🐆',
      '🦓',
      '🦍',
      '🦧',
      '🐘',
      '🦛',
      '🦏',
      '🐪',
      '🐫',
      '🦒',
      '🦘',
      '🐃',
      '🐂',
      '🐄',
      '🐎',
      '🐖',
      '🐏',
      '🐑',
      '🦙',
      '🐐',
      '🦌',
      '🐕',
      '🐩',
      '🦮',
      '🐈',
      '🐓',
      '🦃',
      '🦤',
      '🦚',
      '🦜',
      '🦢',
      '🦩',
      '🕊️',
      '🐇',
      '🦝',
      '🦨',
      '🦡',
      '🦫',
      '🦦',
      '🦥',
      '🐁',
      '🐀',
      '🐿️',
      '🦔',
    ],
  },
  {
    label: 'Food',
    icon: '🍕',
    emojis: [
      '🍕',
      '🍔',
      '🍟',
      '🌭',
      '🍿',
      '🧂',
      '🥓',
      '🥚',
      '🍳',
      '🧇',
      '🥞',
      '🧈',
      '🍞',
      '🥐',
      '🥖',
      '🥨',
      '🥯',
      '🧀',
      '🥗',
      '🥙',
      '🥪',
      '🌮',
      '🌯',
      '🫔',
      '🥫',
      '🍱',
      '🍘',
      '🍙',
      '🍚',
      '🍛',
      '🍜',
      '🍝',
      '🍠',
      '🍢',
      '🍣',
      '🍤',
      '🍥',
      '🥮',
      '🍡',
      '🥟',
      '🥠',
      '🥡',
      '🍦',
      '🍧',
      '🍨',
      '🍩',
      '🍪',
      '🎂',
      '🍰',
      '🧁',
      '🥧',
      '🍫',
      '🍬',
      '🍭',
      '🍮',
      '🍯',
      '🍼',
      '🥛',
      '☕',
      '🍵',
      '🧃',
      '🥤',
      '🧋',
      '🍶',
      '🍺',
      '🍻',
      '🥂',
      '🍷',
      '🥃',
      '🍸',
      '🍹',
      '🧉',
      '🍾',
    ],
  },
  {
    label: 'Activities',
    icon: '⚽',
    emojis: [
      '⚽',
      '🏀',
      '🏈',
      '⚾',
      '🥎',
      '🎾',
      '🏐',
      '🏉',
      '🎱',
      '🏓',
      '🏸',
      '🥊',
      '🥋',
      '🎽',
      '⛸️',
      '🛷',
      '🎿',
      '🏂',
      '🪂',
      '🏋️',
      '🤸',
      '🤺',
      '🤼',
      '🤾',
      '🏌️',
      '🏇',
      '🧘',
      '🏄',
      '🚣',
      '🧗',
      '🚵',
      '🚴',
      '🏆',
      '🥇',
      '🥈',
      '🥉',
      '🎖️',
      '🏅',
      '🎗️',
      '🎫',
      '🎟️',
      '🎪',
      '🤹',
      '🎭',
      '🎨',
      '🎬',
      '🎤',
      '🎧',
      '🎼',
      '🎹',
      '🥁',
      '🎷',
      '🎺',
      '🎸',
      '🪕',
      '🎻',
      '🎲',
      '♟️',
      '🎯',
      '🎳',
      '🎮',
      '🎰',
    ],
  },
  {
    label: 'Travel',
    icon: '✈️',
    emojis: [
      '✈️',
      '🚀',
      '🛸',
      '🚁',
      '🛺',
      '🚕',
      '🚗',
      '🚙',
      '🚌',
      '🚎',
      '🚐',
      '🚑',
      '🚒',
      '🚓',
      '🚔',
      '🚖',
      '🚘',
      '🚍',
      '🚋',
      '🚂',
      '🚃',
      '🚄',
      '🚅',
      '🚆',
      '🚇',
      '🚈',
      '🚉',
      '🚊',
      '🚝',
      '🚞',
      '🚲',
      '🛴',
      '🛵',
      '🏍️',
      '🚨',
      '🚥',
      '🚦',
      '🛑',
      '🚧',
      '⚓',
      '🪝',
      '⛽',
      '🛶',
      '🚤',
      '🛥️',
      '🛳️',
      '⛴️',
      '🚢',
      '🏖️',
      '🏝️',
      '🏜️',
      '🏕️',
      '⛰️',
      '🗻',
      '🏔️',
      '🌋',
      '🗾',
      '🏠',
      '🏡',
      '🏢',
      '🏣',
      '🏤',
      '🏥',
      '🏦',
      '🏨',
      '🏩',
      '🏪',
      '🏫',
      '🏬',
      '🏭',
      '🏯',
      '🏰',
      '🗼',
      '🗽',
      '🗿',
      '🗺️',
      '🧭',
    ],
  },
  {
    label: 'Objects',
    icon: '💡',
    emojis: [
      '💡',
      '🔦',
      '🕯️',
      '🪔',
      '🧱',
      '💎',
      '🔑',
      '🗝️',
      '🔐',
      '🔒',
      '🔓',
      '🚪',
      '🛋️',
      '🪑',
      '🚽',
      '🚿',
      '🛁',
      '🧴',
      '🪒',
      '🧹',
      '🧺',
      '🧻',
      '🧼',
      '🧽',
      '🧯',
      '🛒',
      '🚬',
      '⚰️',
      '🗑️',
      '📦',
      '📫',
      '📪',
      '📬',
      '📭',
      '📮',
      '📯',
      '📜',
      '📃',
      '📄',
      '📑',
      '🗒️',
      '🗓️',
      '📆',
      '📅',
      '📇',
      '📈',
      '📉',
      '📊',
      '📋',
      '📌',
      '📍',
      '🗃️',
      '🗄️',
      '🗑️',
      '📁',
      '📂',
      '🗂️',
      '🗞️',
      '📰',
      '📓',
      '📔',
      '📒',
      '📕',
      '📗',
      '📘',
      '📙',
      '📚',
      '📖',
      '🔖',
      '🔗',
      '📎',
      '🖇️',
      '📐',
      '📏',
      '🧮',
      '✂️',
      '🗃️',
      '🖊️',
      '🖋️',
      '✒️',
      '🖌️',
      '🖍️',
      '📝',
      '✏️',
      '🔍',
      '🔎',
      '🔬',
      '🔭',
      '📡',
      '💊',
      '🩺',
      '🩻',
      '🩹',
      '🩼',
      '🦽',
      '🦼',
      '🩴',
    ],
  },
  {
    label: 'Symbols',
    icon: '💬',
    emojis: [
      '💬',
      '💭',
      '🗯️',
      '💢',
      '💥',
      '💫',
      '⭐',
      '🌟',
      '✨',
      '🎉',
      '🎊',
      '🎈',
      '🎀',
      '🎁',
      '🔥',
      '💧',
      '🌊',
      '🌈',
      '⚡',
      '❄️',
      '🌀',
      '🌁',
      '🌫️',
      '🌪️',
      '🌬️',
      '☔',
      '⛈️',
      '⛅',
      '☁️',
      '🌤️',
      '🌥️',
      '🌦️',
      '🌧️',
      '🌨️',
      '🌩️',
      '🌙',
      '⭐',
      '🌟',
      '💫',
      '✨',
      '🌠',
      '🌌',
      '☀️',
      '🌝',
      '🌛',
      '🌜',
      '🌚',
      '🌕',
      '🌖',
      '🌗',
      '🌘',
      '🌑',
      '🌒',
      '🌓',
      '🌔',
      '🌙',
      '🌏',
      '🌍',
      '🌎',
      '♾️',
      '⚜️',
      '🔱',
      '📛',
      '🔰',
      '♻️',
      '✅',
      '❎',
      '🆗',
      '🆙',
      '🆒',
      '🆕',
      '🆓',
      '🔜',
      '🔚',
      '🔛',
      '🔝',
      '🔞',
      '📵',
      '🚳',
      '🚭',
      '🚯',
      '🚱',
      '🚷',
      '❗',
      '❕',
      '❓',
      '❔',
      '‼️',
      '⁉️',
      '⚠️',
    ],
  },
];

interface GifResult {
  id: string;
  title: string;
  preview: string;
  full: string;
  width: number;
  height: number;
}

function GifPicker({
  onSelect,
  onClose,
}: {
  onSelect: (url: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GifResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load featured GIFs on mount
  useEffect(() => {
    inputRef.current?.focus();
    loadGifs('');
  }, []);

  const loadGifs = async (q: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/gif?q=${encodeURIComponent(q)}&limit=20`);
      const data = await res.json();
      if (data.success) setGifs(data.gifs);
      else setError(data.error ?? 'GIF search failed.');
    } catch {
      setError('Could not reach GIF service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => loadGifs(query), 400);
    return () => {
      if (searchRef.current) clearTimeout(searchRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="bg-card w-72 overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-white/8 px-3 py-2">
        <Gift className="text-primary h-3.5 w-3.5 shrink-0" />
        <span className="flex-1 text-xs font-semibold">GIFs</span>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* Search */}
      <div className="border-b border-white/8 px-2.5 py-2">
        <div className="relative">
          <SearchIcon className="text-muted-foreground absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search GIFs…"
            className="text-foreground placeholder:text-muted-foreground focus:border-primary/40 w-full rounded-lg border border-white/10 bg-white/5 py-1 pr-3 pl-7 text-xs focus:outline-none"
          />
        </div>
      </div>
      {/* Grid */}
      <div className="h-48 overflow-y-auto p-1.5">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <p className="text-muted-foreground text-xs">{error}</p>
            <p className="text-muted-foreground/60 text-[10px]">Make sure GIPHY_API_KEY is set.</p>
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground text-xs">No GIFs found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {gifs.map((g) => (
              <button
                key={g.id}
                onClick={() => {
                  onSelect(g.full);
                  onClose();
                }}
                className="hover:ring-primary/60 group relative aspect-square overflow-hidden rounded-lg bg-white/5 transition-all hover:ring-2"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={g.preview}
                  alt={g.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="border-t border-white/8 px-3 py-1">
        <p className="text-muted-foreground/50 text-center text-[9px]">Powered by GIPHY</p>
      </div>
    </motion.div>
  );
}

function EmojiPicker({
  onSelect,
  onClose,
  recentEmojis,
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
  recentEmojis: string[];
}) {
  const [activeCategory, setActiveCategory] = useState(recentEmojis.length > 0 ? 0 : 1);
  const [search, setSearch] = useState('');

  const categories = EMOJI_CATEGORIES.map((c, i) =>
    i === 0 ? { ...c, emojis: recentEmojis.slice(0, 32) } : c
  ).filter((c, i) => i !== 0 || c.emojis.length > 0);

  const displayEmojis =
    search.length > 0
      ? categories
          .flatMap((c) => c.emojis)
          .filter((e) => {
            // Very simple filter: just check if emoji is in any category that contains the search letter heuristic
            return true; // show all when searching — user just types to narrow
          })
          .filter((e, _, arr) => {
            // Filter by checking codepoint range for search-as-you-type
            void arr;
            return true;
          })
      : (categories[activeCategory]?.emojis ?? []);

  // When searching, filter all emojis (we can't do name search without a lib, so filter by recent first)
  const searchedEmojis = search
    ? categories.flatMap((c) => c.emojis).filter((_, i) => i < 200)
    : displayEmojis;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className="bg-card w-64 overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search */}
      <div className="flex items-center gap-2 border-b border-white/8 px-2.5 py-2">
        <SearchIcon className="text-muted-foreground h-3 w-3 shrink-0" />
        <input
          autoFocus
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emoji…"
          className="text-foreground placeholder:text-muted-foreground flex-1 bg-transparent text-xs focus:outline-none"
        />
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {/* Category tabs */}
      {!search && (
        <div className="flex scrollbar-none items-center gap-0.5 overflow-x-auto border-b border-white/8 px-1.5 py-1">
          {categories.map((cat, i) => (
            <button
              key={cat.label}
              onClick={() => setActiveCategory(i)}
              title={cat.label}
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-sm transition-colors',
                activeCategory === i ? 'bg-primary/20' : 'hover:bg-white/8'
              )}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      )}
      {/* Grid */}
      <div className="h-44 overflow-y-auto p-1">
        <div className="grid grid-cols-8 gap-0">
          {(search ? searchedEmojis : displayEmojis).map((emoji, i) => (
            <button
              key={`${emoji}-${i}`}
              onClick={() => onSelect(emoji)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-lg transition-colors hover:bg-white/10 active:scale-90"
            >
              {emoji}
            </button>
          ))}
        </div>
        {(search ? searchedEmojis : displayEmojis).length === 0 && (
          <p className="text-muted-foreground py-6 text-center text-xs">No emojis found.</p>
        )}
      </div>
    </motion.div>
  );
}

/* 
   Helpers
 */
function initials(name: string) {
  return (
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '??'
  );
}

function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

/* 
   useIsMobile — true when the primary input is touch / coarse
 */
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

/* 
   Main Page
 */
export default function MessagesPage() {
  const { session, loading: sessionLoading } = useSession();
  const username = session?.userId ?? '';
  const isMobile = useIsMobile();

  // Gate: has the user set up their profile yet?
  const [profileExists, setProfileExists] = useState<boolean | null>(null);

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((d) => setProfileExists(d.success && d.profile !== null))
      .catch(() => setProfileExists(false));
  }, []);

  const { conversations, loading: convoLoading } = useConversations(username);
  const { markRead, setCurrentConversation } = useUnread();
  const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
  const { messages, loading: msgLoading } = useMessages(
    activeConvo?.id ?? null,
    activeConvo?.participantAliases
  );

  // Update unread context when active conversation changes
  useEffect(() => {
    setCurrentConversation(activeConvo?.id ?? null);
  }, [activeConvo?.id, setCurrentConversation]);

  // Clear optimistic when switching conversations
  useEffect(() => {
    setOptimisticMsgs([]);
  }, [activeConvo?.id]);

  // Friends
  const {
    friends,
    received: friendRequests,
    sent: sentFriendRequests,
    profileMap: friendProfileMap,
    isFriend,
    pendingFrom,
    sentTo,
  } = useFriends(username);
  // Group invites
  const [groupInvites, setGroupInvites] = useState<GroupInvite[]>([]);
  const [loadingGroupInvites, setLoadingGroupInvites] = useState(false);

  // Presence — track own + participantIds
  useMyPresence(username);
  const presenceUsernames = useMemo(() => {
    const all = new Set<string>();
    for (const c of conversations) {
      for (const p of c.participantIds) if (p !== username) all.add(p);
    }
    for (const f of friends) all.add(f.userAId === username ? f.userBId : f.userAId);
    return [...all];
  }, [conversations, friends, username]);
  const statusMap = usePresenceMap(presenceUsernames);

  // Sidebar tab: "messages" | "friends"
  const [sidebarTab, setSidebarTab] = useState<'messages' | 'friends'>('messages');
  // Friend search
  const [friendSearchQuery, setFriendSearchQuery] = useState('');
  const [friendSearchResults, setFriendSearchResults] = useState<UserSearchResult[]>([]);
  const [friendSearching, setFriendSearching] = useState(false);
  const [friendRequestSending, setFriendRequestSending] = useState<string | null>(null);

  const [showPinned, setShowPinned] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [optimisticMsgs, setOptimisticMsgs] = useState<Message[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [showNewDM, setShowNewDM] = useState(false);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDesc, setGroupDesc] = useState('');
  const [groupMembers, setGroupMembers] = useState<UserSearchResult[]>([]);
  const [groupCreating, setGroupCreating] = useState(false);
  // E2EE group creation
  const [groupEncrypted, setGroupEncrypted] = useState(false);
  const [groupEncPassword, setGroupEncPassword] = useState('');
  const [groupEncPasswordConfirm, setGroupEncPasswordConfirm] = useState('');
  const [groupEncPasswordShow, setGroupEncPasswordShow] = useState(false);
  // E2EE runtime state: conversationId → derived CryptoKey
  const encKeysRef = useRef<Map<string, CryptoKey>>(new Map());
  const [encUnlockedIds, setEncUnlockedIds] = useState<Set<string>>(new Set());
  // Password prompt modal
  const [encPromptConvoId, setEncPromptConvoId] = useState<string | null>(null);
  const [encPromptPassword, setEncPromptPassword] = useState('');
  const [encPromptShow, setEncPromptShow] = useState(false);
  const [encPromptError, setEncPromptError] = useState('');
  const [encPromptDeriving, setEncPromptDeriving] = useState(false);
  // Decrypted message cache: messageId → plaintext
  const [decryptedCache, setDecryptedCache] = useState<Record<string, string>>({});

  // Image / GIF upload
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<{ url: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // GIF picker
  const [showGifPicker, setShowGifPicker] = useState(false);

  // Emoji picker
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);

  // Message search within conversation
  const [showMsgSearch, setShowMsgSearch] = useState(false);
  const [msgSearchQuery, setMsgSearchQuery] = useState('');
  const [msgSearchResults, setMsgSearchResults] = useState<Message[]>([]);

  // Forward message
  const [forwardMsg, setForwardMsg] = useState<Message | null>(null);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [groupEditName, setGroupEditName] = useState('');
  const [groupEditDesc, setGroupEditDesc] = useState('');
  const [groupEditSaving, setGroupEditSaving] = useState(false);
  const [groupAddSearch, setGroupAddSearch] = useState('');
  const [groupAddResults, setGroupAddResults] = useState<UserSearchResult[]>([]);
  const [groupAddSearching, setGroupAddSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [dmCreating, setDmCreating] = useState(false);
  const [convoFilter, setConvoFilter] = useState('');
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>('default');
  const [mobileActionMsg, setMobileActionMsg] = useState<Message | null>(null);
  const [viewProfileUsername, setViewProfileUsername] = useState<string | null>(null);

  useEffect(() => {
    setActiveConvo((prev) => {
      if (!prev) return prev;
      const next = conversations.find((c) => c.id === prev.id);
      return next ?? null;
    });
  }, [conversations]);

  //  Voice calls (global context — CallPanel rendered in layout)
  const { call, groupCall } = useCallContext();
  const [showEncCallWarning, setShowEncCallWarning] = useState(false);

  // Detect any active group call in the current group conversation
  const activeGroupCallInfo = useActiveGroupCallForConversation(
    activeConvo?.type === 'group' ? activeConvo.id : null
  );

  // pfp cache: username → pfp URL, fetched from /api/profile/[username]
  const [pfpCache, setPfpCache] = useState<Record<string, string>>({});
  const pfpFetchingRef = useRef<Set<string>>(new Set());

  const fetchPfp = useCallback(async (u: string) => {
    if (!u || pfpFetchingRef.current.has(u)) return;
    pfpFetchingRef.current.add(u);
    try {
      const res = await fetch(`/api/profile/${encodeURIComponent(u)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.profile?.pfpUrl) {
          setPfpCache((prev) => ({ ...prev, [u]: data.profile.pfpUrl }));
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  /* Fetch pfp for all conversation participantIds whenever conversations change */
  useEffect(() => {
    if (!username) return;
    const toFetch = new Set<string>();
    for (const c of conversations) {
      for (const p of c.participantIds) {
        if (p !== username) toFetch.add(p);
      }
    }
    toFetch.forEach(fetchPfp);
  }, [conversations, username, fetchPfp]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const groupAddSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composeAreaRef = useRef<HTMLFormElement>(null);

  /* Load recent emojis from localStorage */
  useEffect(() => {
    try {
      const raw = localStorage.getItem('recentEmojis');
      if (raw) setRecentEmojis(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const recordEmojiUsed = useCallback((emoji: string) => {
    setRecentEmojis((prev) => {
      const next = [emoji, ...prev.filter((e) => e !== emoji)].slice(0, 32);
      localStorage.setItem('recentEmojis', JSON.stringify(next));
      return next;
    });
  }, []);

  /* Per-conversation draft persistence */
  useEffect(() => {
    if (!activeConvo) return;
    const saved = sessionStorage.getItem(`draft_${activeConvo.id}`);
    setDraft(saved ?? '');
    setImagePreview(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvo?.id]);

  useEffect(() => {
    if (!activeConvo) return;
    if (draft) sessionStorage.setItem(`draft_${activeConvo.id}`, draft);
    else sessionStorage.removeItem(`draft_${activeConvo.id}`);
  }, [draft, activeConvo]);

  /* Message search within conversation */
  useEffect(() => {
    if (!msgSearchQuery.trim()) {
      setMsgSearchResults([]);
      return;
    }
    const q = msgSearchQuery.toLowerCase();
    setMsgSearchResults(
      visibleMessages.filter(
        (m) =>
          !m.shareCard &&
          (m.content.toLowerCase().includes(q) || m.senderDisplayName.toLowerCase().includes(q))
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [msgSearchQuery, messages]);

  /* Notifications — permission state */
  useEffect(() => {
    if (typeof Notification !== 'undefined') setNotifPermission(Notification.permission);
  }, []);

  /* Mark read when a conversation is opened or receives a new unread message */
  const lastSenderUserId = activeConvo?.lastSenderUserId;
  const lastAt = activeConvo?.lastAt ?? 0;
  const lastReadAt = activeConvo?.lastReadAt?.[username] ?? 0;

  useEffect(() => {
    if (!activeConvo?.id) return;
    if (lastSenderUserId && lastSenderUserId !== username && lastAt > lastReadAt) {
      markRead(activeConvo.id);
    }
  }, [activeConvo?.id, lastSenderUserId, lastAt, lastReadAt, username, markRead]);

  /* Auto-scroll when near bottom */
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  /* Scroll to bottom instantly when switching conversations */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'instant' });
  }, [activeConvo?.id]);

  /* Scroll to bottom once messages finish loading for the first time */
  useEffect(() => {
    if (!msgLoading) {
      bottomRef.current?.scrollIntoView({ behavior: 'instant' });
    }
  }, [msgLoading]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setShowScrollBtn(el.scrollHeight - el.scrollTop - el.clientHeight > 300);
  }, []);

  /* Reset on convo switch */
  useEffect(() => {
    setShowPinned(false);
    setPinnedMessages([]);
    setEditingId(null);
    setReplyingTo(null);
    setShowScrollBtn(false);
    setShowGroupInfo(false);
  }, [activeConvo?.id]);

  /* Load group invites */
  const loadGroupInvites = useCallback(async () => {
    if (!username) return;
    setLoadingGroupInvites(true);
    try {
      const res = await fetch('/api/group-invites');
      const data = await res.json();
      if (data.success) setGroupInvites(data.invites);
    } finally {
      setLoadingGroupInvites(false);
    }
  }, [username]);

  useEffect(() => {
    loadGroupInvites();
  }, [loadGroupInvites]);

  /* Friend search debounce */
  const friendSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (friendSearchRef.current) clearTimeout(friendSearchRef.current);
    if (friendSearchQuery.length < 2) {
      setFriendSearchResults([]);
      return;
    }
    friendSearchRef.current = setTimeout(async () => {
      setFriendSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(friendSearchQuery)}`);
        const data = await res.json();
        if (data.success) setFriendSearchResults(data.users);
      } finally {
        setFriendSearching(false);
      }
    }, 350);
  }, [friendSearchQuery]);

  const sendFriendReq = async (targetUsername: string) => {
    setFriendRequestSending(targetUsername);
    try {
      await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername }),
      });
    } finally {
      setFriendRequestSending(null);
    }
  };

  const respondFriendReq = async (fromUsername: string, accept: boolean) => {
    await fetch('/api/friends', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromUsername, accept }),
    });
  };

  const acceptGroupInvite = async (inviteId: string, accept: boolean) => {
    const res = await fetch('/api/group-invites', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inviteId, accept }),
    });
    const data = await res.json();
    if (data.success) {
      setGroupInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
      if (accept && data.invite?.conversationId) {
        // Switch to the joined conversation
        const convo = conversations.find((c) => c.id === data.invite.conversationId);
        if (convo) {
          setActiveConvo(convo);
          setMobileShowChat(true);
        }
      }
    }
  };

  /* User search debounce */
  useEffect(() => {
    if (searchRef.current) clearTimeout(searchRef.current);
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    searchRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        if (data.success) setSearchResults(data.users);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, [searchQuery]);

  const openDM = async (target: UserSearchResult) => {
    setDmCreating(true);
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername: target.username }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveConvo(data.conversation);
        setMobileShowChat(true);
        setShowNewDM(false);
        setSearchQuery('');
        setSearchResults([]);
      } else if (data.needsFriend) {
        // Auto-send a friend request and inform the user
        await sendFriendReq(target.username);
        alert(
          `You are not friends with ${target.displayName} yet. A friend request has been sent!`
        );
      }
    } finally {
      setDmCreating(false);
    }
  };

  /* Group add-member search debounce */
  useEffect(() => {
    if (groupAddSearchRef.current) clearTimeout(groupAddSearchRef.current);
    if (groupAddSearch.length < 2) {
      setGroupAddResults([]);
      return;
    }
    groupAddSearchRef.current = setTimeout(async () => {
      setGroupAddSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(groupAddSearch)}`);
        const data = await res.json();
        if (data.success) setGroupAddResults(data.users);
      } finally {
        setGroupAddSearching(false);
      }
    }, 350);
  }, [groupAddSearch]);

  const createGroup = async () => {
    if (!groupName.trim() || groupMembers.length === 0 || groupCreating) return;
    if (groupEncrypted && groupEncPassword.length < 8) return;
    if (groupEncrypted && groupEncPassword !== groupEncPasswordConfirm) return;
    setGroupCreating(true);
    try {
      const res = await fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'group',
          groupName: groupName.trim(),
          groupDescription: groupDesc.trim() || undefined,
          encrypted: groupEncrypted,
          members: groupMembers.map((m) => m.username),
        }),
      });
      const data = await res.json();
      if (data.success) {
        const convo = data.conversation;
        // If E2EE, derive and cache the key immediately so the creator doesn't need to re-enter
        if (groupEncrypted && groupEncPassword) {
          const key = await deriveKey(groupEncPassword, convo.id);
          encKeysRef.current.set(convo.id, key);
          setEncUnlockedIds((prev) => new Set([...prev, convo.id]));
          // Save password to sessionStorage so it survives page navigations in this session
          sessionStorage.setItem(`e2ee_${convo.id}`, groupEncPassword);
        }
        setActiveConvo(convo);
        setMobileShowChat(true);
        setShowNewGroup(false);
        setGroupName('');
        setGroupDesc('');
        setGroupMembers([]);
        setGroupEncrypted(false);
        setGroupEncPassword('');
        setGroupEncPasswordConfirm('');
      }
    } finally {
      setGroupCreating(false);
    }
  };

  /* Try to restore E2EE key from sessionStorage on conversation open */
  useEffect(() => {
    if (!activeConvo?.encrypted) return;
    const id = activeConvo.id;
    if (encKeysRef.current.has(id)) return; // already unlocked
    const saved = sessionStorage.getItem(`e2ee_${id}`);
    if (saved) {
      deriveKey(saved, id)
        .then((key) => {
          encKeysRef.current.set(id, key);
          setEncUnlockedIds((prev) => new Set([...prev, id]));
        })
        .catch(() => {
          /* ignore */
        });
    } else {
      // Prompt user for password
      setEncPromptConvoId(id);
      setEncPromptPassword('');
      setEncPromptError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeConvo?.id, activeConvo?.encrypted]);

  const unlockEncryptedConvo = async () => {
    if (!encPromptConvoId || !encPromptPassword || encPromptDeriving) return;
    setEncPromptDeriving(true);
    setEncPromptError('');
    try {
      const key = await deriveKey(encPromptPassword, encPromptConvoId);
      // Verify the key works by attempting to decrypt the first available message
      // (If no messages yet, just trust the password for now)
      const msgs = messages.filter((m) => m.deletedAt === null && !m.shareCard);
      if (msgs.length > 0) {
        const test = await decryptMessage(key, msgs[0].content);
        if (test === null) {
          setEncPromptError('Wrong password. Please try again.');
          setEncPromptDeriving(false);
          return;
        }
      }
      encKeysRef.current.set(encPromptConvoId, key);
      sessionStorage.setItem(`e2ee_${encPromptConvoId}`, encPromptPassword);
      setEncUnlockedIds((prev) => new Set([...prev, encPromptConvoId]));
      setEncPromptConvoId(null);
      setEncPromptPassword('');
    } catch {
      setEncPromptError('Failed to derive key. Please try again.');
    } finally {
      setEncPromptDeriving(false);
    }
  };

  /* Decrypt messages whenever messages or keys change */
  useEffect(() => {
    if (!activeConvo?.encrypted) return;
    const key = encKeysRef.current.get(activeConvo.id);
    if (!key) return;
    const toDecrypt = messages.filter(
      (m) => m.deletedAt === null && !m.shareCard && !(m.id in decryptedCache)
    );
    if (toDecrypt.length === 0) return;
    Promise.all(
      toDecrypt.map(async (m) => {
        const plain = await decryptMessage(key, m.content);
        return { id: m.id, plain: plain ?? '🔒 (undecryptable)' };
      })
    ).then((results) => {
      setDecryptedCache((prev) => {
        const next = { ...prev };
        for (const r of results) next[r.id] = r.plain;
        return next;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, activeConvo?.id, activeConvo?.encrypted, encUnlockedIds]);

  const groupInfoAction = async (action: string, payload?: Record<string, string>) => {
    if (!activeConvo) return;
    const res = await fetch(`/api/conversations/${activeConvo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    });
    const data = await res.json();
    if (data.success) setActiveConvo(data.conversation);
    return data;
  };

  const saveGroupEdit = async () => {
    if (!activeConvo || !groupEditName.trim()) return;
    setGroupEditSaving(true);
    try {
      await groupInfoAction('rename', {
        groupName: groupEditName,
        groupDescription: groupEditDesc,
      });
    } finally {
      setGroupEditSaving(false);
    }
  };

  const addMemberToGroup = async (user: UserSearchResult) => {
    if (!activeConvo) return;
    // Send a group invite instead of directly adding
    const res = await fetch('/api/group-invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conversationId: activeConvo.id, targetUsername: user.username }),
    });
    const data = await res.json();
    if (!data.success) {
      alert(data.error ?? 'Could not send invite.');
    }
    setGroupAddSearch('');
    setGroupAddResults([]);
  };

  const removeMemberFromGroup = async (targetUsername: string) => {
    await groupInfoAction('remove_member', { targetUsername });
  };

  const leaveGroup = async () => {
    if (!activeConvo) return;
    await groupInfoAction('leave');
    setActiveConvo(null);
    setShowGroupInfo(false);
    setMobileShowChat(false);
  };

  const transferAdmin = async (targetUsername: string) => {
    await groupInfoAction('transfer_admin', { targetUsername });
  };

  /* Image upload handler */
  const uploadImage = useCallback(
    async (file: File) => {
      if (imageUploading) return;
      setImageUploading(true);
      try {
        const url = await uploadHostedImage(file, '/api/msg-upload');
        setImagePreview({ url, name: file.name });
      } catch (error) {
        alert(error instanceof Error ? error.message : 'Upload failed.');
      } finally {
        setImageUploading(false);
      }
    },
    [imageUploading]
  );

  /* Paste handler: intercept pasted images */
  const handleComposePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = Array.from(e.clipboardData.items);
      const imageItem = items.find((i) => i.type.startsWith('image/'));
      if (imageItem) {
        e.preventDefault();
        const file = imageItem.getAsFile();
        if (file) uploadImage(file);
      }
    },
    [uploadImage]
  );

  const sendMessage = async (e: FormEvent) => {
    e.preventDefault();
    const hasImage = !!imagePreview;
    if (!activeConvo || (!draft.trim() && !hasImage) || sending) return;
    const isEncrypted = activeConvo.encrypted;
    const charLimit = isEncrypted ? E2EE_MAX_CHARS : MAX_CHARS;
    if (draft.trim().length > charLimit) return;
    setSending(true);
    let content: string;
    if (hasImage && !draft.trim()) {
      content = imagePreview!.url;
    } else if (hasImage) {
      content = `${draft.trim()}\n${imagePreview!.url}`;
    } else {
      content = draft.trim();
    }
    const reply: ReplyTo | null = replyingTo
      ? {
          messageId: replyingTo.id,
          content: replyingTo.content,
          senderDisplayName: replyingTo.senderDisplayName,
        }
      : null;
    setDraft('');
    setReplyingTo(null);
    setImagePreview(null);

    // Push optimistic message so it shows immediately
    const optMsg: Message = {
      id: `__opt_${Date.now()}`,
      conversationId: activeConvo.id,
      senderUserId: username,
      senderDisplayName: activeConvo.participantNames[username] || username,
      content,
      edited: false,
      editedAt: null,
      pinned: false,
      deletedAt: null,
      createdAt: Date.now(),
      reactions: {},
      replyTo: reply,
      shareCard: null,
      isNew: true,
      sending: true,
    };
    setOptimisticMsgs((prev) => [...prev, optMsg]);
    try {
      // Encrypt if E2EE group
      if (isEncrypted) {
        const key = encKeysRef.current.get(activeConvo.id);
        if (!key) {
          setSending(false);
          return;
        } // not unlocked
        content = await encryptMessage(key, content);
      }
      await fetch(`/api/conversations/${activeConvo.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, replyTo: reply }),
      });
    } finally {
      setSending(false);
      // Use rAF to refocus after React re-render
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
  };

  const submitEdit = async (messageId: string) => {
    if (!activeConvo || !editContent.trim()) return;
    setEditSaving(true);
    try {
      await fetch(`/api/conversations/${activeConvo.id}/${messageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'edit', content: editContent.trim() }),
      });
    } finally {
      setEditSaving(false);
      setEditingId(null);
    }
  };

  const deleteMsg = async (messageId: string) => {
    if (!activeConvo) return;
    await fetch(`/api/conversations/${activeConvo.id}/${messageId}`, { method: 'DELETE' });
    if (showPinned) loadPinned();
  };

  const togglePin = async (messageId: string) => {
    if (!activeConvo) return;
    await fetch(`/api/conversations/${activeConvo.id}/${messageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'pin' }),
    });
    if (showPinned) loadPinned();
  };

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!activeConvo) return;
    await fetch(`/api/conversations/${activeConvo.id}/${messageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'react', emoji }),
    });
  };

  const loadPinned = async () => {
    if (!activeConvo) return;
    const res = await fetch(`/api/conversations/${activeConvo.id}?pinned=true`);
    const data = await res.json();
    if (data.success) setPinnedMessages(data.messages);
  };

  const togglePinnedPanel = () => {
    if (!showPinned) loadPinned();
    setShowPinned((v) => !v);
  };

  const partnerName = (c: Conversation) => {
    if (c.type === 'group') return c.groupName ?? 'Group';
    const other = c.participantIds.find((p) => p !== username) ?? '';
    return c.participantNames[other] || other;
  };

  const partnerSubtitle = (c: Conversation) => {
    if (c.type === 'group') return `${c.participantIds.length} members`;
    return c.participantIds.find((p) => p !== username) ?? '';
  };

  // Deduplicate optimistic messages against real ones in the same render to avoid double-show.
  // When a real message from the current user arrives with a timestamp close to an optimistic
  // one, that optimistic is considered confirmed and excluded.
  const visibleMessages = (() => {
    const real = messages.filter((m) => m.deletedAt === null);
    if (optimisticMsgs.length === 0) return real;
    const oldestOptTime = optimisticMsgs[0].createdAt - 10_000;
    const confirmedCount = Math.min(
      real.filter((m) => m.senderUserId === username && m.createdAt >= oldestOptTime).length,
      optimisticMsgs.length
    );
    return [...real, ...optimisticMsgs.slice(confirmedCount)];
  })();
  const grouped: { date: string; msgs: Message[] }[] = [];
  for (const msg of visibleMessages) {
    const d = formatDate(msg.createdAt);
    const last = grouped[grouped.length - 1];
    if (last?.date === d) last.msgs.push(msg);
    else grouped.push({ date: d, msgs: [msg] });
  }

  const filteredConvos = conversations.filter((c) =>
    partnerName(c).toLowerCase().includes(convoFilter.toLowerCase())
  );

  if (sessionLoading || profileExists === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="text-primary h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!profileExists) {
    return <ProfileGate />;
  }

  return (
    <div className="flex h-full flex-col">
      {/* ═══ Voice call panel is now in the global layout (lib/call-context.tsx) ══ */}

      <div className="flex flex-1 overflow-hidden">
        {/* ═══ Conversation list ═════════════════════════════ */}
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'bg-card flex shrink-0 flex-col border-r border-white/7',
            'w-full md:w-72 lg:w-80',
            mobileShowChat && 'hidden md:flex'
          )}
        >
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/7 px-4">
            <div className="flex items-center gap-2">
              <MessageSquare className="text-primary h-4 w-4" />
              <span className="text-sm font-semibold">Messages</span>
            </div>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-lg hover:bg-white/8"
                    onClick={async () => {
                      const p = await Notification.requestPermission();
                      if (p) setNotifPermission(p);
                    }}
                  >
                    {notifPermission === 'granted' ? (
                      <Bell className="text-primary h-3.5 w-3.5" />
                    ) : (
                      <BellOff className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {notifPermission === 'granted' ? 'Notifications on' : 'Enable notifications'}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-lg hover:bg-white/8"
                    onClick={() => setShowNewGroup(true)}
                  >
                    <Users className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  New group chat
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 rounded-lg hover:bg-white/8"
                    onClick={() => setShowNewDM(true)}
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left" className="text-xs">
                  New conversation
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex shrink-0 border-b border-white/7">
            <button
              onClick={() => setSidebarTab('messages')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors',
                sidebarTab === 'messages'
                  ? 'text-primary border-primary border-b-2'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Chats
            </button>
            <button
              onClick={() => setSidebarTab('friends')}
              className={cn(
                'relative flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors',
                sidebarTab === 'friends'
                  ? 'text-primary border-primary border-b-2'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Users className="h-3.5 w-3.5" />
              Friends
              {friendRequests.length + groupInvites.length > 0 && (
                <span
                  className="absolute top-1 right-3 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold"
                  style={{ background: 'oklch(0.65 0.22 278)', color: 'white' }}
                >
                  {friendRequests.length + groupInvites.length}
                </span>
              )}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {sidebarTab === 'messages' ? (
              <>
                {/* Group invite banner */}
                {groupInvites.length > 0 && (
                  <div className="space-y-1.5 border-b border-white/7 px-3 py-2">
                    <p className="text-muted-foreground px-1 text-[10px] font-semibold tracking-wider uppercase">
                      Group Invites ({groupInvites.length})
                    </p>
                    {groupInvites.map((inv) => (
                      <div
                        key={inv.id}
                        className="bg-primary/5 border-primary/15 flex items-center gap-2 rounded-lg border px-2 py-1.5"
                      >
                        <div
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                          style={{ background: 'oklch(0.65 0.22 278 / 15%)' }}
                        >
                          <Users className="text-primary h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{inv.groupName}</p>
                          <p className="text-muted-foreground truncate text-[9px]">
                            from {inv.invitedByDisplayName}
                          </p>
                        </div>
                        <div className="flex gap-0.5">
                          <button
                            onClick={() => acceptGroupInvite(inv.id, true)}
                            className="flex h-6 w-6 items-center justify-center rounded-md text-green-400 transition-colors hover:bg-green-500/15"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => acceptGroupInvite(inv.id, false)}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex h-6 w-6 items-center justify-center rounded-md transition-colors"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="shrink-0 border-b border-white/7 px-3 py-2.5">
                  <div className="relative">
                    <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
                    <Input
                      value={convoFilter}
                      onChange={(e) => setConvoFilter(e.target.value)}
                      placeholder="Search conversations…"
                      className="focus:border-primary/40 h-8 border-white/10 bg-white/5 pl-8 text-xs"
                    />
                  </div>
                </div>

                {convoLoading ? (
                  <div className="flex h-24 items-center justify-center">
                    <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                  </div>
                ) : filteredConvos.length === 0 ? (
                  <div className="flex h-40 flex-col items-center justify-center gap-2 px-6 text-center">
                    <MessageSquare className="text-muted-foreground/30 h-8 w-8" />
                    <p className="text-muted-foreground text-xs">
                      {convoFilter ? 'No conversations match.' : 'No conversations yet. Start one!'}
                    </p>
                  </div>
                ) : (
                  <AnimatePresence initial={false}>
                    {filteredConvos.map((convo, i) => (
                      <ConvoItem
                        key={convo.id}
                        convo={convo}
                        name={partnerName(convo)}
                        subtitle={partnerSubtitle(convo)}
                        active={activeConvo?.id === convo.id}
                        username={username}
                        index={i}
                        pfpCache={pfpCache}
                        statusMap={statusMap}
                        onClick={() => {
                          setActiveConvo(convo);
                          setMobileShowChat(true);
                          setEditingId(null);
                        }}
                      />
                    ))}
                  </AnimatePresence>
                )}
              </>
            ) : (
              /*  Friends tab  */
              <FriendsPanel
                username={username}
                friends={friends}
                received={friendRequests}
                sent={sentFriendRequests}
                profileMap={friendProfileMap}
                statusMap={statusMap}
                friendSearchQuery={friendSearchQuery}
                friendSearchResults={friendSearchResults}
                friendSearching={friendSearching}
                friendRequestSending={friendRequestSending}
                isFriend={isFriend}
                pendingFrom={pendingFrom}
                sentTo={sentTo}
                onSearchChange={setFriendSearchQuery}
                onSendRequest={sendFriendReq}
                onRespond={respondFriendReq}
                onOpenDM={(targetUsername: string) => {
                  const u: UserSearchResult = {
                    username: targetUsername,
                    displayName: friendProfileMap[targetUsername]?.displayName ?? targetUsername,
                    schoolName: friendProfileMap[targetUsername]?.schoolName ?? '',
                    userType: '',
                  };
                  openDM(u);
                  setSidebarTab('messages');
                }}
              />
            )}
          </div>
        </motion.div>

        {/* ═══ Chat area ═════════════════════════════════════ */}
        <div className={cn('flex min-w-0 flex-1 flex-col', !mobileShowChat && 'hidden md:flex')}>
          {!activeConvo ? (
            <EmptyChat onNew={() => setShowNewDM(true)} />
          ) : (
            <>
              {/* Header — sticky so it stays visible when the outer scroll jumps */}
              <motion.div
                initial={{ y: -8, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="sticky top-0 z-10 flex h-14 min-w-0 shrink-0 items-center gap-2 border-b border-white/7 px-3"
                style={{ background: 'var(--card)' }}
              >
                <button
                  className="text-muted-foreground hover:text-foreground mr-0.5 shrink-0 md:hidden"
                  onClick={() => setMobileShowChat(false)}
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <Avatar
                  className={cn(
                    'h-8 w-8 shrink-0',
                    activeConvo.type === 'dm' &&
                      'hover:ring-primary/40 cursor-pointer transition-all hover:ring-2'
                  )}
                  onClick={() => {
                    if (activeConvo.type === 'dm') {
                      const partner = activeConvo.participantIds.find((p) => p !== username);
                      if (partner) setViewProfileUsername(partner);
                    }
                  }}
                >
                  {activeConvo.type === 'dm' &&
                    (() => {
                      const partner = activeConvo.participantIds.find((p) => p !== username);
                      const pfp = partner
                        ? pfpCache[partner] || activeConvo.participantPfpUrls[partner] || ''
                        : '';
                      return pfp ? <AvatarImage src={pfp} alt={partnerName(activeConvo)} /> : null;
                    })()}
                  <AvatarFallback
                    className="text-xs font-bold"
                    style={{
                      background:
                        'linear-gradient(135deg, oklch(0.65 0.22 278 / 40%), oklch(0.55 0.25 295 / 40%))',
                      color: 'oklch(0.78 0.15 278)',
                    }}
                  >
                    {activeConvo.type === 'group' ? (
                      <Users className="h-4 w-4" />
                    ) : (
                      initials(partnerName(activeConvo))
                    )}
                  </AvatarFallback>
                </Avatar>
                <div
                  className={cn('min-w-0 flex-1', activeConvo.type === 'dm' && 'cursor-pointer')}
                  onClick={() => {
                    if (activeConvo.type === 'dm') {
                      const partner = activeConvo.participantIds.find((p) => p !== username);
                      if (partner) setViewProfileUsername(partner);
                    }
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-semibold">{partnerName(activeConvo)}</p>
                    {activeConvo.encrypted && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <Lock className="text-primary h-3 w-3 shrink-0" />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          End-to-end encrypted
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {activeConvo.type === 'dm' &&
                      (() => {
                        const partner = activeConvo.participantIds.find((p) => p !== username);
                        const st = partner ? (statusMap[partner] ?? 'offline') : 'offline';
                        return (
                          <span
                            className="flex items-center gap-1 text-[10px]"
                            style={{ color: statusColor(st) }}
                          >
                            <span
                              className="inline-block h-1.5 w-1.5 rounded-full"
                              style={{ background: statusColor(st) }}
                            />
                            {statusLabel(st)}
                          </span>
                        );
                      })()}
                    {activeConvo.type === 'group' && (
                      <p className="text-muted-foreground truncate text-[10px]">
                        {partnerSubtitle(activeConvo)}
                      </p>
                    )}
                  </div>
                </div>
                {activeConvo.type === 'dm' && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={cn(
                          'h-8 w-8 shrink-0 rounded-lg',
                          call.phase !== 'idle' && 'bg-primary/15 text-primary'
                        )}
                        disabled={call.phase !== 'idle' || groupCall.phase !== 'idle'}
                        onClick={() => {
                          const partner = activeConvo.participantIds.find((p) => p !== username);
                          if (partner) call.startCall(username, partner);
                        }}
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      {call.phase !== 'idle' ? 'Call in progress' : 'Voice call'}
                    </TooltipContent>
                  </Tooltip>
                )}
                {activeConvo.type === 'group' && activeGroupCallInfo && (
                  // Active group call banner
                  <div
                    className="flex items-center gap-1.5 rounded-xl px-2 py-1 text-xs font-medium"
                    style={{
                      background: 'oklch(0.60 0.20 148 / 12%)',
                      border: '1px solid oklch(0.60 0.20 148 / 25%)',
                    }}
                  >
                    <span
                      className="h-1.5 w-1.5 animate-pulse rounded-full"
                      style={{ background: 'oklch(0.60 0.20 148)' }}
                    />
                    <span className="text-[10px]" style={{ color: 'oklch(0.65 0.18 148)' }}>
                      {activeGroupCallInfo.participantIds.length} in call
                    </span>
                    {groupCall.session?.callId === activeGroupCallInfo.callId ? (
                      <button
                        onClick={() => groupCall.leaveGroupCall()}
                        className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-colors hover:bg-red-500/15"
                        style={{ color: 'oklch(0.72 0.20 24)' }}
                      >
                        Leave
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          if (groupCall.phase !== 'idle' || call.phase !== 'idle') return;
                          groupCall.joinGroupCall(
                            activeGroupCallInfo.callId,
                            activeConvo.id,
                            username
                          );
                        }}
                        disabled={groupCall.phase !== 'idle' || call.phase !== 'idle'}
                        className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-colors hover:bg-green-500/15 disabled:opacity-50"
                        style={{ color: 'oklch(0.65 0.18 148)' }}
                      >
                        Join
                      </button>
                    )}
                  </div>
                )}
                {activeConvo.type === 'group' && !activeGroupCallInfo && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0 rounded-lg"
                        disabled={groupCall.phase !== 'idle' || call.phase !== 'idle'}
                        onClick={() => {
                          if (activeConvo.encrypted) {
                            setShowEncCallWarning(true);
                          } else {
                            groupCall.startGroupCall(username, activeConvo.id);
                          }
                        }}
                      >
                        <Phone className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Start voice call
                    </TooltipContent>
                  </Tooltip>
                )}
                {activeConvo.type === 'group' && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={cn(
                          'h-8 w-8 shrink-0 rounded-lg',
                          showGroupInfo && 'bg-primary/15 text-primary'
                        )}
                        onClick={() => {
                          setShowGroupInfo((v) => !v);
                          setShowPinned(false);
                          if (!showGroupInfo) {
                            setGroupEditName(activeConvo.groupName ?? '');
                            setGroupEditDesc(activeConvo.groupDescription ?? '');
                          }
                        }}
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Group info
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={cn(
                        'h-8 w-8 shrink-0 rounded-lg',
                        showPinned && 'bg-primary/15 text-primary'
                      )}
                      onClick={togglePinnedPanel}
                    >
                      <Pin className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    {showPinned ? 'Hide pinned' : 'Pinned messages'}
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={cn(
                        'h-8 w-8 shrink-0 rounded-lg',
                        showMsgSearch && 'bg-primary/15 text-primary'
                      )}
                      onClick={() => {
                        setShowMsgSearch((v) => !v);
                        setMsgSearchQuery('');
                        setMsgSearchResults([]);
                      }}
                    >
                      <SearchIcon className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Search messages
                  </TooltipContent>
                </Tooltip>
              </motion.div>

              <div className="flex min-h-0 flex-1">
                {/* Messages */}
                <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
                  {/* Message search panel */}
                  <AnimatePresence>
                    {showMsgSearch && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="shrink-0 overflow-hidden border-b border-white/7 bg-black/20 px-4 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <SearchIcon className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                          <input
                            autoFocus
                            className="placeholder:text-muted-foreground/50 flex-1 bg-transparent text-sm outline-none"
                            placeholder="Search messages…"
                            value={msgSearchQuery}
                            onChange={(e) => setMsgSearchQuery(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape') {
                                setShowMsgSearch(false);
                                setMsgSearchQuery('');
                              }
                            }}
                          />
                          {msgSearchQuery && (
                            <span className="text-muted-foreground shrink-0 text-[10px]">
                              {msgSearchResults.length} result
                              {msgSearchResults.length !== 1 ? 's' : ''}
                            </span>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 shrink-0"
                            onClick={() => {
                              setShowMsgSearch(false);
                              setMsgSearchQuery('');
                            }}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        {msgSearchResults.length > 0 && (
                          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                            {msgSearchResults.map((m) => (
                              <button
                                key={m.id}
                                type="button"
                                className="w-full rounded-lg bg-white/5 px-3 py-2 text-left transition-colors hover:bg-white/10"
                                onClick={() => {
                                  const el = document.getElementById(`msg-${m.id}`);
                                  if (el)
                                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  setShowMsgSearch(false);
                                  setMsgSearchQuery('');
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-primary text-[10px] font-medium">
                                    {m.senderDisplayName}
                                  </span>
                                  <span className="text-muted-foreground text-[10px]">
                                    {new Date(m.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-foreground/80 mt-0.5 truncate text-xs">
                                  {m.content}
                                </p>
                              </button>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div
                    ref={scrollRef}
                    onScroll={onScroll}
                    className="flex-1 space-y-1 overflow-y-auto px-4 py-3"
                  >
                    {msgLoading ? (
                      <div className="flex h-24 items-center justify-center">
                        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                      </div>
                    ) : visibleMessages.length === 0 ? (
                      <div className="flex h-full flex-col items-center justify-center gap-2 py-16 text-center">
                        <MessageSquare className="text-muted-foreground/20 h-10 w-10" />
                        <p className="text-muted-foreground text-xs">No messages yet. Say hello!</p>
                      </div>
                    ) : (
                      grouped.map((group) => (
                        <div key={group.date}>
                          <div className="flex items-center gap-3 py-3">
                            <div className="h-px flex-1 bg-white/7" />
                            <span className="text-muted-foreground shrink-0 text-[10px]">
                              {group.date}
                            </span>
                            <div className="h-px flex-1 bg-white/7" />
                          </div>
                          {group.msgs.map((msg, i) => (
                            <div key={msg.id} id={`msg-${msg.id}`}>
                              <MessageBubble
                                msg={msg}
                                displayContent={
                                  msg.sending
                                    ? msg.content
                                    : activeConvo?.encrypted
                                      ? (decryptedCache[msg.id] ?? null)
                                      : msg.content
                                }
                                replyToDisplayContent={
                                  activeConvo?.encrypted && msg.replyTo
                                    ? (decryptedCache[msg.replyTo.messageId] ?? null)
                                    : (msg.replyTo?.content ?? null)
                                }
                                isEncryptedConvo={activeConvo?.encrypted ?? false}
                                isMe={msg.senderUserId === username}
                                sameSender={
                                  i > 0 && group.msgs[i - 1].senderUserId === msg.senderUserId
                                }
                                isLastInGroup={
                                  i === group.msgs.length - 1 ||
                                  group.msgs[i + 1].senderUserId !== msg.senderUserId
                                }
                                isEditing={editingId === msg.id}
                                editContent={editContent}
                                editSaving={editSaving}
                                username={username}
                                isGroup={activeConvo?.type === 'group'}
                                canDelete={
                                  msg.senderUserId === username ||
                                  activeConvo?.adminUserId === username
                                }
                                isMobile={isMobile}
                                pfpUrl={
                                  pfpCache[msg.senderUserId] ||
                                  activeConvo?.participantPfpUrls[msg.senderUserId] ||
                                  ''
                                }
                                onAvatarClick={() => {
                                  if (msg.senderUserId !== username)
                                    setViewProfileUsername(msg.senderUserId);
                                }}
                                onMobileTap={() => setMobileActionMsg(msg)}
                                onEditStart={() => {
                                  setEditingId(msg.id);
                                  setEditContent(
                                    activeConvo?.encrypted
                                      ? (decryptedCache[msg.id] ?? msg.content)
                                      : msg.content
                                  );
                                }}
                                onEditChange={setEditContent}
                                onEditSubmit={() => submitEdit(msg.id)}
                                onEditCancel={() => setEditingId(null)}
                                onDelete={() => deleteMsg(msg.id)}
                                onPin={() => togglePin(msg.id)}
                                onReply={() => {
                                  setReplyingTo(msg);
                                  inputRef.current?.focus();
                                }}
                                onReact={(emoji) => toggleReaction(msg.id, emoji)}
                              />
                            </div>
                          ))}
                        </div>
                      ))
                    )}
                    <div ref={bottomRef} />
                  </div>

                  {/* Scroll-to-bottom button */}
                  <AnimatePresence>
                    {showScrollBtn && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 8 }}
                        transition={{ duration: 0.15 }}
                        onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
                        className="bg-card text-muted-foreground hover:text-foreground absolute right-4 bottom-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 shadow-lg transition-colors hover:bg-white/10"
                      >
                        <ChevronDown className="h-4 w-4" />
                      </motion.button>
                    )}
                  </AnimatePresence>

                  {/* Reply preview */}
                  <AnimatePresence>
                    {replyingTo && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-hidden px-4"
                      >
                        <div
                          className="mb-1 flex items-center gap-2 rounded-lg border border-l-2 border-white/10 bg-white/5 px-3 py-2"
                          style={{ borderLeftColor: 'oklch(0.65 0.22 278)' }}
                        >
                          <CornerUpLeft className="text-primary h-3 w-3 shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="text-primary text-[10px] font-semibold">
                              {replyingTo.senderDisplayName}
                            </p>
                            <p className="text-muted-foreground truncate text-[11px]">
                              {replyingTo.content}
                            </p>
                          </div>
                          <button
                            onClick={() => setReplyingTo(null)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Compose */}
                  <form
                    onSubmit={sendMessage}
                    className="flex shrink-0 flex-col gap-1 border-t border-white/7 px-4 py-3"
                    onPaste={handleComposePaste}
                    ref={composeAreaRef}
                  >
                    {/* Hidden file input */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          uploadImage(file);
                          e.target.value = '';
                        }
                      }}
                    />

                    {/* Encrypted group — locked banner */}
                    {activeConvo.encrypted && !encUnlockedIds.has(activeConvo.id) && (
                      <div className="mb-1 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                        <Lock className="h-3 w-3 shrink-0" />
                        Enter the group password to read and send messages.
                      </div>
                    )}

                    {/* Image preview strip */}
                    <AnimatePresence>
                      {imagePreview && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-1 flex items-center gap-2"
                        >
                          <div className="relative inline-block">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imagePreview.url}
                              alt={imagePreview.name}
                              className="h-20 w-auto max-w-40 rounded-lg border border-white/10 object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => setImagePreview(null)}
                              className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-black/80 transition-colors hover:bg-red-600/80"
                            >
                              <X className="h-3 w-3 text-white" />
                            </button>
                          </div>
                          <span className="text-muted-foreground max-w-30 truncate text-xs">
                            {imagePreview.name}
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* GIF / Emoji pickers — anchored above the toolbar, not in flow */}

                    {/* Toolbar + input row */}
                    <div className="relative flex items-end gap-1">
                      {/* Pickers float above the toolbar */}
                      <AnimatePresence>
                        {showGifPicker && (
                          <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.97 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bottom-full left-0 z-50 mb-2"
                          >
                            <GifPicker
                              onSelect={(url) => {
                                setImagePreview({ url, name: 'GIF' });
                                setShowGifPicker(false);
                              }}
                              onClose={() => setShowGifPicker(false)}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <AnimatePresence>
                        {showEmojiPicker && (
                          <motion.div
                            initial={{ opacity: 0, y: 6, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 6, scale: 0.97 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bottom-full left-0 z-50 mb-2"
                          >
                            <EmojiPicker
                              recentEmojis={recentEmojis}
                              onSelect={(emoji) => {
                                recordEmojiUsed(emoji);
                                setDraft((d) => d + emoji);
                                inputRef.current?.focus();
                              }}
                              onClose={() => setShowEmojiPicker(false)}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {/* Attachment button */}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground hover:text-foreground h-8 w-8 shrink-0"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={
                          imageUploading ||
                          (activeConvo.encrypted && !encUnlockedIds.has(activeConvo.id))
                        }
                        title="Upload image"
                      >
                        {imageUploading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Paperclip className="h-4 w-4" />
                        )}
                      </Button>

                      {/* GIF button */}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className={cn(
                          'text-muted-foreground hover:text-foreground h-8 w-8 shrink-0',
                          showGifPicker && 'text-primary'
                        )}
                        onClick={() => {
                          setShowGifPicker((v) => !v);
                          setShowEmojiPicker(false);
                        }}
                        disabled={activeConvo.encrypted && !encUnlockedIds.has(activeConvo.id)}
                        title="GIFs"
                      >
                        <Gift className="h-4 w-4" />
                      </Button>

                      {/* Emoji button */}
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className={cn(
                          'text-muted-foreground hover:text-foreground h-8 w-8 shrink-0',
                          showEmojiPicker && 'text-primary'
                        )}
                        onClick={() => {
                          setShowEmojiPicker((v) => !v);
                          setShowGifPicker(false);
                        }}
                        disabled={activeConvo.encrypted && !encUnlockedIds.has(activeConvo.id)}
                        title="Emoji"
                      >
                        <span className="text-base leading-none">😊</span>
                      </Button>

                      <div className="relative flex-1">
                        <Input
                          ref={inputRef}
                          value={draft}
                          onChange={(e) => {
                            const limit = activeConvo.encrypted ? E2EE_MAX_CHARS : MAX_CHARS;
                            if (e.target.value.length <= limit) setDraft(e.target.value);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendMessage(e as unknown as FormEvent);
                            }
                            if (e.key === 'Escape') {
                              setReplyingTo(null);
                              setShowGifPicker(false);
                              setShowEmojiPicker(false);
                            }
                          }}
                          placeholder={
                            activeConvo.encrypted && !encUnlockedIds.has(activeConvo.id)
                              ? '🔒 Locked — enter password above'
                              : imagePreview
                                ? 'Add a caption…'
                                : activeConvo.type === 'group'
                                  ? `Message ${activeConvo.groupName ?? 'group'}…`
                                  : `Message ${partnerName(activeConvo)}…`
                          }
                          className={cn(
                            'focus:border-primary/50 flex-1 border-white/10 bg-white/5 text-sm',
                            draft.length > HARD_UI_CHARS &&
                              !activeConvo.encrypted &&
                              'border-red-500/50 focus:border-red-500/70',
                            draft.length > WARN_CHARS &&
                              draft.length <= HARD_UI_CHARS &&
                              'border-amber-500/40 focus:border-amber-500/60'
                          )}
                          autoComplete="off"
                          disabled={
                            sending ||
                            (activeConvo.encrypted && !encUnlockedIds.has(activeConvo.id))
                          }
                        />
                      </div>
                      <Button
                        type="submit"
                        size="icon"
                        disabled={
                          (!draft.trim() && !imagePreview) ||
                          sending ||
                          (activeConvo.encrypted && !encUnlockedIds.has(activeConvo.id)) ||
                          (!activeConvo.encrypted && draft.length > MAX_CHARS)
                        }
                        className="h-9 w-9 shrink-0"
                        style={{ background: 'var(--primary)' }}
                      >
                        {sending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    {/* Character count feedback */}
                    {(() => {
                      const limit = activeConvo.encrypted ? E2EE_MAX_CHARS : MAX_CHARS;
                      const len = draft.length;
                      const showCount = activeConvo.encrypted ? len > 80 : len > WARN_CHARS;
                      if (!showCount) return null;
                      const overLimit = len > limit;
                      const nearLimit = !activeConvo.encrypted && len > WARN_CHARS;
                      return (
                        <div
                          className={cn(
                            'flex items-center justify-end gap-1 px-1 text-[10px]',
                            overLimit
                              ? 'text-red-400'
                              : nearLimit
                                ? 'text-amber-400'
                                : 'text-amber-400'
                          )}
                        >
                          {overLimit && <span>Message too long</span>}
                          <span className="font-mono tabular-nums">
                            {len}/{limit}
                          </span>
                        </div>
                      );
                    })()}
                    {/* E2EE info badge */}
                    {activeConvo.encrypted && encUnlockedIds.has(activeConvo.id) && (
                      <div className="text-primary/60 flex items-center gap-1 px-1 text-[10px]">
                        <ShieldCheck className="h-2.5 w-2.5" />
                        End-to-end encrypted · images are not encrypted
                        <button
                          type="button"
                          onClick={() => {
                            sessionStorage.removeItem(`e2ee_${activeConvo.id}`);
                            encKeysRef.current.delete(activeConvo.id);
                            setEncUnlockedIds((prev) => {
                              const next = new Set(prev);
                              next.delete(activeConvo.id);
                              return next;
                            });
                            setDecryptedCache({});
                            setEncPromptConvoId(activeConvo.id);
                            setEncPromptPassword('');
                            setEncPromptError('');
                          }}
                          className="text-muted-foreground/50 hover:text-destructive/70 ml-auto flex items-center gap-0.5 text-[10px] transition-colors"
                          title="Forget stored password"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                          Forget password
                        </button>
                      </div>
                    )}
                  </form>
                </div>

                {/* Pinned panel */}
                <AnimatePresence>
                  {showPinned && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 280, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="bg-card hidden shrink-0 flex-col overflow-hidden border-l border-white/7 md:flex"
                    >
                      <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/7 px-4">
                        <div className="flex items-center gap-2">
                          <Pin className="text-primary h-3.5 w-3.5" />
                          <span className="text-xs font-semibold">Pinned</span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => setShowPinned(false)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex-1 space-y-2 overflow-y-auto p-3">
                        {pinnedMessages.length === 0 ? (
                          <p className="text-muted-foreground py-8 text-center text-xs">
                            No pinned messages.
                          </p>
                        ) : (
                          <AnimatePresence>
                            {pinnedMessages.map((msg) => (
                              <motion.div
                                key={msg.id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                className="space-y-1 rounded-lg border border-white/8 bg-white/5 p-3"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-primary text-[10px] font-semibold">
                                    {msg.senderDisplayName}
                                  </span>
                                  <button
                                    onClick={() => togglePin(msg.id)}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    <PinOff className="h-3 w-3" />
                                  </button>
                                </div>
                                <p className="text-foreground/90 min-w-0 text-xs wrap-break-word">
                                  {decryptedCache[msg.id] ?? msg.content}
                                </p>
                                <p className="text-muted-foreground text-[9px]">
                                  {formatDate(msg.createdAt)} · {formatTime(msg.createdAt)}
                                </p>
                              </motion.div>
                            ))}
                          </AnimatePresence>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Group info panel */}
                <AnimatePresence>
                  {showGroupInfo && activeConvo?.type === 'group' && (
                    <motion.div
                      key="group-info"
                      initial={{ width: 0, opacity: 0 }}
                      animate={{ width: 280, opacity: 1 }}
                      exit={{ width: 0, opacity: 0 }}
                      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                      className="bg-card hidden shrink-0 flex-col overflow-hidden border-l border-white/7 md:flex"
                    >
                      <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/7 px-4">
                        <div className="flex items-center gap-2">
                          <Users className="text-primary h-3.5 w-3.5" />
                          <span className="text-xs font-semibold">Group Info</span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => setShowGroupInfo(false)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="flex-1 space-y-4 overflow-y-auto p-3">
                        {/* Edit name/desc — admin only */}
                        {activeConvo.adminUserId === username && (
                          <div className="space-y-2">
                            <p className="text-muted-foreground px-1 text-[10px] font-semibold tracking-widest uppercase">
                              Edit Group
                            </p>
                            <Input
                              value={groupEditName}
                              onChange={(e) => setGroupEditName(e.target.value)}
                              placeholder="Group name…"
                              className="focus:border-primary/40 h-8 border-white/10 bg-white/5 text-xs"
                            />
                            <Input
                              value={groupEditDesc}
                              onChange={(e) => setGroupEditDesc(e.target.value)}
                              placeholder="Description (optional)…"
                              className="focus:border-primary/40 h-8 border-white/10 bg-white/5 text-xs"
                            />
                            <Button
                              size="sm"
                              className="h-7 w-full text-xs"
                              disabled={!groupEditName.trim() || groupEditSaving}
                              onClick={saveGroupEdit}
                            >
                              {groupEditSaving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                'Save'
                              )}
                            </Button>
                          </div>
                        )}

                        {/* Members list */}
                        <div className="space-y-1">
                          <p className="text-muted-foreground px-1 text-[10px] font-semibold tracking-widest uppercase">
                            Members ({activeConvo.participantIds.length})
                          </p>
                          {activeConvo.participantIds.map((p) => (
                            <div
                              key={p}
                              className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5"
                            >
                              <Avatar className="h-6 w-6 shrink-0">
                                <AvatarFallback
                                  className="text-[9px] font-bold"
                                  style={{
                                    background:
                                      'linear-gradient(135deg, oklch(0.65 0.22 278 / 30%), oklch(0.55 0.25 295 / 30%))',
                                    color: 'oklch(0.78 0.15 278)',
                                  }}
                                >
                                  {initials(activeConvo.participantNames[p] || p)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs">
                                  {activeConvo.participantNames[p] || p}
                                </p>
                                {activeConvo.adminUserId === p && (
                                  <p className="text-primary/70 flex items-center gap-0.5 text-[9px]">
                                    <Crown className="h-2.5 w-2.5" /> Admin
                                  </p>
                                )}
                              </div>
                              {/* Admin actions on members */}
                              {activeConvo.adminUserId === username && p !== username && (
                                <div className="flex gap-0.5">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        className="text-muted-foreground hover:text-primary hover:bg-primary/10 flex h-5 w-5 items-center justify-center rounded"
                                        onClick={() => transferAdmin(p)}
                                      >
                                        <Crown className="h-3 w-3" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className="text-[10px]">
                                      Make admin
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <button
                                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex h-5 w-5 items-center justify-center rounded"
                                        onClick={() => removeMemberFromGroup(p)}
                                      >
                                        <UserMinus className="h-3 w-3" />
                                      </button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className="text-[10px]">
                                      Remove
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        {/* Add member — admin only */}
                        {activeConvo.adminUserId === username && (
                          <div className="space-y-1">
                            <p className="text-muted-foreground px-1 text-[10px] font-semibold tracking-widest uppercase">
                              Invite Member
                            </p>
                            <p className="text-muted-foreground/60 px-1 text-[9px]">
                              Sends an invite they can accept or decline.
                            </p>
                            <div className="relative">
                              <Search className="text-muted-foreground absolute top-1/2 left-2 h-3 w-3 -translate-y-1/2" />
                              <Input
                                value={groupAddSearch}
                                onChange={(e) => setGroupAddSearch(e.target.value)}
                                placeholder="Search…"
                                className="focus:border-primary/40 h-8 border-white/10 bg-white/5 pl-7 text-xs"
                              />
                            </div>
                            {groupAddSearching && (
                              <Loader2 className="text-muted-foreground mx-auto h-3 w-3 animate-spin" />
                            )}
                            {groupAddResults
                              .filter((u) => !activeConvo.participantIds.includes(u.username))
                              .map((u) => (
                                <button
                                  key={u.username}
                                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs hover:bg-white/8"
                                  onClick={() => addMemberToGroup(u)}
                                >
                                  <Avatar className="h-5 w-5 shrink-0">
                                    <AvatarFallback
                                      className="text-[8px]"
                                      style={{
                                        background:
                                          'linear-gradient(135deg, oklch(0.65 0.22 278 / 30%), oklch(0.55 0.25 295 / 30%))',
                                        color: 'oklch(0.78 0.15 278)',
                                      }}
                                    >
                                      {initials(u.displayName)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="truncate">{u.displayName}</span>
                                  <AtSign className="text-muted-foreground/40 ml-auto h-3 w-3 shrink-0" />
                                </button>
                              ))}
                          </div>
                        )}

                        {/* Leave group */}
                        <button
                          onClick={leaveGroup}
                          className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Leave group
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>

        {/* ═══ New DM modal ════════════════════════════════════ */}
        <AnimatePresence>
          {showNewDM && (
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
              onClick={() => setShowNewDM(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.18 }}
                className="bg-card w-full max-w-sm space-y-4 rounded-xl border border-white/10 p-5 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserPlus className="text-primary h-4 w-4" />
                    <h2 className="text-sm font-semibold">New Conversation</h2>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => setShowNewDM(false)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Separator className="bg-white/7" />

                {/* Friends quick-select */}
                {friends.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-[10px] font-semibold tracking-wider uppercase">
                      Your Friends
                    </p>
                    <div className="max-h-40 space-y-1 overflow-y-auto">
                      {friends.map((f) => {
                        const other = f.userAId === username ? f.userBId : f.userAId;
                        const p = friendProfileMap[other];
                        const st = statusMap[other] ?? 'offline';
                        return (
                          <button
                            key={other}
                            disabled={dmCreating}
                            onClick={() =>
                              openDM({
                                username: other,
                                displayName: p?.displayName ?? other,
                                schoolName: p?.schoolName ?? '',
                                userType: '',
                              })
                            }
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/8"
                          >
                            <div className="relative shrink-0">
                              <Avatar className="h-8 w-8">
                                {p?.pfpUrl && <AvatarImage src={p.pfpUrl} />}
                                <AvatarFallback
                                  className="text-xs font-bold"
                                  style={{
                                    background:
                                      'linear-gradient(135deg, oklch(0.65 0.22 278 / 30%), oklch(0.55 0.25 295 / 30%))',
                                    color: 'oklch(0.78 0.15 278)',
                                  }}
                                >
                                  {initials(p?.displayName ?? other)}
                                </AvatarFallback>
                              </Avatar>
                              {st !== 'offline' && (
                                <span
                                  className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2"
                                  style={{
                                    background: statusColor(st),
                                    borderColor: 'var(--card)',
                                  }}
                                />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium">
                                {p?.displayName ?? other}
                              </p>
                              <p className="text-[9px]" style={{ color: statusColor(st) }}>
                                {statusLabel(st)}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <Separator className="bg-white/7" />
                  </div>
                )}

                <div className="relative">
                  <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
                  <Input
                    autoFocus
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by username…"
                    className="focus:border-primary/50 border-white/10 bg-white/5 pl-8 text-sm"
                  />
                </div>
                <div className="min-h-20 space-y-1">
                  {searching && (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                    </div>
                  )}
                  {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                    <p className="text-muted-foreground py-6 text-center text-xs">
                      No users found.
                    </p>
                  )}
                  {searchResults.map((user) => (
                    <button
                      key={user.username}
                      onClick={() => openDM(user)}
                      disabled={dmCreating}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/8"
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback
                          className="text-xs font-bold"
                          style={{
                            background:
                              'linear-gradient(135deg, oklch(0.65 0.22 278 / 30%), oklch(0.55 0.25 295 / 30%))',
                            color: 'oklch(0.78 0.15 278)',
                          }}
                        >
                          {initials(user.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{user.displayName}</p>
                        <p className="text-muted-foreground truncate text-[10px]">
                          @{user.username}
                          {user.schoolName ? ` · ${user.schoolName}` : ''}
                          {isFriend(user.username) ? ' · Friend' : ''}
                        </p>
                      </div>
                      {dmCreating && (
                        <Loader2 className="ml-auto h-3.5 w-3.5 shrink-0 animate-spin" />
                      )}
                    </button>
                  ))}
                  {!searching && searchQuery.length < 2 && friends.length === 0 && (
                    <p className="text-muted-foreground py-4 text-center text-xs">
                      Add friends first to start conversations. Type to search users.
                    </p>
                  )}
                  {!searching && searchQuery.length < 2 && friends.length > 0 && (
                    <p className="text-muted-foreground py-2 text-center text-xs">
                      Or search for anyone above.
                    </p>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ New Group modal ═════════════════════════════════ */}
        <AnimatePresence>
          {showNewGroup && (
            <motion.div
              key="group-overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
              onClick={() => {
                setShowNewGroup(false);
                setGroupName('');
                setGroupDesc('');
                setGroupMembers([]);
                setGroupEncrypted(false);
                setGroupEncPassword('');
                setGroupEncPasswordConfirm('');
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                transition={{ duration: 0.18 }}
                className="bg-card max-h-[90dvh] w-full max-w-sm space-y-4 overflow-y-auto rounded-xl border border-white/10 p-5 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="text-primary h-4 w-4" />
                    <h2 className="text-sm font-semibold">New Group Chat</h2>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    onClick={() => {
                      setShowNewGroup(false);
                      setGroupName('');
                      setGroupDesc('');
                      setGroupMembers([]);
                      setGroupEncrypted(false);
                      setGroupEncPassword('');
                      setGroupEncPasswordConfirm('');
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Separator className="bg-white/7" />

                {/* Group name & description */}
                <div className="space-y-2">
                  <Input
                    autoFocus
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Group name…"
                    maxLength={80}
                    className="focus:border-primary/50 border-white/10 bg-white/5 text-sm"
                  />
                  <Input
                    value={groupDesc}
                    onChange={(e) => setGroupDesc(e.target.value)}
                    placeholder="Description (optional)…"
                    maxLength={200}
                    className="focus:border-primary/50 border-white/10 bg-white/5 text-sm"
                  />
                </div>

                {/* Member search */}
                <div className="space-y-2">
                  <p className="text-muted-foreground text-xs">Add members</p>
                  <div className="relative">
                    <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search by username…"
                      className="focus:border-primary/50 border-white/10 bg-white/5 pl-8 text-sm"
                    />
                  </div>
                  <div className="max-h-36 space-y-1 overflow-y-auto">
                    {searching && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
                      </div>
                    )}
                    {!searching &&
                      searchQuery.length >= 2 &&
                      searchResults.filter(
                        (u) => !groupMembers.find((m) => m.username === u.username)
                      ).length === 0 && (
                        <p className="text-muted-foreground py-3 text-center text-xs">
                          No more users found.
                        </p>
                      )}
                    {searchResults
                      .filter((u) => !groupMembers.find((m) => m.username === u.username))
                      .map((user) => (
                        <button
                          key={user.username}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition-colors hover:bg-white/8"
                          onClick={() => {
                            setGroupMembers((prev) => [...prev, user]);
                            setSearchQuery('');
                            setSearchResults([]);
                          }}
                        >
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarFallback
                              className="text-[10px] font-bold"
                              style={{
                                background:
                                  'linear-gradient(135deg, oklch(0.65 0.22 278 / 30%), oklch(0.55 0.25 295 / 30%))',
                                color: 'oklch(0.78 0.15 278)',
                              }}
                            >
                              {initials(user.displayName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-medium">{user.displayName}</p>
                            <p className="text-muted-foreground text-[10px]">@{user.username}</p>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Selected members chips */}
                {groupMembers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {groupMembers.map((m) => (
                      <span
                        key={m.username}
                        className="bg-primary/10 text-primary flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[11px]"
                      >
                        {m.displayName}
                        <button
                          onClick={() =>
                            setGroupMembers((prev) => prev.filter((x) => x.username !== m.username))
                          }
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/*  E2EE Toggle  */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => {
                      setGroupEncrypted((v) => !v);
                      setGroupEncPassword('');
                      setGroupEncPasswordConfirm('');
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all',
                      groupEncrypted
                        ? 'border-primary/50 bg-primary/8'
                        : 'border-white/10 bg-white/3 hover:bg-white/6'
                    )}
                  >
                    <div
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                        groupEncrypted ? 'bg-primary/20' : 'bg-white/8'
                      )}
                    >
                      <Lock
                        className={cn(
                          'h-4 w-4',
                          groupEncrypted ? 'text-primary' : 'text-muted-foreground'
                        )}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'text-xs font-semibold',
                          groupEncrypted ? 'text-primary' : 'text-foreground'
                        )}
                      >
                        End-to-end encryption
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-[10px] leading-relaxed">
                        Messages encrypted with AES-256-GCM. Password required to read.
                      </p>
                    </div>
                    <div
                      className={cn(
                        'relative h-5 w-9 shrink-0 rounded-full transition-all',
                        groupEncrypted ? 'bg-primary' : 'bg-white/15'
                      )}
                    >
                      <div
                        className={cn(
                          'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all',
                          groupEncrypted ? 'left-[calc(100%-18px)]' : 'left-0.5'
                        )}
                      />
                    </div>
                  </button>

                  {groupEncrypted && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2">
                        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                        <p className="text-[10px] leading-relaxed text-amber-300/90">
                          All participantIds need this password to read messages. It is{' '}
                          <strong>never</strong> sent to any server. Keep it safe — there is no
                          recovery option.
                        </p>
                      </div>
                      <div className="relative">
                        <Input
                          type={groupEncPasswordShow ? 'text' : 'password'}
                          value={groupEncPassword}
                          onChange={(e) => setGroupEncPassword(e.target.value)}
                          placeholder="Set encryption password (min 8 chars)…"
                          className="focus:border-primary/50 border-white/10 bg-white/5 pr-9 text-sm"
                          autoComplete="new-password"
                        />
                        <button
                          type="button"
                          onClick={() => setGroupEncPasswordShow((v) => !v)}
                          className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
                        >
                          {groupEncPasswordShow ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                      <Input
                        type={groupEncPasswordShow ? 'text' : 'password'}
                        value={groupEncPasswordConfirm}
                        onChange={(e) => setGroupEncPasswordConfirm(e.target.value)}
                        placeholder="Confirm password…"
                        className={cn(
                          'focus:border-primary/50 border-white/10 bg-white/5 text-sm',
                          groupEncPasswordConfirm &&
                            groupEncPasswordConfirm !== groupEncPassword &&
                            'border-red-500/50'
                        )}
                        autoComplete="new-password"
                      />
                      {groupEncPasswordConfirm && groupEncPasswordConfirm !== groupEncPassword && (
                        <p className="px-1 text-[10px] text-red-400">Passwords do not match.</p>
                      )}
                      {groupEncPassword.length > 0 && groupEncPassword.length < 8 && (
                        <p className="px-1 text-[10px] text-amber-400">
                          Password must be at least 8 characters.
                        </p>
                      )}
                      {/* Strength bar */}
                      {groupEncPassword.length >= 8 && (
                        <div className="space-y-1 px-1">
                          <div className="flex h-1 gap-1">
                            {[8, 12, 16, 20].map((threshold) => (
                              <div
                                key={threshold}
                                className={cn(
                                  'flex-1 rounded-full transition-all',
                                  groupEncPassword.length >= threshold
                                    ? groupEncPassword.length >= 20
                                      ? 'bg-green-500'
                                      : groupEncPassword.length >= 12
                                        ? 'bg-amber-400'
                                        : 'bg-amber-500/60'
                                    : 'bg-white/10'
                                )}
                              />
                            ))}
                          </div>
                          <p className="text-muted-foreground text-[9px]">
                            {groupEncPassword.length >= 20
                              ? 'Strong password'
                              : groupEncPassword.length >= 12
                                ? 'Good password'
                                : 'Weak — use a longer password'}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>

                <Button
                  className="w-full"
                  disabled={
                    !groupName.trim() ||
                    groupMembers.length === 0 ||
                    groupCreating ||
                    (groupEncrypted &&
                      (groupEncPassword.length < 8 || groupEncPassword !== groupEncPasswordConfirm))
                  }
                  onClick={createGroup}
                  style={{ background: 'var(--primary)' }}
                >
                  {groupCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : groupEncrypted ? (
                    <>
                      <Lock className="mr-2 h-3.5 w-3.5" />
                      Create Encrypted Group ({groupMembers.length + 1} members)
                    </>
                  ) : (
                    <>
                      <Users className="mr-2 h-3.5 w-3.5" />
                      Create Group ({groupMembers.length + 1} members)
                    </>
                  )}
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ═══ Mobile action sheet ════════════════════════════ */}
      <AnimatePresence>
        {mobileActionMsg && (
          <MobileActionSheet
            msg={mobileActionMsg}
            isMe={mobileActionMsg.senderUserId === username}
            canDelete={
              mobileActionMsg.senderUserId === username || activeConvo?.adminUserId === username
            }
            username={username}
            displayContent={
              activeConvo?.encrypted
                ? (decryptedCache[mobileActionMsg.id] ?? null)
                : mobileActionMsg.content
            }
            onClose={() => setMobileActionMsg(null)}
            onEdit={() => {
              setEditingId(mobileActionMsg.id);
              setEditContent(
                activeConvo?.encrypted
                  ? (decryptedCache[mobileActionMsg.id] ?? mobileActionMsg.content)
                  : mobileActionMsg.content
              );
            }}
            onDelete={() => deleteMsg(mobileActionMsg.id)}
            onPin={() => togglePin(mobileActionMsg.id)}
            onReply={() => {
              setReplyingTo(mobileActionMsg);
              inputRef.current?.focus();
            }}
            onReact={(emoji) => toggleReaction(mobileActionMsg.id, emoji)}
          />
        )}
      </AnimatePresence>

      {/* User profile modal */}
      <AnimatePresence>
        {viewProfileUsername && (
          <UserProfileModal
            username={viewProfileUsername}
            onClose={() => setViewProfileUsername(null)}
            onMessage={() => {
              // Open DM with this user
              const u: UserSearchResult = {
                username: viewProfileUsername,
                displayName:
                  friendProfileMap[viewProfileUsername]?.displayName ?? viewProfileUsername,
                schoolName: friendProfileMap[viewProfileUsername]?.schoolName ?? '',
                userType: '',
              };
              openDM(u);
              setViewProfileUsername(null);
            }}
            friendStatus={
              isFriend(viewProfileUsername)
                ? 'friends'
                : sentTo(viewProfileUsername)
                  ? 'pending_sent'
                  : pendingFrom(viewProfileUsername)
                    ? 'pending_received'
                    : 'none'
            }
            onAddFriend={() => sendFriendReq(viewProfileUsername)}
            onRespondFriend={(accept) => respondFriendReq(viewProfileUsername, accept)}
          />
        )}
      </AnimatePresence>

      {/* ═══ E2EE Password Prompt Modal ═══════════════════════ */}
      <AnimatePresence>
        {encPromptConvoId && (
          <motion.div
            key="enc-prompt-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.18 }}
              className="bg-card w-full max-w-sm space-y-4 rounded-xl border border-white/10 p-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{ background: 'oklch(0.65 0.22 278 / 15%)' }}
                >
                  <Lock className="text-primary h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold">Encrypted Group</h2>
                  <p className="text-muted-foreground text-[11px]">
                    Enter the group password to decrypt messages.
                  </p>
                </div>
              </div>
              <Separator className="bg-white/7" />
              <div className="relative">
                <Input
                  autoFocus
                  type={encPromptShow ? 'text' : 'password'}
                  value={encPromptPassword}
                  onChange={(e) => {
                    setEncPromptPassword(e.target.value);
                    setEncPromptError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') unlockEncryptedConvo();
                  }}
                  placeholder="Group password…"
                  className="focus:border-primary/50 border-white/10 bg-white/5 pr-9 text-sm"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setEncPromptShow((v) => !v)}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2"
                >
                  {encPromptShow ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              {encPromptError && (
                <p className="flex items-center gap-1.5 text-[11px] text-red-400">
                  <X className="h-3 w-3 shrink-0" />
                  {encPromptError}
                </p>
              )}
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setEncPromptConvoId(null);
                    setActiveConvo(null);
                    setMobileShowChat(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={!encPromptPassword || encPromptDeriving}
                  onClick={unlockEncryptedConvo}
                  style={{ background: 'var(--primary)' }}
                >
                  {encPromptDeriving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                      Unlock
                    </>
                  )}
                </Button>
              </div>
              <div className="flex items-start gap-2 rounded-lg border border-white/8 bg-white/3 px-3 py-2.5 text-left">
                <Info className="text-muted-foreground mt-0.5 h-3 w-3 shrink-0" />
                <p className="text-muted-foreground text-[10px] leading-relaxed">
                  The password is used locally to decrypt messages. It is never sent to any server.
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Group call encryption warning */}
      <AnimatePresence>
        {showEncCallWarning && (
          <GroupCallEncryptionNotice
            onCancel={() => setShowEncCallWarning(false)}
            onConfirm={() => {
              setShowEncCallWarning(false);
              if (activeConvo?.type === 'group') {
                groupCall.startGroupCall(username, activeConvo.id);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* 
   ProfileGate — shown when the user has no profile yet
 */
function ProfileGate() {
  const STEPS = [
    { icon: User, text: 'Choose a display name' },
    { icon: MessageSquare, text: 'Start messaging classmates' },
    { icon: Sparkles, text: 'React, reply, and more' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="flex h-full flex-col items-center justify-center gap-8 px-6 text-center"
    >
      {/* Animated icon */}
      <motion.div
        className="flex h-20 w-20 items-center justify-center rounded-3xl shadow-lg"
        style={{
          background:
            'linear-gradient(135deg, oklch(0.65 0.22 278 / 25%), oklch(0.55 0.25 295 / 25%))',
        }}
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
      >
        <MessageSquare className="text-primary h-9 w-9" />
      </motion.div>

      {/* Heading */}
      <div className="max-w-sm">
        <h2 className="mb-2 text-xl font-bold tracking-tight">Set up your profile first</h2>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Messaging requires a profile so classmates know who they're talking to. It only takes a
          few seconds.
        </p>
      </div>

      {/* Step strip */}
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-0">
        {STEPS.map(({ icon: Icon, text }, i) => (
          <div key={text} className="flex items-center gap-3 sm:gap-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.1, duration: 0.35, type: 'spring', stiffness: 260 }}
              className="text-muted-foreground flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium whitespace-nowrap"
            >
              <div
                className="text-primary flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                style={{ background: 'oklch(0.65 0.22 278 / 15%)' }}
              >
                <Icon className="h-3 w-3" />
              </div>
              {text}
            </motion.div>
            {i < STEPS.length - 1 && (
              <div className="mx-1 hidden h-px w-6 shrink-0 bg-white/10 sm:block" />
            )}
          </div>
        ))}
      </div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.35 }}
        className="flex flex-col items-center gap-3"
      >
        <a
          href="/profile"
          className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg transition-opacity hover:opacity-90 active:scale-95"
          style={{ background: 'var(--primary)' }}
        >
          Set up your profile
          <ArrowRight className="h-4 w-4" />
        </a>
        <p className="text-muted-foreground text-[11px]">
          Takes less than 30 seconds — just a display name is enough.
        </p>
      </motion.div>

      {/* Info note */}
      <div className="flex max-w-xs items-start gap-2 rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-left">
        <Info className="text-muted-foreground mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p className="text-muted-foreground text-[10px] leading-relaxed">
          Your display name is what others see. Your SchoolSoft username stays private.
        </p>
      </div>
    </motion.div>
  );
}

/* 
   FriendsPanel
 */
function FriendsPanel({
  username,
  friends,
  received,
  sent,
  profileMap,
  statusMap,
  friendSearchQuery,
  friendSearchResults,
  friendSearching,
  friendRequestSending,
  isFriend,
  pendingFrom,
  sentTo,
  onSearchChange,
  onSendRequest,
  onRespond,
  onOpenDM,
}: {
  username: string;
  friends: import('@/lib/useFriends').RTFriendship[];
  received: import('@/lib/useFriends').RTFriendship[];
  sent: import('@/lib/useFriends').RTFriendship[];
  profileMap: Record<string, import('@/lib/useFriends').FriendProfile>;
  statusMap: Record<string, UserStatus>;
  friendSearchQuery: string;
  friendSearchResults: UserSearchResult[];
  friendSearching: boolean;
  friendRequestSending: string | null;
  isFriend: (u: string) => boolean;
  pendingFrom: (u: string) => import('@/lib/useFriends').RTFriendship | undefined;
  sentTo: (u: string) => import('@/lib/useFriends').RTFriendship | undefined;
  onSearchChange: (q: string) => void;
  onSendRequest: (u: string) => void;
  onRespond: (from: string, accept: boolean) => void;
  onOpenDM: (u: string) => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Search bar */}
      <div className="shrink-0 border-b border-white/7 px-3 py-2.5">
        <div className="relative">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2" />
          <Input
            value={friendSearchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Add friend by username…"
            className="focus:border-primary/40 h-8 border-white/10 bg-white/5 pl-8 text-xs"
          />
        </div>
        {/* Search results */}
        {friendSearchQuery.length >= 2 && (
          <div className="mt-2 space-y-1">
            {friendSearching ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="text-muted-foreground h-3.5 w-3.5 animate-spin" />
              </div>
            ) : friendSearchResults.length === 0 ? (
              <p className="text-muted-foreground py-2 text-center text-[11px]">No users found.</p>
            ) : (
              friendSearchResults
                .filter((u) => u.username !== username)
                .map((u) => {
                  const alreadyFriend = isFriend(u.username);
                  const hasSent = !!sentTo(u.username);
                  const hasIncoming = !!pendingFrom(u.username);
                  return (
                    <div
                      key={u.username}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5"
                    >
                      <Avatar className="h-7 w-7 shrink-0">
                        <AvatarFallback
                          className="text-[10px] font-bold"
                          style={{
                            background:
                              'linear-gradient(135deg, oklch(0.65 0.22 278 / 30%), oklch(0.55 0.25 295 / 30%))',
                            color: 'oklch(0.78 0.15 278)',
                          }}
                        >
                          {initials(u.displayName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium">{u.displayName}</p>
                        <p className="text-muted-foreground text-[9px]">@{u.username}</p>
                      </div>
                      {alreadyFriend ? (
                        <span className="shrink-0 text-[10px] text-green-400">Friends</span>
                      ) : hasIncoming ? (
                        <button
                          onClick={() => onRespond(u.username, true)}
                          className="text-primary shrink-0 text-[10px] hover:underline"
                        >
                          Accept
                        </button>
                      ) : hasSent ? (
                        <span className="text-muted-foreground shrink-0 text-[10px]">Sent</span>
                      ) : (
                        <button
                          onClick={() => onSendRequest(u.username)}
                          disabled={friendRequestSending === u.username}
                          className="text-primary flex shrink-0 items-center gap-1 text-[10px] hover:underline"
                        >
                          {friendRequestSending === u.username ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <UserPlus className="h-3 w-3" />
                          )}
                          Add
                        </button>
                      )}
                    </div>
                  );
                })
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Pending requests */}
        {received.length > 0 && (
          <div className="border-b border-white/7 px-3 py-2">
            <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
              Pending ({received.length})
            </p>
            {received.map((f) => {
              const other = f.requestedById;
              const p = profileMap[other];
              return (
                <div key={f.id} className="flex items-center gap-2 py-1.5">
                  <Avatar className="h-8 w-8 shrink-0">
                    {p?.pfpUrl && <AvatarImage src={p.pfpUrl} />}
                    <AvatarFallback
                      className="text-[10px] font-bold"
                      style={{
                        background:
                          'linear-gradient(135deg, oklch(0.65 0.22 278 / 30%), oklch(0.55 0.25 295 / 30%))',
                        color: 'oklch(0.78 0.15 278)',
                      }}
                    >
                      {initials(p?.displayName ?? other)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium">{p?.displayName ?? other}</p>
                    <p className="text-muted-foreground text-[9px]">@{other}</p>
                  </div>
                  <div className="flex gap-0.5">
                    <button
                      onClick={() => onRespond(other, true)}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-green-400 transition-colors hover:bg-green-500/15"
                    >
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => onRespond(other, false)}
                      className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex h-6 w-6 items-center justify-center rounded-md transition-colors"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Friends list */}
        <div className="px-3 py-2">
          {friends.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Users className="text-muted-foreground/25 h-8 w-8" />
              <p className="text-muted-foreground text-xs">No friends yet.</p>
              <p className="text-muted-foreground/60 text-[10px]">Search above to add friends.</p>
            </div>
          ) : (
            <>
              <p className="text-muted-foreground mb-1.5 text-[10px] font-semibold tracking-wider uppercase">
                Friends —{' '}
                {
                  friends.filter((f) => {
                    const other = f.userAId === username ? f.userBId : f.userAId;
                    return (statusMap[other] ?? 'offline') !== 'offline';
                  }).length
                }{' '}
                online
              </p>
              {friends.map((f) => {
                const other = f.userAId === username ? f.userBId : f.userAId;
                const p = profileMap[other];
                const st = statusMap[other] ?? 'offline';
                return (
                  <div key={f.id} className="group flex items-center gap-2 py-1.5">
                    <div className="relative shrink-0">
                      <Avatar className="h-8 w-8">
                        {p?.pfpUrl && <AvatarImage src={p.pfpUrl} />}
                        <AvatarFallback
                          className="text-[10px] font-bold"
                          style={{
                            background:
                              'linear-gradient(135deg, oklch(0.65 0.22 278 / 30%), oklch(0.55 0.25 295 / 30%))',
                            color: 'oklch(0.78 0.15 278)',
                          }}
                        >
                          {initials(p?.displayName ?? other)}
                        </AvatarFallback>
                      </Avatar>
                      {st !== 'offline' && (
                        <span
                          className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2"
                          style={{ background: statusColor(st), borderColor: 'var(--card)' }}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{p?.displayName ?? other}</p>
                      <p className="text-[9px]" style={{ color: statusColor(st) }}>
                        {statusLabel(st)}
                      </p>
                    </div>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => onOpenDM(other)}
                          className="text-muted-foreground hover:text-primary hover:bg-primary/10 flex h-6 w-6 items-center justify-center rounded-md opacity-0 transition-all group-hover:opacity-100"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="left" className="text-[10px]">
                        Message
                      </TooltipContent>
                    </Tooltip>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* 
   ConvoItem
 */
function ConvoItem({
  convo,
  name,
  subtitle,
  active,
  username,
  index,
  pfpCache,
  statusMap,
  onClick,
}: {
  convo: Conversation;
  name: string;
  subtitle: string;
  active: boolean;
  username: string;
  index: number;
  pfpCache: Record<string, string>;
  statusMap: Record<string, UserStatus>;
  onClick: () => void;
}) {
  // No longer track unread for all conversations; only the current one

  const dmPartner = convo.type === 'dm' ? convo.participantIds.find((p) => p !== username) : null;
  const partnerStatus: UserStatus = dmPartner ? (statusMap[dmPartner] ?? 'offline') : 'offline';

  return (
    <motion.button
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: index * 0.03, ease: [0.22, 1, 0.36, 1] }}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors',
        active ? 'bg-white/8' : 'hover:bg-white/5'
      )}
      style={active ? { boxShadow: 'inset 2px 0 0 var(--primary)' } : undefined}
    >
      <div className="relative shrink-0">
        <Avatar className="h-9 w-9">
          {convo.type === 'dm' &&
            (() => {
              const partner = convo.participantIds.find((p) => p !== username);
              const pfp = partner
                ? pfpCache[partner] || convo.participantPfpUrls[partner] || ''
                : '';
              return pfp ? <AvatarImage src={pfp} alt={name} /> : null;
            })()}
          <AvatarFallback
            className="text-xs font-bold"
            style={{
              background:
                'linear-gradient(135deg, oklch(0.65 0.22 278 / 35%), oklch(0.55 0.25 295 / 35%))',
              color: 'oklch(0.78 0.15 278)',
            }}
          >
            {convo.type === 'group' ? <Users className="h-4 w-4" /> : initials(name)}
          </AvatarFallback>
        </Avatar>
        {/* Status dot for DMs */}
        {convo.type === 'dm' && partnerStatus !== 'offline' && (
          <span
            className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2"
            style={{ background: statusColor(partnerStatus), borderColor: 'var(--card)' }}
          />
        )}
        {/* unread indicator removed — only tracking current conversation */}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <span className={cn('truncate text-sm', 'font-medium')}>{name}</span>
          <div className="ml-1 flex shrink-0 items-center gap-1">
            {convo.encrypted && <Lock className="text-primary/60 h-2.5 w-2.5" />}
            {convo.lastAt > 0 && (
              <span className="text-muted-foreground text-[9px]">{relativeTime(convo.lastAt)}</span>
            )}
          </div>
        </div>
        <p className={cn('truncate text-[11px]', 'text-muted-foreground')}>
          {convo.lastMessage
            ? (convo.lastSenderUserId === username
                ? 'You: '
                : convo.type === 'group'
                  ? (convo.participantNames[convo.lastSenderUserId]?.split(' ')[0] ??
                      convo.lastSenderUserId) + ': '
                  : '') + convo.lastMessage
            : subtitle}
        </p>
      </div>
    </motion.button>
  );
}

/* 
   Share Card Bubble — rendered inside a MessageBubble
 */

// Grade colours matching OVERALL_GRADE_STYLE in the assignment page
const SHARE_GRADE_STYLE: Record<string, { bg: string; color: string; border: string }> = {
  A: {
    bg: 'oklch(0.65 0.22 278 / 22%)',
    color: 'oklch(0.80 0.18 278)',
    border: 'oklch(0.65 0.22 278 / 40%)',
  },
  B: {
    bg: 'oklch(0.65 0.20 245 / 22%)',
    color: 'oklch(0.78 0.17 245)',
    border: 'oklch(0.65 0.20 245 / 40%)',
  },
  C: {
    bg: 'oklch(0.65 0.18 210 / 22%)',
    color: 'oklch(0.78 0.16 210)',
    border: 'oklch(0.65 0.18 210 / 40%)',
  },
  D: {
    bg: 'oklch(0.65 0.20 175 / 22%)',
    color: 'oklch(0.75 0.18 175)',
    border: 'oklch(0.65 0.20 175 / 40%)',
  },
  E: {
    bg: 'oklch(0.65 0.22 148 / 22%)',
    color: 'oklch(0.72 0.18 148)',
    border: 'oklch(0.65 0.22 148 / 40%)',
  },
  F: { bg: 'oklch(1 0 0 / 8%)', color: 'oklch(0.55 0 0)', border: 'oklch(1 0 0 / 15%)' },
  '—': { bg: 'oklch(1 0 0 / 6%)', color: 'oklch(0.50 0 0)', border: 'oklch(1 0 0 / 12%)' },
};

const STATUS_DOT: Record<string, string> = {
  draft: 'oklch(0.75 0.10 80)',
  published: 'oklch(0.72 0.18 148)',
  archived: 'oklch(0.55 0.02 260)',
};

function NoteFullModal({ card, onClose }: { card: NoteShareCard; onClose: () => void }) {
  const dotColor = STATUS_DOT[card.status] ?? STATUS_DOT.draft;
  // Close on Escape
  useEffect(() => {
    const handler = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="bg-card flex w-full flex-col overflow-hidden rounded-t-3xl border border-white/10 shadow-2xl sm:max-w-xl sm:rounded-2xl"
        style={{ maxHeight: '88dvh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-center gap-2.5 border-b px-4 py-3"
          style={{ borderColor: 'oklch(1 0 0 / 8%)' }}
        >
          <StickyNote className="h-3.5 w-3.5 shrink-0 opacity-50" />
          <span className="flex-1 truncate text-sm font-semibold">{card.title || 'Untitled'}</span>
          <span
            className="mr-1 flex items-center gap-1 text-[10px] font-medium"
            style={{ color: dotColor }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: dotColor }}
            />
            {card.status}
          </span>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded-lg p-1 transition-colors hover:bg-white/8"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {card.fullContent ? (
            <div className="prose prose-invert prose-sm prose-headings:font-semibold prose-headings:text-foreground prose-p:text-foreground/80 prose-p:leading-relaxed prose-code:bg-white/8 prose-code:px-1 prose-code:rounded prose-code:text-xs prose-pre:bg-white/6 prose-pre:rounded-xl prose-pre:p-3 prose-blockquote:border-l-primary/40 prose-blockquote:text-foreground/60 prose-a:text-primary prose-strong:text-foreground prose-li:text-foreground/80 max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{card.fullContent}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">{card.preview || 'No content.'}</p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function NoteCardBubble({ card, isMe }: { card: NoteShareCard; isMe: boolean }) {
  const [open, setOpen] = useState(false);
  const dotColor = STATUS_DOT[card.status] ?? STATUS_DOT.draft;
  return (
    <>
      <div
        className="group/notecard mt-1.5 cursor-pointer overflow-hidden rounded-2xl"
        style={{
          background: isMe ? 'oklch(0 0 0 / 22%)' : 'oklch(1 0 0 / 6%)',
          border: `1px solid ${isMe ? 'oklch(1 0 0 / 14%)' : 'oklch(1 0 0 / 10%)'}`,
          minWidth: 230,
          maxWidth: 310,
        }}
        onClick={() => setOpen(true)}
      >
        {/* Header row */}
        <div
          className="flex items-center gap-2 border-b px-3 py-2"
          style={{ borderColor: isMe ? 'oklch(1 0 0 / 12%)' : 'oklch(1 0 0 / 7%)' }}
        >
          <StickyNote className="h-3 w-3 shrink-0 opacity-60" />
          <span className="flex-1 text-[10px] font-semibold tracking-wider uppercase opacity-55">
            Note
          </span>
          <span
            className="flex items-center gap-1 text-[9px] font-medium"
            style={{ color: dotColor }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: dotColor }}
            />
            {card.status}
          </span>
        </div>
        {/* Body */}
        <div className="px-3 py-2.5">
          <p className="mb-1 truncate text-sm leading-snug font-semibold">
            {card.title || 'Untitled'}
          </p>
          {card.preview && (
            <p className="line-clamp-2 text-[11px] leading-relaxed opacity-55">{card.preview}</p>
          )}
          <div
            className="mt-2 flex items-center gap-1 text-[10px] opacity-0 transition-opacity group-hover/notecard:opacity-60"
            style={{ color: 'oklch(0.72 0.18 148)' }}
          >
            <BookOpen className="h-2.5 w-2.5" />
            <span>View full note</span>
          </div>
        </div>
      </div>
      <AnimatePresence>
        {open && <NoteFullModal card={card} onClose={() => setOpen(false)} />}
      </AnimatePresence>
    </>
  );
}

function GradeCardBubble({ card, isMe }: { card: GradeShareCard; isMe: boolean }) {
  const gs = SHARE_GRADE_STYLE[card.grade] ?? SHARE_GRADE_STYLE['—'];
  return (
    <div
      className="mt-1.5 overflow-hidden rounded-2xl"
      style={{
        background: isMe ? 'oklch(0 0 0 / 22%)' : 'oklch(1 0 0 / 6%)',
        border: `1px solid ${isMe ? 'oklch(1 0 0 / 14%)' : 'oklch(1 0 0 / 10%)'}`,
        minWidth: 230,
        maxWidth: 310,
      }}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-2 border-b px-3 py-2"
        style={{ borderColor: isMe ? 'oklch(1 0 0 / 12%)' : 'oklch(1 0 0 / 7%)' }}
      >
        <BarChart2 className="h-3 w-3 shrink-0 opacity-60" />
        <span className="flex-1 text-[10px] font-semibold tracking-wider uppercase opacity-55">
          Grade
        </span>
        {card.confidence === 'estimated' && (
          <span
            className="rounded-full px-1.5 py-0.5 text-[9px] font-medium"
            style={{ background: 'oklch(0.75 0.16 82 / 18%)', color: 'oklch(0.78 0.14 82)' }}
          >
            est.
          </span>
        )}
      </div>
      {/* Body */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-black"
          style={{
            background: gs.bg,
            color: gs.color,
            border: `1.5px solid ${gs.border}`,
            fontSize: '1.4rem',
          }}
        >
          {card.grade}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm leading-snug font-semibold">{card.assignmentTitle}</p>
          <p className="mt-0.5 truncate text-[10px] opacity-55">{card.subjectName}</p>
          {card.totalPoints && (
            <p className="mt-0.5 font-mono text-[9px] opacity-40">{card.totalPoints} pts</p>
          )}
        </div>
      </div>
    </div>
  );
}

const DECK_BUBBLE_COLORS: Record<string, { from: string; to: string }> = {
  violet: { from: 'oklch(0.65 0.22 278)', to: 'oklch(0.55 0.25 295)' },
  rose: { from: 'oklch(0.68 0.22 10)', to: 'oklch(0.58 0.26 340)' },
  amber: { from: 'oklch(0.78 0.17 75)', to: 'oklch(0.68 0.20 55)' },
  emerald: { from: 'oklch(0.70 0.18 148)', to: 'oklch(0.60 0.22 165)' },
  sky: { from: 'oklch(0.72 0.17 220)', to: 'oklch(0.62 0.22 240)' },
  slate: { from: 'oklch(0.60 0.04 255)', to: 'oklch(0.48 0.05 265)' },
};

function FlashDeckCardBubble({
  card,
  isMe,
  messageId,
}: {
  card: FlashDeckShareCard;
  isMe: boolean;
  messageId: string;
}) {
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [importErr, setImportErr] = useState('');
  const c = DECK_BUBBLE_COLORS[card.color] ?? DECK_BUBBLE_COLORS.violet;

  async function importDeck() {
    if (importing || imported) return;
    setImporting(true);
    setImportErr('');
    try {
      const res = await fetch('/api/flashcards/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deckId: card.deckId, messageId }),
      });
      const data = await res.json();
      if (data.success) {
        setImported(true);
      } else {
        setImportErr(data.error ?? 'Import failed.');
      }
    } catch {
      setImportErr('Network error.');
    } finally {
      setImporting(false);
    }
  }

  return (
    <div
      className="mt-1.5 overflow-hidden rounded-2xl"
      style={{
        background: isMe ? 'oklch(0 0 0 / 22%)' : 'oklch(1 0 0 / 6%)',
        border: `1px solid ${isMe ? 'oklch(1 0 0 / 14%)' : 'oklch(1 0 0 / 10%)'}`,
        minWidth: 230,
        maxWidth: 310,
      }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 border-b px-3 py-2"
        style={{ borderColor: isMe ? 'oklch(1 0 0 / 12%)' : 'oklch(1 0 0 / 7%)' }}
      >
        <div
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
          style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})` }}
        >
          <BookOpen className="h-3 w-3 text-white" />
        </div>
        <span className="flex-1 text-[10px] font-semibold tracking-wider uppercase opacity-55">
          Flashcard deck
        </span>
        <span
          className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium"
          style={{ background: `${c.from}22`, color: c.from }}
        >
          {card.cardCount} card{card.cardCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Body */}
      <div className="px-3 py-2.5">
        <p className="text-sm leading-snug font-semibold">{card.title}</p>
        {card.description && (
          <p className="mt-0.5 line-clamp-2 text-[11px] opacity-55">{card.description}</p>
        )}
        {card.subjectName && <p className="mt-1 text-[10px] opacity-40">{card.subjectName}</p>}
        {card.tags.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {card.tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className="rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                style={{ background: `${c.from}15`, color: c.from }}
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Import button */}
      <div
        className="border-t px-3 pt-0.5 pb-3"
        style={{ borderColor: isMe ? 'oklch(1 0 0 / 8%)' : 'oklch(1 0 0 / 6%)' }}
      >
        {importErr && <p className="mb-1.5 text-[10px] text-red-400">{importErr}</p>}
        <button
          onClick={importDeck}
          disabled={importing || imported}
          className={cn(
            'mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-1.5 text-[11px] font-semibold transition-all',
            imported
              ? 'cursor-default opacity-60'
              : importing
                ? 'cursor-wait opacity-50'
                : 'hover:opacity-90 active:scale-[0.98]'
          )}
          style={{
            background: imported
              ? 'oklch(1 0 0 / 8%)'
              : `linear-gradient(135deg, ${c.from}, ${c.to})`,
            color: imported ? 'oklch(0.55 0 0)' : 'white',
          }}
        >
          {importing ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" /> Importing...
            </>
          ) : imported ? (
            <>
              <Check className="h-3 w-3" /> Added to your decks
            </>
          ) : (
            <>
              <Download className="h-3 w-3" /> Import deck
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function ShareCardBubble({
  card,
  isMe,
  messageId,
}: {
  card: ShareCard;
  isMe: boolean;
  messageId: string;
}) {
  if (card.type === 'note') return <NoteCardBubble card={card} isMe={isMe} />;
  if (card.type === 'flashdeck')
    return <FlashDeckCardBubble card={card} isMe={isMe} messageId={messageId} />;
  return <GradeCardBubble card={card} isMe={isMe} />;
}

/* 
   MessageBubble
 */
function MessageBubble({
  msg,
  displayContent,
  replyToDisplayContent,
  isEncryptedConvo,
  isMe,
  sameSender,
  isLastInGroup,
  isEditing,
  editContent,
  editSaving,
  username,
  isGroup,
  canDelete,
  isMobile,
  onMobileTap,
  pfpUrl,
  onAvatarClick,
  onEditStart,
  onEditChange,
  onEditSubmit,
  onEditCancel,
  onDelete,
  onPin,
  onReply,
  onReact,
}: {
  msg: Message;
  displayContent: string | null;
  isEncryptedConvo: boolean;
  isMe: boolean;
  sameSender: boolean;
  isLastInGroup: boolean;
  isEditing: boolean;
  editContent: string;
  editSaving: boolean;
  username: string;
  isGroup: boolean;
  canDelete: boolean;
  replyToDisplayContent?: string | null;
  isMobile: boolean;
  onMobileTap: () => void;
  pfpUrl?: string;
  onAvatarClick?: () => void;
  onEditStart: () => void;
  onEditChange: (v: string) => void;
  onEditSubmit: () => void;
  onEditCancel: () => void;
  onDelete: () => void;
  onPin: () => void;
  onReply: () => void;
  onReact: (emoji: string) => void;
}) {
  const [hover, setHover] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(displayContent ?? msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const reactionEntries = Object.entries(msg.reactions ?? {}).filter(([, u]) => u.length > 0);

  return (
    <motion.div
      layout
      initial={msg.isNew ? { opacity: 0, y: 14, scale: 0.96 } : false}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'group flex gap-2',
        isMe ? 'flex-row-reverse' : 'flex-row',
        sameSender ? 'mt-0.5' : 'mt-3'
      )}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setShowPicker(false);
      }}
    >
      {/* Avatar */}
      <div className="mt-0.5 w-7 shrink-0">
        {!sameSender && (
          <Avatar
            className={cn(
              'h-7 w-7',
              !isMe &&
                onAvatarClick &&
                'hover:ring-primary/30 cursor-pointer transition-all hover:ring-2'
            )}
            onClick={() => {
              if (!isMe && onAvatarClick) onAvatarClick();
            }}
          >
            {pfpUrl && <AvatarImage src={pfpUrl} alt={msg.senderDisplayName} />}
            <AvatarFallback
              className="text-[10px] font-bold"
              style={{
                background: isMe
                  ? 'linear-gradient(135deg, oklch(0.65 0.22 278 / 50%), oklch(0.55 0.25 295 / 50%))'
                  : 'linear-gradient(135deg, oklch(0.50 0.18 150 / 40%), oklch(0.45 0.20 160 / 40%))',
                color: isMe ? 'oklch(0.82 0.15 278)' : 'oklch(0.82 0.12 150)',
              }}
            >
              {initials(msg.senderDisplayName)}
            </AvatarFallback>
          </Avatar>
        )}
      </div>

      {/* Content column */}
      <div className={cn('flex max-w-[70%] min-w-0 flex-col', isMe ? 'items-end' : 'items-start')}>
        {!sameSender && !isMe && (
          <span className="text-muted-foreground mb-0.5 px-1 text-[10px]">
            {msg.senderDisplayName}
          </span>
        )}

        {/* Reply quote */}
        {msg.replyTo && (
          <div
            className="mb-1 flex w-full min-w-0 items-start gap-1.5 rounded-lg border border-l-2 border-white/8 bg-white/5 px-2.5 py-1.5"
            style={{ borderLeftColor: 'oklch(0.65 0.22 278 / 60%)' }}
          >
            <CornerUpLeft className="text-primary/60 mt-0.5 h-2.5 w-2.5 shrink-0" />
            <div className="min-w-0 overflow-hidden">
              <p className="text-primary/80 truncate text-[9px] font-semibold">
                {msg.replyTo.senderDisplayName}
              </p>
              <p className="text-muted-foreground truncate text-[10px]">
                {replyToDisplayContent ?? msg.replyTo.content}
              </p>
            </div>
          </div>
        )}

        <div className="relative w-full min-w-0">
          {isEditing ? (
            <div className="flex items-center gap-1.5">
              <Input
                autoFocus
                value={editContent}
                onChange={(e) => onEditChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    onEditSubmit();
                  }
                  if (e.key === 'Escape') onEditCancel();
                }}
                className="border-primary/40 min-w-50 bg-white/8 text-sm"
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-green-400"
                onClick={onEditSubmit}
                disabled={editSaving}
              >
                {editSaving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="text-muted-foreground h-7 w-7"
                onClick={onEditCancel}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          ) : (
            <div
              className={cn(
                'rounded-2xl px-3.5 py-2 text-sm wrap-break-word',
                isMe ? 'rounded-tr-sm text-white' : 'text-foreground rounded-tl-sm bg-white/8',
                isMobile && 'cursor-pointer transition-opacity select-none active:opacity-75',
                msg.sending && 'opacity-60'
              )}
              style={isMe ? { background: 'var(--primary)' } : undefined}
              onClick={() => {
                if (isMobile) onMobileTap();
              }}
            >
              {msg.shareCard ? (
                <ShareCardBubble card={msg.shareCard} isMe={isMe} messageId={msg.id} />
              ) : isEncryptedConvo && displayContent === null ? (
                <span className="text-muted-foreground/60 flex items-center gap-1.5 text-xs italic">
                  <Loader2 className="h-3 w-3 animate-spin" /> Decrypting…
                </span>
              ) : (
                <>
                  <MessageContent text={displayContent ?? msg.content} isMe={isMe} />
                  {msg.pinned && <Pin className="ml-1.5 inline h-2.5 w-2.5 opacity-60" />}
                </>
              )}
            </div>
          )}

          {/* Action toolbar — desktop hover only */}
          <AnimatePresence>
            {hover && !isEditing && !isMobile && !msg.sending && (
              <motion.div
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.88 }}
                transition={{ duration: 0.1 }}
                className={cn(
                  'bg-card absolute top-1/2 z-10 flex -translate-y-1/2 items-center gap-0.5 rounded-lg border border-white/10 px-1 py-0.5 shadow-lg',
                  isMe ? 'right-full mr-2' : 'left-full ml-2'
                )}
              >
                {/* Emoji picker trigger */}
                <div className="relative">
                  <ActionBtn icon={Smile} label="React" onClick={() => setShowPicker((v) => !v)} />
                  <AnimatePresence>
                    {showPicker && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.85, y: 4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{ duration: 0.12 }}
                        className={cn(
                          'bg-card absolute bottom-full z-20 mb-1.5 flex gap-0.5 rounded-xl border border-white/10 p-1.5 shadow-xl',
                          isMe ? 'right-0' : 'left-0'
                        )}
                      >
                        {QUICK_REACTIONS.map((e) => (
                          <button
                            key={e}
                            onClick={() => {
                              onReact(e);
                              setShowPicker(false);
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-base transition-all hover:scale-125 hover:bg-white/10"
                          >
                            {e}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <ActionBtn icon={CornerUpLeft} label="Reply" onClick={onReply} />
                <ActionBtn
                  icon={copied ? Check : Copy}
                  label={copied ? 'Copied!' : 'Copy'}
                  onClick={copy}
                />
                <ActionBtn
                  icon={msg.pinned ? PinOff : Pin}
                  label={msg.pinned ? 'Unpin' : 'Pin'}
                  onClick={onPin}
                />
                {isMe && <ActionBtn icon={Pencil} label="Edit" onClick={onEditStart} />}
                {canDelete && <ActionBtn icon={Trash2} label="Delete" onClick={onDelete} danger />}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Reactions */}
        {reactionEntries.length > 0 && (
          <div
            className={cn(
              'mt-1 flex flex-wrap gap-1 px-0.5',
              isMe ? 'justify-end' : 'justify-start'
            )}
          >
            {reactionEntries.map(([emoji, users]) => {
              const reacted = users.includes(username);
              return (
                <motion.button
                  key={emoji}
                  layout
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  onClick={() => onReact(emoji)}
                  className={cn(
                    'flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] transition-colors',
                    reacted
                      ? 'border-primary/40 bg-primary/10 text-foreground'
                      : 'text-muted-foreground border-white/10 bg-white/5 hover:border-white/20'
                  )}
                >
                  <span>{emoji}</span>
                  <span className="font-medium tabular-nums">{users.length}</span>
                </motion.button>
              );
            })}
          </div>
        )}

        <div className="mt-0.5 flex items-center gap-1 px-1">
          {isLastInGroup &&
            (msg.sending ? (
              <span className="text-muted-foreground/50 flex items-center gap-1 text-[9px]">
                <Clock className="h-2.5 w-2.5 animate-pulse" /> Sending
              </span>
            ) : (
              <span className="text-muted-foreground text-[9px]">{formatTime(msg.createdAt)}</span>
            ))}
          {msg.edited && !msg.sending && (
            <span className="text-muted-foreground text-[9px] italic">(edited)</span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* 
   ActionBtn
 */
function ActionBtn({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-md transition-colors',
            danger
              ? 'text-muted-foreground hover:text-destructive hover:bg-destructive/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-white/10'
          )}
        >
          <Icon className="h-3 w-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

/* 
   EmptyChat
 */
function EmptyChat({ onNew }: { onNew: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center"
    >
      <motion.div
        className="bg-primary flex h-16 w-16 items-center justify-center rounded-2xl"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
      >
        <MessageSquare className="text-primary-foreground h-7 w-7" />
      </motion.div>
      <div>
        <p className="text-sm font-semibold">Your messages</p>
        <p className="text-muted-foreground mt-1 max-w-xs text-xs">
          Send private messages to other Schoolsoft+ users.
        </p>
      </div>
      <Button size="sm" onClick={onNew} style={{ background: 'var(--primary)' }}>
        <UserPlus className="mr-2 h-3.5 w-3.5" />
        New conversation
      </Button>
    </motion.div>
  );
}

/* 
   MobileActionSheet — bottom sheet for message actions on touch
 */
interface SheetAction {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  danger?: boolean;
}

function MobileActionSheet({
  msg,
  isMe,
  canDelete,
  username,
  displayContent,
  onClose,
  onEdit,
  onDelete,
  onPin,
  onReply,
  onReact,
}: {
  msg: Message;
  isMe: boolean;
  canDelete: boolean;
  username: string;
  displayContent?: string | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPin: () => void;
  onReply: () => void;
  onReact: (emoji: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(displayContent ?? msg.content);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
      onClose();
    }, 900);
  };

  const actions: SheetAction[] = [
    {
      icon: CornerUpLeft,
      label: 'Reply',
      onClick: () => {
        onReply();
        onClose();
      },
    },
    { icon: copied ? Check : Copy, label: copied ? 'Copied!' : 'Copy', onClick: copy },
    {
      icon: msg.pinned ? PinOff : Pin,
      label: msg.pinned ? 'Unpin' : 'Pin',
      onClick: () => {
        onPin();
        onClose();
      },
    },
    ...(isMe
      ? [
          {
            icon: Pencil,
            label: 'Edit',
            onClick: () => {
              onEdit();
              onClose();
            },
          } as SheetAction,
        ]
      : []),
    ...(canDelete
      ? [
          {
            icon: Trash2,
            label: 'Delete',
            onClick: () => {
              onDelete();
              onClose();
            },
            danger: true,
          } as SheetAction,
        ]
      : []),
  ];

  return (
    <motion.div
      key="sheet-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      className="fixed inset-0 z-50 flex items-end"
      onClick={onClose}
    >
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />

      <motion.div
        key="sheet-panel"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 320, mass: 0.8 }}
        className="relative w-full overflow-hidden rounded-t-3xl border-t border-white/10"
        style={{ background: 'oklch(0.13 0 0)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="h-1 w-9 rounded-full bg-white/20" />
        </div>

        {/* Message preview */}
        <div className="px-4 pt-1 pb-2">
          <div
            className="rounded-xl border border-white/8 px-3.5 py-2.5"
            style={{ background: 'oklch(1 0 0 / 4%)' }}
          >
            <p className="mb-1 text-[10px] font-semibold" style={{ color: 'oklch(0.72 0.16 263)' }}>
              {msg.senderDisplayName}
            </p>
            <p className="text-foreground/90 line-clamp-3 text-sm wrap-break-word">
              {displayContent ?? msg.content}
            </p>
          </div>
        </div>

        {/* Quick reactions */}
        <div
          className="mx-4 mb-2 flex items-center justify-around rounded-2xl px-4 py-3"
          style={{ background: 'oklch(1 0 0 / 4%)', border: '1px solid oklch(1 0 0 / 7%)' }}
        >
          {QUICK_REACTIONS.map((e) => {
            const reacted = (msg.reactions?.[e] ?? []).includes(username);
            return (
              <motion.button
                key={e}
                whileTap={{ scale: 0.75 }}
                onClick={() => {
                  onReact(e);
                  onClose();
                }}
                className={cn(
                  'relative flex h-11 w-11 items-center justify-center rounded-full text-2xl transition-colors',
                  reacted ? 'bg-primary/20' : 'active:bg-white/10'
                )}
              >
                {e}
                {reacted && (
                  <span className="bg-primary border-card absolute right-0.5 bottom-0.5 h-2 w-2 rounded-full border-2" />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Action rows */}
        <div
          className="mx-4 mb-8 overflow-hidden rounded-2xl"
          style={{ background: 'oklch(1 0 0 / 4%)', border: '1px solid oklch(1 0 0 / 7%)' }}
        >
          {actions.map(({ icon: Icon, label, onClick, danger }, i) => (
            <motion.button
              key={label}
              whileTap={{ backgroundColor: 'oklch(1 0 0 / 8%)' }}
              onClick={onClick}
              className={cn(
                'flex w-full items-center gap-4 px-5 py-4 text-left text-sm font-medium transition-colors',
                danger ? 'text-destructive' : 'text-foreground',
                i > 0 && 'border-t border-white/7'
              )}
            >
              <Icon className="h-4.5 w-4.5 shrink-0" />
              {label}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}
