'use client';

import Link from 'next/link';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowUpRight, GripVertical, MoreHorizontal, Star } from 'lucide-react';

import { cn } from '@/lib/utils';
import { SIZE_LABELS, sizeToClasses, WIDGET_REGISTRY } from '@/lib/widgets/registry';
import type { WidgetInstance, WidgetSize } from '@/lib/widgets/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { WidgetErrorBoundary } from './WidgetErrorBoundary';

interface Props {
  instance: WidgetInstance;
  children: React.ReactNode;
  onResize: (id: string, size: WidgetSize) => void;
  onRemove: (id: string) => void;
  onMove: (offset: number) => void;
  onMoveFirst: () => void;
  onToggleHighlight: (id: string) => void;
  reducedMotion: boolean;
  first: boolean;
  last: boolean;
  editing: boolean;
}

export function WidgetShell({
  instance,
  children,
  onResize,
  onRemove,
  onMove,
  onMoveFirst,
  onToggleHighlight,
  reducedMotion,
  first,
  last,
  editing,
}: Props) {
  const meta = WIDGET_REGISTRY[instance.widgetId];
  const Icon = meta.icon;
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: instance.instanceId,
    disabled: !editing,
    transition: reducedMotion ? null : undefined,
  });

  return (
    <section
      ref={setNodeRef}
      data-tall={instance.size.endsWith('x2')}
      data-highlighted={instance.highlighted === true}
      data-dragging={isDragging}
      style={{
        transform: CSS.Translate.toString(transform),
        transition: transition
          ? `${transition}, border-color 180ms, background-color 180ms`
          : undefined,
        zIndex: isDragging ? 20 : undefined,
      }}
      className={cn(
        sizeToClasses(instance.size),
        'dashboardWidget bg-card border-border relative flex min-w-0 flex-col border',
        instance.size.endsWith('x2') && '@min-[38rem]:row-span-2',
        editing && 'border-dashed',
        isDragging && 'border-primary opacity-80'
      )}
    >
      <header className="flex min-h-12 shrink-0 items-center gap-2.5 px-(--widget-inset) pt-1.5">
        {editing ? (
          <Button
            ref={setActivatorNodeRef}
            variant="ghost"
            size="icon-sm"
            className="-ml-2 min-h-11 cursor-grab touch-none active:cursor-grabbing"
            aria-label={`Drag ${meta.label}`}
            {...attributes}
            {...listeners}
          >
            <GripVertical />
          </Button>
        ) : (
          <Icon aria-hidden className="text-muted-foreground size-4 shrink-0" />
        )}
        <h2 className="min-w-0 flex-1 truncate text-[0.9375rem] font-semibold" title={meta.label}>
          {meta.label}
        </h2>
        {instance.highlighted && (
          <Star aria-label="Highlighted" className="size-4 shrink-0 text-(--dashboard-color)" />
        )}
        {editing ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="-mr-2 min-h-11"
                aria-label={`Options for ${meta.label}`}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Widget size</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={instance.size}
                onValueChange={(size) => onResize(instance.instanceId, size as WidgetSize)}
              >
                {meta.allowedSizes.map((size) => (
                  <DropdownMenuRadioItem key={size} value={size}>
                    {SIZE_LABELS[size]}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => onToggleHighlight(instance.instanceId)}>
                {instance.highlighted ? 'Remove highlight' : 'Highlight widget'}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={first} onSelect={onMoveFirst}>
                Move to top
              </DropdownMenuItem>
              <DropdownMenuItem disabled={first} onSelect={() => onMove(-1)}>
                Move earlier
              </DropdownMenuItem>
              <DropdownMenuItem disabled={last} onSelect={() => onMove(1)}>
                Move later
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onSelect={() => onRemove(instance.instanceId)}
              >
                Remove widget
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          meta.href && (
            <Button asChild variant="ghost" size="icon-sm" className="-mr-2 min-h-11">
              <Link href={meta.href} prefetch={false} aria-label={`Open ${meta.label}`}>
                <ArrowUpRight />
              </Link>
            </Button>
          )
        )}
      </header>
      <div className="widgetScroll min-h-0 flex-1 overflow-auto px-(--widget-inset) pt-1 pb-(--widget-inset)">
        <WidgetErrorBoundary widgetId={instance.widgetId}>{children}</WidgetErrorBoundary>
      </div>
    </section>
  );
}
