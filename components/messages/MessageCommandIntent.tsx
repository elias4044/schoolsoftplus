'use client';

import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export function MessageCommandIntent({
  onCompose,
  onCreateGroup,
}: {
  onCompose: () => void;
  onCreateGroup: () => void;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const handled = useRef<string | null>(null);
  const action =
    searchParams.get('compose') === 'true'
      ? 'compose'
      : searchParams.get('action') === 'group'
        ? 'group'
        : null;

  useEffect(() => {
    if (!action) {
      handled.current = null;
      return;
    }
    if (handled.current === action) return;
    handled.current = action;
    if (action === 'compose') onCompose();
    else onCreateGroup();
    const next = new URLSearchParams(searchParams.toString());
    next.delete(action === 'compose' ? 'compose' : 'action');
    router.replace(`/messages${next.size ? `?${next}` : ''}`, { scroll: false });
  }, [action, onCompose, onCreateGroup, router, searchParams]);

  return null;
}
