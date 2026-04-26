"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, MapPin, Globe,
  MessageSquare, Loader2, School, BadgeInfo, ExternalLink,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export interface PublicProfile {
  username: string;
  displayName: string;
  bio: string;
  pronouns: string;
  location: string;
  website: string;
  pfpUrl: string;
  coverUrl: string;
  accentColor: string;
  github: string;
  twitter: string;
  instagram: string;
  linkedin: string;
  firstName: string;
  lastName: string;
  schoolName: string;
  userType: string;
  joinedAt: number;
  updatedAt: number;
}

interface Props {
  username: string;
  onClose: () => void;
  /** If provided, shows a "Message" button */
  onMessage?: () => void;
}

function initials(profile: PublicProfile) {
  const name = profile.displayName || `${profile.firstName} ${profile.lastName}`.trim();
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || "??";
}

function capitalize(s: string) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

export function UserProfileModal({ username, onClose, onMessage }: Props) {
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    fetch(`/api/profile/${encodeURIComponent(username)}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) setProfile(d.profile);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [username]);

  const accent = profile?.accentColor || "#7c6af7";

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
        initial={{ opacity: 0, y: 28, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl border border-white/10 bg-card shadow-2xl flex flex-col overflow-hidden"
        style={{ maxHeight: "88dvh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 text-white/70 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : notFound || !profile ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground">
              <BadgeInfo className="w-8 h-8 opacity-30" />
              <p className="text-sm">Profile not found</p>
            </div>
          ) : (
            <>
              {/* Cover / banner */}
              <div
                className="relative h-28 shrink-0"
                style={{
                  background: profile.coverUrl
                    ? `url(${profile.coverUrl}) center/cover no-repeat`
                    : `linear-gradient(135deg, ${accent}33, ${accent}66)`,
                }}
              >
                {/* Accent overlay stripe */}
                <div
                  className="absolute bottom-0 inset-x-0 h-px"
                  style={{ background: `linear-gradient(90deg, transparent, ${accent}80, transparent)` }}
                />
              </div>

              {/* Avatar row */}
              <div className="z-20 px-5 -mt-9 flex items-end justify-between mb-3">
                <div className="relative">
                  <Avatar className="w-18 h-18 border-4"
                    style={{ borderColor: "var(--card)", width: 72, height: 72 }}>
                    <AvatarImage src={profile.pfpUrl || undefined} />
                    <AvatarFallback
                      className="text-xl font-bold"
                      style={{
                        background: `linear-gradient(135deg, ${accent}50, ${accent}88)`,
                        color: accent,
                      }}
                    >
                      {initials(profile)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                {onMessage && (
                  <button
                    onClick={onMessage}
                    className="flex items-center mt-10 gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white shadow-lg hover:opacity-90 active:scale-95 transition-all"
                    style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    Message
                  </button>
                )}
              </div>

              {/* Identity */}
              <div className="px-5 pb-1">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <h2 className="text-lg font-bold leading-tight">
                    {profile.displayName || `${profile.firstName} ${profile.lastName}`.trim() || profile.username}
                  </h2>
                  {profile.pronouns && (
                    <span className="text-xs text-muted-foreground">({profile.pronouns})</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">@{profile.username}</p>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {profile.schoolName && (
                    <Badge variant="secondary" className="text-[10px] gap-1">
                      <School className="w-2.5 h-2.5" />
                      {profile.schoolName}
                    </Badge>
                  )}
                  {profile.userType && (
                    <Badge variant="outline" className="text-[10px] border-white/10">
                      {capitalize(profile.userType)}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Bio */}
              {profile.bio && (
                <div className="px-5 py-3">
                  <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                    {profile.bio}
                  </p>
                </div>
              )}

              {/* Meta row */}
              {(profile.location || profile.website || profile.joinedAt) && (
                <div className="px-5 pb-3 flex flex-wrap gap-x-4 gap-y-1.5">
                  {profile.location && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <MapPin className="w-3 h-3" /> {profile.location}
                    </span>
                  )}
                  {profile.website && (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] hover:text-primary transition-colors"
                      style={{ color: accent }}
                    >
                      <Globe className="w-3 h-3" />
                      {profile.website.replace(/^https?:\/\//, "")}
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </a>
                  )}
                  {profile.joinedAt && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      Joined {new Date(profile.joinedAt).toLocaleDateString([], { month: "short", year: "numeric" })}
                    </span>
                  )}
                </div>
              )}

              {/* Social links */}
              {(profile.github || profile.twitter || profile.instagram || profile.linkedin) && (
                <div
                  className="mx-5 mb-5 rounded-xl border border-white/8 p-3 flex items-center gap-3 flex-wrap"
                  style={{ background: "oklch(1 0 0 / 3%)" }}
                >
                  {profile.github && (
                    <SocialLink href={`https://github.com/${profile.github}`} label={profile.github} accent={accent}
                      icon={<svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.54-1.38-1.33-1.75-1.33-1.75-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58C20.57 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>}
                    />
                  )}
                  {profile.twitter && (
                    <SocialLink href={`https://x.com/${profile.twitter}`} label={`@${profile.twitter}`} accent={accent}
                      icon={<svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>}
                    />
                  )}
                  {profile.instagram && (
                    <SocialLink href={`https://instagram.com/${profile.instagram}`} label={`@${profile.instagram}`} accent={accent}
                      icon={<svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>}
                    />
                  )}
                  {profile.linkedin && (
                    <SocialLink href={profile.linkedin.startsWith("http") ? profile.linkedin : `https://linkedin.com/in/${profile.linkedin}`} label="LinkedIn" accent={accent}
                      icon={<svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function SocialLink({ href, icon, label, accent }: { href: string; icon: React.ReactNode; label: string; accent: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-lg border border-white/8 transition-all hover:scale-105",
        "hover:border-white/20 text-muted-foreground hover:text-foreground"
      )}
      style={{ "--accent": accent } as React.CSSProperties}
    >
      <span style={{ color: accent }}>{icon}</span>
      {label}
    </a>
  );
}
