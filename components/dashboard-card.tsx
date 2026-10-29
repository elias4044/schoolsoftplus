'use client';

import { motion } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';

import { fadeUp } from '@/lib/animations';
import { cn } from '@/lib/utils';

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
      className={cn('card-base relative overflow-hidden rounded-xl', className)}
    >
      {/* Accent top bar */}
      {accent && (
        <div
          className="absolute inset-x-0 top-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, color-mix(in oklch, var(--brand) 70%, transparent), transparent)',
          }}
        />
      )}

      {/* Header */}
      {(title || action) && (
        <div className="flex items-center justify-between px-4 pt-4 pb-1">
          <div className="flex items-center gap-2">
            {Icon && (
              <div
                className="flex h-6 w-6 items-center justify-center rounded-md"
                style={{ background: 'color-mix(in oklch, var(--brand) 15%, transparent)' }}
              >
                <Icon className="text-primary h-3.5 w-3.5" />
              </div>
            )}
            {title && <h2 className="text-foreground/90 text-sm font-semibold">{title}</h2>}
          </div>
          {action && <div className="text-muted-foreground text-xs">{action}</div>}
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
      className={cn('card-base relative overflow-hidden rounded-xl p-4', className)}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-muted-foreground mb-1 text-xs">{label}</p>
          <p className="text-foreground text-2xl font-bold tabular-nums">{value}</p>
          {trend && <p className="text-muted-foreground mt-1 text-xs">{trend}</p>}
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ background: 'oklch(0.65 0.22 278 / 12%)' }}
        >
          <Icon className="text-primary h-4.5 w-4.5" />
        </div>
      </div>
    </motion.div>
  );
}
