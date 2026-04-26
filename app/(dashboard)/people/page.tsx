"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Search, X, Loader2, MapPin, School, MessageSquare, ArrowRight } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { AnimatePresence as AP } from "framer-motion";
import { UserProfileModal } from "@/components/UserProfileModal";
import { cn } from "@/lib/utils";

interface UserSearchResult {
  username: string;
  displayName: string;
  bio: string;
  location: string;
  pfpUrl: string;
  pronouns: string;
  schoolName: string;
  userType: string;
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

function initials(u: UserSearchResult) {
  return u.displayName.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || u.username.slice(0, 2).toUpperCase();
}

export default function PeoplePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [viewProfile, setViewProfile] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success) setResults(data.users);
      } finally { setSearching(false); }
    }, 350);
  }, [query]);

  const openDM = async (username: string) => {
    const res = await fetch("/api/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUsername: username }),
    });
    const data = await res.json();
    if (data.success) router.push("/messages");
  };

  return (
    <>
    <div className="p-6 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" />
          People
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search for other SchoolSoft+ users to view their profile or start a conversation.
        </p>
      </motion.div>

      {/* Search input */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="relative mb-6"
      >
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by username…"
          autoFocus
          className="w-full rounded-xl border border-white/10 bg-white/5 pl-10 pr-10 py-3 text-sm placeholder:text-muted-foreground/40 outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 transition-all"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </motion.div>

      {/* Results */}
      <AnimatePresence mode="wait">
        {query.length < 2 ? (
          <motion.div
            key="hint"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground"
          >
            <Users className="w-10 h-10 opacity-20" />
            <p className="text-sm">Type at least 2 characters to search</p>
          </motion.div>
        ) : results.length === 0 && !searching ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground"
          >
            <Search className="w-10 h-10 opacity-20" />
            <p className="text-sm">No users found for &ldquo;{query}&rdquo;</p>
          </motion.div>
        ) : (
          <motion.div
            key="results"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="space-y-2"
          >
            {results.map((user, i) => (
              <motion.div
                key={user.username}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className={cn(
                  "group flex items-center gap-3 rounded-xl border border-white/7 bg-card p-4",
                  "hover:border-white/15 transition-all cursor-pointer"
                )}
                onClick={() => setViewProfile(user.username)}
              >
                <Avatar className="w-12 h-12 shrink-0">
                  <AvatarImage src={user.pfpUrl || undefined} />
                  <AvatarFallback
                    className="text-sm font-bold"
                    style={{
                      background: "linear-gradient(135deg, oklch(0.65 0.22 278 / 40%), oklch(0.55 0.25 295 / 40%))",
                      color: "oklch(0.75 0.15 278)",
                    }}
                  >
                    {initials(user)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-sm font-semibold">{user.displayName}</span>
                    {user.pronouns && <span className="text-[10px] text-muted-foreground">({user.pronouns})</span>}
                  </div>
                  <p className="text-[11px] text-muted-foreground">@{user.username}</p>
                  {user.bio && (
                    <p className="text-xs text-foreground/60 truncate mt-0.5">{user.bio}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {user.schoolName && (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <School className="w-2.5 h-2.5" /> {user.schoolName}
                      </span>
                    )}
                    {user.location && (
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <MapPin className="w-2.5 h-2.5" /> {user.location}
                      </span>
                    )}
                    {user.userType && (
                      <Badge variant="secondary" className="text-[9px] py-0">{capitalize(user.userType)}</Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={e => { e.stopPropagation(); openDM(user.username); }}
                    className="flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-lg text-white transition-all hover:scale-105 active:scale-95"
                    style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 278), oklch(0.55 0.25 295))" }}
                    title="Send message"
                  >
                    <MessageSquare className="w-3 h-3" />
                  </button>
                  <button
                    className="flex items-center gap-1 text-[11px] px-3 py-1.5 rounded-lg border border-white/10 text-muted-foreground hover:text-foreground transition-all"
                    title="View profile"
                  >
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>

    {/* Profile modal */}
    <AP>
      {viewProfile && (
        <UserProfileModal
          username={viewProfile}
          onClose={() => setViewProfile(null)}
          onMessage={() => { openDM(viewProfile); setViewProfile(null); }}
        />
      )}
    </AP>
    </>
  );
}
