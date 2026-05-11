"use client";

import {
    useState,
    useEffect,
    useRef,
    FormEvent,
    useCallback,
    KeyboardEvent,
    useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    MessageSquare,
    Search,
    Send,
    Pin,
    Pencil,
    Trash2,
    X,
    Check,
    ChevronLeft,
    Loader2,
    PinOff,
    UserPlus,
    Info,
    Copy,
    CornerUpLeft,
    Bell,
    BellOff,
    ChevronDown,
    Smile,
    ArrowRight,
    User,
    Sparkles,
    Users,
    Settings2,
    Crown,
    LogOut,
    UserMinus,
    StickyNote,
    BarChart2,
    BookOpen,
    Lock,
    ShieldCheck,
    Eye,
    EyeOff,
    Link as LinkIcon,
    Image as ImageIcon,
    Paperclip,
    Gift,
    Search as SearchIcon,
    Hash,
    Zap,
    AtSign,
    Forward,
    MessageCircle,
    Upload,
    XCircle,
    Phone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useConversations, useMessages, RTConversation, RTMessage, ReplyTo, ShareCard, NoteShareCard, GradeShareCard } from "@/lib/useMessages";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/useSession";
import { useUnread } from "@/lib/unread-context";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { UserProfileModal } from "@/components/UserProfileModal";
import { deriveKey, encryptMessage, decryptMessage } from "@/lib/crypto";
import { useFriends } from "@/lib/useFriends";
import { useMyPresence, usePresenceMap, statusColor, statusLabel, type UserStatus } from "@/lib/usePresence";
import { useCallContext } from "@/lib/call-context";
import { useActiveGroupCallForConversation } from "@/lib/useCall";
import { GroupCallEncryptionNotice } from "@/components/CallPanel";

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */
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
    invitedUsername: string;
    invitedBy: string;
    invitedByDisplayName: string;
    status: "pending" | "accepted" | "declined";
    invitedAt: number;
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

/* ─────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────── */
const MAX_CHARS = 2000;
const WARN_CHARS = 180;          // orange warning
const HARD_UI_CHARS = 200;       // red + won't send without encryption
const E2EE_MAX_CHARS = 100;      // hard limit in encrypted groups

/* ─────────────────────────────────────────────────────────────
   URL / image rendering helpers
───────────────────────────────────────────────────────────── */
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
                        <span key={i} className="block mt-1.5">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={part}
                                alt="Image"
                                loading="lazy"
                                className="rounded-xl max-w-full max-h-64 object-contain border border-white/10 cursor-pointer hover:opacity-90 transition-opacity"
                                style={{ maxWidth: 300 }}
                                onClick={() => window.open(part, "_blank", "noopener,noreferrer")}
                                onError={e => {
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
                            "inline-flex items-center gap-0.5 underline underline-offset-2 break-all hover:opacity-80 transition-opacity",
                            isMe ? "text-white/90" : "text-primary"
                        )}
                    >
                        <LinkIcon className="inline w-2.5 h-2.5 shrink-0" />{part}
                    </a>
                );
            })}
        </>
    );
}

