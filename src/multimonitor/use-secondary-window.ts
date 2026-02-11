import { useEffect, useState } from "react";
import { startListening, stopListening } from "./sync";

/** Whether this window is a secondary (display-only) monitor window. */
export function isSecondaryWindow(): boolean {
  return new URLSearchParams(window.location.search).has("monitor");
}

/**
 * Hook for secondary window setup.
 * Returns `true` if this is a secondary window.
 * When it is, sets up the state listener and ensures edit mode controls are disabled.
 */
export function useSecondaryWindow(): boolean {
  const [secondary] = useState(isSecondaryWindow);

  useEffect(() => {
    if (!secondary) return;
    startListening().catch(console.error);
    return () => stopListening();
  }, [secondary]);

  return secondary;
}
