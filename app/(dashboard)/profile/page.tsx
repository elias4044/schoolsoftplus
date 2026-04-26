"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Mail, School, MapPin, Globe, FileText, Save, Loader2,
  CheckCircle2, XCircle, BadgeInfo, MessageSquare, ArrowRight,
  Sparkles, PartyPopper, Camera, Palette, Lock, Unlock, Eye,
  Link as LinkIcon, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/useSession";
import { staggerContainer, fadeUp } from "@/components/dashboard-card";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

/* ── Types ─────────────────────────────────────────────── */
interface ProfileData {
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
  dmPrivacy: "everyone" | "nobody";
  firstName: string;
  lastName: string;
  email: string;
  schoolName: string;
  userType: string;
  joinedAt: number;
  updatedAt: number;
}

type SaveStatus = "idle" | "saving" | "success" | "error";

/* ── Accent palettes ───────────────────────────────────── */
const ACCENT_PRESETS = [
  { label: "Purple",  hex: "#7c6af7" },
  { label: "Blue",    hex: "#3b82f6" },
  { label: "Cyan",    hex: "#06b6d4" },
  { label: "Green",   hex: "#22c55e" },
  { label: "Rose",    hex: "#f43f5e" },
  { label: "Orange",  hex: "#f97316" },
  { label: "Yellow",  hex: "#eab308" },
  { label: "Pink",    hex: "#ec4899" },
];

/* ── Helpers ───────────────────────────────────────────── */
function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("image", file);
  const res = await fetch("/api/pfp-upload", { method: "POST", body: form });
  const data = await res.json();
  if (!data.success) throw new Error(data.error ?? "Upload failed");
  return data.url as string;
}