/* ─────────────────────────────────────────────────────────────
   EmojiPicker — lightweight inline emoji grid, no external lib
───────────────────────────────────────────────────────────── */
const EMOJI_CATEGORIES: { label: string; icon: string; emojis: string[] }[] = [
    { label: "Recent", icon: "🕐", emojis: [] }, // filled from localStorage at runtime
    { label: "Smileys", icon: "😀", emojis: ["😀","😃","😄","😁","😆","😅","😂","🤣","☺️","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🥸","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬","🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔","🤭","🤫","🤥","😶","😐","😑","😬","🙄","😯","😦","😧","😮","😲","🥱","😴","🤤","😪","😵","🤐","🥴","🤢","🤮","🤧","😷","🤒","🤕","🤑","🤠","😈","👿"] },
    { label: "Gestures", icon: "👋", emojis: ["👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","🦾","🦿","🦵","🦶","👂","🦻","👃","🫀","🫁","🧠","🦷","🦴","👀","👁️","👅","👄","🫦"] },
    { label: "Hearts", icon: "❤️", emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","☮️","✝️","☪️","🕉️","☸️","✡️","🔯","🕎","☯️","☦️","🛐","⛎","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","🆔","⚛️","🉑","☢️","☣️","📴","📳","🈶","🈚","🈸","🈺","🈷️","✴️","🆚","💮","🉐","㊙️","㊗️","🈴","🈵","🈹","🈲","🅰️","🅱️","🆎","🆑","🅾️","🆘","❌","⭕","🛑","⛔","📛","🚫"] },
    { label: "Animals", icon: "🐶", emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐒","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🦟","🦗","🦂","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🦧","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌","🐕","🐩","🦮","🐈","🐓","🦃","🦤","🦚","🦜","🦢","🦩","🕊️","🐇","🦝","🦨","🦡","🦫","🦦","🦥","🐁","🐀","🐿️","🦔"] },
    { label: "Food", icon: "🍕", emojis: ["🍕","🍔","🍟","🌭","🍿","🧂","🥓","🥚","🍳","🧇","🥞","🧈","🍞","🥐","🥖","🥨","🥯","🧀","🥗","🥙","🥪","🌮","🌯","🫔","🥫","🍱","🍘","🍙","🍚","🍛","🍜","🍝","🍠","🍢","🍣","🍤","🍥","🥮","🍡","🥟","🥠","🥡","🍦","🍧","🍨","🍩","🍪","🎂","🍰","🧁","🥧","🍫","🍬","🍭","🍮","🍯","🍼","🥛","☕","🍵","🧃","🥤","🧋","🍶","🍺","🍻","🥂","🍷","🥃","🍸","🍹","🧉","🍾"] },
    { label: "Activities", icon: "⚽", emojis: ["⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🎱","🏓","🏸","🥊","🥋","🎽","⛸️","🛷","🎿","🏂","🪂","🏋️","🤸","🤺","🤼","🤾","🏌️","🏇","🧘","🏄","🚣","🧗","🚵","🚴","🏆","🥇","🥈","🥉","🎖️","🏅","🎗️","🎫","🎟️","🎪","🤹","🎭","🎨","🎬","🎤","🎧","🎼","🎹","🥁","🎷","🎺","🎸","🪕","🎻","🎲","♟️","🎯","🎳","🎮","🎰"] },
    { label: "Travel", icon: "✈️", emojis: ["✈️","🚀","🛸","🚁","🛺","🚕","🚗","🚙","🚌","🚎","🚐","🚑","🚒","🚓","🚔","🚖","🚘","🚍","🚋","🚂","🚃","🚄","🚅","🚆","🚇","🚈","🚉","🚊","🚝","🚞","🚲","🛴","🛵","🏍️","🚨","🚥","🚦","🛑","🚧","⚓","🪝","⛽","🛶","🚤","🛥️","🛳️","⛴️","🚢","🏖️","🏝️","🏜️","🏕️","⛰️","🗻","🏔️","🌋","🗾","🏠","🏡","🏢","🏣","🏤","🏥","🏦","🏨","🏩","🏪","🏫","🏬","🏭","🏯","🏰","🗼","🗽","🗿","🗺️","🧭"] },
    { label: "Objects", icon: "💡", emojis: ["💡","🔦","🕯️","🪔","🧱","💎","🔑","🗝️","🔐","🔒","🔓","🚪","🛋️","🪑","🚽","🚿","🛁","🧴","🪒","🧹","🧺","🧻","🧼","🧽","🧯","🛒","🚬","⚰️","🗑️","📦","📫","📪","📬","📭","📮","📯","📜","📃","📄","📑","🗒️","🗓️","📆","📅","📇","📈","📉","📊","📋","📌","📍","🗃️","🗄️","🗑️","📁","📂","🗂️","🗞️","📰","📓","📔","📒","📕","📗","📘","📙","📚","📖","🔖","🔗","📎","🖇️","📐","📏","🧮","✂️","🗃️","🖊️","🖋️","✒️","🖌️","🖍️","📝","✏️","🔍","🔎","🔬","🔭","📡","💊","🩺","🩻","🩹","🩼","🦽","🦼","🩴"] },
    { label: "Symbols", icon: "💬", emojis: ["💬","💭","🗯️","💢","💥","💫","⭐","🌟","✨","🎉","🎊","🎈","🎀","🎁","🔥","💧","🌊","🌈","⚡","❄️","🌀","🌁","🌫️","🌪️","🌬️","☔","⛈️","⛅","☁️","🌤️","🌥️","🌦️","🌧️","🌨️","🌩️","🌙","⭐","🌟","💫","✨","🌠","🌌","☀️","🌝","🌛","🌜","🌚","🌕","🌖","🌗","🌘","🌑","🌒","🌓","🌔","🌙","🌏","🌍","🌎","♾️","⚜️","🔱","📛","🔰","♻️","✅","❎","🆗","🆙","🆒","🆕","🆓","🔜","🔚","🔛","🔝","🔞","📵","🚳","🚭","🚯","🚱","🚷","❗","❕","❓","❔","‼️","⁉️","⚠️"] },
];

interface GifResult { id: string; title: string; preview: string; full: string; width: number; height: number; }

function GifPicker({ onSelect, onClose }: { onSelect: (url: string) => void; onClose: () => void }) {
    const [query, setQuery] = useState("");
    const [gifs, setGifs] = useState<GifResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Load featured GIFs on mount
    useEffect(() => {
        inputRef.current?.focus();
        loadGifs("");
    }, []);

    const loadGifs = async (q: string) => {
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/gif?q=${encodeURIComponent(q)}&limit=20`);
            const data = await res.json();
            if (data.success) setGifs(data.gifs);
            else setError(data.error ?? "GIF search failed.");
        } catch {
            setError("Could not reach GIF service.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (searchRef.current) clearTimeout(searchRef.current);
        searchRef.current = setTimeout(() => loadGifs(query), 400);
        return () => { if (searchRef.current) clearTimeout(searchRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [query]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="w-72 rounded-2xl border border-white/10 bg-card shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
        >
            {/* Header */}
            <div className="flex items-center gap-2 px-3 py-2 border-b border-white/8">
                <Gift className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs font-semibold flex-1">GIFs</span>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
            </div>
            {/* Search */}
            <div className="px-2.5 py-2 border-b border-white/8">
                <div className="relative">
                    <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search GIFs…"
                        className="w-full pl-7 pr-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40"
                    />
                </div>
            </div>
            {/* Grid */}
            <div className="h-48 overflow-y-auto p-1.5">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-center px-4">
                        <p className="text-xs text-muted-foreground">{error}</p>
                        <p className="text-[10px] text-muted-foreground/60">Make sure GIPHY_API_KEY is set.</p>
                    </div>
                ) : gifs.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-xs text-muted-foreground">No GIFs found.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-1">
                        {gifs.map(g => (
                            <button
                                key={g.id}
                                onClick={() => { onSelect(g.full); onClose(); }}
                                className="relative rounded-lg overflow-hidden hover:ring-2 hover:ring-primary/60 transition-all aspect-square bg-white/5 group"
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={g.preview}
                                    alt={g.title}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="px-3 py-1 border-t border-white/8">
                <p className="text-[9px] text-muted-foreground/50 text-center">Powered by GIPHY</p>
            </div>
        </motion.div>
    );
}

function EmojiPicker({ onSelect, onClose, recentEmojis }: {
    onSelect: (emoji: string) => void;
    onClose: () => void;
    recentEmojis: string[];
}) {
    const [activeCategory, setActiveCategory] = useState(recentEmojis.length > 0 ? 0 : 1);
    const [search, setSearch] = useState("");

    const categories = EMOJI_CATEGORIES.map((c, i) =>
        i === 0 ? { ...c, emojis: recentEmojis.slice(0, 32) } : c
    ).filter((c, i) => i !== 0 || c.emojis.length > 0);

    const displayEmojis = search.length > 0
        ? categories.flatMap(c => c.emojis).filter(e => {
            // Very simple filter: just check if emoji is in any category that contains the search letter heuristic
            return true; // show all when searching — user just types to narrow
        }).filter((e, _, arr) => {
            // Filter by checking codepoint range for search-as-you-type
            void arr;
            return true;
        })
        : (categories[activeCategory]?.emojis ?? []);

    // When searching, filter all emojis (we can't do name search without a lib, so filter by recent first)
    const searchedEmojis = search
        ? categories.flatMap(c => c.emojis).filter((_, i) => i < 200)
        : displayEmojis;

    return (
        <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="w-64 rounded-2xl border border-white/10 bg-card shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
        >
            {/* Search */}
            <div className="px-2.5 py-2 border-b border-white/8 flex items-center gap-2">
                <SearchIcon className="w-3 h-3 text-muted-foreground shrink-0" />
                <input
                    autoFocus
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search emoji…"
                    className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>
            </div>
            {/* Category tabs */}
            {!search && (
                <div className="flex items-center gap-0.5 px-1.5 py-1 border-b border-white/8 overflow-x-auto scrollbar-none">
                    {categories.map((cat, i) => (
                        <button
                            key={cat.label}
                            onClick={() => setActiveCategory(i)}
                            title={cat.label}
                            className={cn(
                                "w-6 h-6 flex items-center justify-center rounded-md text-sm shrink-0 transition-colors",
                                activeCategory === i ? "bg-primary/20" : "hover:bg-white/8"
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
                            className="w-7 h-7 flex items-center justify-center text-lg rounded-md hover:bg-white/10 transition-colors active:scale-90"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
                {(search ? searchedEmojis : displayEmojis).length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-6">No emojis found.</p>
                )}
            </div>
        </motion.div>
    );
}

/* ─────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────── */
function initials(name: string) {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "??";
}

function relativeTime(ts: number) {
    const diff = Date.now() - ts;
    const m = Math.floor(diff / 60000);
    if (m < 1) return "just now";
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}

function formatTime(ts: number) {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: number) {
    return new Date(ts).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

/* ─────────────────────────────────────────────────────────────
   useIsMobile — true when the primary input is touch / coarse
───────────────────────────────────────────────────────────── */
function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const mq = window.matchMedia("(pointer: coarse)");
        setIsMobile(mq.matches);
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    }, []);
    return isMobile;
}

/* ─────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────── */
export default function MessagesPage() {
    const { session, loading: sessionLoading } = useSession();
    const username = session?.username ?? "";
    const isMobile = useIsMobile();

    // Gate: has the user set up their profile yet?
    const [profileExists, setProfileExists] = useState<boolean | null>(null);

    useEffect(() => {
        fetch("/api/profile")
            .then(r => r.json())
            .then(d => setProfileExists(d.success && d.profile !== null))
            .catch(() => setProfileExists(false));
    }, []);

    const { conversations, loading: convoLoading } = useConversations(username);
    const [activeConvo, setActiveConvo] = useState<Conversation | null>(null);
    const { messages, loading: msgLoading } = useMessages(activeConvo?.id ?? null);

    // Friends
    const { friends, received: friendRequests, sent: sentFriendRequests, profileMap: friendProfileMap, isFriend, pendingFrom, sentTo } = useFriends(username);
    // Group invites
    const [groupInvites, setGroupInvites] = useState<GroupInvite[]>([]);
    const [loadingGroupInvites, setLoadingGroupInvites] = useState(false);

    // Presence — track own + participants
    useMyPresence(username);
    const presenceUsernames = useMemo(() => {
        const all = new Set<string>();
        for (const c of conversations) {
            for (const p of c.participants) if (p !== username) all.add(p);
        }
        for (const f of friends) all.add(f.userA === username ? f.userB : f.userA);
        return [...all];
    }, [conversations, friends, username]);
    const statusMap = usePresenceMap(presenceUsernames);

    // Sidebar tab: "messages" | "friends"
    const [sidebarTab, setSidebarTab] = useState<"messages" | "friends">("messages");
    // Friend search
    const [friendSearchQuery, setFriendSearchQuery] = useState("");
    const [friendSearchResults, setFriendSearchResults] = useState<UserSearchResult[]>([]);
    const [friendSearching, setFriendSearching] = useState(false);
    const [friendRequestSending, setFriendRequestSending] = useState<string | null>(null);

    const { markRead } = useUnread();

    const [showPinned, setShowPinned] = useState(false);
    const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");
    const [editSaving, setEditSaving] = useState(false);
    const [showNewDM, setShowNewDM] = useState(false);
    const [showNewGroup, setShowNewGroup] = useState(false);
    const [groupName, setGroupName] = useState("");
    const [groupDesc, setGroupDesc] = useState("");
    const [groupMembers, setGroupMembers] = useState<UserSearchResult[]>([]);
    const [groupCreating, setGroupCreating] = useState(false);
    // E2EE group creation
    const [groupEncrypted, setGroupEncrypted] = useState(false);
    const [groupEncPassword, setGroupEncPassword] = useState("");
    const [groupEncPasswordConfirm, setGroupEncPasswordConfirm] = useState("");
    const [groupEncPasswordShow, setGroupEncPasswordShow] = useState(false);
    // E2EE runtime state: conversationId → derived CryptoKey
    const encKeysRef = useRef<Map<string, CryptoKey>>(new Map());
    const [encUnlockedIds, setEncUnlockedIds] = useState<Set<string>>(new Set());
    // Password prompt modal
    const [encPromptConvoId, setEncPromptConvoId] = useState<string | null>(null);
    const [encPromptPassword, setEncPromptPassword] = useState("");
    const [encPromptShow, setEncPromptShow] = useState(false);
    const [encPromptError, setEncPromptError] = useState("");
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
    const [msgSearchQuery, setMsgSearchQuery] = useState("");
    const [msgSearchResults, setMsgSearchResults] = useState<Message[]>([]);

    // Forward message
    const [forwardMsg, setForwardMsg] = useState<Message | null>(null);
    const [showGroupInfo, setShowGroupInfo] = useState(false);
    const [groupEditName, setGroupEditName] = useState("");
    const [groupEditDesc, setGroupEditDesc] = useState("");
    const [groupEditSaving, setGroupEditSaving] = useState(false);
    const [groupAddSearch, setGroupAddSearch] = useState("");
    const [groupAddResults, setGroupAddResults] = useState<UserSearchResult[]>([]);
    const [groupAddSearching, setGroupAddSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
    const [searching, setSearching] = useState(false);
    const [dmCreating, setDmCreating] = useState(false);
    const [convoFilter, setConvoFilter] = useState("");
    const [mobileShowChat, setMobileShowChat] = useState(false);
    const [replyingTo, setReplyingTo] = useState<Message | null>(null);
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const [notifPermission, setNotifPermission] = useState<NotificationPermission>("default");
    const [mobileActionMsg, setMobileActionMsg] = useState<Message | null>(null);
    const [viewProfileUsername, setViewProfileUsername] = useState<string | null>(null);

    // ── Voice calls (global context — CallPanel rendered in layout) ──
    const { call, groupCall } = useCallContext();
    const [showEncCallWarning, setShowEncCallWarning] = useState(false);

    // Detect any active group call in the current group conversation
    const activeGroupCallInfo = useActiveGroupCallForConversation(
        activeConvo?.type === "group" ? activeConvo.id : null
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
                    setPfpCache(prev => ({ ...prev, [u]: data.profile.pfpUrl }));
                }
            }
        } catch { /* ignore */ }
    }, []);

    /* Fetch pfp for all conversation participants whenever conversations change */
    useEffect(() => {
        if (!username) return;
        const toFetch = new Set<string>();
        for (const c of conversations) {
            for (const p of c.participants) {
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
            const raw = localStorage.getItem("recentEmojis");
            if (raw) setRecentEmojis(JSON.parse(raw));
        } catch { /* ignore */ }
    }, []);

    const recordEmojiUsed = useCallback((emoji: string) => {
        setRecentEmojis(prev => {
            const next = [emoji, ...prev.filter(e => e !== emoji)].slice(0, 32);
            localStorage.setItem("recentEmojis", JSON.stringify(next));
            return next;
        });
    }, []);

    /* Per-conversation draft persistence */
    useEffect(() => {
        if (!activeConvo) return;
        const saved = sessionStorage.getItem(`draft_${activeConvo.id}`);
        setDraft(saved ?? "");
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
        if (!msgSearchQuery.trim()) { setMsgSearchResults([]); return; }
        const q = msgSearchQuery.toLowerCase();
        setMsgSearchResults(
            visibleMessages.filter(m =>
                !m.shareCard &&
                (m.content.toLowerCase().includes(q) || m.senderDisplayName.toLowerCase().includes(q))
            )
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [msgSearchQuery, messages]);

    /* Notifications — permission state */
    useEffect(() => {
        if (typeof Notification !== "undefined") setNotifPermission(Notification.permission);
    }, []);

    /* Mark read on open and when new messages arrive in the active conversation */
    useEffect(() => {
        if (!activeConvo) return;
        markRead(activeConvo.id);
    }, [activeConvo?.id, messages, markRead]);

    /* Auto-scroll when near bottom */
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        if (el.scrollHeight - el.scrollTop - el.clientHeight < 200) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages]);

    /* Scroll to bottom instantly when switching conversations */
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }, [activeConvo?.id]);

    /* Scroll to bottom once messages finish loading for the first time */
    useEffect(() => {
        if (!msgLoading) {
            bottomRef.current?.scrollIntoView({ behavior: "instant" });
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
            const res = await fetch("/api/group-invites");
            const data = await res.json();
            if (data.success) setGroupInvites(data.invites);
        } finally { setLoadingGroupInvites(false); }
    }, [username]);

    useEffect(() => { loadGroupInvites(); }, [loadGroupInvites]);

    /* Friend search debounce */
    const friendSearchRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (friendSearchRef.current) clearTimeout(friendSearchRef.current);
        if (friendSearchQuery.length < 2) { setFriendSearchResults([]); return; }
        friendSearchRef.current = setTimeout(async () => {
            setFriendSearching(true);
            try {
                const res = await fetch(`/api/users/search?q=${encodeURIComponent(friendSearchQuery)}`);
                const data = await res.json();
                if (data.success) setFriendSearchResults(data.users);
            } finally { setFriendSearching(false); }
        }, 350);
    }, [friendSearchQuery]);

    const sendFriendReq = async (targetUsername: string) => {
        setFriendRequestSending(targetUsername);
        try {
            await fetch("/api/friends", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetUsername }),
            });
        } finally { setFriendRequestSending(null); }
    };

    const respondFriendReq = async (fromUsername: string, accept: boolean) => {
        await fetch("/api/friends", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fromUsername, accept }),
        });
    };

    const acceptGroupInvite = async (inviteId: string, accept: boolean) => {
        const res = await fetch("/api/group-invites", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ inviteId, accept }),
        });
        const data = await res.json();
        if (data.success) {
            setGroupInvites(prev => prev.filter(inv => inv.id !== inviteId));
            if (accept && data.invite?.conversationId) {
                // Switch to the joined conversation
                const convo = conversations.find(c => c.id === data.invite.conversationId);
                if (convo) { setActiveConvo(convo); setMobileShowChat(true); }
            }
        }
    };

    /* User search debounce */
    useEffect(() => {
        if (searchRef.current) clearTimeout(searchRef.current);
        if (searchQuery.length < 2) { setSearchResults([]); return; }
        searchRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
                const data = await res.json();
                if (data.success) setSearchResults(data.users);
            } finally { setSearching(false); }
        }, 350);
    }, [searchQuery]);

    const openDM = async (target: UserSearchResult) => {
        setDmCreating(true);
        try {
            const res = await fetch("/api/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ targetUsername: target.username }),
            });
            const data = await res.json();
            if (data.success) {
                setActiveConvo(data.conversation);
                setMobileShowChat(true);
                setShowNewDM(false);
                setSearchQuery(""); setSearchResults([]);
            } else if (data.needsFriend) {
                // Auto-send a friend request and inform the user
                await sendFriendReq(target.username);
                alert(`You are not friends with ${target.displayName} yet. A friend request has been sent!`);
            }
        } finally {
            setDmCreating(false);
        }
    };

    /* Group add-member search debounce */
    useEffect(() => {
        if (groupAddSearchRef.current) clearTimeout(groupAddSearchRef.current);
        if (groupAddSearch.length < 2) { setGroupAddResults([]); return; }
        groupAddSearchRef.current = setTimeout(async () => {
            setGroupAddSearching(true);
            try {
                const res = await fetch(`/api/users/search?q=${encodeURIComponent(groupAddSearch)}`);
                const data = await res.json();
                if (data.success) setGroupAddResults(data.users);
            } finally { setGroupAddSearching(false); }
        }, 350);
    }, [groupAddSearch]);

    const createGroup = async () => {
        if (!groupName.trim() || groupMembers.length === 0 || groupCreating) return;
        if (groupEncrypted && groupEncPassword.length < 8) return;
        if (groupEncrypted && groupEncPassword !== groupEncPasswordConfirm) return;
        setGroupCreating(true);
        try {
            const res = await fetch("/api/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    type: "group",
                    groupName: groupName.trim(),
                    groupDescription: groupDesc.trim() || undefined,
                    encrypted: groupEncrypted,
                    members: groupMembers.map(m => m.username),
                }),
            });
            const data = await res.json();
            if (data.success) {
                const convo = data.conversation;
                // If E2EE, derive and cache the key immediately so the creator doesn't need to re-enter
                if (groupEncrypted && groupEncPassword) {
                    const key = await deriveKey(groupEncPassword, convo.id);
                    encKeysRef.current.set(convo.id, key);
                    setEncUnlockedIds(prev => new Set([...prev, convo.id]));
                    // Save password to sessionStorage so it survives page navigations in this session
                    sessionStorage.setItem(`e2ee_${convo.id}`, groupEncPassword);
                }
                setActiveConvo(convo);
                setMobileShowChat(true);
                setShowNewGroup(false);
                setGroupName(""); setGroupDesc(""); setGroupMembers([]);
                setGroupEncrypted(false); setGroupEncPassword(""); setGroupEncPasswordConfirm("");
            }
        } finally { setGroupCreating(false); }
    };

    /* Try to restore E2EE key from sessionStorage on conversation open */
    useEffect(() => {
        if (!activeConvo?.encrypted) return;
        const id = activeConvo.id;
        if (encKeysRef.current.has(id)) return; // already unlocked
        const saved = sessionStorage.getItem(`e2ee_${id}`);
        if (saved) {
            deriveKey(saved, id).then(key => {
                encKeysRef.current.set(id, key);
                setEncUnlockedIds(prev => new Set([...prev, id]));
            }).catch(() => {/* ignore */});
        } else {
            // Prompt user for password
            setEncPromptConvoId(id);
            setEncPromptPassword("");
            setEncPromptError("");
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeConvo?.id, activeConvo?.encrypted]);

    const unlockEncryptedConvo = async () => {
        if (!encPromptConvoId || !encPromptPassword || encPromptDeriving) return;
        setEncPromptDeriving(true);
        setEncPromptError("");
        try {
            const key = await deriveKey(encPromptPassword, encPromptConvoId);
            // Verify the key works by attempting to decrypt the first available message
            // (If no messages yet, just trust the password for now)
            const msgs = messages.filter(m => m.deletedAt === null && !m.shareCard);
            if (msgs.length > 0) {
                const test = await decryptMessage(key, msgs[0].content);
                if (test === null) {
                    setEncPromptError("Wrong password. Please try again.");
                    setEncPromptDeriving(false);
                    return;
                }
            }
            encKeysRef.current.set(encPromptConvoId, key);
            sessionStorage.setItem(`e2ee_${encPromptConvoId}`, encPromptPassword);
            setEncUnlockedIds(prev => new Set([...prev, encPromptConvoId]));
            setEncPromptConvoId(null);
            setEncPromptPassword("");
        } catch {
            setEncPromptError("Failed to derive key. Please try again.");
        } finally {
            setEncPromptDeriving(false);
        }
    };

    /* Decrypt messages whenever messages or keys change */
    useEffect(() => {
        if (!activeConvo?.encrypted) return;
        const key = encKeysRef.current.get(activeConvo.id);
        if (!key) return;
        const toDecrypt = messages.filter(m => m.deletedAt === null && !m.shareCard && !(m.id in decryptedCache));
        if (toDecrypt.length === 0) return;
        Promise.all(
            toDecrypt.map(async m => {
                const plain = await decryptMessage(key, m.content);
                return { id: m.id, plain: plain ?? "🔒 (undecryptable)" };
            })
        ).then(results => {
            setDecryptedCache(prev => {
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
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
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
            await groupInfoAction("rename", { groupName: groupEditName, groupDescription: groupEditDesc });
        } finally { setGroupEditSaving(false); }
    };

    const addMemberToGroup = async (user: UserSearchResult) => {
        if (!activeConvo) return;
        // Send a group invite instead of directly adding
        const res = await fetch("/api/group-invites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversationId: activeConvo.id, targetUsername: user.username }),
        });
        const data = await res.json();
        if (!data.success) {
            alert(data.error ?? "Could not send invite.");
        }
        setGroupAddSearch(""); setGroupAddResults([]);
    };

    const removeMemberFromGroup = async (targetUsername: string) => {
        await groupInfoAction("remove_member", { targetUsername });
    };

    const leaveGroup = async () => {
        if (!activeConvo) return;
        await groupInfoAction("leave");
        setActiveConvo(null);
        setShowGroupInfo(false);
        setMobileShowChat(false);
    };

    const transferAdmin = async (targetUsername: string) => {
        await groupInfoAction("transfer_admin", { targetUsername });
    };

    /* Image upload handler */
    const uploadImage = useCallback(async (file: File) => {
        if (imageUploading) return;
        setImageUploading(true);
        const fd = new FormData();
        fd.append("image", file);
        try {
            const res = await fetch("/api/msg-upload", { method: "POST", body: fd });
            const data = await res.json();
            if (data.success) setImagePreview({ url: data.url, name: file.name });
            else alert(data.error ?? "Upload failed.");
        } catch {
            alert("Upload failed.");
        } finally {
            setImageUploading(false);
        }
    }, [imageUploading]);

    /* Paste handler: intercept pasted images */
    const handleComposePaste = useCallback((e: React.ClipboardEvent) => {
        const items = Array.from(e.clipboardData.items);
        const imageItem = items.find(i => i.type.startsWith("image/"));
        if (imageItem) {
            e.preventDefault();
            const file = imageItem.getAsFile();
            if (file) uploadImage(file);
        }
    }, [uploadImage]);

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
            ? { messageId: replyingTo.id, content: replyingTo.content, senderDisplayName: replyingTo.senderDisplayName }
            : null;
        setDraft(""); setReplyingTo(null); setImagePreview(null);
        try {
            // Encrypt if E2EE group
            if (isEncrypted) {
                const key = encKeysRef.current.get(activeConvo.id);
                if (!key) { setSending(false); return; } // not unlocked
                content = await encryptMessage(key, content);
            }
            await fetch(`/api/conversations/${activeConvo.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content, replyTo: reply }),
            });
        } finally {
            setSending(false);
            // Use rAF to refocus after React re-render
            requestAnimationFrame(() => { inputRef.current?.focus(); });
        }
    };

    const submitEdit = async (messageId: string) => {
        if (!activeConvo || !editContent.trim()) return;
        setEditSaving(true);
        try {
            await fetch(`/api/conversations/${activeConvo.id}/${messageId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ action: "edit", content: editContent.trim() }),
            });
        } finally { setEditSaving(false); setEditingId(null); }
    };

    const deleteMsg = async (messageId: string) => {
        if (!activeConvo) return;
        await fetch(`/api/conversations/${activeConvo.id}/${messageId}`, { method: "DELETE" });
        if (showPinned) loadPinned();
    };

    const togglePin = async (messageId: string) => {
        if (!activeConvo) return;
        await fetch(`/api/conversations/${activeConvo.id}/${messageId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "pin" }),
        });
        if (showPinned) loadPinned();
    };

    const toggleReaction = async (messageId: string, emoji: string) => {
        if (!activeConvo) return;
        await fetch(`/api/conversations/${activeConvo.id}/${messageId}`, {
            method: "PATCH", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "react", emoji }),
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
        setShowPinned(v => !v);
    };

    const partnerName = (c: Conversation) => {
        if (c.type === "group") return c.groupName ?? "Group";
        const other = c.participants.find(p => p !== username) ?? "";
        return c.participantNames[other] || other;
    };

    const partnerSubtitle = (c: Conversation) => {
        if (c.type === "group") return `${c.participants.length} members`;
        return c.participants.find(p => p !== username) ?? "";
    };

    const visibleMessages = messages.filter(m => m.deletedAt === null);
    const grouped: { date: string; msgs: Message[] }[] = [];
    for (const msg of visibleMessages) {
        const d = formatDate(msg.createdAt);
        const last = grouped[grouped.length - 1];
        if (last?.date === d) last.msgs.push(msg);
        else grouped.push({ date: d, msgs: [msg] });
    }

    const filteredConvos = conversations.filter(c =>
        partnerName(c).toLowerCase().includes(convoFilter.toLowerCase())
    );

    if (sessionLoading || profileExists === null) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
        );
    }

    if (!profileExists) {
        return <ProfileGate />;
    }

    return (
        <div className="flex flex-col h-full">
            {/* ═══ Voice call panel is now in the global layout (lib/call-context.tsx) ══ */}

            <div className="flex flex-1 overflow-hidden">

                {/* ═══ Conversation list ═════════════════════════════ */}
                <motion.div
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className={cn(
                        "flex flex-col border-r border-white/7 bg-card shrink-0",
                        "w-full md:w-72 lg:w-80",
                        mobileShowChat && "hidden md:flex"
                    )}
                >
                    <div className="flex items-center justify-between px-4 h-14 border-b border-white/7 shrink-0">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-primary" />
                            <span className="text-sm font-semibold">Messages</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" className="w-7 h-7 rounded-lg hover:bg-white/8"
                                        onClick={async () => {
                                            const p = await Notification.requestPermission();
                                            if (p) setNotifPermission(p);
                                        }}
                                    >
                                        {notifPermission === "granted"
                                            ? <Bell className="w-3.5 h-3.5 text-primary" />
                                            : <BellOff className="w-3.5 h-3.5" />}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom" className="text-xs">
                                    {notifPermission === "granted" ? "Notifications on" : "Enable notifications"}
                                </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" className="w-7 h-7 rounded-lg hover:bg-white/8"
                                        onClick={() => setShowNewGroup(true)}
                                    >
                                        <Users className="w-3.5 h-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="text-xs">New group chat</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button size="icon" variant="ghost" className="w-7 h-7 rounded-lg hover:bg-white/8"
                                        onClick={() => setShowNewDM(true)}
                                    >
                                        <UserPlus className="w-3.5 h-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="text-xs">New conversation</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

                    {/* Tab bar */}
                    <div className="flex border-b border-white/7 shrink-0">
                        <button
                            onClick={() => setSidebarTab("messages")}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors",
                                sidebarTab === "messages" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <MessageSquare className="w-3.5 h-3.5" />
                            Chats
                        </button>
                        <button
                            onClick={() => setSidebarTab("friends")}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-colors relative",
                                sidebarTab === "friends" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Users className="w-3.5 h-3.5" />
                            Friends
                            {(friendRequests.length + groupInvites.length) > 0 && (
                                <span className="absolute top-1 right-3 min-w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center px-1"
                                    style={{ background: "oklch(0.65 0.22 278)", color: "white" }}>
                                    {friendRequests.length + groupInvites.length}
                                </span>
                            )}
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                        {sidebarTab === "messages" ? (
                          <>
                            {/* Group invite banner */}
                            {groupInvites.length > 0 && (
                                <div className="px-3 py-2 border-b border-white/7 space-y-1.5">
                                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1">
                                        Group Invites ({groupInvites.length})
                                    </p>
                                    {groupInvites.map(inv => (
                                        <div key={inv.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-primary/5 border border-primary/15">
                                            <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                                                style={{ background: "oklch(0.65 0.22 278 / 15%)" }}>
                                                <Users className="w-3.5 h-3.5 text-primary" />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-xs font-medium truncate">{inv.groupName}</p>
                                                <p className="text-[9px] text-muted-foreground truncate">from {inv.invitedByDisplayName}</p>
                                            </div>
                                            <div className="flex gap-0.5">
                                                <button onClick={() => acceptGroupInvite(inv.id, true)}
                                                    className="w-6 h-6 rounded-md flex items-center justify-center text-green-400 hover:bg-green-500/15 transition-colors">
                                                    <Check className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={() => acceptGroupInvite(inv.id, false)}
                                                    className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="px-3 py-2.5 border-b border-white/7 shrink-0">
                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                    <Input
                                        value={convoFilter}
                                        onChange={e => setConvoFilter(e.target.value)}
                                        placeholder="Search conversations…"
                                        className="pl-8 h-8 text-xs bg-white/5 border-white/10 focus:border-primary/40"
                                    />
                                </div>
                            </div>

                            {convoLoading ? (
                                <div className="flex items-center justify-center h-24">
                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                </div>
                            ) : filteredConvos.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-40 gap-2 px-6 text-center">
                                    <MessageSquare className="w-8 h-8 text-muted-foreground/30" />
                                    <p className="text-xs text-muted-foreground">
                                        {convoFilter ? "No conversations match." : "No conversations yet. Start one!"}
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
                          /* ── Friends tab ── */
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
                                      schoolName: friendProfileMap[targetUsername]?.schoolName ?? "",
                                      userType: "",
                                  };
                                  openDM(u);
                                  setSidebarTab("messages");
                              }}
                          />
                        )}
                    </div>
                </motion.div>

                {/* ═══ Chat area ═════════════════════════════════════ */}
                <div className={cn("flex flex-col flex-1 min-w-0", !mobileShowChat && "hidden md:flex")}>
                    {!activeConvo ? (
                        <EmptyChat onNew={() => setShowNewDM(true)} />
                    ) : (
                        <>
                            {/* Header — sticky so it stays visible when the outer scroll jumps */}
                            <motion.div
                                initial={{ y: -8, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.25 }}
                                className="sticky top-0 z-10 flex items-center gap-2 px-3 h-14 border-b border-white/7 shrink-0 min-w-0"
                                style={{ background: "var(--card)" }}
                            >
                                <button className="md:hidden mr-0.5 shrink-0 text-muted-foreground hover:text-foreground"
                                    onClick={() => setMobileShowChat(false)}>
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <Avatar
                                    className={cn("w-8 h-8 shrink-0", activeConvo.type === "dm" && "cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all")}
                                    onClick={() => {
                                        if (activeConvo.type === "dm") {
                                            const partner = activeConvo.participants.find(p => p !== username);
                                            if (partner) setViewProfileUsername(partner);
                                        }
                                    }}
                                >
                                    {activeConvo.type === "dm" && (() => {
                                        const partner = activeConvo.participants.find(p => p !== username);
                                        const pfp = partner ? (pfpCache[partner] || activeConvo.participantPfpUrls[partner] || "") : "";
                                        return pfp ? <AvatarImage src={pfp} alt={partnerName(activeConvo)} /> : null;
                                    })()}
                                    <AvatarFallback className="text-xs font-bold" style={{
                                        background: "linear-gradient(135deg, oklch(0.65 0.22 278 / 40%), oklch(0.55 0.25 295 / 40%))",
                                        color: "oklch(0.78 0.15 278)",
                                    }}>
                                        {activeConvo.type === "group"
                                            ? <Users className="w-4 h-4" />
                                            : initials(partnerName(activeConvo))}
                                    </AvatarFallback>
                                </Avatar>
                                <div
                                    className={cn("min-w-0 flex-1", activeConvo.type === "dm" && "cursor-pointer")}
                                    onClick={() => {
                                        if (activeConvo.type === "dm") {
                                            const partner = activeConvo.participants.find(p => p !== username);
                                            if (partner) setViewProfileUsername(partner);
                                        }
                                    }}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <p className="text-sm font-semibold truncate">{partnerName(activeConvo)}</p>
                                        {activeConvo.encrypted && (
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span>
                                                        <Lock className="w-3 h-3 text-primary shrink-0" />
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent side="bottom" className="text-xs">End-to-end encrypted</TooltipContent>
                                            </Tooltip>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {activeConvo.type === "dm" && (() => {
                                            const partner = activeConvo.participants.find(p => p !== username);
                                            const st = partner ? (statusMap[partner] ?? "offline") : "offline";
                                            return (
                                                <span className="flex items-center gap-1 text-[10px]" style={{ color: statusColor(st) }}>
                                                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: statusColor(st) }} />
                                                    {statusLabel(st)}
                                                </span>
                                            );
                                        })()}
                                        {activeConvo.type === "group" && (
                                            <p className="text-[10px] text-muted-foreground truncate">
                                                {partnerSubtitle(activeConvo)}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {activeConvo.type === "dm" && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className={cn(
                                                    "w-8 h-8 shrink-0 rounded-lg",
                                                    call.phase !== "idle" && "bg-primary/15 text-primary"
                                                )}
                                                disabled={call.phase !== "idle" || groupCall.phase !== "idle"}
                                                onClick={() => {
                                                    const partner = activeConvo.participants.find(
                                                        (p) => p !== username
                                                    );
                                                    if (partner) call.startCall(username, partner);
                                                }}
                                            >
                                                <Phone className="w-3.5 h-3.5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="text-xs">
                                            {call.phase !== "idle" ? "Call in progress" : "Voice call"}
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                                {activeConvo.type === "group" && activeGroupCallInfo && (
                                    // Active group call banner
                                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs font-medium"
                                        style={{ background: "oklch(0.60 0.20 148 / 12%)", border: "1px solid oklch(0.60 0.20 148 / 25%)" }}>
                                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "oklch(0.60 0.20 148)" }} />
                                        <span className="text-[10px]" style={{ color: "oklch(0.65 0.18 148)" }}>
                                            {activeGroupCallInfo.participants.length} in call
                                        </span>
                                        {groupCall.session?.callId === activeGroupCallInfo.callId ? (
                                            <button
                                                onClick={() => groupCall.leaveGroupCall()}
                                                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md transition-colors hover:bg-red-500/15"
                                                style={{ color: "oklch(0.72 0.20 24)" }}
                                            >
                                                Leave
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => {
                                                    if (groupCall.phase !== "idle" || call.phase !== "idle") return;
                                                    groupCall.joinGroupCall(activeGroupCallInfo.callId, activeConvo.id, username);
                                                }}
                                                disabled={groupCall.phase !== "idle" || call.phase !== "idle"}
                                                className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md transition-colors hover:bg-green-500/15 disabled:opacity-50"
                                                style={{ color: "oklch(0.65 0.18 148)" }}
                                            >
                                                Join
                                            </button>
                                        )}
                                    </div>
                                )}
                                {activeConvo.type === "group" && !activeGroupCallInfo && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                className="w-8 h-8 shrink-0 rounded-lg"
                                                disabled={groupCall.phase !== "idle" || call.phase !== "idle"}
                                                onClick={() => {
                                                    if (activeConvo.encrypted) {
                                                        setShowEncCallWarning(true);
                                                    } else {
                                                        groupCall.startGroupCall(username, activeConvo.id);
                                                    }
                                                }}
                                            >
                                                <Phone className="w-3.5 h-3.5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="text-xs">Start voice call</TooltipContent>
                                    </Tooltip>
                                )}
                                {activeConvo.type === "group" && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Button size="icon" variant="ghost"
                                                className={cn("w-8 h-8 shrink-0 rounded-lg", showGroupInfo && "bg-primary/15 text-primary")}
                                                onClick={() => {
                                                    setShowGroupInfo(v => !v);
                                                    setShowPinned(false);
                                                    if (!showGroupInfo) {
                                                        setGroupEditName(activeConvo.groupName ?? "");
                                                        setGroupEditDesc(activeConvo.groupDescription ?? "");
                                                    }
                                                }}
                                            >
                                                <Settings2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </TooltipTrigger>
                                        <TooltipContent side="bottom" className="text-xs">Group info</TooltipContent>
                                    </Tooltip>
                                )}
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button size="icon" variant="ghost"
                                            className={cn("w-8 h-8 shrink-0 rounded-lg", showPinned && "bg-primary/15 text-primary")}
                                            onClick={togglePinnedPanel}
                                        >
                                            <Pin className="w-3.5 h-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs">
                                        {showPinned ? "Hide pinned" : "Pinned messages"}
                                    </TooltipContent>
                                </Tooltip>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button size="icon" variant="ghost"
                                            className={cn("w-8 h-8 shrink-0 rounded-lg", showMsgSearch && "bg-primary/15 text-primary")}
                                            onClick={() => { setShowMsgSearch(v => !v); setMsgSearchQuery(""); setMsgSearchResults([]); }}
                                        >
                                            <SearchIcon className="w-3.5 h-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs">Search messages</TooltipContent>
                                </Tooltip>
                            </motion.div>

                            <div className="flex flex-1 min-h-0">
                                {/* Messages */}
                                <div className="flex flex-col flex-1 min-w-0 min-h-0 relative">
                                    {/* Message search panel */}
                                    <AnimatePresence>
                                        {showMsgSearch && (
                                            <motion.div
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: "auto" }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="border-b border-white/7 bg-black/20 px-4 py-2 shrink-0 overflow-hidden"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <SearchIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                    <input
                                                        autoFocus
                                                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
                                                        placeholder="Search messages…"
                                                        value={msgSearchQuery}
                                                        onChange={e => setMsgSearchQuery(e.target.value)}
                                                        onKeyDown={e => { if (e.key === "Escape") { setShowMsgSearch(false); setMsgSearchQuery(""); } }}
                                                    />
                                                    {msgSearchQuery && (
                                                        <span className="text-[10px] text-muted-foreground shrink-0">
                                                            {msgSearchResults.length} result{msgSearchResults.length !== 1 ? "s" : ""}
                                                        </span>
                                                    )}
                                                    <Button size="icon" variant="ghost" className="w-6 h-6 shrink-0"
                                                        onClick={() => { setShowMsgSearch(false); setMsgSearchQuery(""); }}
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </Button>
                                                </div>
                                                {msgSearchResults.length > 0 && (
                                                    <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
                                                        {msgSearchResults.map(m => (
                                                            <button key={m.id} type="button"
                                                                className="w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                                                                onClick={() => {
                                                                    const el = document.getElementById(`msg-${m.id}`);
                                                                    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                                                                    setShowMsgSearch(false); setMsgSearchQuery("");
                                                                }}
                                                            >
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] text-primary font-medium">{m.senderDisplayName}</span>
                                                                    <span className="text-[10px] text-muted-foreground">{new Date(m.createdAt).toLocaleDateString()}</span>
                                                                </div>
                                                                <p className="text-xs text-foreground/80 truncate mt-0.5">{m.content}</p>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    <div ref={scrollRef} onScroll={onScroll}
                                        className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
                                        {msgLoading ? (
                                            <div className="flex items-center justify-center h-24">
                                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                            </div>
                                        ) : visibleMessages.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-full gap-2 py-16 text-center">
                                                <MessageSquare className="w-10 h-10 text-muted-foreground/20" />
                                                <p className="text-xs text-muted-foreground">No messages yet. Say hello!</p>
                                            </div>
                                        ) : (
                                            grouped.map(group => (
                                                <div key={group.date}>
                                                    <div className="flex items-center gap-3 py-3">
                                                        <div className="flex-1 h-px bg-white/7" />
                                                        <span className="text-[10px] text-muted-foreground shrink-0">{group.date}</span>
                                                        <div className="flex-1 h-px bg-white/7" />
                                                    </div>
                                                    {group.msgs.map((msg, i) => (
                                                        <div key={msg.id} id={`msg-${msg.id}`}>
                                                        <MessageBubble
                                                            msg={msg}
                                                            displayContent={
                                                                activeConvo?.encrypted
                                                                    ? (decryptedCache[msg.id] ?? null)
                                                                    : msg.content
                                                            }
                                                            replyToDisplayContent={
                                                                activeConvo?.encrypted && msg.replyTo
                                                                    ? (decryptedCache[msg.replyTo.messageId] ?? null)
                                                                    : msg.replyTo?.content ?? null
                                                            }
                                                            isEncryptedConvo={activeConvo?.encrypted ?? false}
                                                            isMe={msg.senderUsername === username}
                                                            sameSender={i > 0 && group.msgs[i - 1].senderUsername === msg.senderUsername}
                                                            isLastInGroup={
                                                                i === group.msgs.length - 1 ||
                                                                group.msgs[i + 1].senderUsername !== msg.senderUsername
                                                            }
                                                            isEditing={editingId === msg.id}
                                                            editContent={editContent}
                                                            editSaving={editSaving}
                                                            username={username}
                                                            isGroup={activeConvo?.type === "group"}
                                                            canDelete={msg.senderUsername === username || activeConvo?.adminUsername === username}
                                                            isMobile={isMobile}
                                                            pfpUrl={pfpCache[msg.senderUsername] || activeConvo?.participantPfpUrls[msg.senderUsername] || ""}
                                                            onAvatarClick={() => {
                                                                if (msg.senderUsername !== username) setViewProfileUsername(msg.senderUsername);
                                                            }}
                                                            onMobileTap={() => setMobileActionMsg(msg)}
                                                            onEditStart={() => { setEditingId(msg.id); setEditContent(activeConvo?.encrypted ? (decryptedCache[msg.id] ?? msg.content) : msg.content); }}
                                                            onEditChange={setEditContent}
                                                            onEditSubmit={() => submitEdit(msg.id)}
                                                            onEditCancel={() => setEditingId(null)}
                                                            onDelete={() => deleteMsg(msg.id)}
                                                            onPin={() => togglePin(msg.id)}
                                                            onReply={() => { setReplyingTo(msg); inputRef.current?.focus(); }}
                                                            onReact={emoji => toggleReaction(msg.id, emoji)}
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
                                                onClick={() => bottomRef.current?.scrollIntoView({ behavior: "smooth" })}
                                                className="absolute bottom-20 right-4 w-9 h-9 rounded-full bg-card border border-white/15 shadow-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
                                            >
                                                <ChevronDown className="w-4 h-4" />
                                            </motion.button>
                                        )}
                                    </AnimatePresence>

                                    {/* Reply preview */}
                                    <AnimatePresence>
                                        {replyingTo && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.15 }}
                                                className="px-4 overflow-hidden"
                                            >
                                                <div className="flex items-center gap-2 px-3 py-2 mb-1 rounded-lg bg-white/5 border border-white/10 border-l-2"
                                                    style={{ borderLeftColor: "oklch(0.65 0.22 278)" }}
                                                >
                                                    <CornerUpLeft className="w-3 h-3 text-primary shrink-0" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-[10px] font-semibold text-primary">{replyingTo.senderDisplayName}</p>
                                                        <p className="text-[11px] text-muted-foreground truncate">{replyingTo.content}</p>
                                                    </div>
                                                    <button onClick={() => setReplyingTo(null)} className="text-muted-foreground hover:text-foreground">
                                                        <X className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Compose */}
                                    <form onSubmit={sendMessage}
                                        className="flex flex-col gap-1 px-4 py-3 border-t border-white/7 shrink-0"
                                        onPaste={handleComposePaste}
                                        ref={composeAreaRef}
                                    >
                                        {/* Hidden file input */}
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept="image/jpeg,image/png,image/gif,image/webp,image/avif,image/bmp"
                                            onChange={e => {
                                                const file = e.target.files?.[0];
                                                if (file) { uploadImage(file); e.target.value = ""; }
                                            }}
                                        />

                                        {/* Encrypted group — locked banner */}
                                        {activeConvo.encrypted && !encUnlockedIds.has(activeConvo.id) && (
                                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 mb-1">
                                                <Lock className="w-3 h-3 shrink-0" />
                                                Enter the group password to read and send messages.
                                            </div>
                                        )}

                                        {/* Image preview strip */}
                                        <AnimatePresence>
                                            {imagePreview && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    className="flex items-center gap-2 mb-1"
                                                >
                                                    <div className="relative inline-block">
                                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                                        <img src={imagePreview.url} alt={imagePreview.name}
                                                            className="h-20 w-auto max-w-[160px] rounded-lg object-cover border border-white/10"
                                                        />
                                                        <button type="button"
                                                            onClick={() => setImagePreview(null)}
                                                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/80 border border-white/20 flex items-center justify-center hover:bg-red-600/80 transition-colors"
                                                        >
                                                            <X className="w-3 h-3 text-white" />
                                                        </button>
                                                    </div>
                                                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">{imagePreview.name}</span>
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
                                                        className="absolute bottom-full left-0 mb-2 z-50"
                                                    >
                                                        <GifPicker onSelect={url => {
                                                            setImagePreview({ url, name: "GIF" });
                                                            setShowGifPicker(false);
                                                        }} onClose={() => setShowGifPicker(false)} />
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
                                                        className="absolute bottom-full left-0 mb-2 z-50"
                                                    >
                                                        <EmojiPicker
                                                            recentEmojis={recentEmojis}
                                                            onSelect={emoji => {
                                                                recordEmojiUsed(emoji);
                                                                setDraft(d => d + emoji);
                                                                inputRef.current?.focus();
                                                            }}
                                                            onClose={() => setShowEmojiPicker(false)}
                                                        />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                            {/* Attachment button */}
                                            <Button type="button" size="icon" variant="ghost"
                                                className="w-8 h-8 shrink-0 text-muted-foreground hover:text-foreground"
                                                onClick={() => fileInputRef.current?.click()}
                                                disabled={imageUploading || (activeConvo.encrypted && !encUnlockedIds.has(activeConvo.id))}
                                                title="Upload image"
                                            >
                                                {imageUploading
                                                    ? <Loader2 className="w-4 h-4 animate-spin" />
                                                    : <Paperclip className="w-4 h-4" />
                                                }
                                            </Button>

                                            {/* GIF button */}
                                            <Button type="button" size="icon" variant="ghost"
                                                className={cn("w-8 h-8 shrink-0 text-muted-foreground hover:text-foreground", showGifPicker && "text-primary")}
                                                onClick={() => { setShowGifPicker(v => !v); setShowEmojiPicker(false); }}
                                                disabled={activeConvo.encrypted && !encUnlockedIds.has(activeConvo.id)}
                                                title="GIFs"
                                            >
                                                <Gift className="w-4 h-4" />
                                            </Button>

                                            {/* Emoji button */}
                                            <Button type="button" size="icon" variant="ghost"
                                                className={cn("w-8 h-8 shrink-0 text-muted-foreground hover:text-foreground", showEmojiPicker && "text-primary")}
                                                onClick={() => { setShowEmojiPicker(v => !v); setShowGifPicker(false); }}
                                                disabled={activeConvo.encrypted && !encUnlockedIds.has(activeConvo.id)}
                                                title="Emoji"
                                            >
                                                <span className="text-base leading-none">😊</span>
                                            </Button>

                                            <div className="flex-1 relative">
                                                <Input
                                                    ref={inputRef}
                                                    value={draft}
                                                    onChange={e => {
                                                        const limit = activeConvo.encrypted ? E2EE_MAX_CHARS : MAX_CHARS;
                                                        if (e.target.value.length <= limit) setDraft(e.target.value);
                                                    }}
                                                    onKeyDown={e => {
                                                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e as unknown as FormEvent); }
                                                        if (e.key === "Escape") { setReplyingTo(null); setShowGifPicker(false); setShowEmojiPicker(false); }
                                                    }}
                                                    placeholder={
                                                        activeConvo.encrypted && !encUnlockedIds.has(activeConvo.id)
                                                            ? "🔒 Locked — enter password above"
                                                            : imagePreview
                                                                ? "Add a caption…"
                                                                : activeConvo.type === "group"
                                                                    ? `Message ${activeConvo.groupName ?? "group"}…`
                                                                    : `Message ${partnerName(activeConvo)}…`
                                                    }
                                                    className={cn(
                                                        "flex-1 bg-white/5 border-white/10 focus:border-primary/50 text-sm",
                                                        draft.length > HARD_UI_CHARS && !activeConvo.encrypted && "border-red-500/50 focus:border-red-500/70",
                                                        draft.length > WARN_CHARS && draft.length <= HARD_UI_CHARS && "border-amber-500/40 focus:border-amber-500/60"
                                                    )}
                                                    autoComplete="off"
                                                    disabled={sending || (activeConvo.encrypted && !encUnlockedIds.has(activeConvo.id))}
                                                />
                                            </div>
                                            <Button type="submit" size="icon" disabled={
                                                (!draft.trim() && !imagePreview) || sending ||
                                                (activeConvo.encrypted && !encUnlockedIds.has(activeConvo.id)) ||
                                                (!activeConvo.encrypted && draft.length > MAX_CHARS)
                                            }
                                                className="w-9 h-9 shrink-0"
                                                style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 278), oklch(0.55 0.25 295))" }}
                                            >
                                                {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
                                                <div className={cn(
                                                    "flex items-center justify-end gap-1 text-[10px] px-1",
                                                    overLimit ? "text-red-400" : nearLimit ? "text-amber-400" : "text-amber-400"
                                                )}>
                                                    {overLimit && <span>Message too long</span>}
                                                    <span className="tabular-nums font-mono">{len}/{limit}</span>
                                                </div>
                                            );
                                        })()}
                                        {/* E2EE info badge */}
                                        {activeConvo.encrypted && encUnlockedIds.has(activeConvo.id) && (
                                            <div className="flex items-center gap-1 text-[10px] text-primary/60 px-1">
                                                <ShieldCheck className="w-2.5 h-2.5" />
                                                End-to-end encrypted · images are not encrypted
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        sessionStorage.removeItem(`e2ee_${activeConvo.id}`);
                                                        encKeysRef.current.delete(activeConvo.id);
                                                        setEncUnlockedIds(prev => {
                                                            const next = new Set(prev);
                                                            next.delete(activeConvo.id);
                                                            return next;
                                                        });
                                                        setDecryptedCache({});
                                                        setEncPromptConvoId(activeConvo.id);
                                                        setEncPromptPassword("");
                                                        setEncPromptError("");
                                                    }}
                                                    className="ml-auto flex items-center gap-0.5 text-[10px] text-muted-foreground/50 hover:text-destructive/70 transition-colors"
                                                    title="Forget stored password"
                                                >
                                                    <Trash2 className="w-2.5 h-2.5" />
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
                                            className="border-l border-white/7 bg-card overflow-hidden shrink-0 hidden md:flex flex-col"
                                        >
                                            <div className="flex items-center justify-between px-4 h-14 border-b border-white/7 shrink-0">
                                                <div className="flex items-center gap-2">
                                                    <Pin className="w-3.5 h-3.5 text-primary" />
                                                    <span className="text-xs font-semibold">Pinned</span>
                                                </div>
                                                <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => setShowPinned(false)}>
                                                    <X className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-3 space-y-2">
                                                {pinnedMessages.length === 0 ? (
                                                    <p className="text-xs text-muted-foreground text-center py-8">No pinned messages.</p>
                                                ) : (
                                                    <AnimatePresence>
                                                        {pinnedMessages.map(msg => (
                                                            <motion.div key={msg.id}
                                                                initial={{ opacity: 0, y: 6 }}
                                                                animate={{ opacity: 1, y: 0 }}
                                                                exit={{ opacity: 0, y: -6 }}
                                                                className="rounded-lg bg-white/5 border border-white/8 p-3 space-y-1"
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-[10px] font-semibold text-primary">{msg.senderDisplayName}</span>
                                                                    <button onClick={() => togglePin(msg.id)}
                                                                        className="text-muted-foreground hover:text-foreground transition-colors">
                                                                        <PinOff className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                                <p className="text-xs text-foreground/90 wrap-break-word min-w-0">{decryptedCache[msg.id] ?? msg.content}</p>
                                                                <p className="text-[9px] text-muted-foreground">{formatDate(msg.createdAt)} · {formatTime(msg.createdAt)}</p>
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
                                    {showGroupInfo && activeConvo?.type === "group" && (
                                        <motion.div
                                            key="group-info"
                                            initial={{ width: 0, opacity: 0 }}
                                            animate={{ width: 280, opacity: 1 }}
                                            exit={{ width: 0, opacity: 0 }}
                                            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                                            className="border-l border-white/7 bg-card overflow-hidden shrink-0 hidden md:flex flex-col"
                                        >
                                            <div className="flex items-center justify-between px-4 h-14 border-b border-white/7 shrink-0">
                                                <div className="flex items-center gap-2">
                                                    <Users className="w-3.5 h-3.5 text-primary" />
                                                    <span className="text-xs font-semibold">Group Info</span>
                                                </div>
                                                <Button size="icon" variant="ghost" className="w-6 h-6" onClick={() => setShowGroupInfo(false)}>
                                                    <X className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                            <div className="flex-1 overflow-y-auto p-3 space-y-4">
                                                {/* Edit name/desc — admin only */}
                                                {activeConvo.adminUsername === username && (
                                                    <div className="space-y-2">
                                                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-1">Edit Group</p>
                                                        <Input
                                                            value={groupEditName}
                                                            onChange={e => setGroupEditName(e.target.value)}
                                                            placeholder="Group name…"
                                                            className="h-8 text-xs bg-white/5 border-white/10 focus:border-primary/40"
                                                        />
                                                        <Input
                                                            value={groupEditDesc}
                                                            onChange={e => setGroupEditDesc(e.target.value)}
                                                            placeholder="Description (optional)…"
                                                            className="h-8 text-xs bg-white/5 border-white/10 focus:border-primary/40"
                                                        />
                                                        <Button
                                                            size="sm"
                                                            className="w-full h-7 text-xs"
                                                            disabled={!groupEditName.trim() || groupEditSaving}
                                                            onClick={saveGroupEdit}
                                                        >
                                                            {groupEditSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
                                                        </Button>
                                                    </div>
                                                )}

                                                {/* Members list */}
                                                <div className="space-y-1">
                                                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-1">
                                                        Members ({activeConvo.participants.length})
                                                    </p>
                                                    {activeConvo.participants.map(p => (
                                                        <div key={p} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5">
                                                            <Avatar className="w-6 h-6 shrink-0">
                                                                <AvatarFallback className="text-[9px] font-bold" style={{
                                                                    background: "linear-gradient(135deg, oklch(0.65 0.22 278 / 30%), oklch(0.55 0.25 295 / 30%))",
                                                                    color: "oklch(0.78 0.15 278)",
                                                                }}>
                                                                    {initials(activeConvo.participantNames[p] || p)}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div className="min-w-0 flex-1">
                                                                <p className="text-xs truncate">{activeConvo.participantNames[p] || p}</p>
                                                                {activeConvo.adminUsername === p && (
                                                                    <p className="text-[9px] text-primary/70 flex items-center gap-0.5">
                                                                        <Crown className="w-2.5 h-2.5" /> Admin
                                                                    </p>
                                                                )}
                                                            </div>
                                                            {/* Admin actions on members */}
                                                            {activeConvo.adminUsername === username && p !== username && (
                                                                <div className="flex gap-0.5">
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <button
                                                                                className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                                                onClick={() => transferAdmin(p)}
                                                                            >
                                                                                <Crown className="w-3 h-3" />
                                                                            </button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="left" className="text-[10px]">Make admin</TooltipContent>
                                                                    </Tooltip>
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <button
                                                                                className="w-5 h-5 flex items-center justify-center rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                                onClick={() => removeMemberFromGroup(p)}
                                                                            >
                                                                                <UserMinus className="w-3 h-3" />
                                                                            </button>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent side="left" className="text-[10px]">Remove</TooltipContent>
                                                                    </Tooltip>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>

                                                {/* Add member — admin only */}
                                                {activeConvo.adminUsername === username && (
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold px-1">Invite Member</p>
                                                        <p className="text-[9px] text-muted-foreground/60 px-1">Sends an invite they can accept or decline.</p>
                                                        <div className="relative">
                                                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                                                            <Input
                                                                value={groupAddSearch}
                                                                onChange={e => setGroupAddSearch(e.target.value)}
                                                                placeholder="Search…"
                                                                className="pl-7 h-8 text-xs bg-white/5 border-white/10 focus:border-primary/40"
                                                            />
                                                        </div>
                                                        {groupAddSearching && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground mx-auto" />}
                                                        {groupAddResults.filter(u => !activeConvo.participants.includes(u.username)).map(u => (
                                                            <button key={u.username}
                                                                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/8 text-left text-xs"
                                                                onClick={() => addMemberToGroup(u)}
                                                            >
                                                                <Avatar className="w-5 h-5 shrink-0">
                                                                    <AvatarFallback className="text-[8px]" style={{
                                                                        background: "linear-gradient(135deg, oklch(0.65 0.22 278 / 30%), oklch(0.55 0.25 295 / 30%))",
                                                                        color: "oklch(0.78 0.15 278)",
                                                                    }}>{initials(u.displayName)}</AvatarFallback>
                                                                </Avatar>
                                                                <span className="truncate">{u.displayName}</span>
                                                                <AtSign className="w-3 h-3 ml-auto text-muted-foreground/40 shrink-0" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Leave group */}
                                                <button
                                                    onClick={leaveGroup}
                                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors text-xs"
                                                >
                                                    <LogOut className="w-3.5 h-3.5" />
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
                        <motion.div key="overlay"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
                            onClick={() => setShowNewDM(false)}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                                transition={{ duration: 0.18 }}
                                className="w-full max-w-sm rounded-xl border border-white/10 bg-card shadow-2xl p-5 space-y-4"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <UserPlus className="w-4 h-4 text-primary" />
                                        <h2 className="text-sm font-semibold">New Conversation</h2>
                                    </div>
                                    <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => setShowNewDM(false)}>
                                        <X className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                                <Separator className="bg-white/7" />

                                {/* Friends quick-select */}
                                {friends.length > 0 && (
                                    <div className="space-y-1">
                                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Your Friends</p>
                                        <div className="space-y-1 max-h-40 overflow-y-auto">
                                            {friends.map(f => {
                                                const other = f.userA === username ? f.userB : f.userA;
                                                const p = friendProfileMap[other];
                                                const st = statusMap[other] ?? "offline";
                                                return (
                                                    <button key={other}
                                                        disabled={dmCreating}
                                                        onClick={() => openDM({ username: other, displayName: p?.displayName ?? other, schoolName: p?.schoolName ?? "", userType: "" })}
                                                        className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/8 transition-colors text-left"
                                                    >
                                                        <div className="relative shrink-0">
                                                            <Avatar className="w-8 h-8">
                                                                {p?.pfpUrl && <AvatarImage src={p.pfpUrl} />}
                                                                <AvatarFallback className="text-xs font-bold" style={{
                                                                    background: "linear-gradient(135deg, oklch(0.65 0.22 278 / 30%), oklch(0.55 0.25 295 / 30%))",
                                                                    color: "oklch(0.78 0.15 278)",
                                                                }}>{initials(p?.displayName ?? other)}</AvatarFallback>
                                                            </Avatar>
                                                            {st !== "offline" && (
                                                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                                                                    style={{ background: statusColor(st), borderColor: "var(--card)" }} />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium truncate">{p?.displayName ?? other}</p>
                                                            <p className="text-[9px]" style={{ color: statusColor(st) }}>{statusLabel(st)}</p>
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <Separator className="bg-white/7" />
                                    </div>
                                )}

                                <div className="relative">
                                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                    <Input autoFocus value={searchQuery}
                                        onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Search by username…"
                                        className="pl-8 bg-white/5 border-white/10 focus:border-primary/50 text-sm"
                                    />
                                </div>
                                <div className="space-y-1 min-h-20">
                                    {searching && (
                                        <div className="flex items-center justify-center py-6">
                                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                        </div>
                                    )}
                                    {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
                                        <p className="text-xs text-muted-foreground text-center py-6">No users found.</p>
                                    )}
                                    {searchResults.map(user => (
                                        <button key={user.username} onClick={() => openDM(user)} disabled={dmCreating}
                                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/8 transition-colors text-left"
                                        >
                                            <Avatar className="w-8 h-8 shrink-0">
                                                <AvatarFallback className="text-xs font-bold" style={{
                                                    background: "linear-gradient(135deg, oklch(0.65 0.22 278 / 30%), oklch(0.55 0.25 295 / 30%))",
                                                    color: "oklch(0.78 0.15 278)",
                                                }}>
                                                    {initials(user.displayName)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{user.displayName}</p>
                                                <p className="text-[10px] text-muted-foreground truncate">
                                                    @{user.username}{user.schoolName ? ` · ${user.schoolName}` : ""}
                                                    {isFriend(user.username) ? " · Friend" : ""}
                                                </p>
                                            </div>
                                            {dmCreating && <Loader2 className="w-3.5 h-3.5 animate-spin ml-auto shrink-0" />}
                                        </button>
                                    ))}
                                    {!searching && searchQuery.length < 2 && friends.length === 0 && (
                                        <p className="text-xs text-muted-foreground text-center py-4">
                                            Add friends first to start conversations. Type to search users.
                                        </p>
                                    )}
                                    {!searching && searchQuery.length < 2 && friends.length > 0 && (
                                        <p className="text-xs text-muted-foreground text-center py-2">
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
                        <motion.div key="group-overlay"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
                            onClick={() => { setShowNewGroup(false); setGroupName(""); setGroupDesc(""); setGroupMembers([]); setGroupEncrypted(false); setGroupEncPassword(""); setGroupEncPasswordConfirm(""); }}
                        >
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                                transition={{ duration: 0.18 }}
                                className="w-full max-w-sm rounded-xl border border-white/10 bg-card shadow-2xl p-5 space-y-4 max-h-[90dvh] overflow-y-auto"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-primary" />
                                        <h2 className="text-sm font-semibold">New Group Chat</h2>
                                    </div>
                                    <Button size="icon" variant="ghost" className="w-7 h-7"
                                        onClick={() => { setShowNewGroup(false); setGroupName(""); setGroupDesc(""); setGroupMembers([]); setGroupEncrypted(false); setGroupEncPassword(""); setGroupEncPasswordConfirm(""); }}>
                                        <X className="w-3.5 h-3.5" />
                                    </Button>
                                </div>
                                <Separator className="bg-white/7" />

                                {/* Group name & description */}
                                <div className="space-y-2">
                                    <Input
                                        autoFocus
                                        value={groupName}
                                        onChange={e => setGroupName(e.target.value)}
                                        placeholder="Group name…"
                                        maxLength={80}
                                        className="bg-white/5 border-white/10 focus:border-primary/50 text-sm"
                                    />
                                    <Input
                                        value={groupDesc}
                                        onChange={e => setGroupDesc(e.target.value)}
                                        placeholder="Description (optional)…"
                                        maxLength={200}
                                        className="bg-white/5 border-white/10 focus:border-primary/50 text-sm"
                                    />
                                </div>

                                {/* Member search */}
                                <div className="space-y-2">
                                    <p className="text-xs text-muted-foreground">Add members</p>
                                    <div className="relative">
                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                        <Input
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            placeholder="Search by username…"
                                            className="pl-8 bg-white/5 border-white/10 focus:border-primary/50 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1 max-h-36 overflow-y-auto">
                                        {searching && (
                                            <div className="flex items-center justify-center py-4">
                                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                            </div>
                                        )}
                                        {!searching && searchQuery.length >= 2 && searchResults.filter(u => !groupMembers.find(m => m.username === u.username)).length === 0 && (
                                            <p className="text-xs text-muted-foreground text-center py-3">No more users found.</p>
                                        )}
                                        {searchResults.filter(u => !groupMembers.find(m => m.username === u.username)).map(user => (
                                            <button key={user.username}
                                                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/8 transition-colors text-left"
                                                onClick={() => { setGroupMembers(prev => [...prev, user]); setSearchQuery(""); setSearchResults([]); }}
                                            >
                                                <Avatar className="w-7 h-7 shrink-0">
                                                    <AvatarFallback className="text-[10px] font-bold" style={{
                                                        background: "linear-gradient(135deg, oklch(0.65 0.22 278 / 30%), oklch(0.55 0.25 295 / 30%))",
                                                        color: "oklch(0.78 0.15 278)",
                                                    }}>{initials(user.displayName)}</AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-medium truncate">{user.displayName}</p>
                                                    <p className="text-[10px] text-muted-foreground">@{user.username}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Selected members chips */}
                                {groupMembers.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {groupMembers.map(m => (
                                            <span key={m.username} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] border border-white/10 bg-primary/10 text-primary">
                                                {m.displayName}
                                                <button onClick={() => setGroupMembers(prev => prev.filter(x => x.username !== m.username))}>
                                                    <X className="w-2.5 h-2.5" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {/* ── E2EE Toggle ──────────────────────────────────── */}
                                <div className="space-y-3">
                                    <button
                                        type="button"
                                        onClick={() => { setGroupEncrypted(v => !v); setGroupEncPassword(""); setGroupEncPasswordConfirm(""); }}
                                        className={cn(
                                            "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left",
                                            groupEncrypted
                                                ? "border-primary/50 bg-primary/8"
                                                : "border-white/10 bg-white/3 hover:bg-white/6"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                            groupEncrypted ? "bg-primary/20" : "bg-white/8"
                                        )}>
                                            <Lock className={cn("w-4 h-4", groupEncrypted ? "text-primary" : "text-muted-foreground")} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className={cn("text-xs font-semibold", groupEncrypted ? "text-primary" : "text-foreground")}>
                                                End-to-end encryption
                                            </p>
                                            <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                                                Messages encrypted with AES-256-GCM. Password required to read.
                                            </p>
                                        </div>
                                        <div className={cn(
                                            "w-9 h-5 rounded-full transition-all relative shrink-0",
                                            groupEncrypted ? "bg-primary" : "bg-white/15"
                                        )}>
                                            <div className={cn(
                                                "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all",
                                                groupEncrypted ? "left-[calc(100%-18px)]" : "left-0.5"
                                            )} />
                                        </div>
                                    </button>

                                    {groupEncrypted && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: "auto", opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.18 }}
                                            className="space-y-2 overflow-hidden"
                                        >
                                            <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/8 px-3 py-2">
                                                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                                                <p className="text-[10px] text-amber-300/90 leading-relaxed">
                                                    All participants need this password to read messages. It is <strong>never</strong> sent to any server. Keep it safe — there is no recovery option.
                                                </p>
                                            </div>
                                            <div className="relative">
                                                <Input
                                                    type={groupEncPasswordShow ? "text" : "password"}
                                                    value={groupEncPassword}
                                                    onChange={e => setGroupEncPassword(e.target.value)}
                                                    placeholder="Set encryption password (min 8 chars)…"
                                                    className="pr-9 bg-white/5 border-white/10 focus:border-primary/50 text-sm"
                                                    autoComplete="new-password"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setGroupEncPasswordShow(v => !v)}
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                >
                                                    {groupEncPasswordShow ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                </button>
                                            </div>
                                            <Input
                                                type={groupEncPasswordShow ? "text" : "password"}
                                                value={groupEncPasswordConfirm}
                                                onChange={e => setGroupEncPasswordConfirm(e.target.value)}
                                                placeholder="Confirm password…"
                                                className={cn(
                                                    "bg-white/5 border-white/10 focus:border-primary/50 text-sm",
                                                    groupEncPasswordConfirm && groupEncPasswordConfirm !== groupEncPassword && "border-red-500/50"
                                                )}
                                                autoComplete="new-password"
                                            />
                                            {groupEncPasswordConfirm && groupEncPasswordConfirm !== groupEncPassword && (
                                                <p className="text-[10px] text-red-400 px-1">Passwords do not match.</p>
                                            )}
                                            {groupEncPassword.length > 0 && groupEncPassword.length < 8 && (
                                                <p className="text-[10px] text-amber-400 px-1">Password must be at least 8 characters.</p>
                                            )}
                                            {/* Strength bar */}
                                            {groupEncPassword.length >= 8 && (
                                                <div className="space-y-1 px-1">
                                                    <div className="flex gap-1 h-1">
                                                        {[8, 12, 16, 20].map(threshold => (
                                                            <div key={threshold} className={cn(
                                                                "flex-1 rounded-full transition-all",
                                                                groupEncPassword.length >= threshold
                                                                    ? groupEncPassword.length >= 20 ? "bg-green-500" : groupEncPassword.length >= 12 ? "bg-amber-400" : "bg-amber-500/60"
                                                                    : "bg-white/10"
                                                            )} />
                                                        ))}
                                                    </div>
                                                    <p className="text-[9px] text-muted-foreground">
                                                        {groupEncPassword.length >= 20 ? "Strong password" : groupEncPassword.length >= 12 ? "Good password" : "Weak — use a longer password"}
                                                    </p>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </div>

                                <Button
                                    className="w-full"
                                    disabled={
                                        !groupName.trim() || groupMembers.length === 0 || groupCreating ||
                                        (groupEncrypted && (groupEncPassword.length < 8 || groupEncPassword !== groupEncPasswordConfirm))
                                    }
                                    onClick={createGroup}
                                    style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 278), oklch(0.55 0.25 295))" }}
                                >
                                    {groupCreating
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : groupEncrypted
                                            ? <><Lock className="w-3.5 h-3.5 mr-2" />Create Encrypted Group ({groupMembers.length + 1} members)</>
                                            : <><Users className="w-3.5 h-3.5 mr-2" />Create Group ({groupMembers.length + 1} members)</>}
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
                        isMe={mobileActionMsg.senderUsername === username}
                        canDelete={mobileActionMsg.senderUsername === username || activeConvo?.adminUsername === username}
                        username={username}
                        displayContent={activeConvo?.encrypted ? (decryptedCache[mobileActionMsg.id] ?? null) : mobileActionMsg.content}
                        onClose={() => setMobileActionMsg(null)}
                        onEdit={() => {
                            setEditingId(mobileActionMsg.id);
                            setEditContent(activeConvo?.encrypted ? (decryptedCache[mobileActionMsg.id] ?? mobileActionMsg.content) : mobileActionMsg.content);
                        }}
                        onDelete={() => deleteMsg(mobileActionMsg.id)}
                        onPin={() => togglePin(mobileActionMsg.id)}
                        onReply={() => {
                            setReplyingTo(mobileActionMsg);
                            inputRef.current?.focus();
                        }}
                        onReact={emoji => toggleReaction(mobileActionMsg.id, emoji)}
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
                                displayName: friendProfileMap[viewProfileUsername]?.displayName ?? viewProfileUsername,
                                schoolName: friendProfileMap[viewProfileUsername]?.schoolName ?? "",
                                userType: "",
                            };
                            openDM(u);
                            setViewProfileUsername(null);
                        }}
                        friendStatus={
                            isFriend(viewProfileUsername) ? "friends"
                            : sentTo(viewProfileUsername) ? "pending_sent"
                            : pendingFrom(viewProfileUsername) ? "pending_received"
                            : "none"
                        }
                        onAddFriend={() => sendFriendReq(viewProfileUsername)}
                        onRespondFriend={(accept) => respondFriendReq(viewProfileUsername, accept)}
                    />
                )}
            </AnimatePresence>

            {/* ═══ E2EE Password Prompt Modal ═══════════════════════ */}
            <AnimatePresence>
                {encPromptConvoId && (
                    <motion.div key="enc-prompt-overlay"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 8 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 8 }}
                            transition={{ duration: 0.18 }}
                            className="w-full max-w-sm rounded-xl border border-white/10 bg-card shadow-2xl p-5 space-y-4"
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                                    style={{ background: "oklch(0.65 0.22 278 / 15%)" }}>
                                    <Lock className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-sm font-semibold">Encrypted Group</h2>
                                    <p className="text-[11px] text-muted-foreground">Enter the group password to decrypt messages.</p>
                                </div>
                            </div>
                            <Separator className="bg-white/7" />
                            <div className="relative">
                                <Input
                                    autoFocus
                                    type={encPromptShow ? "text" : "password"}
                                    value={encPromptPassword}
                                    onChange={e => { setEncPromptPassword(e.target.value); setEncPromptError(""); }}
                                    onKeyDown={e => { if (e.key === "Enter") unlockEncryptedConvo(); }}
                                    placeholder="Group password…"
                                    className="pr-9 bg-white/5 border-white/10 focus:border-primary/50 text-sm"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    onClick={() => setEncPromptShow(v => !v)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {encPromptShow ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                            </div>
                            {encPromptError && (
                                <p className="text-[11px] text-red-400 flex items-center gap-1.5">
                                    <X className="w-3 h-3 shrink-0" />{encPromptError}
                                </p>
                            )}
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" className="flex-1"
                                    onClick={() => { setEncPromptConvoId(null); setActiveConvo(null); setMobileShowChat(false); }}>
                                    Cancel
                                </Button>
                                <Button size="sm" className="flex-1"
                                    disabled={!encPromptPassword || encPromptDeriving}
                                    onClick={unlockEncryptedConvo}
                                    style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 278), oklch(0.55 0.25 295))" }}
                                >
                                    {encPromptDeriving
                                        ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        : <><ShieldCheck className="w-3.5 h-3.5 mr-1.5" />Unlock</>}
                                </Button>
                            </div>
                            <div className="flex items-start gap-2 rounded-lg border border-white/8 bg-white/3 px-3 py-2.5 text-left">
                                <Info className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
                                <p className="text-[10px] text-muted-foreground leading-relaxed">
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
                            if (activeConvo?.type === "group") {
                                groupCall.startGroupCall(username, activeConvo.id);
                            }
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

/* ─────────────────────────────────────────────────────────────
   ProfileGate — shown when the user has no profile yet
───────────────────────────────────────────────────────────── */
function ProfileGate() {
    const STEPS = [
        { icon: User, text: "Choose a display name" },
        { icon: MessageSquare, text: "Start messaging classmates" },
        { icon: Sparkles, text: "React, reply, and more" },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center justify-center h-full px-6 text-center gap-8"
        >
            {/* Animated icon */}
            <motion.div
                className="w-20 h-20 rounded-3xl flex items-center justify-center shadow-lg"
                style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 278 / 25%), oklch(0.55 0.25 295 / 25%))" }}
                animate={{ scale: [1, 1.06, 1] }}
                transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
            >
                <MessageSquare className="w-9 h-9 text-primary" />
            </motion.div>

            {/* Heading */}
            <div className="max-w-sm">
                <h2 className="text-xl font-bold tracking-tight mb-2">Set up your profile first</h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                    Messaging requires a profile so classmates know who they're talking to.
                    It only takes a few seconds.
                </p>
            </div>

            {/* Step strip */}
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-0">
                {STEPS.map(({ icon: Icon, text }, i) => (
                    <div key={text} className="flex items-center gap-3 sm:gap-0">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.15 + i * 0.1, duration: 0.35, type: "spring", stiffness: 260 }}
                            className="flex items-center gap-2 px-3.5 py-2 rounded-full border border-white/10 bg-white/5 text-xs font-medium text-muted-foreground whitespace-nowrap"
                        >
                            <div
                                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-primary"
                                style={{ background: "oklch(0.65 0.22 278 / 15%)" }}
                            >
                                <Icon className="w-3 h-3" />
                            </div>
                            {text}
                        </motion.div>
                        {i < STEPS.length - 1 && (
                            <div className="hidden sm:block w-6 h-px bg-white/10 mx-1 shrink-0" />
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
                    style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 278), oklch(0.55 0.25 295))" }}
                >
                    Set up your profile
                    <ArrowRight className="w-4 h-4" />
                </a>
                <p className="text-[11px] text-muted-foreground">
                    Takes less than 30 seconds — just a display name is enough.
                </p>
            </motion.div>

            {/* Info note */}
            <div className="flex items-start gap-2 rounded-xl border border-white/8 bg-white/3 px-4 py-3 text-left max-w-xs">
                <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Your display name is what others see. Your SchoolSoft username stays private.
                </p>
            </div>
        </motion.div>
    );
}

/* ─────────────────────────────────────────────────────────────
   FriendsPanel
───────────────────────────────────────────────────────────── */
function FriendsPanel({
    username, friends, received, sent, profileMap, statusMap,
    friendSearchQuery, friendSearchResults, friendSearching, friendRequestSending,
    isFriend, pendingFrom, sentTo,
    onSearchChange, onSendRequest, onRespond, onOpenDM,
}: {
    username: string;
    friends: import("@/lib/useFriends").RTFriendship[];
    received: import("@/lib/useFriends").RTFriendship[];
    sent: import("@/lib/useFriends").RTFriendship[];
    profileMap: Record<string, import("@/lib/useFriends").FriendProfile>;
    statusMap: Record<string, UserStatus>;
    friendSearchQuery: string;
    friendSearchResults: UserSearchResult[];
    friendSearching: boolean;
    friendRequestSending: string | null;
    isFriend: (u: string) => boolean;
    pendingFrom: (u: string) => import("@/lib/useFriends").RTFriendship | undefined;
    sentTo: (u: string) => import("@/lib/useFriends").RTFriendship | undefined;
    onSearchChange: (q: string) => void;
    onSendRequest: (u: string) => void;
    onRespond: (from: string, accept: boolean) => void;
    onOpenDM: (u: string) => void;
}) {
    return (
        <div className="flex flex-col h-full">
            {/* Search bar */}
            <div className="px-3 py-2.5 border-b border-white/7 shrink-0">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input
                        value={friendSearchQuery}
                        onChange={e => onSearchChange(e.target.value)}
                        placeholder="Add friend by username…"
                        className="pl-8 h-8 text-xs bg-white/5 border-white/10 focus:border-primary/40"
                    />
                </div>
                {/* Search results */}
                {friendSearchQuery.length >= 2 && (
                    <div className="mt-2 space-y-1">
                        {friendSearching ? (
                            <div className="flex items-center justify-center py-3">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                            </div>
                        ) : friendSearchResults.length === 0 ? (
                            <p className="text-[11px] text-muted-foreground text-center py-2">No users found.</p>
                        ) : (
                            friendSearchResults.filter(u => u.username !== username).map(u => {
                                const alreadyFriend = isFriend(u.username);
                                const hasSent       = !!sentTo(u.username);
                                const hasIncoming   = !!pendingFrom(u.username);
                                return (
                                    <div key={u.username} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/5">
                                        <Avatar className="w-7 h-7 shrink-0">
                                            <AvatarFallback className="text-[10px] font-bold" style={{
                                                background: "linear-gradient(135deg, oklch(0.65 0.22 278 / 30%), oklch(0.55 0.25 295 / 30%))",
                                                color: "oklch(0.78 0.15 278)",
                                            }}>{initials(u.displayName)}</AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-medium truncate">{u.displayName}</p>
                                            <p className="text-[9px] text-muted-foreground">@{u.username}</p>
                                        </div>
                                        {alreadyFriend ? (
                                            <span className="text-[10px] text-green-400 shrink-0">Friends</span>
                                        ) : hasIncoming ? (
                                            <button onClick={() => onRespond(u.username, true)}
                                                className="text-[10px] text-primary shrink-0 hover:underline">Accept</button>
                                        ) : hasSent ? (
                                            <span className="text-[10px] text-muted-foreground shrink-0">Sent</span>
                                        ) : (
                                            <button
                                                onClick={() => onSendRequest(u.username)}
                                                disabled={friendRequestSending === u.username}
                                                className="flex items-center gap-1 text-[10px] text-primary shrink-0 hover:underline"
                                            >
                                                {friendRequestSending === u.username
                                                    ? <Loader2 className="w-3 h-3 animate-spin" />
                                                    : <UserPlus className="w-3 h-3" />}
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
                    <div className="px-3 py-2 border-b border-white/7">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                            Pending ({received.length})
                        </p>
                        {received.map(f => {
                            const other = f.requestedBy;
                            const p = profileMap[other];
                            return (
                                <div key={f.id} className="flex items-center gap-2 py-1.5">
                                    <Avatar className="w-8 h-8 shrink-0">
                                        {p?.pfpUrl && <AvatarImage src={p.pfpUrl} />}
                                        <AvatarFallback className="text-[10px] font-bold" style={{
                                            background: "linear-gradient(135deg, oklch(0.65 0.22 278 / 30%), oklch(0.55 0.25 295 / 30%))",
                                            color: "oklch(0.78 0.15 278)",
                                        }}>{initials(p?.displayName ?? other)}</AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium truncate">{p?.displayName ?? other}</p>
                                        <p className="text-[9px] text-muted-foreground">@{other}</p>
                                    </div>
                                    <div className="flex gap-0.5">
                                        <button onClick={() => onRespond(other, true)}
                                            className="w-6 h-6 rounded-md flex items-center justify-center text-green-400 hover:bg-green-500/15 transition-colors">
                                            <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => onRespond(other, false)}
                                            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                                            <X className="w-3.5 h-3.5" />
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
                        <div className="flex flex-col items-center justify-center py-12 gap-2 text-center">
                            <Users className="w-8 h-8 text-muted-foreground/25" />
                            <p className="text-xs text-muted-foreground">No friends yet.</p>
                            <p className="text-[10px] text-muted-foreground/60">Search above to add friends.</p>
                        </div>
                    ) : (
                        <>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
                                Friends — {friends.filter(f => {
                                    const other = f.userA === username ? f.userB : f.userA;
                                    return (statusMap[other] ?? "offline") !== "offline";
                                }).length} online
                            </p>
                            {friends.map(f => {
                                const other = f.userA === username ? f.userB : f.userA;
                                const p = profileMap[other];
                                const st = statusMap[other] ?? "offline";
                                return (
                                    <div key={f.id} className="flex items-center gap-2 py-1.5 group">
                                        <div className="relative shrink-0">
                                            <Avatar className="w-8 h-8">
                                                {p?.pfpUrl && <AvatarImage src={p.pfpUrl} />}
                                                <AvatarFallback className="text-[10px] font-bold" style={{
                                                    background: "linear-gradient(135deg, oklch(0.65 0.22 278 / 30%), oklch(0.55 0.25 295 / 30%))",
                                                    color: "oklch(0.78 0.15 278)",
                                                }}>{initials(p?.displayName ?? other)}</AvatarFallback>
                                            </Avatar>
                                            {st !== "offline" && (
                                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                                                    style={{ background: statusColor(st), borderColor: "var(--card)" }} />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-medium truncate">{p?.displayName ?? other}</p>
                                            <p className="text-[9px]" style={{ color: statusColor(st) }}>{statusLabel(st)}</p>
                                        </div>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button
                                                    onClick={() => onOpenDM(other)}
                                                    className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <MessageSquare className="w-3.5 h-3.5" />
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="left" className="text-[10px]">Message</TooltipContent>
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

/* ─────────────────────────────────────────────────────────────
   ConvoItem
───────────────────────────────────────────────────────────── */
function ConvoItem({
    convo, name, subtitle, active, username, index, pfpCache, statusMap, onClick,
}: {
    convo: Conversation; name: string; subtitle: string; active: boolean;
    username: string; index: number; pfpCache: Record<string, string>;
    statusMap: Record<string, UserStatus>; onClick: () => void;
}) {
    const { unreadByConvo } = useUnread();
    const unread = unreadByConvo[convo.id] ?? 0;

    const dmPartner = convo.type === "dm" ? convo.participants.find(p => p !== username) : null;
    const partnerStatus: UserStatus = dmPartner ? (statusMap[dmPartner] ?? "offline") : "offline";

    return (
        <motion.button
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: index * 0.03, ease: [0.22, 1, 0.36, 1] }}
            onClick={onClick}
            className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                active ? "bg-white/8" : "hover:bg-white/5"
            )}
            style={active ? { boxShadow: "inset 2px 0 0 oklch(0.65 0.22 278)" } : undefined}
        >
            <div className="relative shrink-0">
                <Avatar className="w-9 h-9">
                    {convo.type === "dm" && (() => {
                        const partner = convo.participants.find(p => p !== username);
                        const pfp = partner ? (pfpCache[partner] || convo.participantPfpUrls[partner] || "") : "";
                        return pfp ? <AvatarImage src={pfp} alt={name} /> : null;
                    })()}
                    <AvatarFallback className="text-xs font-bold" style={{
                        background: "linear-gradient(135deg, oklch(0.65 0.22 278 / 35%), oklch(0.55 0.25 295 / 35%))",
                        color: "oklch(0.78 0.15 278)",
                    }}>
                        {convo.type === "group" ? <Users className="w-4 h-4" /> : initials(name)}
                    </AvatarFallback>
                </Avatar>
                {/* Status dot for DMs */}
                {convo.type === "dm" && partnerStatus !== "offline" && (
                    <span
                        className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                        style={{ background: statusColor(partnerStatus), borderColor: "var(--card)" }}
                    />
                )}
                {unread > 0 && (
                    <motion.span
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full"
                        style={{ background: "oklch(0.65 0.22 278)", boxShadow: "0 0 0 2px var(--card)" }}
                    />
                )}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                    <span className={cn("text-sm truncate", unread > 0 ? "font-semibold" : "font-medium")}>
                        {name}
                    </span>
                    <div className="flex items-center gap-1 shrink-0 ml-1">
                        {convo.encrypted && <Lock className="w-2.5 h-2.5 text-primary/60" />}
                        {convo.lastAt > 0 && (
                            <span className="text-[9px] text-muted-foreground">
                                {relativeTime(convo.lastAt)}
                            </span>
                        )}
                    </div>
                </div>
                <p className={cn("text-[11px] truncate", unread > 0 ? "text-foreground/80" : "text-muted-foreground")}>
                    {convo.lastMessage
                        ? (convo.lastSenderUsername === username ? "You: " : (convo.type === "group" ? (convo.participantNames[convo.lastSenderUsername]?.split(" ")[0] ?? convo.lastSenderUsername) + ": " : "")) + convo.lastMessage
                        : subtitle}
                </p>
            </div>
        </motion.button>
    );
}

/* ─────────────────────────────────────────────────────────────
   Share Card Bubble — rendered inside a MessageBubble
───────────────────────────────────────────────────────────── */

// Grade colours matching OVERALL_GRADE_STYLE in the assignment page
const SHARE_GRADE_STYLE: Record<string, { bg: string; color: string; border: string }> = {
    A: { bg: "oklch(0.65 0.22 278 / 22%)", color: "oklch(0.80 0.18 278)", border: "oklch(0.65 0.22 278 / 40%)" },
    B: { bg: "oklch(0.65 0.20 245 / 22%)", color: "oklch(0.78 0.17 245)", border: "oklch(0.65 0.20 245 / 40%)" },
    C: { bg: "oklch(0.65 0.18 210 / 22%)", color: "oklch(0.78 0.16 210)", border: "oklch(0.65 0.18 210 / 40%)" },
    D: { bg: "oklch(0.65 0.20 175 / 22%)", color: "oklch(0.75 0.18 175)", border: "oklch(0.65 0.20 175 / 40%)" },
    E: { bg: "oklch(0.65 0.22 148 / 22%)", color: "oklch(0.72 0.18 148)", border: "oklch(0.65 0.22 148 / 40%)" },
    F: { bg: "oklch(1 0 0 / 8%)",           color: "oklch(0.55 0 0)",      border: "oklch(1 0 0 / 15%)"          },
    "—": { bg: "oklch(1 0 0 / 6%)",         color: "oklch(0.50 0 0)",      border: "oklch(1 0 0 / 12%)"          },
};

const STATUS_DOT: Record<string, string> = {
    draft:     "oklch(0.75 0.10 80)",
    published: "oklch(0.72 0.18 148)",
    archived:  "oklch(0.55 0.02 260)",
};

function NoteFullModal({ card, onClose }: { card: NoteShareCard; onClose: () => void }) {
    const dotColor = STATUS_DOT[card.status] ?? STATUS_DOT.draft;
    // Close on Escape
    useEffect(() => {
        const handler = (e: globalThis.KeyboardEvent) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [onClose]);
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center"
            onClick={onClose}
        >
            <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 16, scale: 0.97 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="w-full sm:max-w-xl rounded-t-3xl sm:rounded-2xl border border-white/10 bg-card shadow-2xl flex flex-col overflow-hidden"
                style={{ maxHeight: "88dvh" }}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-2.5 px-4 py-3 border-b shrink-0"
                    style={{ borderColor: "oklch(1 0 0 / 8%)" }}>
                    <StickyNote className="w-3.5 h-3.5 shrink-0 opacity-50" />
                    <span className="font-semibold text-sm flex-1 truncate">{card.title || "Untitled"}</span>
                    <span className="flex items-center gap-1 text-[10px] font-medium mr-1"
                        style={{ color: dotColor }}>
                        <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: dotColor }} />
                        {card.status}
                    </span>
                    <button onClick={onClose}
                        className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>
                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-4">
                    {card.fullContent ? (
                        <div className="prose prose-invert prose-sm max-w-none
                            prose-headings:font-semibold prose-headings:text-foreground
                            prose-p:text-foreground/80 prose-p:leading-relaxed
                            prose-code:bg-white/8 prose-code:px-1 prose-code:rounded prose-code:text-xs
                            prose-pre:bg-white/6 prose-pre:rounded-xl prose-pre:p-3
                            prose-blockquote:border-l-primary/40 prose-blockquote:text-foreground/60
                            prose-a:text-primary prose-strong:text-foreground
                            prose-li:text-foreground/80">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {card.fullContent}
                            </ReactMarkdown>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground">{card.preview || "No content."}</p>
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
            className="mt-1.5 rounded-2xl overflow-hidden cursor-pointer group/notecard"
            style={{
                background: isMe ? "oklch(0 0 0 / 22%)" : "oklch(1 0 0 / 6%)",
                border: `1px solid ${isMe ? "oklch(1 0 0 / 14%)" : "oklch(1 0 0 / 10%)"}`,
                minWidth: 230,
                maxWidth: 310,
            }}
            onClick={() => setOpen(true)}
        >
            {/* Header row */}
            <div
                className="flex items-center gap-2 px-3 py-2 border-b"
                style={{ borderColor: isMe ? "oklch(1 0 0 / 12%)" : "oklch(1 0 0 / 7%)" }}
            >
                <StickyNote className="w-3 h-3 shrink-0 opacity-60" />
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-55 flex-1">Note</span>
                <span
                    className="flex items-center gap-1 text-[9px] font-medium"
                    style={{ color: dotColor }}
                >
                    <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: dotColor }} />
                    {card.status}
                </span>
            </div>
            {/* Body */}
            <div className="px-3 py-2.5">
                <p className="text-sm font-semibold leading-snug mb-1 truncate">
                    {card.title || "Untitled"}
                </p>
                {card.preview && (
                    <p className="text-[11px] opacity-55 line-clamp-2 leading-relaxed">
                        {card.preview}
                    </p>
                )}
                <div className="flex items-center gap-1 mt-2 text-[10px] opacity-0 group-hover/notecard:opacity-60 transition-opacity"
                    style={{ color: "oklch(0.72 0.18 148)" }}>
                    <BookOpen className="w-2.5 h-2.5" />
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
    const gs = SHARE_GRADE_STYLE[card.grade] ?? SHARE_GRADE_STYLE["—"];
    return (
        <div
            className="mt-1.5 rounded-2xl overflow-hidden"
            style={{
                background: isMe ? "oklch(0 0 0 / 22%)" : "oklch(1 0 0 / 6%)",
                border: `1px solid ${isMe ? "oklch(1 0 0 / 14%)" : "oklch(1 0 0 / 10%)"}`,
                minWidth: 230,
                maxWidth: 310,
            }}
        >
            {/* Header row */}
            <div
                className="flex items-center gap-2 px-3 py-2 border-b"
                style={{ borderColor: isMe ? "oklch(1 0 0 / 12%)" : "oklch(1 0 0 / 7%)" }}
            >
                <BarChart2 className="w-3 h-3 shrink-0 opacity-60" />
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-55 flex-1">Grade</span>
                {card.confidence === "estimated" && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                        style={{ background: "oklch(0.75 0.16 82 / 18%)", color: "oklch(0.78 0.14 82)" }}>
                        est.
                    </span>
                )}
            </div>
            {/* Body */}
            <div className="flex items-center gap-3 px-3 py-2.5">
                <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center font-black shrink-0"
                    style={{
                        background: gs.bg,
                        color: gs.color,
                        border: `1.5px solid ${gs.border}`,
                        fontSize: "1.4rem",
                    }}
                >
                    {card.grade}
                </div>
                <div className="min-w-0">
                    <p className="text-sm font-semibold truncate leading-snug">
                        {card.assignmentTitle}
                    </p>
                    <p className="text-[10px] opacity-55 truncate mt-0.5">
                        {card.subjectName}
                    </p>
                    {card.totalPoints && (
                        <p className="text-[9px] opacity-40 mt-0.5 font-mono">
                            {card.totalPoints} pts
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

function ShareCardBubble({ card, isMe }: { card: ShareCard; isMe: boolean }) {
    if (card.type === "note") return <NoteCardBubble card={card} isMe={isMe} />;
    return <GradeCardBubble card={card} isMe={isMe} />;
}

/* ─────────────────────────────────────────────────────────────
   MessageBubble
───────────────────────────────────────────────────────────── */
function MessageBubble({
    msg, displayContent, replyToDisplayContent, isEncryptedConvo, isMe, sameSender, isLastInGroup, isEditing, editContent, editSaving, username, isGroup, canDelete,
    isMobile, onMobileTap, pfpUrl, onAvatarClick,
    onEditStart, onEditChange, onEditSubmit, onEditCancel, onDelete, onPin, onReply, onReact,
}: {
    msg: Message; displayContent: string | null; isEncryptedConvo: boolean; isMe: boolean; sameSender: boolean; isLastInGroup: boolean;
    isEditing: boolean; editContent: string; editSaving: boolean; username: string;
    isGroup: boolean; canDelete: boolean;
    replyToDisplayContent?: string | null;
    isMobile: boolean; onMobileTap: () => void;
    pfpUrl?: string; onAvatarClick?: () => void;
    onEditStart: () => void; onEditChange: (v: string) => void;
    onEditSubmit: () => void; onEditCancel: () => void;
    onDelete: () => void; onPin: () => void; onReply: () => void;
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
                "flex gap-2 group",
                isMe ? "flex-row-reverse" : "flex-row",
                sameSender ? "mt-0.5" : "mt-3"
            )}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => { setHover(false); setShowPicker(false); }}
        >
            {/* Avatar */}
            <div className="w-7 shrink-0 mt-0.5">
                {!sameSender && (
                    <Avatar
                        className={cn("w-7 h-7", !isMe && onAvatarClick && "cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all")}
                        onClick={() => { if (!isMe && onAvatarClick) onAvatarClick(); }}
                    >
                        {pfpUrl && <AvatarImage src={pfpUrl} alt={msg.senderDisplayName} />}
                        <AvatarFallback className="text-[10px] font-bold" style={{
                            background: isMe
                                ? "linear-gradient(135deg, oklch(0.65 0.22 278 / 50%), oklch(0.55 0.25 295 / 50%))"
                                : "linear-gradient(135deg, oklch(0.50 0.18 150 / 40%), oklch(0.45 0.20 160 / 40%))",
                            color: isMe ? "oklch(0.82 0.15 278)" : "oklch(0.82 0.12 150)",
                        }}>
                            {initials(msg.senderDisplayName)}
                        </AvatarFallback>
                    </Avatar>
                )}
            </div>

            {/* Content column */}
            <div className={cn("flex flex-col max-w-[70%] min-w-0", isMe ? "items-end" : "items-start")}>
                {!sameSender && !isMe && (
                    <span className="text-[10px] text-muted-foreground mb-0.5 px-1">
                        {msg.senderDisplayName}
                    </span>
                )}

                {/* Reply quote */}
                {msg.replyTo && (
                    <div
                        className="flex items-start gap-1.5 px-2.5 py-1.5 mb-1 rounded-lg bg-white/5 border border-white/8 border-l-2 w-full min-w-0"
                        style={{ borderLeftColor: "oklch(0.65 0.22 278 / 60%)" }}
                    >
                        <CornerUpLeft className="w-2.5 h-2.5 text-primary/60 shrink-0 mt-0.5" />
                        <div className="min-w-0 overflow-hidden">
                            <p className="text-[9px] font-semibold text-primary/80 truncate">{msg.replyTo.senderDisplayName}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{replyToDisplayContent ?? msg.replyTo.content}</p>
                        </div>
                    </div>
                )}

                <div className="relative min-w-0 w-full">
                    {isEditing ? (
                        <div className="flex items-center gap-1.5">
                            <Input autoFocus value={editContent}
                                onChange={e => onEditChange(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onEditSubmit(); }
                                    if (e.key === "Escape") onEditCancel();
                                }}
                                className="text-sm bg-white/8 border-primary/40 min-w-50"
                            />
                            <Button size="icon" variant="ghost" className="w-7 h-7 text-green-400" onClick={onEditSubmit} disabled={editSaving}>
                                {editSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            </Button>
                            <Button size="icon" variant="ghost" className="w-7 h-7 text-muted-foreground" onClick={onEditCancel}>
                                <X className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    ) : (
                        <div
                            className={cn(
                                "rounded-2xl px-3.5 py-2 text-sm wrap-break-word",
                                isMe ? "rounded-tr-sm text-white" : "rounded-tl-sm bg-white/8 text-foreground",
                                isMobile && "cursor-pointer active:opacity-75 transition-opacity select-none"
                            )}
                            style={isMe ? { background: "linear-gradient(135deg, oklch(0.65 0.22 278), oklch(0.55 0.25 295))" } : undefined}
                            onClick={() => { if (isMobile) onMobileTap(); }}
                        >
                            {msg.shareCard ? (
                                <ShareCardBubble card={msg.shareCard} isMe={isMe} />
                            ) : isEncryptedConvo && displayContent === null ? (
                                <span className="flex items-center gap-1.5 text-muted-foreground/60 italic text-xs">
                                    <Loader2 className="w-3 h-3 animate-spin" /> Decrypting…
                                </span>
                            ) : (
                                <>
                                    <MessageContent text={displayContent ?? msg.content} isMe={isMe} />
                                    {msg.pinned && <Pin className="inline w-2.5 h-2.5 ml-1.5 opacity-60" />}
                                </>
                            )}
                        </div>
                    )}

                    {/* Action toolbar — desktop hover only */}
                    <AnimatePresence>
                        {hover && !isEditing && !isMobile && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.88 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.88 }}
                                transition={{ duration: 0.1 }}
                                className={cn(
                                    "absolute top-1/2 -translate-y-1/2 flex items-center gap-0.5 bg-card border border-white/10 rounded-lg shadow-lg px-1 py-0.5 z-10",
                                    isMe ? "right-full mr-2" : "left-full ml-2"
                                )}
                            >
                                {/* Emoji picker trigger */}
                                <div className="relative">
                                    <ActionBtn icon={Smile} label="React" onClick={() => setShowPicker(v => !v)} />
                                    <AnimatePresence>
                                        {showPicker && (
                                            <motion.div
                                                initial={{ opacity: 0, scale: 0.85, y: 4 }}
                                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.85 }}
                                                transition={{ duration: 0.12 }}
                                                className={cn(
                                                    "absolute bottom-full mb-1.5 flex gap-0.5 bg-card border border-white/10 rounded-xl shadow-xl p-1.5 z-20",
                                                    isMe ? "right-0" : "left-0"
                                                )}
                                            >
                                                {QUICK_REACTIONS.map(e => (
                                                    <button key={e}
                                                        onClick={() => { onReact(e); setShowPicker(false); }}
                                                        className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/10 text-base transition-all hover:scale-125"
                                                    >
                                                        {e}
                                                    </button>
                                                ))}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                                <ActionBtn icon={CornerUpLeft} label="Reply" onClick={onReply} />
                                <ActionBtn icon={copied ? Check : Copy} label={copied ? "Copied!" : "Copy"} onClick={copy} />
                                <ActionBtn icon={msg.pinned ? PinOff : Pin} label={msg.pinned ? "Unpin" : "Pin"} onClick={onPin} />
                                {isMe && <ActionBtn icon={Pencil} label="Edit" onClick={onEditStart} />}
                                {canDelete && <ActionBtn icon={Trash2} label="Delete" onClick={onDelete} danger />}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Reactions */}
                {reactionEntries.length > 0 && (
                    <div className={cn("flex flex-wrap gap-1 mt-1 px-0.5", isMe ? "justify-end" : "justify-start")}>
                        {reactionEntries.map(([emoji, users]) => {
                            const reacted = users.includes(username);
                            return (
                                <motion.button key={emoji}
                                    layout
                                    initial={{ scale: 0.5, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    exit={{ scale: 0.5, opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                                    onClick={() => onReact(emoji)}
                                    className={cn(
                                        "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[11px] border transition-colors",
                                        reacted
                                            ? "border-primary/40 bg-primary/10 text-foreground"
                                            : "border-white/10 bg-white/5 text-muted-foreground hover:border-white/20"
                                    )}
                                >
                                    <span>{emoji}</span>
                                    <span className="font-medium tabular-nums">{users.length}</span>
                                </motion.button>
                            );
                        })}
                    </div>
                )}

                <div className="flex items-center gap-1 mt-0.5 px-1">
                    {isLastInGroup && (
                        <span className="text-[9px] text-muted-foreground">{formatTime(msg.createdAt)}</span>
                    )}
                    {msg.edited && <span className="text-[9px] text-muted-foreground italic">(edited)</span>}
                </div>
            </div>
        </motion.div>
    );
}

/* ─────────────────────────────────────────────────────────────
   ActionBtn
───────────────────────────────────────────────────────────── */
function ActionBtn({ icon: Icon, label, onClick, danger }: {
    icon: React.ElementType; label: string; onClick: () => void; danger?: boolean;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button onClick={onClick}
                    className={cn(
                        "w-6 h-6 flex items-center justify-center rounded-md transition-colors",
                        danger
                            ? "text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                    )}
                >
                    <Icon className="w-3 h-3" />
                </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">{label}</TooltipContent>
        </Tooltip>
    );
}

/* ─────────────────────────────────────────────────────────────
   EmptyChat
───────────────────────────────────────────────────────────── */
function EmptyChat({ onNew }: { onNew: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col items-center justify-center h-full gap-4 text-center px-8"
        >
            <motion.div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 278 / 20%), oklch(0.55 0.25 295 / 20%))" }}
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            >
                <MessageSquare className="w-7 h-7 text-primary" />
            </motion.div>
            <div>
                <p className="text-sm font-semibold">Your messages</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                    Send private messages to other Schoolsoft+ users.
                </p>
            </div>
            <Button size="sm" onClick={onNew}
                style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 278), oklch(0.55 0.25 295))" }}
            >
                <UserPlus className="w-3.5 h-3.5 mr-2" />
                New conversation
            </Button>
            <div className="flex items-start gap-2 rounded-lg border border-white/8 bg-white/3 px-4 py-3 text-left max-w-xs">
                <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[10px] text-muted-foreground">
                    You can only message users who have a Schoolsoft+ profile. Search by their exact username.
                </p>
            </div>
        </motion.div>
    );
}

/* ─────────────────────────────────────────────────────────────
   MobileActionSheet — bottom sheet for message actions on touch
───────────────────────────────────────────────────────────── */
interface SheetAction {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    danger?: boolean;
}

function MobileActionSheet({
    msg, isMe, canDelete, username, displayContent, onClose, onEdit, onDelete, onPin, onReply, onReact,
}: {
    msg: Message; isMe: boolean; canDelete: boolean; username: string; displayContent?: string | null;
    onClose: () => void; onEdit: () => void; onDelete: () => void;
    onPin: () => void; onReply: () => void; onReact: (emoji: string) => void;
}) {
    const [copied, setCopied] = useState(false);

    const copy = () => {
        navigator.clipboard.writeText(displayContent ?? msg.content);
        setCopied(true);
        setTimeout(() => { setCopied(false); onClose(); }, 900);
    };

    const actions: SheetAction[] = [
        { icon: CornerUpLeft, label: "Reply",                          onClick: () => { onReply(); onClose(); } },
        { icon: copied ? Check : Copy, label: copied ? "Copied!" : "Copy", onClick: copy },
        { icon: msg.pinned ? PinOff : Pin, label: msg.pinned ? "Unpin" : "Pin", onClick: () => { onPin(); onClose(); } },
        ...(isMe ? [{ icon: Pencil, label: "Edit", onClick: () => { onEdit(); onClose(); } } as SheetAction] : []),
        ...(canDelete ? [{ icon: Trash2, label: "Delete", onClick: () => { onDelete(); onClose(); }, danger: true } as SheetAction] : []),
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
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 320, mass: 0.8 }}
                className="relative w-full rounded-t-3xl border-t border-white/10 overflow-hidden"
                style={{ background: "oklch(0.13 0 0)" }}
                onClick={e => e.stopPropagation()}
            >
                {/* Drag handle */}
                <div className="flex justify-center pt-3 pb-1">
                    <div className="w-9 h-1 rounded-full bg-white/20" />
                </div>

                {/* Message preview */}
                <div className="px-4 pb-2 pt-1">
                    <div
                        className="rounded-xl px-3.5 py-2.5 border border-white/8"
                        style={{ background: "oklch(1 0 0 / 4%)" }}
                    >
                        <p className="text-[10px] font-semibold mb-1" style={{ color: "oklch(0.72 0.16 263)" }}>
                            {msg.senderDisplayName}
                        </p>
                        <p className="text-sm text-foreground/90 line-clamp-3 wrap-break-word">{displayContent ?? msg.content}</p>
                    </div>
                </div>

                {/* Quick reactions */}
                <div
                    className="flex items-center justify-around px-4 py-3 mx-4 mb-2 rounded-2xl"
                    style={{ background: "oklch(1 0 0 / 4%)", border: "1px solid oklch(1 0 0 / 7%)" }}
                >
                    {QUICK_REACTIONS.map(e => {
                        const reacted = (msg.reactions?.[e] ?? []).includes(username);
                        return (
                            <motion.button
                                key={e}
                                whileTap={{ scale: 0.75 }}
                                onClick={() => { onReact(e); onClose(); }}
                                className={cn(
                                    "relative w-11 h-11 flex items-center justify-center rounded-full text-2xl transition-colors",
                                    reacted ? "bg-primary/20" : "active:bg-white/10"
                                )}
                            >
                                {e}
                                {reacted && (
                                    <span className="absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full bg-primary border-2 border-card" />
                                )}
                            </motion.button>
                        );
                    })}
                </div>

                {/* Action rows */}
                <div
                    className="mx-4 mb-8 rounded-2xl overflow-hidden"
                    style={{ background: "oklch(1 0 0 / 4%)", border: "1px solid oklch(1 0 0 / 7%)" }}
                >
                    {actions.map(({ icon: Icon, label, onClick, danger }, i) => (
                        <motion.button
                            key={label}
                            whileTap={{ backgroundColor: "oklch(1 0 0 / 8%)" }}
                            onClick={onClick}
                            className={cn(
                                "w-full flex items-center gap-4 px-5 py-4 text-sm font-medium text-left transition-colors",
                                danger ? "text-destructive" : "text-foreground",
                                i > 0 && "border-t border-white/7"
                            )}
                        >
                            <Icon className="w-4.5 h-4.5 shrink-0" />
                            {label}
                        </motion.button>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
}
