'use client';

import { useEffect, useState } from 'react';
import { Comfortaa } from 'next/font/google';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bot, Menu, Search } from 'lucide-react';

import { AuthProvider, useAuth } from '@/lib/auth-context';
import { CallProvider } from '@/lib/call-context';
import { NotificationProvider } from '@/lib/notification-context';
import { UnreadProvider } from '@/lib/unread-context';
import { AiChatPanel } from '@/components/ai-chat-panel';
import { CinematicTransition } from '@/components/CinematicTransition';
import { CommandPalette, triggerCommandPalette } from '@/components/command-palette';
import { NotificationBell, NotificationToasts } from '@/components/NotificationCenter';
import { Sidebar } from '@/components/sidebar';

const comfortaa = Comfortaa({ subsets: ['latin'] });

/* Improved loading screen */
function LoadingScreen() {
  return (
    <div className="bg-background flex h-screen items-center justify-center">
      <motion.div
        className="flex flex-col items-center gap-5"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Brand name */}
        <motion.p
          className={'text-gradient text-xl font-bold tracking-tight ' + comfortaa.className}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          Schoolsoft+
        </motion.p>

        {/* Loading dots */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="bg-primary h-1.5 w-1.5 rounded-full"
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
              transition={{
                duration: 1.1,
                repeat: Infinity,
                delay: i * 0.18,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* Mobile top header */
function MobileHeader({ onMenuOpen, onAiOpen }: { onMenuOpen: () => void; onAiOpen: () => void }) {
  return (
    <header
      className="border-sidebar-border fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b px-4 md:hidden"
      style={{ background: 'var(--sidebar)' }}
    >
      <button
        onClick={onMenuOpen}
        className="text-muted-foreground hover:text-foreground hover:bg-sidebar-accent flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <span className={'text-gradient text-sm font-bold tracking-tight ' + comfortaa.className}>
        Schoolsoft+
      </span>

      <div className="flex items-center gap-1">
        <button
          onClick={() => triggerCommandPalette()}
          className="text-muted-foreground hover:text-foreground hover:bg-sidebar-accent flex h-9 w-9 items-center justify-center rounded-lg transition-colors active:scale-95"
          aria-label="Open command palette"
        >
          <Search className="h-5 w-5" />
        </button>

        <NotificationBell />
        <button
          onClick={onAiOpen}
          className="text-muted-foreground hover:text-primary hover:bg-brand-dim flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
          aria-label="Open AI Assistant"
        >
          <Bot className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

/*  Dashboard shell  */
function DashboardShell({ children }: { children: React.ReactNode }) {
  const [aiOpen, setAiOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return <LoadingScreen />;
  }

  return (
    <div className="bg-background flex h-screen overflow-hidden">
      {/* Mobile top bar */}
      <MobileHeader onMenuOpen={() => setSidebarOpen(true)} onAiOpen={() => setAiOpen(true)} />

      {/* Sidebar (desktop fixed, mobile drawer) */}
      <Sidebar
        onAiOpen={() => setAiOpen(true)}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      {/* Desktop notification bell — top-right fixed corner. Disable due to placement issues */}
      {/* <div className="hidden md:block fixed bottom-4 left-42 z-50">


        <NotificationBell />
      </div> */}

      {/* Main content */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto pt-14 md:pt-0">{children}</main>

      {/* Global floating layers */}
      <NotificationToasts />
      <AiChatPanel open={aiOpen} onClose={() => setAiOpen(false)} />
      <CommandPalette onAiOpen={() => setAiOpen(true)} />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotificationProvider>
        <UnreadProvider>
          <CallProvider>
            <DashboardShell>{children}</DashboardShell>
            {/* Cinematic reveal — sweeps away the brand curtain after login */}
            <CinematicTransition />
          </CallProvider>
        </UnreadProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}
