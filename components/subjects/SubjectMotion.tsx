'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { Collapsible } from 'radix-ui';

import { SubjectNavigation } from './SubjectNavigation';

const InputContext = createContext(false);
export const subjectEase = [0.23, 1, 0.32, 1] as const;

export function SubjectMotion({ children }: { children: ReactNode }) {
  const [keyboard, setKeyboard] = useState(false);
  const reduced = useReducedMotion();
  useEffect(() => {
    const onKey = () => setKeyboard(true);
    const onPointer = () => setKeyboard(false);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('pointerdown', onPointer, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('pointerdown', onPointer, true);
    };
  }, []);
  return (
    <InputContext value={keyboard}>
      <div className="subjects-workspace" data-input={keyboard ? 'keyboard' : 'pointer'}>
        <SubjectNavigation keyboard={keyboard} reduced={!!reduced} ease={subjectEase}>
          {children}
        </SubjectNavigation>
      </div>
    </InputContext>
  );
}

export function useSubjectMotion() {
  const keyboard = useContext(InputContext);
  const reduced = useReducedMotion();
  return { keyboard, gentle: keyboard || !!reduced, duration: keyboard ? 0 : 0.2 };
}

export function AnimatedPanel({ open, children }: { open: boolean; children: ReactNode }) {
  const { gentle, duration } = useSubjectMotion();
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="panel"
          initial={{ height: gentle ? 'auto' : 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: gentle ? 'auto' : 0, opacity: 0 }}
          transition={{ duration, ease: subjectEase }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function AnimatedDisclosure({
  title,
  children,
  icon: Icon,
  className = '',
  onOpenChange,
  defaultOpen = false,
}: {
  title: ReactNode;
  children: ReactNode;
  icon?: LucideIcon;
  className?: string;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const { gentle, duration } = useSubjectMotion();
  return (
    <Collapsible.Root
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        onOpenChange?.(value);
      }}
      className={`subject-accordion ${className}`}
    >
      <Collapsible.Trigger className="subject-accordion-trigger">
        {Icon && <Icon className="subject-accent size-4 shrink-0" aria-hidden="true" />}
        <span className="min-w-0 flex-1 text-left">{title}</span>
        <motion.span
          aria-hidden="true"
          animate={{ transform: open && !gentle ? 'rotate(180deg)' : 'rotate(0deg)' }}
          transition={{ duration, ease: subjectEase }}
        >
          <ChevronDown className="text-muted-foreground size-4" />
        </motion.span>
      </Collapsible.Trigger>
      <AnimatePresence initial={false}>
        {open && (
          <Collapsible.Content forceMount asChild>
            <motion.div
              initial={{ height: gentle ? 'auto' : 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: gentle ? 'auto' : 0, opacity: 0 }}
              transition={{ duration, ease: subjectEase }}
              className="overflow-hidden"
            >
              {children}
            </motion.div>
          </Collapsible.Content>
        )}
      </AnimatePresence>
    </Collapsible.Root>
  );
}
