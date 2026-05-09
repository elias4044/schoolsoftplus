export const TRANSITION_KEY = "ssp_cinematic_transition";

/** Call on the login page right before navigating to dashboard. */
export function markTransitionPending(): void {
  if (typeof window !== "undefined") sessionStorage.setItem(TRANSITION_KEY, "1");
}

/**
 * Peek without consuming — used as a lazy useState initializer to prevent
 * the flash caused by starting hidden then switching to covering in useEffect.
 */
export function peekTransitionPending(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(sessionStorage.getItem(TRANSITION_KEY));
}

/**
 * Call once on the dashboard side.
 * Reads + removes the flag atomically — returns true if a cinematic
 * transition should play.
 */
export function consumeTransitionPending(): boolean {
  if (typeof window === "undefined") return false;
  const has = Boolean(sessionStorage.getItem(TRANSITION_KEY));
  if (has) sessionStorage.removeItem(TRANSITION_KEY);
  return has;
}
