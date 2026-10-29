'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, AnimatePresence as AP, motion } from 'framer-motion';
import {
  ArrowRight,
  Clock,
  Loader2,
  MapPin,
  MessageSquare,
  School,
  Search,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

import { useFriends } from '@/lib/useFriends';
import { useSession } from '@/lib/useSession';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { UserProfileModal } from '@/components/UserProfileModal';

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
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : '';
}

function initials(u: UserSearchResult) {
  return (
    u.displayName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || u.username.slice(0, 2).toUpperCase()
  );
}

export default function PeoplePage() {
  const { session } = useSession();
  const username = session?.userId ?? '';
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [viewProfile, setViewProfile] = useState<string | null>(null);
  const [requestSending, setRequestSending] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const { isFriend, pendingFrom, sentTo } = useFriends(username);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        if (data.success) setResults(data.users);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, [query]);

  const openDM = async (targetUsername: string) => {
    const res = await fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUsername }),
    });
    const data = await res.json();
    if (data.success) router.push('/messages');
    else if (data.needsFriend) {
      await sendFriendRequest(targetUsername);
      alert('Friend request sent! You must be friends to message.');
    }
  };

  const sendFriendRequest = async (targetUsername: string) => {
    setRequestSending(targetUsername);
    try {
      await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUsername }),
      });
    } finally {
      setRequestSending(null);
    }
  };

  const respondFriendRequest = async (fromUsername: string, accept: boolean) => {
    await fetch('/api/friends', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromUsername, accept }),
    });
  };

  function getFriendStatus(
    u: UserSearchResult
  ): 'friends' | 'pending_sent' | 'pending_received' | 'none' {
    if (isFriend(u.username)) return 'friends';
    if (sentTo(u.username)) return 'pending_sent';
    if (pendingFrom(u.username)) return 'pending_received';
    return 'none';
  }

  return (
    <>
      <div className="mx-auto max-w-2xl p-6">
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Users className="text-primary h-6 w-6" />
            People
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Search for other SchoolSoft+ users to view their profile or add them as friends.
          </p>
        </motion.div>

        {/* Search input */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="relative mb-6"
        >
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by username…"
            autoFocus
            className="placeholder:text-muted-foreground/40 focus:border-primary/40 focus:ring-primary/20 w-full rounded-xl border border-white/10 bg-white/5 py-3 pr-10 pl-10 text-sm transition-all outline-none focus:ring-1"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-3 -translate-y-1/2"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {searching && (
            <Loader2 className="text-muted-foreground absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin" />
          )}
        </motion.div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {query.length < 2 ? (
            <motion.div
              key="hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-muted-foreground flex flex-col items-center justify-center gap-3 py-16"
            >
              <Users className="h-10 w-10 opacity-20" />
              <p className="text-sm">Type at least 2 characters to search</p>
            </motion.div>
          ) : results.length === 0 && !searching ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-muted-foreground flex flex-col items-center justify-center gap-3 py-16"
            >
              <Search className="h-10 w-10 opacity-20" />
              <p className="text-sm">No users found for &ldquo;{query}&rdquo;</p>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-2"
            >
              {results.map((user, i) => {
                const fs = getFriendStatus(user);
                return (
                  <motion.div
                    key={user.username}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={cn(
                      'group bg-card flex items-center gap-3 rounded-xl border border-white/7 p-4',
                      'cursor-pointer transition-all hover:border-white/15'
                    )}
                    onClick={() => setViewProfile(user.username)}
                  >
                    <Avatar className="h-12 w-12 shrink-0">
                      <AvatarImage src={user.pfpUrl || undefined} />
                      <AvatarFallback
                        className="text-sm font-bold"
                        style={{
                          background:
                            'linear-gradient(135deg, oklch(0.65 0.22 278 / 40%), oklch(0.55 0.25 295 / 40%))',
                          color: 'oklch(0.75 0.15 278)',
                        }}
                      >
                        {initials(user)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="text-sm font-semibold">{user.displayName}</span>
                        {user.pronouns && (
                          <span className="text-muted-foreground text-[10px]">
                            ({user.pronouns})
                          </span>
                        )}
                      </div>
                      <p className="text-muted-foreground text-[11px]">@{user.username}</p>
                      {user.bio && (
                        <p className="text-foreground/60 mt-0.5 truncate text-xs">{user.bio}</p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {user.schoolName && (
                          <span className="text-muted-foreground flex items-center gap-0.5 text-[10px]">
                            <School className="h-2.5 w-2.5" /> {user.schoolName}
                          </span>
                        )}
                        {user.location && (
                          <span className="text-muted-foreground flex items-center gap-0.5 text-[10px]">
                            <MapPin className="h-2.5 w-2.5" /> {user.location}
                          </span>
                        )}
                        {user.userType && (
                          <Badge variant="secondary" className="py-0 text-[9px]">
                            {capitalize(user.userType)}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                      {fs === 'friends' && (
                        <span className="flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] text-green-400">
                          <UserCheck className="h-3 w-3" /> Friends
                        </span>
                      )}
                      {fs === 'pending_sent' && (
                        <span className="text-muted-foreground flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-[11px]">
                          <Clock className="h-3 w-3" /> Sent
                        </span>
                      )}
                      {fs === 'pending_received' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            respondFriendRequest(user.username, true);
                          }}
                          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] text-white"
                          style={{ background: 'oklch(0.55 0.18 148)' }}
                        >
                          <UserCheck className="h-3 w-3" /> Accept
                        </button>
                      )}
                      {fs === 'none' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            sendFriendRequest(user.username);
                          }}
                          disabled={requestSending === user.username}
                          className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] text-white transition-all hover:scale-105 active:scale-95"
                          style={{
                            background:
                              'linear-gradient(135deg, oklch(0.65 0.22 278), oklch(0.55 0.25 295))',
                          }}
                        >
                          {requestSending === user.username ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <UserPlus className="h-3 w-3" />
                          )}
                          Add
                        </button>
                      )}
                      {fs === 'friends' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openDM(user.username);
                          }}
                          className="text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] transition-all"
                          title="Send message"
                        >
                          <MessageSquare className="h-3 w-3" />
                        </button>
                      )}
                      <button
                        className="text-muted-foreground hover:text-foreground flex items-center gap-1 rounded-lg border border-white/10 px-3 py-1.5 text-[11px] transition-all"
                        title="View profile"
                      >
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
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
            onMessage={
              isFriend(viewProfile)
                ? () => {
                    openDM(viewProfile);
                    setViewProfile(null);
                  }
                : undefined
            }
            friendStatus={
              isFriend(viewProfile)
                ? 'friends'
                : sentTo(viewProfile)
                  ? 'pending_sent'
                  : pendingFrom(viewProfile)
                    ? 'pending_received'
                    : 'none'
            }
            onAddFriend={() => sendFriendRequest(viewProfile)}
            onRespondFriend={(accept) => respondFriendRequest(viewProfile, accept)}
          />
        )}
      </AP>
    </>
  );
}
