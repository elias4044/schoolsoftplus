'use client';

import { useEffect, useSyncExternalStore } from 'react';
import type { LucideIcon } from 'lucide-react';

export interface PaletteAction {
  id: string;
  label: string;
  keywords?: string;
  description?: string;
  group: string;
  icon: LucideIcon;
  run: () => void;
  disabled?: boolean;
}

const scopes = new Map<string, PaletteAction[]>();
const listeners = new Set<() => void>();
const emptyActions: PaletteAction[] = [];
let snapshot = emptyActions;

function publish() {
  snapshot = [...scopes.values()].flat();
  listeners.forEach((listener) => listener());
}

export function registerCommandActions(scope: string, actions: PaletteAction[]) {
  scopes.set(scope, actions);
  publish();
  return () => {
    if (scopes.get(scope) !== actions) return;
    scopes.delete(scope);
    publish();
  };
}

export function useRegisterCommandActions(scope: string, actions: PaletteAction[]) {
  useEffect(() => registerCommandActions(scope, actions), [scope, actions]);
}

export function useCommandActions() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    () => snapshot,
    () => emptyActions
  );
}
