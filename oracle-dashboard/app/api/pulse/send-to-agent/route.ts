import { getPulseBridgeSecret, verifyPulseBridgeRequest } from "@/lib/pulse-bridge-secret";
import { consumePulseCommandDedup, releasePulseCommandDedup } from "@/lib/pulse-command-dedup";
import { getOraclePulseConfig } from "@/lib/oracle-pulse-config";
import { sendTextToAgentPane } from "@/lib/pulse-send-agent";

const MAX = 48_000;

export async function POST(req: Request) {
  if (getPulseBridgeSecret()) {
    const gate = verifyPulseBridgeRequest(req);
    if (gate) return gate;
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const raw = body as Record<string, unknown>;
  const agentName = typeof raw.agentName === "string" ? raw.agentName.trim() : "";
  if (!agentName) {
    return Response.json({ error: "agentName is required." }, { status: 400 });
  }

  const cfg = getOraclePulseConfig();
  const textRaw =
    typeof raw.text === "string" && raw.text.length > 0
      ? raw.text
      : raw.useDefaultPing === true || raw.ping === true
        ? cfg.defaultPing
        : "";
  const text = textRaw ?? "";
  if (!text.trim()) {
    return Response.json({ error: "Provide text or useDefaultPing: true" }, { status: 400 });
  }
  if (text.length > MAX) {
    return Response.json({ error: "text too long." }, { status: 400 });
  }

  const prefer =
    raw.transport === "tmux" || raw.transport === "wezterm" ? (raw.transport as "tmux" | "wezterm") : undefined;

  const dedupParts = [agentName.toLowerCase(), text, prefer ?? ""] as const;
  if (!consumePulseCommandDedup("send-to-agent", [...dedupParts])) {
    return Response.json({ ok: true, duplicate: true });
  }

  try {
    const result = await sendTextToAgentPane(agentName, text, prefer);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    releasePulseCommandDedup("send-to-agent", [...dedupParts]);
    const msg = e instanceof Error ? e.message : "send failed";
    return Response.json({ error: msg }, { status: 502 });
  }
}
