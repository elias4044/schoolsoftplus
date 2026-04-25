"use client";

import {
    useState,
    useEffect,
    useRef,
    FormEvent,
    useCallback,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useConversations, useMessages, RTConversation, RTMessage, ReplyTo } from "@/lib/useMessages";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/useSession";
import { useUnread } from "@/lib/unread-context";
import { useNotifications } from "@/lib/useNotifications";

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

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

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

    const { setUnread, markRead } = useUnread();

    const [showPinned, setShowPinned] = useState(false);
    const [pinnedMessages, setPinnedMessages] = useState<Message[]>([]);
    const [draft, setDraft] = useState("");
    const [sending, setSending] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");
    const [editSaving, setEditSaving] = useState(false);
    const [showNewDM, setShowNewDM] = useState(false);
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

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /* Notifications */
    const { requestPermission } = useNotifications(conversations, messages, activeConvo?.id ?? null, username);

    useEffect(() => {
        if (typeof Notification !== "undefined") setNotifPermission(Notification.permission);
    }, []);

    /* Unread tracking */
    useEffect(() => {
        if (!username) return;
        for (const c of conversations) {
            if (c.id === activeConvo?.id) { setUnread(c.id, 0); continue; }
            const stored = localStorage.getItem(`lastRead_${c.id}`);
            const lastRead = stored ? parseInt(stored) : 0;
            setUnread(c.id, c.lastAt > lastRead && c.lastSenderUsername !== username ? 1 : 0);
        }
    }, [conversations, activeConvo?.id, username, setUnread]);

    /* Mark read on open */
    useEffect(() => {
        if (!activeConvo) return;
        localStorage.setItem(`lastRead_${activeConvo.id}`, String(Date.now()));
        markRead(activeConvo.id);
    }, [activeConvo?.id, markRead]);

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
    }, [activeConvo?.id]);

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
            if (data.success) { setActiveConvo(data.conversation); setMobileShowChat(true); }
        } finally {
            setDmCreating(false); setShowNewDM(false); setSearchQuery(""); setSearchResults([]);
        }
    };

    const sendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!activeConvo || !draft.trim() || sending) return;
        setSending(true);
        const content = draft.trim();
        const reply: ReplyTo | null = replyingTo
            ? { messageId: replyingTo.id, content: replyingTo.content, senderDisplayName: replyingTo.senderDisplayName }
            : null;
        setDraft(""); setReplyingTo(null);
        try {
            await fetch(`/api/conversations/${activeConvo.id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content, replyTo: reply }),
            });
        } finally { setSending(false); inputRef.current?.focus(); }
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
        const other = c.participants.find(p => p !== username) ?? "";
        return c.participantNames[other] || other;
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
                                            const p = await requestPermission();
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
                                        onClick={() => setShowNewDM(true)}
                                    >
                                        <UserPlus className="w-3.5 h-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="text-xs">New conversation</TooltipContent>
                            </Tooltip>
                        </div>
                    </div>

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

                    <div className="flex-1 overflow-y-auto">
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
                                        active={activeConvo?.id === convo.id}
                                        username={username}
                                        index={i}
                                        onClick={() => {
                                            setActiveConvo(convo);
                                            setMobileShowChat(true);
                                            setEditingId(null);
                                        }}
                                    />
                                ))}
                            </AnimatePresence>
                        )}
                    </div>
                </motion.div>

                {/* ═══ Chat area ═════════════════════════════════════ */}
                <div className={cn("flex flex-col flex-1 min-w-0", !mobileShowChat && "hidden md:flex")}>
                    {!activeConvo ? (
                        <EmptyChat onNew={() => setShowNewDM(true)} />
                    ) : (
                        <>
                            {/* Header */}
                            <motion.div
                                initial={{ y: -8, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ duration: 0.25 }}
                                className="flex items-center gap-3 px-4 h-14 border-b border-white/7 shrink-0"
                            >
                                <button className="md:hidden mr-1 text-muted-foreground hover:text-foreground"
                                    onClick={() => setMobileShowChat(false)}>
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <Avatar className="w-8 h-8 shrink-0">
                                    <AvatarFallback className="text-xs font-bold" style={{
                                        background: "linear-gradient(135deg, oklch(0.65 0.22 278 / 40%), oklch(0.55 0.25 295 / 40%))",
                                        color: "oklch(0.78 0.15 278)",
                                    }}>
                                        {initials(partnerName(activeConvo))}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold truncate">{partnerName(activeConvo)}</p>
                                    <p className="text-[10px] text-muted-foreground truncate">
                                        {activeConvo.participants.find(p => p !== username)}
                                    </p>
                                </div>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button size="icon" variant="ghost"
                                            className={cn("w-8 h-8 rounded-lg", showPinned && "bg-primary/15 text-primary")}
                                            onClick={togglePinnedPanel}
                                        >
                                            <Pin className="w-3.5 h-3.5" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="bottom" className="text-xs">
                                        {showPinned ? "Hide pinned" : "Pinned messages"}
                                    </TooltipContent>
                                </Tooltip>
                            </motion.div>

                            <div className="flex flex-1 min-h-0">
                                {/* Messages */}
                                <div className="flex flex-col flex-1 min-w-0 min-h-0 relative">
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
                                                        <MessageBubble
                                                            key={msg.id}
                                                            msg={msg}
                                                            isMe={msg.senderUsername === username}
                                                            sameSender={i > 0 && group.msgs[i - 1].senderUsername === msg.senderUsername}
                                                            isEditing={editingId === msg.id}
                                                            editContent={editContent}
                                                            editSaving={editSaving}
                                                            username={username}
                                                            isMobile={isMobile}
                                                            onMobileTap={() => setMobileActionMsg(msg)}
                                                            onEditStart={() => { setEditingId(msg.id); setEditContent(msg.content); }}
                                                            onEditChange={setEditContent}
                                                            onEditSubmit={() => submitEdit(msg.id)}
                                                            onEditCancel={() => setEditingId(null)}
                                                            onDelete={() => deleteMsg(msg.id)}
                                                            onPin={() => togglePin(msg.id)}
                                                            onReply={() => { setReplyingTo(msg); inputRef.current?.focus(); }}
                                                            onReact={emoji => toggleReaction(msg.id, emoji)}
                                                        />
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
                                        className="flex items-end gap-2 px-4 py-3 border-t border-white/7 shrink-0"
                                    >
                                        <Input
                                            ref={inputRef}
                                            value={draft}
                                            onChange={e => setDraft(e.target.value)}
                                            onKeyDown={e => {
                                                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(e as unknown as FormEvent); }
                                                if (e.key === "Escape") setReplyingTo(null);
                                            }}
                                            placeholder={`Message ${partnerName(activeConvo)}…`}
                                            className="flex-1 bg-white/5 border-white/10 focus:border-primary/50 text-sm"
                                            autoComplete="off"
                                            disabled={sending}
                                        />
                                        <Button type="submit" size="icon" disabled={!draft.trim() || sending}
                                            className="w-9 h-9 shrink-0"
                                            style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 278), oklch(0.55 0.25 295))" }}
                                        >
                                            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        </Button>
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
                                                                <p className="text-xs text-foreground/90 wrap-break-word min-w-0">{msg.content}</p>
                                                                <p className="text-[9px] text-muted-foreground">{formatDate(msg.createdAt)} · {formatTime(msg.createdAt)}</p>
                                                            </motion.div>
                                                        ))}
                                                    </AnimatePresence>
                                                )}
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
                                                </p>
                                            </div>
                                            {dmCreating && <Loader2 className="w-3.5 h-3.5 animate-spin ml-auto shrink-0" />}
                                        </button>
                                    ))}
                                    {!searching && searchQuery.length < 2 && (
                                        <p className="text-xs text-muted-foreground text-center py-4">
                                            Type at least 2 characters to search.
                                        </p>
                                    )}
                                </div>
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
                        username={username}
                        onClose={() => setMobileActionMsg(null)}
                        onEdit={() => {
                            setEditingId(mobileActionMsg.id);
                            setEditContent(mobileActionMsg.content);
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
   ConvoItem
───────────────────────────────────────────────────────────── */
function ConvoItem({
    convo, name, active, username, index, onClick,
}: {
    convo: Conversation; name: string; active: boolean;
    username: string; index: number; onClick: () => void;
}) {
    const { unreadByConvo } = useUnread();
    const unread = unreadByConvo[convo.id] ?? 0;

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
                    <AvatarFallback className="text-xs font-bold" style={{
                        background: "linear-gradient(135deg, oklch(0.65 0.22 278 / 35%), oklch(0.55 0.25 295 / 35%))",
                        color: "oklch(0.78 0.15 278)",
                    }}>
                        {initials(name)}
                    </AvatarFallback>
                </Avatar>
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
                    {convo.lastAt > 0 && (
                        <span className="text-[9px] text-muted-foreground shrink-0 ml-1">
                            {relativeTime(convo.lastAt)}
                        </span>
                    )}
                </div>
                <p className={cn("text-[11px] truncate", unread > 0 ? "text-foreground/80" : "text-muted-foreground")}>
                    {convo.lastMessage
                        ? (convo.lastSenderUsername === username ? "You: " : "") + convo.lastMessage
                        : "No messages yet"}
                </p>
            </div>
        </motion.button>
    );
}

/* ─────────────────────────────────────────────────────────────
   MessageBubble
───────────────────────────────────────────────────────────── */
function MessageBubble({
    msg, isMe, sameSender, isEditing, editContent, editSaving, username,
    isMobile, onMobileTap,
    onEditStart, onEditChange, onEditSubmit, onEditCancel, onDelete, onPin, onReply, onReact,
}: {
    msg: Message; isMe: boolean; sameSender: boolean;
    isEditing: boolean; editContent: string; editSaving: boolean; username: string;
    isMobile: boolean; onMobileTap: () => void;
    onEditStart: () => void; onEditChange: (v: string) => void;
    onEditSubmit: () => void; onEditCancel: () => void;
    onDelete: () => void; onPin: () => void; onReply: () => void;
    onReact: (emoji: string) => void;
}) {
    const [hover, setHover] = useState(false);
    const [showPicker, setShowPicker] = useState(false);
    const [copied, setCopied] = useState(false);

    const copy = () => {
        navigator.clipboard.writeText(msg.content);
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
                    <Avatar className="w-7 h-7">
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
                {!sameSender && (
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
                            <p className="text-[10px] text-muted-foreground truncate">{msg.replyTo.content}</p>
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
                            {msg.content}
                            {msg.pinned && <Pin className="inline w-2.5 h-2.5 ml-1.5 opacity-60" />}
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
                                {isMe && (
                                    <>
                                        <ActionBtn icon={Pencil} label="Edit" onClick={onEditStart} />
                                        <ActionBtn icon={Trash2} label="Delete" onClick={onDelete} danger />
                                    </>
                                )}
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
                    <span className="text-[9px] text-muted-foreground">{formatTime(msg.createdAt)}</span>
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
    msg, isMe, username, onClose, onEdit, onDelete, onPin, onReply, onReact,
}: {
    msg: Message; isMe: boolean; username: string;
    onClose: () => void; onEdit: () => void; onDelete: () => void;
    onPin: () => void; onReply: () => void; onReact: (emoji: string) => void;
}) {
    const [copied, setCopied] = useState(false);

    const copy = () => {
        navigator.clipboard.writeText(msg.content);
        setCopied(true);
        setTimeout(() => { setCopied(false); onClose(); }, 900);
    };

    const actions: SheetAction[] = [
        { icon: CornerUpLeft, label: "Reply",                          onClick: () => { onReply(); onClose(); } },
        { icon: copied ? Check : Copy, label: copied ? "Copied!" : "Copy", onClick: copy },
        { icon: msg.pinned ? PinOff : Pin, label: msg.pinned ? "Unpin" : "Pin", onClick: () => { onPin(); onClose(); } },
        ...(isMe ? [
            { icon: Pencil, label: "Edit",   onClick: () => { onEdit(); onClose(); } } as SheetAction,
            { icon: Trash2, label: "Delete", onClick: () => { onDelete(); onClose(); }, danger: true } as SheetAction,
        ] : []),
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
                        <p className="text-sm text-foreground/90 line-clamp-3 wrap-break-word">{msg.content}</p>
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
