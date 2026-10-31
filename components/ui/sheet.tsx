'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { menuIconButtonClassName } from '@/components/ui/menu-styles';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  side?: 'left' | 'right';
  children: React.ReactNode;
  className?: string;
  hideTitle?: boolean;
  id?: string;
}

export function Sheet({
  open,
  onOpenChange,
  title,
  side = 'right',
  children,
  className,
  hideTitle,
  id,
}: SheetProps) {
  const opener = React.useRef<HTMLElement | null>(null);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 fixed inset-0 z-50 bg-black/60 motion-reduce:animate-none" />
        <DialogPrimitive.Content
          onOpenAutoFocus={() => {
            opener.current = document.activeElement as HTMLElement;
          }}
          onCloseAutoFocus={(event) => {
            if (opener.current?.isConnected) {
              event.preventDefault();
              opener.current.focus();
            }
          }}
          id={id}
          aria-describedby={undefined}
          className={cn(
            'bg-sidebar text-foreground data-[state=open]:animate-in data-[state=closed]:animate-out fixed inset-y-0 z-50 flex h-dvh w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden shadow-xl shadow-black/20 duration-200 outline-none motion-reduce:animate-none',
            side === 'left'
              ? 'data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left left-0'
              : 'data-[state=open]:slide-in-from-right data-[state=closed]:slide-out-to-right right-0',
            className
          )}
        >
          <DialogPrimitive.Title
            className={hideTitle ? 'sr-only' : 'px-5 pt-6 pr-16 pb-4 text-lg font-semibold'}
          >
            {title}
          </DialogPrimitive.Title>
          {children}
          <DialogPrimitive.Close
            className={cn(menuIconButtonClassName, 'absolute top-2.5 right-2.5')}
            aria-label={`Close ${title.toLowerCase()}`}
          >
            <X className="size-5" />
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
