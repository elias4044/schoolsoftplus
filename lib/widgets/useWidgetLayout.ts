"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { DashboardLayout, WidgetInstance, WidgetId, WidgetSize } from "./types";
import { WIDGET_REGISTRY } from "./registry";
import { apiFetch } from "@/lib/api-client";

const STORAGE_KEY   = "ssp_dashboard_layout";
const TIMESTAMP_KEY = "ssp_dashboard_layout_ts";
const CURRENT_VERSION = 1;
/** Re-fetch from the server at most once every 7 minutes */
const REMOTE_TTL_MS = 7 * 60 * 1000;
/** Debounce saves to the server by 2 seconds after the last change */
const SAVE_DEBOUNCE_MS = 2000;

export const DEFAULT_LAYOUT: DashboardLayout = {
  version: CURRENT_VERSION,
  widgets: [
    { instanceId: "homework-default", widgetId: "homework", size: "2x2" },
    { instanceId: "schedule-default", widgetId: "schedule", size: "2x2" },
    { instanceId: "notes-default",    widgetId: "notes",    size: "2x2" },
    { instanceId: "lunch-default",    widgetId: "lunch",    size: "2x2" },
    { instanceId: "news-default",     widgetId: "news",     size: "2x2" },
  ],
};

/* ------------------------------------------------------------------ */
/* Local-storage helpers                                               */
/* ------------------------------------------------------------------ */

function readLocal(): { layout: DashboardLayout; ts: number } | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const ts  = Number(localStorage.getItem(TIMESTAMP_KEY) ?? "0");
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DashboardLayout;
    if (parsed.version !== CURRENT_VERSION) return null;
    // Strip widgets whose id no longer exists in the registry
    const valid = parsed.widgets.filter(
      (w) => w.instanceId && w.widgetId && WIDGET_REGISTRY[w.widgetId]
    );
    return { layout: { ...parsed, widgets: valid }, ts };
  } catch {
    return null;
  }
}

function writeLocal(layout: DashboardLayout) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
  localStorage.setItem(TIMESTAMP_KEY, String(Date.now()));
}

function mkId() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

export function useWidgetLayout() {
  const [layout,    setLayout]    = useState<DashboardLayout>(DEFAULT_LAYOUT);
  const [hydrated,  setHydrated]  = useState(false);
  const [syncing,   setSyncing]   = useState(false);

  // Tracks whether the current layout came from a local or remote change
  // so we don't echo it back to the server unnecessarily.
  const skipNextSave = useRef(false);
  const saveTimer    = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ---- Initial hydration ---- */
  useEffect(() => {
    const local = readLocal();
    const now   = Date.now();

    if (local && now - local.ts < REMOTE_TTL_MS) {
      // Cache is fresh — use it immediately, no network call
      setLayout(local.layout);
      setHydrated(true);
      return;
    }

    // Cache is stale (or absent) — fetch from server
    setSyncing(true);
    apiFetch<{ layout: DashboardLayout | null }>("/api/layout")
      .then(({ layout: remote }) => {
        if (remote && Array.isArray(remote.widgets)) {
          writeLocal(remote);
          skipNextSave.current = true;
          setLayout(remote);
        } else if (local) {
          // Server has nothing saved yet; keep local copy
          setLayout(local.layout);
        }
        // else: keep DEFAULT_LAYOUT
      })
      .catch(() => {
        // Network error — fall back to local or default
        if (local) setLayout(local.layout);
      })
      .finally(() => {
        setSyncing(false);
        setHydrated(true);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- Persist every layout change ---- */
  useEffect(() => {
    if (!hydrated) return;

    // Always write to localStorage immediately
    writeLocal(layout);

    // Skip the remote save if this change originated from the server
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    // Debounce the remote save
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await apiFetch("/api/layout", {
          method: "PUT",
          body: JSON.stringify({ layout }) as unknown as BodyInit,
        });
        // Refresh the timestamp so we don't re-fetch too soon
        localStorage.setItem(TIMESTAMP_KEY, String(Date.now()));
      } catch {
        // Silent — local copy is still intact
      }
    }, SAVE_DEBOUNCE_MS);
  }, [layout, hydrated]);

  /* ---- Mutations ---- */

  const reorder = useCallback((newWidgets: WidgetInstance[]) => {
    setLayout((l) => ({ ...l, widgets: newWidgets }));
  }, []);

  const resize = useCallback((instanceId: string, size: WidgetSize) => {
    setLayout((l) => ({
      ...l,
      widgets: l.widgets.map((w) =>
        w.instanceId === instanceId ? { ...w, size } : w
      ),
    }));
  }, []);

  const remove = useCallback((instanceId: string) => {
    setLayout((l) => ({
      ...l,
      widgets: l.widgets.filter((w) => w.instanceId !== instanceId),
    }));
  }, []);

  const add = useCallback((widgetId: WidgetId) => {
    const meta = WIDGET_REGISTRY[widgetId];
    if (!meta) return;
    const instance: WidgetInstance = {
      instanceId: `${widgetId}-${mkId()}`,
      widgetId,
      size: meta.defaultSize,
    };
    setLayout((l) => ({ ...l, widgets: [...l.widgets, instance] }));
  }, []);

  const reset = useCallback(() => {
    setLayout(DEFAULT_LAYOUT);
  }, []);

  return { layout, hydrated, syncing, reorder, resize, remove, add, reset };
}
