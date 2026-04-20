/** Client-only: sessionStorage + fetch headers for WezTerm / tmux APIs */

export const PULSE_BRIDGE_STORAGE_KEY = "oracle-pulse-bridge-secret";
const LEGACY_WEZTERM_KEY = "oracle-wezterm-bridge-secret";

export function migrateLegacyPulseSecret(): void {
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem(PULSE_BRIDGE_STORAGE_KEY)) return;
  const old = sessionStorage.getItem(LEGACY_WEZTERM_KEY);
  if (old) sessionStorage.setItem(PULSE_BRIDGE_STORAGE_KEY, old);
}

export function pulseBridgeHeaders(jsonContentType = true): HeadersInit {
  migrateLegacyPulseSecret();
  const secret =
    typeof window !== "undefined" ? sessionStorage.getItem(PULSE_BRIDGE_STORAGE_KEY) : null;
  const h: Record<string, string> = {};
  if (jsonContentType) h["Content-Type"] = "application/json";
  if (secret) {
    h["x-oracle-pulse-secret"] = secret;
    h["x-wezterm-secret"] = secret;
  }
  return h;
}
