'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { apiFetch } from '@/lib/api-client';

import { WIDGET_REGISTRY } from './registry';
import {
  DEFAULT_DASHBOARD_APPEARANCE,
  MAX_WIDGETS,
  WIDGET_IDS,
  type DashboardAppearance,
  type DashboardLayout,
  type WidgetId,
  type WidgetInstance,
  type WidgetSize,
} from './types';

export const DASHBOARD_PRESETS = {
  'School day': [
    'next-lesson',
    'shortcuts',
    'schedule',
    'homework',
    'results',
    'bookings',
    'lunch',
    'news',
    'notes',
  ],
  'Study focus': ['homework', 'results', 'notes', 'countdown', 'shortcuts', 'schedule'],
  Essentials: ['next-lesson', 'homework', 'schedule', 'lunch'],
} satisfies Record<string, WidgetId[]>;

export type DashboardPreset = keyof typeof DASHBOARD_PRESETS;

function presetLayout(preset: DashboardPreset): DashboardLayout {
  return {
    version: 1,
    widgets: DASHBOARD_PRESETS[preset].map((widgetId) => ({
      instanceId: `${widgetId}-default`,
      widgetId,
      size: WIDGET_REGISTRY[widgetId].defaultSize,
      ...(widgetId === 'next-lesson' && { highlighted: true }),
    })),
  };
}

const defaultLayout = presetLayout('School day');
const saveQueues = new Map<string, Promise<unknown>>();

function normalize(layout: DashboardLayout): DashboardLayout {
  const ids = new Set<string>();
  return {
    version: layout.version,
    appearance: layout.appearance,
    widgets: layout.widgets
      .filter((widget) => {
        if (
          !widget ||
          !WIDGET_IDS.includes(widget.widgetId) ||
          !widget.instanceId ||
          ids.has(widget.instanceId)
        ) {
          return false;
        }
        ids.add(widget.instanceId);
        return true;
      })
      .map((widget) => {
        const meta = WIDGET_REGISTRY[widget.widgetId];
        return meta.allowedSizes.includes(widget.size)
          ? widget
          : { ...widget, size: meta.defaultSize };
      }),
  };
}

interface SavedLayout {
  layout: DashboardLayout;
  pending: boolean;
}

function readLocal(key: string): SavedLayout | null {
  try {
    const entry = JSON.parse(localStorage.getItem(key) ?? 'null') as SavedLayout | null;
    if (!entry || !Array.isArray(entry.layout?.widgets)) return null;
    return { ...entry, layout: normalize(entry.layout) };
  } catch {
    return null;
  }
}

function writeLocal(key: string, entry: SavedLayout) {
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch {
    // Cloud saving still works when browser storage is unavailable.
  }
}

export function useWidgetLayout(account: string) {
  const key = `ssp_dashboard_layout:${account}`;
  const [layout, setLayout] = useState(defaultLayout);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<
    'loading' | 'ready' | 'saving' | 'saved' | 'error' | 'load-error'
  >('loading');
  const current = useRef(layout);
  const edited = useRef(false);
  const saveRevision = useRef(0);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const save = useCallback(
    (next: DashboardLayout) => {
      const revision = ++saveRevision.current;
      writeLocal(key, { layout: next, pending: true });
      setStatus('saving');
      const previous = saveQueues.get(key) ?? Promise.resolve();
      const request = previous
        .catch(() => {})
        .then(() =>
          apiFetch('/api/layout', {
            params: { account },
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ layout: next }),
            keepalive: true,
          })
        );
      saveQueues.set(key, request);
      void request
        .then(
          () => {
            if (saveQueues.get(key) === request) {
              writeLocal(key, { layout: next, pending: false });
            }
            if (saveRevision.current === revision) setStatus('saved');
          },
          () => {
            if (saveRevision.current === revision) setStatus('error');
          }
        )
        .finally(() => {
          if (saveQueues.get(key) === request) saveQueues.delete(key);
        });
    },
    [account, key]
  );

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        await saveQueues.get(key);
      } catch {
        // Retry a pending local layout below.
      }
      if (!active) return;
      const local = readLocal(key);
      if (local) {
        current.current = local.layout;
        setLayout(local.layout);
        setReady(true);
      }
      if (local?.pending) {
        save(local.layout);
        return;
      }
      setStatus('loading');
      try {
        const { layout: remote } = await apiFetch<{ layout: DashboardLayout | null }>(
          '/api/layout',
          {
            params: { account },
          }
        );
        if (!active || edited.current) return;
        if (remote && Array.isArray(remote.widgets)) {
          const next = normalize(remote);
          current.current = next;
          setLayout(next);
          writeLocal(key, { layout: next, pending: false });
        }
        setStatus('ready');
      } catch {
        if (active && !edited.current) setStatus('load-error');
      } finally {
        if (active) setReady(true);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [account, key, loadAttempt, save]);

  const commit = useCallback(
    (next: DashboardLayout) => {
      edited.current = true;
      current.current = next;
      setLayout(next);
      save(next);
    },
    [save]
  );

  const update = useCallback(
    (change: (widgets: WidgetInstance[]) => WidgetInstance[]) => {
      const widgets = change(current.current.widgets);
      if (widgets !== current.current.widgets) commit({ ...current.current, widgets });
    },
    [commit]
  );

  const setAppearance = useCallback(
    (patch: Partial<DashboardAppearance>) => {
      const appearance = current.current.appearance ?? DEFAULT_DASHBOARD_APPEARANCE;
      commit({ ...current.current, appearance: { ...appearance, ...patch } });
    },
    [commit]
  );

  const toggleHighlight = useCallback(
    (id: string) => {
      update((widgets) =>
        widgets.map((widget) =>
          widget.instanceId === id
            ? { ...widget, highlighted: widget.highlighted ? undefined : true }
            : widget
        )
      );
    },
    [update]
  );

  const reorder = useCallback((widgets: WidgetInstance[]) => update(() => widgets), [update]);
  const resize = useCallback(
    (id: string, size: WidgetSize) => {
      update((widgets) =>
        widgets.map((widget) => (widget.instanceId === id ? { ...widget, size } : widget))
      );
    },
    [update]
  );
  const remove = useCallback(
    (id: string) => {
      update((widgets) => widgets.filter((widget) => widget.instanceId !== id));
    },
    [update]
  );
  const add = useCallback(
    (widgetId: WidgetId) => {
      update((widgets) =>
        widgets.length >= MAX_WIDGETS
          ? widgets
          : [
              ...widgets,
              {
                instanceId: `${widgetId}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`,
                widgetId,
                size: WIDGET_REGISTRY[widgetId].defaultSize,
              },
            ]
      );
    },
    [update]
  );
  const applyPreset = useCallback(
    (preset: DashboardPreset) => {
      update(() => presetLayout(preset).widgets);
    },
    [update]
  );

  return {
    layout,
    ready,
    status,
    reorder,
    resize,
    remove,
    add,
    setAppearance,
    toggleHighlight,
    applyPreset,
    retry: () =>
      status === 'error' ? save(current.current) : setLoadAttempt((attempt) => attempt + 1),
  };
}
