'use client';

import { useState } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { AnimatePresence, motion } from 'framer-motion';
import { Check, ChevronDown } from 'lucide-react';

import { subjectEase, useSubjectMotion } from './SubjectMotion';

export function SubjectSelect({
  value,
  onValueChange,
  options,
  label,
  disabled,
  className = '',
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const { gentle, duration } = useSubjectMotion();
  const closed = {
    opacity: 0,
    transform: gentle ? 'translateY(0px) scale(1)' : 'translateY(-4px) scale(0.97)',
  };
  return (
    <Menu.Root open={open} onOpenChange={setOpen} modal={false}>
      <Menu.Trigger
        disabled={disabled}
        aria-label={`${label}: ${options.find((option) => option.value === value)?.label ?? value}`}
        className={`subject-select-trigger ${className}`}
      >
        <span>{options.find((option) => option.value === value)?.label ?? value}</span>
        <ChevronDown className="size-4" />
      </Menu.Trigger>
      <Menu.Portal forceMount>
        <AnimatePresence>
          {open && (
            <Menu.Content forceMount asChild sideOffset={6} collisionPadding={12}>
              <motion.div
                className="subject-select-menu"
                aria-label={label}
                initial={closed}
                animate={{ opacity: 1, transform: 'translateY(0px) scale(1)' }}
                exit={closed}
                transition={{ duration: duration ? 0.18 : 0, ease: subjectEase }}
              >
                <Menu.RadioGroup value={value} onValueChange={onValueChange} className="p-1">
                  {options.map((option) => (
                    <Menu.RadioItem
                      key={option.value}
                      value={option.value}
                      className="subject-select-item"
                    >
                      {option.label}
                      <Menu.ItemIndicator>
                        <Check className="size-4" />
                      </Menu.ItemIndicator>
                    </Menu.RadioItem>
                  ))}
                </Menu.RadioGroup>
              </motion.div>
            </Menu.Content>
          )}
        </AnimatePresence>
      </Menu.Portal>
    </Menu.Root>
  );
}
