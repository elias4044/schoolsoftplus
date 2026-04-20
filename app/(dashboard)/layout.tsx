"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Menu, Sparkles, Bot } from "lucide-react";
import { Sidebar } from "@/components/sidebar";
import { AiChatPanel } from "@/components/ai-chat-panel";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import { Comfortaa } from "next/font/google";

const comfortaa = Comfortaa({ subsets: ["latin"] });

/* ── Improved loading screen ─────────────────────────────── */
function LoadingScreen() {
  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <motion.div
        className="flex flex-col items-center gap-5"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* icon */}
        <div className="relative w-16 h-16">
          {/* Inner bg to mask ring into border */}
          <div
            className="absolute inset-0.75 rounded-[10px]"
            style={{ background: "var(--background)" }}
          />
          {/* Icon center */}
          <div
            className="absolute inset-0.75 rounded-[10px] flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, oklch(0.65 0.22 278 / 20%), oklch(0.55 0.25 295 / 20%))",
            }}
          >
            <Sparkles className="w-5 h-5" style={{ color: "oklch(0.65 0.22 278)" }} />
          </div>
        </div>

        {/* Brand name */}
        <motion.p
          className={"text-base font-bold tracking-tight text-gradient " + comfortaa.className}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          Schoolsoft+
        </motion.p>

        {/* Loading dots */}
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: "oklch(0.65 0.22 278)" }}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
              transition={{
                duration: 1.1,
                repeat: Infinity,
                delay: i * 0.18,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ── Mobile top header ───────────────────────────────────── */
function MobileHeader({
  onMenuOpen,
  onAiOpen,
}: {
  onMenuOpen: () => void;
  onAiOpen: () => void;
}) {
  return (
    <header
      className="md:hidden fixed top-0 inset-x-0 z-30 flex items-center justify-between px-4 h-14 border-b border-sidebar-border"
      style={{ background: "var(--sidebar)" }}
    >
      <button
        onClick={onMenuOpen}
        className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <span className={"text-sm font-bold tracking-tight text-gradient " + comfortaa.className}>
        Schoolsoft+
      </span>

      <button
        onClick={onAiOpen}
        className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:text-primary hover:bg-brand-dim transition-colors"
        aria-label="Open AI Assistant"
      >
        <Bot className="w-5 h-5" />
      </button>
    </header>
  );
}

/* ── Dashboard shell ─────────────────────────────────────── */
function DashboardShell({ children }: { children: React.ReactNode }) {
  const [aiOpen, setAiOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || !isAuthenticated) {
    return <LoadingScreen />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile top bar */}
      <MobileHeader
        onMenuOpen={() => setSidebarOpen(true)}
        onAiOpen={() => setAiOpen(true)}
      />

      {/* Sidebar (desktop fixed, mobile drawer) */}
      <Sidebar
        onAiOpen={() => setAiOpen(true)}
        mobileOpen={sidebarOpen}
        onMobileClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto overflow-x-hidden pt-14 md:pt-0">
        {children}
      </main>

      <AiChatPanel open={aiOpen} onClose={() => setAiOpen(false)} />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DashboardShell>{children}</DashboardShell>
    </AuthProvider>
  );
}
