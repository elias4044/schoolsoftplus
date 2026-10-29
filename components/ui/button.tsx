import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'bg-brand text-brand-foreground shadow-[inset_0_1px_0_oklch(1_0_0/22%),inset_0_0_0_1px_oklch(0_0_0/15%),0_1px_2px_oklch(0_0_0/30%)] hover:bg-brand-hover',
        secondary:
          'border border-border bg-card/80 text-foreground shadow-sm hover:border-brand/40 hover:bg-card',
        outline:
          'border border-border-strong bg-transparent text-foreground hover:border-brand/40 hover:bg-overlay-hover',
        soft: 'bg-brand-dim text-brand-strong hover:bg-brand-soft',
        ghost: 'text-muted-foreground hover:bg-overlay-hover hover:text-foreground',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
        link: 'h-auto rounded-none p-0 text-brand-strong underline-offset-4 hover:underline active:scale-100',
      },
      size: {
        xs: 'h-7 rounded-lg px-2.5 text-xs',
        sm: 'h-9 rounded-lg px-3.5',
        default: 'h-10 px-4',
        lg: 'h-11 px-5',
        xl: 'h-12 px-6 text-base',
        icon: 'size-10',
        'icon-sm': 'size-8 rounded-lg',
        'icon-lg': 'size-11',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

type ButtonProps = React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  if (asChild) {
    return (
      <Slot
        data-slot="button"
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {children}
      </Slot>
    );
  }

  return (
    <button
      data-slot="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading ? (
        <>
          <span className="invisible inline-flex items-center justify-center gap-2">
            {children}
          </span>
          <Loader2 className="absolute animate-spin" />
        </>
      ) : (
        children
      )}
    </button>
  );
}

export { Button, buttonVariants };
export type { ButtonProps };
