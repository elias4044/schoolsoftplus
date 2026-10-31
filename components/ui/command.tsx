'use client';

import * as React from 'react';
import { type DialogProps } from '@radix-ui/react-dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Command as CommandPrimitive, useCommandState } from 'cmdk';
import { Search, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { menuIconButtonClassName, menuItemClassName } from '@/components/ui/menu-styles';

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn(
      'bg-popover text-popover-foreground flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-2xl',
      className
    )}
    {...props}
  />
));
Command.displayName = CommandPrimitive.displayName;

interface CommandDialogProps extends DialogProps {
  children: React.ReactNode;
  containerClassName?: string;
}

const CommandDialog = ({ children, containerClassName, ...props }: CommandDialogProps) => {
  return (
    <DialogPrimitive.Root {...props}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/60 duration-150 motion-reduce:animate-none" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            document.querySelector<HTMLInputElement>('[cmdk-input]')?.focus();
          }}
          className={cn(
            'bg-popover fixed top-4 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 flex-col overflow-hidden rounded-2xl p-0 shadow-2xl shadow-black/30 outline-none sm:top-[12dvh] sm:max-h-[76dvh]',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-150 motion-reduce:animate-none',
            containerClassName
          )}
        >
          <DialogPrimitive.Title className="sr-only">Quick jump</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Search pages, actions, and appearance settings.
          </DialogPrimitive.Description>
          <DialogPrimitive.Close
            aria-label="Close quick jump"
            className={cn(menuIconButtonClassName, 'absolute top-1.5 right-2 z-10')}
          >
            <X className="size-4" />
          </DialogPrimitive.Close>
          <Command>{children}</Command>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
};

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input> & {
    wrapperClassName?: string;
  }
>(({ className, wrapperClassName, ...props }, ref) => (
  <div
    className={cn('border-border/40 flex items-center border-b px-3.5', wrapperClassName)}
    cmdk-input-wrapper=""
  >
    <Search className="text-muted-foreground/70 mr-2.5 h-4 w-4 shrink-0" />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        'placeholder:text-muted-foreground flex h-14 w-full min-w-0 rounded-md bg-transparent py-3 text-base outline-none disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    />
  </div>
));
CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => {
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const search = useCommandState((state) => state.search);

  React.useEffect(() => {
    // cmdk reorders results during filtering; reset after its selection and layout updates.
    const frame = requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: 0, behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [search]);

  return (
    <CommandPrimitive.List
      ref={(element) => {
        listRef.current = element;
        if (typeof ref === 'function') return ref(element);
        if (ref) ref.current = element;
      }}
      className={cn(
        'max-h-[min(26rem,calc(100dvh-8rem))] min-h-0 flex-1 scroll-py-2 overflow-x-hidden overflow-y-auto overscroll-contain p-2 [overflow-anchor:none] focus:outline-none',
        className
      )}
      {...props}
    />
  );
});
CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty
    ref={ref}
    className="text-muted-foreground py-10 text-center text-sm"
    {...props}
  />
));
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn(
      'text-foreground [&_[cmdk-group-heading]]:text-muted-foreground overflow-hidden p-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-2 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium',
      className
    )}
    {...props}
  />
));
CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator
    ref={ref}
    className={cn('bg-border/40 -mx-1 my-1 h-px', className)}
    {...props}
  />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      menuItemClassName,
      'data-[selected=true]:bg-accent data-[selected=true]:text-foreground data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
      className
    )}
    {...props}
  />
));
CommandItem.displayName = CommandPrimitive.Item.displayName;

const CommandShortcut = ({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn(
        'text-muted-foreground ml-auto hidden shrink-0 items-center gap-0.5 pl-4 text-xs sm:inline-flex',
        className
      )}
      {...props}
    />
  );
};
CommandShortcut.displayName = 'CommandShortcut';

export {
  Command,
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
};
