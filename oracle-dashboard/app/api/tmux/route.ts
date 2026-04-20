import { consumePulseCommandDedup, releasePulseCommandDedup } from "@/lib/pulse-command-dedup";
import { verifyPulseBridgeRequest } from "@/lib/pulse-bridge-secret";
import {
  getTmuxBinForStatus,
  isTmuxBridgeEnabled,
  resolveSshTarget,
  tmuxListPanes,
  tmuxSendLiteral,
} from "@/lib/tmux-bridge";

const MAX_TEXT = 48_000;

export async function GET(req: Request) {
  const gate = verifyPulseBridgeRequest(req);
  if (gate) return gate;

  if (!isTmuxBridgeEnabled()) {
    return Response.json({
      enabled: false,
      hint: "Set TMUX_BRIDGE_ENABLED=1 in .env.local. Use ORACLE_SSH_TARGET=user@host to run tmux over SSH.",
    });
  }

  const url = new URL(req.url);
  if (url.searchParams.get("probe") === "1") {
    return Response.json({
      enabled: true,
      tmuxBin: getTmuxBinForStatus(),
      sshTarget: resolveSshTarget() ?? null,
    });
  }

  try {
    const panes = await tmuxListPanes();
    return Response.json({ enabled: true, panes, sshTarget: resolveSshTarget() ?? null });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "tmux failed";
    return Response.json(
      { enabled: true, error: msg, panes: [], sshTarget: resolveSshTarget() ?? null },
      { status: 502 },
    );
  }
}

export async function POST(req: Request) {
  const gate = verifyPulseBridgeRequest(req);
  if (gate) return gate;

  if (!isTmuxBridgeEnabled()) {
    return Response.json({ error: "tmux bridge is disabled." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (typeof body !== "object" || !body || !("action" in body)) {
    return Response.json({ error: "Missing action." }, { status: 400 });
  }

  const action = (body as { action: string }).action;

  try {
    if (action === "list") {
      const panes = await tmuxListPanes();
      return Response.json({ panes });
    }

    if (action === "send-text") {
      const paneId = Number((body as { paneId?: unknown }).paneId);
      const text = String((body as { text?: unknown }).text ?? "");
      if (!Number.isFinite(paneId) || paneId < 0) {
        return Response.json({ error: "Invalid paneId." }, { status: 400 });
      }
      if (!text.length) {
        return Response.json({ error: "text is required." }, { status: 400 });
      }
      if (text.length > MAX_TEXT) {
        return Response.json({ error: "text too long." }, { status: 400 });
      }
      const dedupParts = [String(paneId), text] as const;
      if (!consumePulseCommandDedup("tmux-send-text", [...dedupParts])) {
        return Response.json({ ok: true, duplicate: true });
      }
      try {
        await tmuxSendLiteral(paneId, text);
        return Response.json({ ok: true });
      } catch (e) {
        releasePulseCommandDedup("tmux-send-text", [...dedupParts]);
        throw e;
      }
    }

    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "tmux failed";
    return Response.json({ error: msg }, { status: 502 });
  }
}
