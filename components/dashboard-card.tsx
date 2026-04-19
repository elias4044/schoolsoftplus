"use client";

import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";
import { type LucideIcon } from "lucide-react";

/* -- Staggered container ---------------------------------- */
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.1,
    },
  },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

/* -- DashboardCard ---------------------------------------- */
interface DashboardCardProps {
  title?: string;
  icon?: LucideIcon;
  accent?: boolean;
  className?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}

export function DashboardCard({
  title,
  icon: Icon,
  accent,
  className,
  children,
  action,
}: DashboardCardProps) {
  return (
    <motion.div
      variants={fadeUp}
      className={cn(
        "relative rounded-xl overflow-hidden",
        className
      )}
      style={{ background: "var(--card)", border: "1px solid oklch(1 0 0 / 7%)" }}
    >
      {/* Accent top bar */}
      {accent && (
        <div
          className="absolute top-0 inset-x-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, oklch(0.65 0.22 278 / 70%), transparent)",
          }}
        />
      )}

      {/* Header */}
      {(title || action) && (
        <div className="flex items-center justify-between px-4 pt-4 pb-1">
          <div className="flex items-center gap-2">
            {Icon && (
              <div
                className="flex items-center justify-center w-6 h-6 rounded-md"
                style={{ background: "oklch(0.65 0.22 278 / 15%)" }}
              >
                <Icon className="w-3.5 h-3.5 text-primary" />
              </div>
            )}
            {title && (
              <h2 className="text-sm font-semibold text-foreground/90">{title}</h2>
            )}
          </div>
          {action && <div className="text-xs text-muted-foreground">{action}</div>}
        </div>
      )}

      <div className="p-4 pt-2">{children}</div>
    </motion.div>
  );
}

/* -- StatCard --------------------------------------------- */
interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  className?: string;
}

export function StatCard({ label, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <motion.div
      variants={fadeUp}
      className={cn("relative rounded-xl p-4 overflow-hidden", className)}
      style={{ background: "var(--card)", border: "1px solid oklch(1 0 0 / 7%)" }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
          {trend && (
            <p className="text-xs text-muted-foreground mt-1">{trend}</p>
          )}
        </div>
        <div
          className="flex items-center justify-center w-9 h-9 rounded-xl"
          style={{ background: "oklch(0.65 0.22 278 / 12%)" }}
        >
          <Icon className="w-4.5 h-4.5 text-primary" />
        </div>
      </div>
    </motion.div>
  );
}
