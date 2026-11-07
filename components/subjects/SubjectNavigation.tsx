'use client';

import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import NextLink from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

type Navigation = {
  navigate: (href: string, replace?: boolean, scroll?: boolean, instant?: boolean) => boolean;
  isTransitioning: () => boolean;
};
const NavigationContext = createContext<Navigation | null>(null);
type PendingNavigation = {
  target: string;
  resolve: () => void;
  timer?: number;
  transition?: ViewTransition;
};

export function SubjectNavigation({
  children,
  keyboard,
  reduced,
  ease,
}: {
  children: ReactNode;
  keyboard: boolean;
  reduced: boolean;
  ease: readonly [number, number, number, number];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const pending = useRef<PendingNavigation | null>(null);
  const [native, setNative] = useState(false);

  useLayoutEffect(() => {
    const request = pending.current;
    if (request && pathname === request.target) {
      window.clearTimeout(request.timer);
      request.resolve();
    }
  }, [pathname]);

  useEffect(() => {
    const cancelForHistory = () => {
      const request = pending.current;
      if (!request) return;
      pending.current = null;
      window.clearTimeout(request.timer);
      request.resolve();
      request.transition?.skipTransition();
      setNative(false);
      delete document.documentElement.dataset.subjectTransition;
    };
    window.addEventListener('popstate', cancelForHistory);
    return () => {
      window.removeEventListener('popstate', cancelForHistory);
      const request = pending.current;
      if (!request) return;
      pending.current = null;
      window.clearTimeout(request.timer);
      request.resolve();
      request.transition?.skipTransition();
      delete document.documentElement.dataset.subjectTransition;
    };
  }, []);

  function navigate(href: string, replace = false, scroll = true, instant = false) {
    const previous = pending.current;
    if (previous) {
      pending.current = null;
      window.clearTimeout(previous.timer);
      previous.resolve();
      previous.transition?.skipTransition();
      setNative(false);
      delete document.documentElement.dataset.subjectTransition;
    }
    if (
      instant ||
      keyboard ||
      reduced ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      !document.startViewTransition
    )
      return false;
    const target = new URL(href, window.location.href);
    if (
      target.origin !== window.location.origin ||
      target.pathname === window.location.pathname ||
      target.hash
    )
      return false;
    const request: PendingNavigation = { target: target.pathname, resolve: () => {} };
    pending.current = request;
    setNative(true);
    document.documentElement.dataset.subjectTransition = 'true';
    try {
      request.transition = document.startViewTransition(() => {
        if (pending.current !== request) return;
        return new Promise<void>((resolve) => {
          request.resolve = resolve;
          // A slow or cancelled route must never hold the visual snapshot open.
          request.timer = window.setTimeout(() => {
            resolve();
            request.transition?.skipTransition();
          }, 1200);
          startTransition(() => {
            const destination = `${target.pathname}${target.search}`;
            if (replace) router.replace(destination, { scroll });
            else router.push(destination, { scroll });
          });
        });
      });
      void request.transition.ready.catch(() => {});
      void request.transition.finished
        .catch(() => {})
        .finally(() => {
          window.clearTimeout(request.timer);
          if (pending.current === request) {
            pending.current = null;
            setNative(false);
            delete document.documentElement.dataset.subjectTransition;
          }
        });
      return true;
    } catch {
      pending.current = null;
      setNative(false);
      delete document.documentElement.dataset.subjectTransition;
      return false;
    }
  }

  return (
    <NavigationContext value={{ navigate, isTransitioning: () => native }}>
      <motion.div
        key={pathname}
        className="subject-route"
        initial={
          native || keyboard
            ? false
            : { opacity: 0.8, transform: reduced ? 'translateY(0px)' : 'translateY(6px)' }
        }
        animate={{ opacity: 1, transform: 'translateY(0px)' }}
        transition={{ duration: keyboard ? 0 : 0.18, ease }}
      >
        {children}
      </motion.div>
    </NavigationContext>
  );
}

export function useSubjectNavigation() {
  return useContext(NavigationContext);
}

export function SubjectLink({
  href,
  onClick,
  onNavigate,
  replace,
  scroll,
  ...props
}: ComponentProps<typeof NextLink>) {
  const navigation = useSubjectNavigation();
  const pointer = useRef(false);
  return (
    <NextLink
      {...props}
      href={href}
      replace={replace}
      scroll={scroll}
      onClick={(event) => {
        pointer.current = event.detail !== 0;
        onClick?.(event);
      }}
      onNavigate={(event) => {
        if (onNavigate) {
          onNavigate(event);
          return;
        }
        if (
          typeof href === 'string' &&
          navigation?.navigate(href, replace, scroll, !pointer.current)
        )
          event.preventDefault();
      }}
    />
  );
}
