/**
 * Shared secret for Pulse terminal bridges (WezTerm / tmux over SSH).
 * Accepts either header so older clients keep working.
 */
export function getPulseBridgeSecret(): string | undefined {
  const a = process.env.ORACLE_PULSE_BRIDGE_SECRET?.trim();
  const b = process.env.WEZTERM_BRIDGE_SECRET?.trim();
  return a || b || undefined;
}

export function verifyPulseBridgeRequest(req: Request): Response | null {
  const secret = getPulseBridgeSecret();
  if (!secret) return null;
  const h1 = req.headers.get("x-oracle-pulse-secret");
  const h2 = req.headers.get("x-wezterm-secret");
  if (h1 === secret || h2 === secret) return null;
  return Response.json({ error: "Unauthorized", needsSecret: true }, { status: 401 });
}
