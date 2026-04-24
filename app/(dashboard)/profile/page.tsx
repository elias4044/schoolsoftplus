"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User,
  Mail,
  School,
  MapPin,
  Globe,
  FileText,
  Save,
  Loader2,
  CheckCircle2,
  XCircle,
  BadgeInfo,
  MessageSquare,
  ArrowRight,
  Sparkles,
  PartyPopper,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/lib/useSession";
import { staggerContainer, fadeUp } from "@/components/dashboard-card";
import { useRouter } from "next/navigation";

interface ProfileData {
  displayName: string;
  bio: string;
  location: string;
  website: string;
  pfpUrl: string;
  firstName: string;
  lastName: string;
  email: string;
  schoolName: string;
  userType: string;
  updatedAt: number;
}

type SaveStatus = "idle" | "saving" | "success" | "error";

export default function ProfilePage() {
  const { session, loading: sessionLoading } = useSession();
  const router = useRouter();

  const [profileLoading, setProfileLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [isFirstSetup, setIsFirstSetup] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // editable fields
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [saveError, setSaveError] = useState("");

  const displayNameRef = useRef<HTMLInputElement>(null);

  // Load profile from API
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
          setLocation(p.location ?? "");
          setWebsite(p.website ?? "");
        } else {
          // No profile yet — first-time setup
          setIsFirstSetup(true);
        }
      } finally {
        setProfileLoading(false);
      }
    })();
  }, []);

  // Auto-focus display name on first setup once loading is done
  useEffect(() => {
    if (isFirstSetup && !profileLoading && !sessionLoading) {
      setTimeout(() => displayNameRef.current?.focus(), 350);
    }
  }, [isFirstSetup, profileLoading, sessionLoading]);

  const save = async () => {
    setSaveStatus("saving");
    setSaveError("");
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName, bio, location, website }),
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

  // Prefer live session data for read-only fields, fall back to stored snapshot
  const firstName  = session?.user.firstName  ?? profile?.firstName  ?? "";
  const lastName   = session?.user.lastName   ?? profile?.lastName   ?? "";
  const email      = session?.user.email      ?? profile?.email      ?? "";
  const schoolName = session?.organization.name ?? profile?.schoolName ?? "";
  const userType   = session?.userType.name   ?? profile?.userType   ?? "";
  const fullName   = firstName && lastName ? `${firstName} ${lastName}` : null;

  const initials =
    (firstName[0] ?? "") + (lastName[0] ?? "") ||
    displayName.slice(0, 2).toUpperCase() ||
    "??";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  // First-time setup success screen
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
          style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 278 / 25%), oklch(0.55 0.25 295 / 25%))" }}
        >
          <PartyPopper className="w-9 h-9 text-primary" />
        </motion.div>

        <div className="max-w-sm">
          <motion.h2
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-bold tracking-tight mb-2"
          >
            You're all set, {displayName || "there"}!
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="text-sm text-muted-foreground leading-relaxed"
          >
            Your profile is live. You can now send and receive direct messages with any SchoolSoft+ user.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
          className="flex flex-col sm:flex-row items-center gap-3"
        >
          <button
            onClick={() => router.push("/messages")}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-lg hover:opacity-90 active:scale-95 transition-all"
            style={{ background: "linear-gradient(135deg, oklch(0.65 0.22 278), oklch(0.55 0.25 295))" }}
          >
            <MessageSquare className="w-4 h-4" />
            Go to Messages
          </button>
          <button
            onClick={() => { setShowSuccess(false); setIsFirstSetup(false); }}
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-5 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-white/20 transition-colors"
          >
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
            : "Customize how you appear in Schoolsoft+"}
        </p>
      </motion.div>

      {/* First-setup welcome banner */}
      <AnimatePresence>
        {isFirstSetup && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div
              className="rounded-xl border border-primary/20 px-4 py-3.5 flex items-start gap-3"
              style={{ background: "oklch(0.65 0.22 278 / 8%)" }}
            >
              <Sparkles className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-foreground">Welcome to SchoolSoft+!</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                  You're one step away from messaging classmates. Fill in a display name below and hit <strong>Create profile</strong> — that's it.
                </p>
              </div>
              <a
                href="/messages"
                className="ml-auto shrink-0 text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors whitespace-nowrap"
              >
                Skip for now <ArrowRight className="w-2.5 h-2.5" />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="space-y-4"
      >
        {/* ── Avatar + name banner ─────────────────────────── */}
        <motion.div
          variants={fadeUp}
          className="rounded-xl border border-white/7 bg-card p-5"
        >
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16 shrink-0">
              <AvatarFallback
                className="text-xl font-bold"
                style={{
                  background:
                    "linear-gradient(135deg, oklch(0.65 0.22 278 / 50%), oklch(0.55 0.25 295 / 50%))",
                  color: "oklch(0.80 0.15 278)",
                }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-base font-semibold">
                {displayName || fullName || session?.username || "—"}
              </p>
              {fullName && displayName && displayName !== fullName && (
                <p className="text-xs text-muted-foreground">{fullName}</p>
              )}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {schoolName && (
                  <Badge variant="secondary" className="text-[10px]">
                    <School className="w-2.5 h-2.5 mr-1" />
                    {schoolName}
                  </Badge>
                )}
                {userType && (
                  <Badge variant="outline" className="text-[10px] border-white/10">
                    {capitalize(userType)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Editable info ───────────────────────────────── */}
        <motion.div
          variants={fadeUp}
          className="rounded-xl border border-white/7 bg-card p-5 space-y-4"
        >
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
              <Input
                ref={displayNameRef}
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                maxLength={80}
                placeholder={fullName ?? "Your name…"}
                className="bg-white/5 border-white/10 focus:border-primary/50"
              />
            </div>

            {/* Bio */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3 h-3" /> Bio
              </Label>
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                maxLength={300}
                rows={3}
                placeholder="Tell people a bit about yourself…"
                className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 resize-none"
              />
              <p className="text-[10px] text-muted-foreground text-right">{bio.length}/300</p>
            </div>

            {/* Location */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Location
              </Label>
              <Input
                value={location}
                onChange={e => setLocation(e.target.value)}
                maxLength={80}
                placeholder="City, Country…"
                className="bg-white/5 border-white/10 focus:border-primary/50"
              />
            </div>

            {/* Website */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-3 h-3" /> Website
              </Label>
              <Input
                value={website}
                onChange={e => setWebsite(e.target.value)}
                maxLength={200}
                placeholder="https://…"
                className="bg-white/5 border-white/10 focus:border-primary/50"
              />
            </div>
          </div>

          {/* Save */}
          <div className="flex items-center gap-3 pt-1">
            <Button
              onClick={save}
              disabled={saveStatus === "saving" || (isFirstSetup && !displayName.trim())}
              size="sm"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.65 0.22 278), oklch(0.55 0.25 295))",
              }}
            >
              {saveStatus === "saving" ? (
                <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />Saving…</>
              ) : isFirstSetup ? (
                <><MessageSquare className="w-3.5 h-3.5 mr-2" />Create profile &amp; start messaging</>
              ) : (
                <><Save className="w-3.5 h-3.5 mr-2" />Save profile</>
              )}
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

        {/* ── Read-only account info ───────────────────────── */}
        <motion.div
          variants={fadeUp}
          className="rounded-xl border border-white/7 bg-card p-5 space-y-4"
        >
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
          </div>

          <p className="text-[10px] text-muted-foreground">
            This information is fetched directly from SchoolSoft and cannot be edited here.
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-white/3 px-3 py-2.5">
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
        {icon} {label}
      </span>
      <span className="text-sm font-medium truncate">{value}</span>
    </div>
  );
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
