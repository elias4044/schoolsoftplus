"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Settings, LogOut, User, Palette, Check, Monitor, Layout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth-context";
import { useAppTheme, THEMES, ACCENTS } from "@/lib/theme-context";
import type { AppTheme, AccentColor } from "@/lib/theme-context";

/* ── Section wrapper ──────────────────────────────────────── */
function Section({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--card)", borderColor: "oklch(1 0 0 / 7%)" }}
    >
      <div className="flex items-center gap-2.5 px-5 py-4 border-b" style={{ borderColor: "oklch(1 0 0 / 6%)" }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "oklch(0.65 0.22 278 / 12%)", color: "oklch(0.75 0.22 278)" }}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

export default function SettingsPage() {
  const { session, logout } = useAuth();
  const { theme, accent, setTheme, setAccent } = useAppTheme();

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences.</p>
      </motion.div>

      <div className="space-y-4">

        {/* ── Appearance ──────────────────────────────────── */}
        <Section icon={Palette} title="Appearance">
          <div className="space-y-5">

            {/* Background theme */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Background</p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {THEMES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id as AppTheme)}
                    className="relative group flex flex-col items-center gap-2 p-2 rounded-xl border transition-all"
                    style={{
                      borderColor: theme === t.id ? "var(--primary)" : "oklch(1 0 0 / 8%)",
                      background: theme === t.id ? "var(--brand-dim)" : "transparent",
                    }}
                  >
                    {/* mini preview */}
                    <div className="w-full h-10 rounded-lg overflow-hidden flex" style={{ background: t.bg }}>
                      <div className="w-4 h-full" style={{ background: t.surface }} />
                      <div className="flex-1 flex flex-col justify-end p-1 gap-0.5">
                        <div className="h-1.5 rounded-full w-3/4 opacity-30" style={{ background: "#fff" }} />
                        <div className="h-1 rounded-full w-1/2 opacity-20" style={{ background: "#fff" }} />
                      </div>
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground transition-colors">{t.label}</span>
                    {theme === t.id && (
                      <div className="absolute top-1.5 right-1.5 w-3.5 h-3.5 rounded-full flex items-center justify-center"
                        style={{ background: "var(--primary)" }}>
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <Separator style={{ background: "oklch(1 0 0 / 6%)" }} />

            {/* Accent color */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Accent color</p>
              <div className="flex flex-wrap gap-2">
                {ACCENTS.map(a => (
                  <button
                    key={a.id}
                    onClick={() => setAccent(a.id as AccentColor)}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all"
                    style={{
                      borderColor: accent === a.id ? a.color : "oklch(1 0 0 / 8%)",
                      background: accent === a.id ? `${a.color.replace("oklch", "oklch").replace(")", " / 12%)")}` : "transparent",
                      color: accent === a.id ? a.color : "oklch(1 0 0 / 45%)",
                    }}
                  >
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: a.color }} />
                    {a.label}
                    {accent === a.id && <Check className="w-3 h-3 ml-0.5" />}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </Section>

        {/* ── Account ─────────────────────────────────────── */}
        <Section icon={User} title="Account">
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: "Username", value: session?.username },
              { label: "Display name", value: session?.name },
              { label: "School", value: session?.school },
            ].map(row => (
              <div key={row.label} className="space-y-1">
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">{row.label}</p>
                <p className="text-sm font-medium text-foreground">{row.value ?? "—"}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* ── Dashboard ────────────────────────────────────── */}
        <Section icon={Layout} title="Dashboard">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Customise your dashboard layout by pressing <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: "oklch(1 0 0 / 6%)" }}>Edit layout</span> on the dashboard page. You can drag, resize, add and remove widgets.
          </p>
        </Section>

        {/* ── Danger zone ──────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-2xl border p-5 flex items-center justify-between gap-4"
          style={{ background: "oklch(0.58 0.19 24 / 5%)", borderColor: "oklch(0.58 0.19 24 / 20%)" }}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LogOut className="w-3.5 h-3.5" style={{ color: "oklch(0.65 0.19 24)" }} />
              <p className="text-sm font-semibold" style={{ color: "oklch(0.65 0.19 24)" }}>Sign out</p>
            </div>
            <p className="text-xs text-muted-foreground">You will be redirected to the login page.</p>
          </div>
          <Button
            size="sm"
            onClick={logout}
            className="shrink-0 text-xs font-medium border"
            style={{
              background: "oklch(0.58 0.19 24 / 12%)",
              color: "oklch(0.65 0.19 24)",
              borderColor: "oklch(0.58 0.19 24 / 30%)",
            }}
          >
            Sign out
          </Button>
        </motion.div>

      </div>
    </div>
  );
}

