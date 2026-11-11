'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight, RefreshCw } from 'lucide-react';

import { apiFetch } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-context';
import { fetchCached, useCachedResource } from '@/lib/cache';
import { cn } from '@/lib/utils';

export function useWidgetResource<T>(
  path: string,
  select: (response: unknown) => T,
  maxAge = 60_000
) {
  const { session } = useAuth();
  const key = `dashboard:${session?.userId}:${path}`;
  return useCachedResource<T>(key, (force) =>
    fetchCached(
      key,
      maxAge,
      async () => {
        const url = new URL(path, window.location.origin);
        if (force) url.searchParams.set('refresh', '1');
        return select(await apiFetch(url.pathname + url.search));
      },
      force
    )
  );
}

export function listData<T>(response: unknown, key = 'data'): T[] {
  const list = Array.isArray(response)
    ? response
    : (response as Record<string, unknown> | null)?.[key];
  if (!Array.isArray(list)) throw new Error('Invalid widget response');
  return list as T[];
}

export function WidgetContent<T>({
  resource,
  empty,
  children,
}: {
  resource: ReturnType<typeof useCachedResource<T>>;
  empty: string;
  children: (data: T) => ReactNode;
}) {
  if (resource.loading) {
    return <WidgetSkeleton />;
  }

  return (
    <>
      {resource.error && (
        <WidgetNotice action="Retry" onAction={resource.refresh}>
          {resource.data === null
            ? 'Could not load this widget.'
            : 'Showing the last saved update.'}
        </WidgetNotice>
      )}
      {resource.data !== null && (children(resource.data) ?? <WidgetNotice>{empty}</WidgetNotice>)}
    </>
  );
}

export function WidgetSkeleton({ label = 'Loading widget' }: { label?: string }) {
  return (
    <div role="status" className="space-y-4 py-3">
      <span className="sr-only">{label}</span>
      {[0, 1].map((row) => (
        <div key={row} className="space-y-1.5 motion-safe:animate-pulse">
          <div className="bg-muted h-3 w-3/4 rounded" />
          <div className="bg-muted h-2.5 w-2/5 rounded" />
        </div>
      ))}
    </div>
  );
}

export function WidgetNotice({
  children,
  action,
  onAction,
}: {
  children: ReactNode;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="text-muted-foreground bg-muted/45 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg px-3 py-2.5 text-sm">
      <p role={onAction ? 'status' : undefined} className="min-w-0 flex-1">
        {children}
      </p>
      {onAction && (
        <button type="button" onClick={onAction} className="widgetControl">
          <RefreshCw aria-hidden className="size-3.5" /> {action}
        </button>
      )}
    </div>
  );
}

export function WidgetTag({ children, active }: { children: ReactNode; active?: boolean }) {
  return (
    <span className="widgetTag" data-active={active || undefined}>
      {children}
    </span>
  );
}

export function WidgetRow({
  title,
  detail,
  leading,
  aside,
  href,
  unread,
  className,
}: {
  title: string;
  detail?: ReactNode;
  leading?: ReactNode;
  aside?: ReactNode;
  href?: string;
  unread?: boolean;
  className?: string;
}) {
  const content = (
    <>
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm leading-snug font-medium wrap-anywhere">
          {unread && (
            <>
              <span aria-hidden className="widgetUnread" />
              <span className="sr-only">Unread: </span>
            </>
          )}
          {title}
        </p>
        {detail && (
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs leading-snug wrap-anywhere">
            {detail}
          </p>
        )}
      </div>
      {aside && (
        <span className="text-muted-foreground shrink-0 text-right text-xs tabular-nums">
          {aside}
        </span>
      )}
      {href && !aside && (
        <ChevronRight aria-hidden className="text-muted-foreground size-3.5 shrink-0" />
      )}
    </>
  );
  const rowClass = cn(
    'widgetRow border-border/70 flex min-h-11 items-center gap-2.5 border-b py-2 last:border-b-0',
    className
  );
  return href ? (
    <Link
      href={href}
      prefetch={false}
      className={cn(
        rowClass,
        'widgetRowLink focus-visible:ring-ring rounded-md transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset'
      )}
    >
      {content}
    </Link>
  ) : (
    <div className={rowClass}>{content}</div>
  );
}
