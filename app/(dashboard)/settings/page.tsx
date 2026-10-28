'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, Check, KeyRound, Layout, LogOut, Palette, Play, User } from 'lucide-react';

import { useAuth } from '@/lib/auth-context';
import { ACCENTS, THEMES, useAppTheme } from '@/lib/theme-context';
import type { AccentColor, AppTheme } from '@/lib/theme-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { RINGTONE_OPTIONS, useRingtone, type RingtoneId } from '@/components/CallPanel';
import PasskeyManager from '@/components/PasskeyManager';

/*  Ringtone preview helper */
function RingtonePreviewButton({ id, customUrl }: { id: string; customUrl?: string }) {
  const [playing, setPlaying] = useState(false);
  useRingtone(id, playing, customUrl);

  function handlePreview() {
    setPlaying(true);
    // Play one 3-second cycle then stop
    setTimeout(() => setPlaying(false), 2_800);
  }

  return (
    <button
      onClick={handlePreview}
      disabled={playing}
      className="flex h-6 w-6 items-center justify-center rounded-md transition-colors hover:bg-white/8 disabled:opacity-40"
      aria-label={`Preview ${id} ringtone`}
    >
      <Play
        className="h-3 w-3"
        style={{ color: playing ? 'var(--primary)' : 'oklch(1 0 0 / 45%)' }}
      />
    </button>
  );
}

/*  Section wrapper  */
function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-2xl border"
      style={{ background: 'var(--card)', borderColor: 'oklch(1 0 0 / 7%)' }}
    >
      <div
        className="flex items-center gap-2.5 border-b px-5 py-4"
        style={{ borderColor: 'oklch(1 0 0 / 6%)' }}
      >
        <div className="bg-accent flex h-7 w-7 items-center justify-center rounded-lg">
          <Icon className="h-3.5 w-3.5" />
        </div>
        <h2 className="text-foreground text-sm font-semibold">{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </motion.div>
  );
}