/* ── Component ─────────────────────────────────────────── */
export default function ProfilePage() {
  const { session, loading: sessionLoading } = useSession();
  const router = useRouter();

  const [profileLoading, setProfileLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Editable fields
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [github, setGithub] = useState("");
  const [twitter, setTwitter] = useState("");
  const [instagram, setInstagram] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [accentColor, setAccentColor] = useState("#7c6af7");
  const [dmPrivacy, setDmPrivacy] = useState<"everyone" | "nobody">("everyone");
  const [pfpUrl, setPfpUrl] = useState("");
  const [coverUrl, setCoverUrl] = useState("");

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState("");
  const [pfpUploading, setPfpUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  const displayNameRef = useRef<HTMLInputElement>(null);
  const pfpInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  // Load profile
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) return;
        const data = await res.json();
        if (data.success && data.profile) {
          const p: ProfileData = data.profile;
          setProfile(p);
          setDisplayName(p.displayName ?? "");
          setBio(p.bio ?? "");
          setPronouns(p.pronouns ?? "");
          setLocation(p.location ?? "");
          setWebsite(p.website ?? "");
          setGithub(p.github ?? "");
          setTwitter(p.twitter ?? "");
          setInstagram(p.instagram ?? "");
          setLinkedin(p.linkedin ?? "");
          setAccentColor(p.accentColor || "#7c6af7");
          setDmPrivacy(p.dmPrivacy === "nobody" ? "nobody" : "everyone");
          setPfpUrl(p.pfpUrl ?? "");
          setCoverUrl(p.coverUrl ?? "");
        } else {
          setIsFirstSetup(true);
        }
      } finally {
        setProfileLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (isFirstSetup && !profileLoading && !sessionLoading) {
      setTimeout(() => displayNameRef.current?.focus(), 350);
    }
  }, [isFirstSetup, profileLoading, sessionLoading]);

  const handleImageUpload = useCallback(async (file: File, field: "pfp" | "cover") => {
    const setter = field === "pfp" ? setPfpUploading : setCoverUploading;
    setter(true);
    try {
      const url = await uploadImage(file);
      if (field === "pfp") setPfpUrl(url);
      else setCoverUrl(url);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setter(false);
    }
  }, []);

  const save = async () => {
    setSaveStatus("saving");
    setSaveError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName, bio, pronouns, location, website,
          github, twitter, instagram, linkedin,
          accentColor, dmPrivacy, pfpUrl, coverUrl,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? "Save failed");
      setProfile(data.profile);
      setSaveStatus("success");
      if (isFirstSetup) {
        setShowSuccess(true);
      } else {
        setTimeout(() => setSaveStatus("idle"), 2500);
      }
    } catch (err) {
      setSaveError((err as Error).message);
      setSaveStatus("error");
    }
  };

  const isLoading = sessionLoading || profileLoading;

  const firstName  = session?.user.firstName  ?? profile?.firstName  ?? "";
  const lastName   = session?.user.lastName   ?? profile?.lastName   ?? "";
  const email      = session?.user.email      ?? profile?.email      ?? "";
  const schoolName = session?.organization.name ?? profile?.schoolName ?? "";
  const userType   = session?.userType.name   ?? profile?.userType   ?? "";
  const fullName   = firstName && lastName ? `${firstName} ${lastName}` : null;

  const initials =
    (firstName[0] ?? "") + (lastName[0] ?? "") ||
    displayName.slice(0, 2).toUpperCase() || "??";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // First-time success screen
  if (showSuccess) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center gap-6"
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, type: "spring", stiffness: 220 }}
          className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${accentColor}33, ${accentColor}66)` }}
        >
          <PartyPopper className="w-9 h-9" style={{ color: accentColor }} />
        </motion.div>
        <div className="max-w-sm">
          <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="text-2xl font-bold tracking-tight mb-2">
            You&apos;re all set, {displayName || "there"}!
          </motion.h2>
          <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
            className="text-sm text-muted-foreground leading-relaxed">
            Your profile is live. You can now send and receive direct messages with any SchoolSoft+ user.
          </motion.p>
        </div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38 }}
          className="flex flex-col sm:flex-row items-center gap-3">
          <button onClick={() => router.push("/messages")}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-90 active:scale-95 transition-all"
            style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}>
            <MessageSquare className="w-4 h-4" /> Go to Messages
          </button>
          <button onClick={() => { setShowSuccess(false); setIsFirstSetup(false); }}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors">
            Edit profile
          </button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <User className="w-6 h-6 text-primary" />
          {isFirstSetup ? "Create your profile" : "Profile"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isFirstSetup
            ? "Choose a display name to get started — everything else is optional."
            : "Customize how you appear in SchoolSoft+"}
        </p>
      </motion.div>

      {/* First-setup banner */}
      <AnimatePresence>
        {isFirstSetup && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="rounded-xl border border-primary/20 px-4 py-3.5 flex items-start gap-3"
              style={{ background: "oklch(0.65 0.22 278 / 8%)" }}>
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Welcome to SchoolSoft+!</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  Fill in a display name below and hit <strong>Create profile</strong> — that&apos;s it.
                </p>
              </div>
              <a href="/messages" className="ml-auto shrink-0 text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors whitespace-nowrap">
                Skip <ArrowRight className="w-2.5 h-2.5" />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="space-y-4">

        {/* ── Cover + Avatar card ── */}
        <motion.div variants={fadeUp} className="rounded-xl border border-white/7 bg-card overflow-hidden">
          {/* Cover image */}
          <div
            className="relative h-32 group cursor-pointer"
            style={{
              background: coverUrl
                ? `url(${coverUrl}) center/cover no-repeat`
                : `linear-gradient(135deg, ${accentColor}33, ${accentColor}66)`,
            }}
            onClick={() => coverInputRef.current?.click()}
          >
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 text-white text-xs font-medium bg-black/50 px-3 py-1.5 rounded-lg">
                {coverUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                {coverUploading ? "Uploading…" : "Change cover"}
              </span>
            </div>
            <input ref={coverInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, "cover"); e.target.value = ""; }} />
          </div>

          {/* Avatar row */}
          <div className="px-5 -mt-8 pb-4 flex items-end gap-4">
            {/* Clickable avatar */}
            <div className="relative group cursor-pointer shrink-0" onClick={() => pfpInputRef.current?.click()}>
              <Avatar className="w-20 h-20 border-4" style={{ borderColor: "var(--card)" }}>
                <AvatarImage src={pfpUrl || undefined} />
                <AvatarFallback className="text-2xl font-bold" style={{
                  background: `linear-gradient(135deg, ${accentColor}50, ${accentColor}88)`,
                  color: accentColor,
                }}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center border-4 border-transparent" style={{ borderColor: "var(--card)" }}>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                  {pfpUploading
                    ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                    : <Camera className="w-5 h-5 text-white" />
                  }
                </span>
              </div>
              <input ref={pfpInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f, "pfp"); e.target.value = ""; }} />
            </div>

            <div className="pb-1 min-w-0">
              <p className="text-base font-semibold truncate">
                {displayName || fullName || session?.username || "—"}
              </p>
              {fullName && displayName && displayName !== fullName && (
                <p className="text-xs text-muted-foreground">{fullName}</p>
              )}
              {pronouns && <p className="text-xs text-muted-foreground">({pronouns})</p>}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {schoolName && (
                  <Badge variant="secondary" className="text-[10px]">
                    <School className="w-2.5 h-2.5 mr-1" />{schoolName}
                  </Badge>
                )}
                {userType && (
                  <Badge variant="outline" className="text-[10px] border-white/10">{capitalize(userType)}</Badge>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── About You ── */}
        <motion.div variants={fadeUp} className="rounded-xl border border-white/7 bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">About You</h2>
          </div>
          <Separator className="bg-white/7" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Display name */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3 h-3" /> Display name
                {isFirstSetup && <span className="text-primary text-[10px] font-semibold ml-1">required</span>}
              </Label>
              <Input ref={displayNameRef} value={displayName} onChange={e => setDisplayName(e.target.value)}
                maxLength={80} placeholder={fullName ?? "Your name…"} className="bg-white/5 border-white/10 focus:border-primary/50" />
            </div>

            {/* Pronouns */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3 h-3" /> Pronouns
              </Label>
              <Input value={pronouns} onChange={e => setPronouns(e.target.value)}
                maxLength={40} placeholder="they/them, she/her…" className="bg-white/5 border-white/10 focus:border-primary/50" />
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Location
              </Label>
              <Input value={location} onChange={e => setLocation(e.target.value)}
                maxLength={80} placeholder="City, Country…" className="bg-white/5 border-white/10 focus:border-primary/50" />
            </div>

            {/* Bio */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3 h-3" /> Bio
              </Label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={500} rows={3}
                placeholder="Tell people a bit about yourself…"
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none" />
              <p className="text-[10px] text-muted-foreground text-right">{bio.length}/500</p>
            </div>
          </div>
        </motion.div>

        {/* ── Links & Social ── */}
        <motion.div variants={fadeUp} className="rounded-xl border border-white/7 bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Links & Social</h2>
          </div>
          <Separator className="bg-white/7" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3 h-3" /> Website
              </Label>
              <Input value={website} onChange={e => setWebsite(e.target.value)}
                maxLength={200} placeholder="https://…" className="bg-white/5 border-white/10 focus:border-primary/50" />
            </div>
            <SocialInput
              icon={<svg viewBox="0 0 24 24" className="w-3 h-3 fill-current"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.54-1.38-1.33-1.75-1.33-1.75-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.22.7.83.58C20.57 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z"/></svg>}
              label="GitHub" placeholder="username" value={github} onChange={setGithub}
            />
            <SocialInput
              icon={<svg viewBox="0 0 24 24" className="w-3 h-3 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>}
              label="X / Twitter" placeholder="username" value={twitter} onChange={setTwitter}
            />
            <SocialInput
              icon={<svg viewBox="0 0 24 24" className="w-3 h-3 fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/></svg>}
              label="Instagram" placeholder="username" value={instagram} onChange={setInstagram}
            />
            <SocialInput
              icon={<svg viewBox="0 0 24 24" className="w-3 h-3 fill-current"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>}
              label="LinkedIn" placeholder="username or profile URL" value={linkedin} onChange={setLinkedin}
            />
          </div>
        </motion.div>

        {/* ── Accent colour ── */}
        <motion.div variants={fadeUp} className="rounded-xl border border-white/7 bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Accent Colour</h2>
          </div>
          <Separator className="bg-white/7" />
          <div className="flex items-center gap-3 flex-wrap">
            {ACCENT_PRESETS.map(p => (
              <button key={p.hex} onClick={() => setAccentColor(p.hex)} title={p.label}
                className={cn(
                  "w-8 h-8 rounded-full border-2 transition-all hover:scale-110",
                  accentColor === p.hex ? "border-white scale-110 shadow-lg" : "border-transparent opacity-70"
                )}
                style={{ background: p.hex }}
              />
            ))}
            {/* Custom hex input */}
            <div className="flex items-center gap-2 ml-2">
              <div className="w-8 h-8 rounded-full border-2 border-white/20" style={{ background: accentColor }} />
              <input type="text" value={accentColor} onChange={e => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setAccentColor(v);
              }}
                className="w-24 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs font-mono focus:outline-none focus:border-primary/40"
                placeholder="#7c6af7"
              />
            </div>
          </div>
          {/* Live preview strip */}
          <div className="rounded-xl p-3 flex items-center gap-3 border"
            style={{ background: `${accentColor}18`, borderColor: `${accentColor}40` }}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: accentColor }}>
              <User className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold" style={{ color: accentColor }}>Preview</p>
              <p className="text-[10px] text-muted-foreground">This colour will show on your profile</p>
            </div>
          </div>
        </motion.div>

        {/* ── Privacy ── */}
        <motion.div variants={fadeUp} className="rounded-xl border border-white/7 bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Privacy</h2>
          </div>
          <Separator className="bg-white/7" />
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Who can send you direct messages?</p>
            <div className="grid grid-cols-2 gap-2">
              {(["everyone", "nobody"] as const).map(opt => (
                <button key={opt} onClick={() => setDmPrivacy(opt)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm transition-all",
                    dmPrivacy === opt
                      ? "border-primary/40 text-foreground"
                      : "border-white/8 text-muted-foreground hover:border-white/15"
                  )}
                  style={dmPrivacy === opt ? { background: `${accentColor}18` } : undefined}
                >
                  {opt === "everyone" ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                  {capitalize(opt)}
                  {dmPrivacy === opt && <CheckCircle2 className="w-3 h-3 ml-auto" style={{ color: accentColor }} />}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Save button ── */}
        <motion.div variants={fadeUp} className="rounded-xl border border-white/7 bg-card p-5">
          <div className="flex items-center gap-3">
            <Button
              onClick={save}
              disabled={saveStatus === "saving" || pfpUploading || coverUploading || (isFirstSetup && !displayName.trim())}
              size="sm"
              style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}cc)` }}
            >
              {saveStatus === "saving"
                ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Saving…</>
                : isFirstSetup
                ? <><MessageSquare className="w-3.5 h-3.5 mr-2" />Create profile &amp; start messaging</>
                : <><Save className="w-3.5 h-3.5 mr-2" />Save profile</>
              }
            </Button>
            {saveStatus === "success" && !isFirstSetup && (
              <span className="text-xs text-green-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Saved!
              </span>
            )}
            {saveStatus === "error" && (
              <span className="text-xs text-destructive flex items-center gap-1">
                <XCircle className="w-3.5 h-3.5" /> {saveError}
              </span>
            )}
          </div>
        </motion.div>

        {/* ── Read-only Account Info ── */}
        <motion.div variants={fadeUp} className="rounded-xl border border-white/7 bg-card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <BadgeInfo className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold">Account Information</h2>
            <Badge variant="secondary" className="ml-auto text-[10px]">Read-only</Badge>
          </div>
          <Separator className="bg-white/7" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Full name" value={fullName ?? "—"} />
            <InfoRow icon={<Mail className="w-3.5 h-3.5" />} label="Email" value={email || "—"} />
            <InfoRow icon={<School className="w-3.5 h-3.5" />} label="School" value={schoolName || "—"} />
            <InfoRow icon={<BadgeInfo className="w-3.5 h-3.5" />} label="Role" value={userType ? capitalize(userType) : "—"} />
            {profile?.joinedAt && (
              <InfoRow icon={<Eye className="w-3.5 h-3.5" />} label="Member since"
                value={new Date(profile.joinedAt).toLocaleDateString([], { month: "long", year: "numeric" })} />
            )}
            {profile?.updatedAt && (
              <InfoRow icon={<ExternalLink className="w-3.5 h-3.5" />} label="Last updated"
                value={new Date(profile.updatedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} />
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            This information is fetched directly from SchoolSoft and cannot be edited here.
          </p>
        </motion.div>

      </motion.div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────── */
function SocialInput({
  icon, label, placeholder, value, onChange,
}: { icon: React.ReactNode; label: string; placeholder: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <span>{icon}</span> {label}
      </Label>
      <Input value={value} onChange={e => onChange(e.target.value)} maxLength={100}
        placeholder={placeholder} className="bg-white/5 border-white/10 focus:border-primary/50" />
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-white/3 px-3 py-2.5">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        {icon} {label}
      </span>
      <span className="text-sm font-medium truncate">{value}</span>
    </div>
  );
}
