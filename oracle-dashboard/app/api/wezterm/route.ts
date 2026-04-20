import { consumePulseCommandDedup, releasePulseCommandDedup } from "@/lib/pulse-command-dedup";
import { getPulseBridgeSecret, verifyPulseBridgeRequest } from "@/lib/pulse-bridge-secret";
import {
  isWezTermBridgeEnabled,
  resolveWezTermBin,
  wezTermListPanes,
  wezTermSendText,
  wezTermSpawn,
  wezTermStart,
} from "@/lib/wezterm-bridge";

const MAX_TEXT = 48_000;
const MAX_ARG_LEN = 800;
const MAX_ARGS = 32;

export async function GET(req: Request) {
  const gate = verifyPulseBridgeRequest(req);
  if (gate) return gate;

  if (!isWezTermBridgeEnabled()) {
    return Response.json({
      enabled: false,
      hint: "Set WEZTERM_BRIDGE_ENABLED=1 in .env.local and restart next dev.",
    });
  }

  const url = new URL(req.url);
  if (url.searchParams.get("probe") === "1") {
    return Response.json({
      enabled: true,
      bin: resolveWezTermBin(),
      secretRequired: Boolean(getPulseBridgeSecret()),
    });
  }

  try {
    const panes = await wezTermListPanes();
    return Response.json({ enabled: true, panes });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "WezTerm CLI failed";
    const guiNotRunning = /failed to connect to Socket/i.test(msg);
    return Response.json({ enabled: true, error: msg, panes: [], guiNotRunning }, { status: 502 });
  }
}

type Body =
  | { action: "list" }
  | { action: "send-text"; paneId: number; text: string; noPaste?: boolean }
  | { action: "start"; argv: string[]; cwd?: string }
  | {
      action: "spawn";
      argv: string[];
      cwd?: string;
      newWindow?: boolean;
      domainName?: string;
      workspace?: string;
      windowId?: number;
    };

export async function POST(req: Request) {
  const gate = verifyPulseBridgeRequest(req);
  if (gate) return gate;

  if (!isWezTermBridgeEnabled()) {
    return Response.json({ error: "WezTerm bridge is disabled." }, { status: 403 });
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
      const panes = await wezTermListPanes();
      return Response.json({ panes });
    }

    if (action === "send-text") {
      const paneId = Number((body as { paneId?: unknown }).paneId);
      const text = String((body as { text?: unknown }).text ?? "");
      const noPaste = Boolean((body as { noPaste?: unknown }).noPaste);
      if (!Number.isFinite(paneId) || paneId < 0) {
        return Response.json({ error: "Invalid paneId." }, { status: 400 });
      }
      if (!text.length) {
        return Response.json({ error: "text is required." }, { status: 400 });
      }
      if (text.length > MAX_TEXT) {
        return Response.json({ error: "text too long." }, { status: 400 });
      }
      const dedupParts = [String(paneId), text, noPaste ? "1" : "0"] as const;
      if (!consumePulseCommandDedup("wezterm-send-text", [...dedupParts])) {
        return Response.json({ ok: true, duplicate: true });
      }
      try {
        await wezTermSendText(paneId, text, noPaste);
        return Response.json({ ok: true });
      } catch (e) {
        releasePulseCommandDedup("wezterm-send-text", [...dedupParts]);
        throw e;
      }
    }

    if (action === "start") {
      const argv = (body as { argv?: unknown }).argv;
      if (!Array.isArray(argv) || !argv.every((x) => typeof x === "string")) {
        return Response.json({ error: "argv must be an array of strings." }, { status: 400 });
      }
      if (argv.length > MAX_ARGS) return Response.json({ error: "Too many argv entries." }, { status: 400 });
      for (const a of argv) {
        if (a.length > MAX_ARG_LEN) return Response.json({ error: "An argv entry is too long." }, { status: 400 });
      }
      const cwd = typeof (body as Record<string, unknown>).cwd === "string" ? String((body as Record<string, unknown>).cwd) : undefined;
      await wezTermStart(argv, { cwd });
      return Response.json({ ok: true });
    }

    if (action === "spawn") {
      const argv = (body as { argv?: unknown }).argv;
      if (!Array.isArray(argv) || !argv.every((x) => typeof x === "string")) {
        return Response.json({ error: "argv must be an array of strings." }, { status: 400 });
      }
      if (argv.length > MAX_ARGS) {
        return Response.json({ error: "Too many argv entries." }, { status: 400 });
      }
      for (const a of argv) {
        if (a.length > MAX_ARG_LEN) {
          return Response.json({ error: "An argv entry is too long." }, { status: 400 });
        }
      }
      const raw = body as Record<string, unknown>;
      const cwd = typeof raw.cwd === "string" ? raw.cwd : undefined;
      const newWindow = Boolean((body as { newWindow?: unknown }).newWindow);
      const domainName = typeof raw.domainName === "string" ? raw.domainName : undefined;
      const workspace = typeof raw.workspace === "string" ? raw.workspace : undefined;
      const windowIdRaw = raw.windowId;
      const windowId =
        typeof windowIdRaw === "number" && Number.isFinite(windowIdRaw)
          ? windowIdRaw
          : typeof windowIdRaw === "string" && windowIdRaw.trim()
            ? Number(windowIdRaw)
            : undefined;
      if (workspace && !newWindow) {
        return Response.json({ error: "workspace requires newWindow=true" }, { status: 400 });
      }
      if (typeof windowId === "number" && (!Number.isFinite(windowId) || windowId < 0)) {
        return Response.json({ error: "Invalid windowId." }, { status: 400 });
      }
      const paneIdOut = await wezTermSpawn(argv, {
        cwd,
        newWindow,
        domainName,
        workspace,
        windowId: typeof windowId === "number" && Number.isFinite(windowId) ? windowId : undefined,
      });
      return Response.json({ ok: true, paneIdOut });
    }

    return Response.json({ error: "Unknown action." }, { status: 400 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "WezTerm CLI failed";
    return Response.json({ error: msg }, { status: 502 });
  }
}