export default function SettingsPage() {
  const { session, logout } = useAuth();
  const { theme, accent, setTheme, setAccent } = useAppTheme();

  // Ringtone preference — loaded from profile, saved on change
  const [ringtone, setRingtoneState] = useState<RingtoneId>('default');
  const [ringtoneSaving, setRingtoneSaving] = useState(false);
  const savingRef = useRef(false);

  const [ringtoneCustomUrl, setRingtoneCustomUrl] = useState('');
  const customUrlDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.profile?.ringtone) {
          setRingtoneState(data.profile.ringtone as RingtoneId);
        }
        if (data.success && data.profile?.ringtoneCustomUrl) {
          setRingtoneCustomUrl(data.profile.ringtoneCustomUrl);
        }
      })
      .catch(() => {});
  }, []);

  const saveRingtone = useCallback(async (id: RingtoneId) => {
    if (savingRef.current) return;
    savingRef.current = true;
    setRingtoneSaving(true);
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ringtone: id }),
      });
    } catch {
      /* ignore */
    } finally {
      savingRef.current = false;
      setRingtoneSaving(false);
    }
  }, []);

  function handleRingtoneCustomUrlChange(url: string) {
    setRingtoneCustomUrl(url);
    if (customUrlDebounceRef.current) clearTimeout(customUrlDebounceRef.current);
    customUrlDebounceRef.current = setTimeout(() => {
      fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ringtoneCustomUrl: url }),
      }).catch(() => {});
    }, 500);
  }

  function handleRingtoneSelect(id: RingtoneId) {
    setRingtoneState(id);
    saveRingtone(id);
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-8"
      >
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your account and preferences.</p>
      </motion.div>

      <div className="space-y-4">
        {/*  Appearance  */}
        <Section icon={Palette} title="Appearance">
          <div className="space-y-5">
            {/* Background theme */}
            <div>
              <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
                Background
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id as AppTheme)}
                    className="group relative flex flex-col items-center gap-2 rounded-xl border p-2 transition-all"
                    style={{
                      borderColor: theme === t.id ? 'var(--primary)' : 'oklch(1 0 0 / 8%)',
                      background: theme === t.id ? 'var(--brand-dim)' : 'transparent',
                    }}
                  >
                    {/* mini preview */}
                    <div
                      className="flex h-10 w-full overflow-hidden rounded-lg"
                      style={{ background: t.bg }}
                    >
                      <div className="h-full w-4" style={{ background: t.surface }} />
                      <div className="flex flex-1 flex-col justify-end gap-0.5 p-1">
                        <div
                          className="h-1.5 w-3/4 rounded-full opacity-30"
                          style={{ background: '#fff' }}
                        />
                        <div
                          className="h-1 w-1/2 rounded-full opacity-20"
                          style={{ background: '#fff' }}
                        />
                      </div>
                    </div>
                    <span className="text-muted-foreground group-hover:text-foreground text-[10px] font-medium transition-colors">
                      {t.label}
                    </span>
                    {theme === t.id && (
                      <div
                        className="absolute top-1.5 right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full"
                        style={{ background: 'var(--primary)' }}
                      >
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <Separator style={{ background: 'oklch(1 0 0 / 6%)' }} />

            {/* Accent color */}
            <div>
              <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
                Accent color
              </p>
              <div className="flex flex-wrap gap-2">
                {ACCENTS.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setAccent(a.id as AccentColor)}
                    className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all"
                    style={{
                      borderColor: accent === a.id ? a.color : 'oklch(1 0 0 / 8%)',
                      background:
                        accent === a.id
                          ? `${a.color.replace('oklch', 'oklch').replace(')', ' / 12%)')}`
                          : 'transparent',
                      color: accent === a.id ? a.color : 'oklch(1 0 0 / 45%)',
                    }}
                  >
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ background: a.color }}
                    />
                    {a.label}
                    {accent === a.id && <Check className="ml-0.5 h-3 w-3" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Section>

        {/*  Account  */}
        <Section icon={User} title="Account">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { label: 'Username', value: session?.username },
              { label: 'Display name', value: session?.name },
              { label: 'School', value: session?.school },
            ].map((row) => (
              <div key={row.label} className="space-y-1">
                <p className="text-muted-foreground/60 text-[10px] font-medium tracking-wider uppercase">
                  {row.label}
                </p>
                <p className="text-foreground text-sm font-medium">{row.value ?? '—'}</p>
              </div>
            ))}
          </div>
        </Section>

        {/*  Dashboard  */}
        <Section icon={Layout} title="Dashboard">
          <p className="text-muted-foreground text-xs leading-relaxed">
            Customise your dashboard layout by pressing{' '}
            <span
              className="rounded px-1.5 py-0.5 font-mono text-xs"
              style={{ background: 'oklch(1 0 0 / 6%)' }}
            >
              Edit layout
            </span>{' '}
            on the dashboard page. You can drag, resize, add and remove widgets.
          </p>
        </Section>

        {/*  Sound  */}
        <Section icon={Bell} title="Sound">
          <div>
            <p className="text-muted-foreground mb-3 text-xs font-medium tracking-wider uppercase">
              Ringtone
            </p>
            <div className="flex flex-col gap-1.5">
              {RINGTONE_OPTIONS.map((opt) => (
                <div key={opt.id}>
                  <div
                    className="flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-2.5 transition-all"
                    style={{
                      borderColor: ringtone === opt.id ? 'var(--primary)' : 'oklch(1 0 0 / 8%)',
                      background: ringtone === opt.id ? 'var(--brand-dim)' : 'oklch(1 0 0 / 2%)',
                    }}
                    onClick={() => handleRingtoneSelect(opt.id as RingtoneId)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-2 w-2 shrink-0 rounded-full transition-colors"
                        style={{
                          background: ringtone === opt.id ? 'var(--primary)' : 'oklch(1 0 0 / 20%)',
                        }}
                      />
                      <span className="text-sm font-medium">{opt.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <RingtonePreviewButton
                        id={opt.id}
                        customUrl={opt.id === 'custom' ? ringtoneCustomUrl : undefined}
                      />
                      {ringtone === opt.id && (
                        <Check className="h-3.5 w-3.5" style={{ color: 'var(--primary)' }} />
                      )}
                    </div>
                  </div>
                  {/* URL input — only shown for custom, only when selected */}
                  {opt.id === 'custom' && ringtone === 'custom' && (
                    <div className="mt-1.5 ml-8">
                      <Input
                        type="url"
                        placeholder="https://example.com/ringtone.mp3"
                        value={ringtoneCustomUrl}
                        onChange={(e) => handleRingtoneCustomUrlChange(e.target.value)}
                        className="h-8 text-xs"
                        style={{
                          background: 'oklch(1 0 0 / 4%)',
                          borderColor: 'oklch(1 0 0 / 10%)',
                        }}
                      />
                      <p className="text-muted-foreground mt-1 text-[10px]">
                        Direct link to an MP3 file. Must start with https://
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {ringtoneSaving && <p className="text-muted-foreground mt-2 text-[10px]">Saving...</p>}
          </div>
        </Section>

        {/*  Security  */}
        <Section icon={KeyRound} title="Security">
          <div>
            <p className="text-muted-foreground mb-4 text-xs leading-relaxed">
              Passkeys let you sign in with Face ID, fingerprint, or a hardware security key. They
              are tied to your current SchoolSoft session and require AuthV2 to be set up first.
            </p>
            <PasskeyManager />
          </div>
        </Section>

        {/*  Danger zone  */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex items-center justify-between gap-4 rounded-2xl border p-5"
          style={{
            background: 'oklch(0.58 0.19 24 / 5%)',
            borderColor: 'oklch(0.58 0.19 24 / 20%)',
          }}
        >
          <div>
            <div className="mb-1 flex items-center gap-2">
              <LogOut className="text-destructive h-3.5 w-3.5" />
              <p className="text-destructive text-sm font-semibold">Sign out</p>
            </div>
            <p className="text-muted-foreground text-xs">
              You will be redirected to the login page.
            </p>
          </div>
          <Button
            size="sm"
            variant={'outline'}
            onClick={logout}
            className="shrink-0 border text-xs font-medium"
          >
            Sign out
          </Button>
        </motion.div>
      </div>
    </div>
  );
}
