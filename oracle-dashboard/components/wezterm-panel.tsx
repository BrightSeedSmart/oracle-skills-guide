"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AGENTS, CATEGORY_LABELS, type AgentCategory } from "@/lib/agents";
import { AgentCard } from "@/components/agent-card";
import { PULSE_BRIDGE_STORAGE_KEY, pulseBridgeHeaders } from "@/lib/pulse-bridge-client";

type Pane = {
  pane_id: number;
  window_id: number;
  tab_id: number;
  title: string;
  cwd: string;
  size: { rows: number; cols: number };
  workspace: string;
};

type StatusPayload =
  | { enabled: false; hint?: string }
  | { enabled: true; secretRequired?: boolean; bin?: string }
  | { enabled: true; panes: Pane[]; error?: string };

export function WezTermPanel() {
  const [bridgeHint, setBridgeHint] = useState<string | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [secretRequired, setSecretRequired] = useState(false);
  const [secretInput, setSecretInput] = useState("");
  const [panes, setPanes] = useState<Pane[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [guiNotRunning, setGuiNotRunning] = useState(false);
  const [paneId, setPaneId] = useState<string>("");
  const [sendText, setSendText] = useState("");
  const [noPaste, setNoPaste] = useState(false);
  const [spawnLine, setSpawnLine] = useState("pwsh -NoLogo -Command Get-Date");
  const [spawnNewWindow, setSpawnNewWindow] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [agentTargets, setAgentTargets] = useState<Record<string, { wezTermPaneId?: number }>>({});
  const [agentActions, setAgentActions] = useState<Record<string, any[]>>({});
  const [activeAgent, setActiveAgent] = useState<string>("oracle");
  const sendRef = useRef<HTMLTextAreaElement | null>(null);
  const [bindings, setBindings] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<AgentCategory | "all">("all");
  const [runMode, setRunMode] = useState<"local" | "wsl" | "vps">("local");
  const [sshTarget, setSshTarget] = useState<string>("");
  const runModeBoot = useRef(false);
  const literalSendLockRef = useRef(false);

  const BINDINGS_KEY = "oracle-pulse-wezterm-bindings-v1";
  const RUNMODE_KEY = "oracle-pulse-wezterm-runmode-v1";

  const append = useCallback((line: string) => {
    setLog((prev) => [...prev.slice(-120), line]);
  }, []);

  const refresh = useCallback(async (): Promise<Pane[] | null> => {
    setBusy(true);
    setListError(null);
    try {
      const res = await fetch("/api/wezterm", { headers: pulseBridgeHeaders(false) });
      const data = (await res.json()) as StatusPayload & { needsSecret?: boolean; error?: string };

      if (res.status === 401 || data.needsSecret) {
        setSecretRequired(true);
        setEnabled(true);
        setBridgeHint("ต้องการ bridge secret — ใส่ค่าเดียวกับ ORACLE_PULSE_BRIDGE_SECRET หรือ WEZTERM_BRIDGE_SECRET");
        setPanes([]);
        return null;
      }

      if (!data.enabled) {
        setEnabled(false);
        setBridgeHint("hint" in data ? String(data.hint) : "ปิดใช้ bridge");
        setPanes([]);
        return null;
      }

      if ("panes" in data) {
        setEnabled(true);
        setSecretRequired(false);
        if (data.error) {
          setListError(data.error);
          setGuiNotRunning(Boolean((data as Record<string, unknown>).guiNotRunning));
        } else {
          setGuiNotRunning(false);
        }
        setPanes(data.panes);
        setPaneId((prev) => (prev ? prev : data.panes.length ? String(data.panes[0].pane_id) : ""));
        return data.panes;
      }

      setEnabled(true);
      setSecretRequired(Boolean(data.secretRequired));
      setPanes([]);
      return null;
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Network error");
      return null;
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem(PULSE_BRIDGE_STORAGE_KEY);
    if (saved) setSecretInput(saved);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(BINDINGS_KEY);
      if (!raw) return;
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        const n = Number(v);
        if (Number.isFinite(n) && n >= 0) out[k.toLowerCase()] = n;
      }
      setBindings(out);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(RUNMODE_KEY);
    const ok = raw === "local" || raw === "wsl" || raw === "vps";
    runModeBoot.current = ok;
    if (ok) setRunMode(raw);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(RUNMODE_KEY, runMode);
    } catch {
      /* ignore */
    }
  }, [runMode]);

  function saveBindings(next: Record<string, number>) {
    setBindings(next);
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(BINDINGS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/pulse/config", { cache: "no-store" });
        const j = (await res.json()) as {
          agentTargets?: Record<string, { wezTermPaneId?: number }>;
          agentActions?: Record<string, unknown>;
          remoteState?: { sshTarget?: string };
        };
        if (cancelled) return;
        if (j.agentTargets && typeof j.agentTargets === "object") setAgentTargets(j.agentTargets);
        if (j.agentActions && typeof j.agentActions === "object") setAgentActions(j.agentActions as Record<string, any[]>);
        if (j.remoteState?.sshTarget && typeof j.remoteState.sshTarget === "string") {
          setSshTarget(j.remoteState.sshTarget);
          if (!runModeBoot.current) {
            // First load: if sshTarget exists and user hasn't set runMode yet, default to VPS
            setRunMode("vps");
          }
        }
      } catch {
        /* ignore */
      }
    };
    void load();
    const id = setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const activeTargetPane = useMemo(() => {
    const key = activeAgent?.toLowerCase();
    const bound = key ? bindings[key] : undefined;
    if (key && typeof bound === "number") return String(bound);
    const t = key ? agentTargets[key] : undefined;
    if (t && typeof t.wezTermPaneId === "number") return String(t.wezTermPaneId);
    return "";
  }, [activeAgent, agentTargets, bindings]);

  useEffect(() => {
    if (!activeTargetPane) return;
    setPaneId(activeTargetPane);
  }, [activeTargetPane]);

  const quickActions = useMemo(() => {
    const key = activeAgent.toLowerCase();
    const global = Array.isArray(agentActions["_global"]) ? (agentActions["_global"] as any[]) : [];
    const arr = Array.isArray(agentActions[key]) ? agentActions[key] : [];
    const merged = [...global, ...arr].filter((a) => a && typeof a === "object");
    return merged.slice(0, 12) as any[];
  }, [activeAgent, agentActions]);

  const filteredAgents = useMemo(() => {
    if (filter === "all") return AGENTS;
    return AGENTS.filter((a) => a.category === filter);
  }, [filter]);

  const agentOnlyActionsFor = useCallback(
    (agentName: string) => {
      const key = agentName.toLowerCase();
      return Array.isArray(agentActions[key]) ? (agentActions[key] as any[]) : [];
    },
    [agentActions],
  );

  const resolvePaneFor = useCallback(
    (agentName: string) => {
      const key = agentName.toLowerCase();
      const bound = bindings[key];
      if (typeof bound === "number") return String(bound);
      const t = agentTargets[key];
      if (t && typeof t.wezTermPaneId === "number") return String(t.wezTermPaneId);
      return paneId; // fallback to current paneId (manual)
    },
    [agentTargets, bindings, paneId],
  );

  const oneClickMenu = useMemo(() => {
    const key = activeAgent.toLowerCase();
    const globalMenu = Array.isArray(agentActions["_global"]) ? (agentActions["_global"] as any[]) : [];
    const agentMenu = Array.isArray(agentActions[key]) ? (agentActions[key] as any[]) : [];
    const common: any[] = [
      {
        id: "refresh",
        emoji: "🔄",
        title: "Refresh panes",
        detail: "ดึงรายการ pane ล่าสุด",
        kind: "internal-refresh",
      },
      {
        id: "open-dashboard",
        emoji: "🧭",
        title: "Open oracle-dashboard",
        detail: "spawn หน้าต่างใหม่ → cd + npm run dev",
        kind: "wezterm-spawn",
        newWindow: true,
        variants: {
          localWin: "pwsh -NoLogo -NoExit -Command \"cd F:\\Ai\\my-Oracle\\oracle-dashboard; npm run dev\"",
          localUnix: "bash -lc \"cd ~/my-Oracle/oracle-dashboard && npm run dev\"",
          wsl: "cd ~/my-Oracle/oracle-dashboard && npm run dev",
        },
      },
      {
        id: "open-repo",
        emoji: "📁",
        title: "Open my-Oracle repo",
        detail: "spawn หน้าต่างใหม่ → cd โปรเจกต์",
        kind: "wezterm-spawn",
        newWindow: true,
        variants: {
          localWin: "pwsh -NoLogo -NoExit -Command \"cd F:\\Ai\\my-Oracle; ls\"",
          localUnix: "bash -lc \"cd ~/my-Oracle && ls\"",
          wsl: "cd ~/my-Oracle && ls",
        },
      },
    ];
    // Keep global actions visible even if an agent has many per-agent actions.
    return [...common, ...globalMenu, ...agentMenu].slice(0, 18);
  }, [activeAgent, agentActions]);

  function actionEmoji(a: any): string {
    const e = typeof a.emoji === "string" && a.emoji.trim() ? a.emoji.trim() : "";
    if (e) return e;
    const kind = String(a.kind ?? "");
    if (kind === "internal-refresh") return "🔄";
    if (kind === "wezterm-spawn") return "🪟";
    if (kind === "pane") return "➡️";
    if (kind === "copy") return "📋";
    if (kind === "link") return "🔗";
    return "⚡";
  }

  function isWindows(): boolean {
    if (typeof navigator === "undefined") return false;
    const p = (navigator.platform || "").toLowerCase();
    const ua = (navigator.userAgent || "").toLowerCase();
    return p.includes("win") || ua.includes("windows");
  }

  function resolveActionText(a: any): string {
    const v = a?.variants && typeof a.variants === "object" ? (a.variants as any) : null;
    if (!v) return typeof a.text === "string" ? a.text : "";

    const win = isWindows();
    if (runMode === "local") {
      return typeof (win ? v.localWin : v.localUnix) === "string" ? String(win ? v.localWin : v.localUnix) : String(a.text ?? "");
    }
    if (runMode === "wsl") {
      const inner = typeof v.wsl === "string" ? v.wsl : typeof v.localUnix === "string" ? v.localUnix : String(a.text ?? "");
      // On Windows, wrap WSL execution; on other OS, just run as unix
      if (win) {
        const escaped = inner.replace(/"/g, '\\"');
        return `wsl.exe -- bash -lc "${escaped}"`;
      }
      return inner;
    }
    if (runMode === "vps") {
      const cmd = typeof v.vps === "string" ? v.vps : String(a.text ?? "");
      const target = sshTarget.trim();
      if (!cmd.trim()) return "";
      if (/^\s*ssh\b/i.test(cmd)) return cmd;
      if (!target) return `ssh user@your-vps-host "${cmd.replace(/"/g, '\\"')}"`;
      return `ssh ${target} "${cmd.replace(/"/g, '\\"')}"`;
    }
    return typeof a.text === "string" ? a.text : "";
  }

  async function runOneClickAction(a: any, paneOverride?: string, context?: { agent?: string; source?: string }) {
    const kind = String(a.kind ?? "copy");
    const text = resolveActionText(a);
    const paneToUse = paneOverride ?? paneId;
    const who = context?.agent ? `${context.agent}` : activeAgent;
    const src = context?.source ? ` (${context.source})` : "";

    if (kind === "internal-refresh") {
      await refresh();
      append("menu: refreshed panes");
      return;
    }

    if (kind === "pane") {
      if (!paneToUse) {
        append("error: ยังไม่ได้เลือก pane (ตั้ง agentTargets.<name>.wezTermPaneId หรือเลือก pane เอง)");
        return;
      }
      if (!text.trim()) return;
      if (literalSendLockRef.current) {
        append("blocked: กำลังส่ง literal อยู่");
        return;
      }
      literalSendLockRef.current = true;
      setBusy(true);
      try {
        const out = await postJson({ action: "send-text", paneId: Number(paneToUse), text, noPaste });
        if (out.duplicate) {
          append("กันซ้ำ: ไม่ส่งข้อความซ้ำในเวลาสั้น ๆ");
          return;
        }
        append(`1-click pane #${paneToUse}: ${who}${src} · ${String(a.title ?? "action")}`);
        setSendText("");
      } catch (e) {
        append(`error: ${e instanceof Error ? e.message : "send failed"}`);
      } finally {
        literalSendLockRef.current = false;
        setBusy(false);
      }
      return;
    }

    if (kind === "wezterm-start") {
      if (!text.trim()) return;
      setBusy(true);
      try {
        const argv = tokenizeSpawn(text);
        append(`start: ${text}`);
        await postJson({ action: "start", argv });
        append(`✓ WezTerm เปิดแล้ว — ${who}${src} · ${String(a.title ?? "start")}`);
      } catch (e) {
        append(`error: ${e instanceof Error ? e.message : "start failed"}`);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (kind === "wezterm-spawn") {
      if (!text.trim()) return;
      setBusy(true);
      try {
        const newWindow = Boolean(a.newWindow);
        const argv = tokenizeSpawn(text);
        const domainName = typeof a.domainName === "string" && a.domainName.trim() ? a.domainName.trim() : undefined;
        const workspace = typeof a.workspace === "string" && a.workspace.trim() ? a.workspace.trim() : undefined;
        const windowId =
          typeof a.windowId === "number" && Number.isFinite(a.windowId)
            ? a.windowId
            : typeof a.windowId === "string" && a.windowId.trim()
              ? Number(a.windowId)
              : undefined;

        append(
          `spawn cmd: ${text}${newWindow ? " · --new-window" : ""}${domainName ? ` · --domain-name ${domainName}` : ""}${
            workspace ? ` · --workspace ${workspace}` : ""
          }${typeof windowId === "number" && Number.isFinite(windowId) ? ` · --window-id ${windowId}` : ""}`,
        );
        append(`spawn argv: ${JSON.stringify(argv)}`);

        const data = await postJson({
          action: "spawn",
          argv,
          newWindow,
          domainName,
          workspace,
          windowId: typeof windowId === "number" && Number.isFinite(windowId) ? windowId : undefined,
        });
        append(`1-click spawn: ${who}${src} · ${String(a.title ?? "spawn")} → ${data.paneIdOut ?? "(no id)"}`);
        const latest = await refresh();
        if (data.paneIdOut) {
          setPaneId(String(data.paneIdOut));
          const idNum = Number(data.paneIdOut);
          const row = latest?.find((p) => p.pane_id === idNum);
          if (row) {
            append(
              `spawn meta: pane=${row.pane_id} window=${row.window_id} tab=${row.tab_id} ws=${row.workspace} title=${row.title}`,
            );
          } else {
            append(`spawn meta: (ยังหา pane ${data.paneIdOut} ใน list ล่าสุดไม่เจอ — ลองกด Refresh panes)`);
          }
        }
      } catch (e) {
        append(`error: ${e instanceof Error ? e.message : "spawn failed"}`);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (kind === "link" && typeof a.url === "string") {
      window.open(a.url, "_blank", "noopener,noreferrer");
      return;
    }

    if (text) {
      try {
        await navigator.clipboard.writeText(text);
        append(`copied: ${who}${src} · ${String(a.title ?? "action")}`);
      } catch (e) {
        append(`copy failed: ${e instanceof Error ? e.message : "clipboard error"}`);
      }
    }
  }

  function saveSecret() {
    const t = secretInput.trim();
    if (t) sessionStorage.setItem(PULSE_BRIDGE_STORAGE_KEY, t);
    else sessionStorage.removeItem(PULSE_BRIDGE_STORAGE_KEY);
    void refresh();
  }

  async function postJson(body: object) {
    const res = await fetch("/api/wezterm", {
      method: "POST",
      headers: pulseBridgeHeaders(),
      body: JSON.stringify(body),
    });
    const data: { error?: string; ok?: boolean; paneIdOut?: string; duplicate?: boolean } = await res.json();
    if (!res.ok) throw new Error(data.error ?? res.statusText);
    return data;
  }

  async function handleSend() {
    const id = Number(paneId);
    if (!Number.isFinite(id)) {
      append("error: เลือก pane");
      return;
    }
    const text = sendText;
    if (!text.trim()) return;
    if (literalSendLockRef.current) {
      append("blocked: กำลังส่ง literal อยู่");
      return;
    }
    literalSendLockRef.current = true;
    setBusy(true);
    try {
      const out = await postJson({ action: "send-text", paneId: id, text, noPaste });
      if (out.duplicate) {
        append("กันซ้ำ: ไม่ส่งข้อความซ้ำในเวลาสั้น ๆ");
        return;
      }
      append(`> sent ${text.length} chars → pane ${id}`);
      setSendText("");
    } catch (e) {
      append(`error: ${e instanceof Error ? e.message : "send failed"}`);
    } finally {
      literalSendLockRef.current = false;
      setBusy(false);
    }
  }

  async function handleSpawn() {
    const line = spawnLine.trim();
    if (!line) return;
    setBusy(true);
    try {
      const data = await postJson({
        action: "spawn",
        argv: tokenizeSpawn(line),
        newWindow: spawnNewWindow,
      });
      append(`spawn ok → ${data.paneIdOut ?? "(no id)"}`);
    } catch (e) {
      append(`error: ${e instanceof Error ? e.message : "spawn failed"}`);
    } finally {
      setBusy(false);
    }
  }

  if (enabled === null) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500">
        กำลังเชื่อมต่อ WezTerm bridge…
      </div>
    );
  }

  if (enabled === false) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 p-6 text-sm text-zinc-300">
        <h2 className="text-base font-semibold text-violet-200">WezTerm bridge ปิดอยู่</h2>
        <p className="text-zinc-400">
          เปิดใช้บนเครื่องที่รัน Next นี้: ตั้ง <code className="text-zinc-200">WEZTERM_BRIDGE_ENABLED=1</code> ใน{" "}
          <code className="text-zinc-200">.env.local</code> แล้วรีสตาร์ท <code className="text-zinc-200">npm run dev</code>
        </p>
        {bridgeHint ? <p className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs">{bridgeHint}</p> : null}
        <p className="text-xs text-zinc-500">
          ต้องติดตั้ง WezTerm และให้คำสั่ง <code className="text-zinc-400">wezterm cli</code> ใช้งานได้จาก PATH (หรือตั้ง{" "}
          <code className="text-zinc-400">WEZTERM_BIN</code>)
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
      <div>
        <h2 className="text-base font-semibold text-violet-200">WezTerm bridge</h2>
        <p className="mt-1 text-xs text-zinc-500">
          เรียก <code className="text-zinc-400">wezterm cli</code> ผ่าน API บนเครื่องนี้ — ส่งข้อความเข้า pane หรือ spawn โปรเซสใหม่ (ขั้นสูง)
        </p>
      </div>

      {guiNotRunning ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-sm">
          <span className="text-amber-200">⚠️ WezTerm GUI ไม่ได้เปิดอยู่</span>
          <span className="text-zinc-400 text-xs">ปุ่ม SSH ด้านล่างจะเปิดหน้าต่าง WezTerm ใหม่ได้เลย (ไม่ต้องเปิด WezTerm ก่อน)</span>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await postJson({ action: "start", argv: ["ssh", "root@72.60.77.195"] });
                append("✓ เปิด WezTerm + SSH VPS");
                setTimeout(() => void refresh(), 2000);
              } catch (e) {
                append(`error: ${e instanceof Error ? e.message : "failed"}`);
              } finally {
                setBusy(false);
              }
            }}
            className="rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600 disabled:opacity-50"
          >
            เปิด SSH → VPS ทันที
          </button>
        </div>
      ) : null}

      {secretRequired ? (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-900/50 bg-amber-950/20 p-4 text-sm">
          <label className="text-amber-200/90">Bridge secret</label>
          <input
            type="password"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            placeholder="ORACLE_PULSE_BRIDGE_SECRET"
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
          />
          <button
            type="button"
            onClick={() => saveSecret()}
            className="self-start rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600"
          >
            บันทึกและเชื่อมต่อ
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void refresh()}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
        >
          รีเฟรช pane
        </button>
        {busy ? <span className="text-xs text-zinc-500">กำลังทำงาน…</span> : null}
      </div>

      {listError ? (
        <p className="rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2 text-xs text-red-200">{listError}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_16rem]">
        <div className="flex flex-col gap-6">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">1-click</div>
              <div className="mt-1 text-sm font-semibold text-zinc-100">ปุ่มลัด (กดครั้งเดียวทำงานเลย)</div>
            </div>
            <div className="text-[11px] text-zinc-500">
              agent: <span className="capitalize text-zinc-200">{activeAgent}</span>
              {paneId ? (
                <>
                  {" "}
                  · pane <span className="font-mono text-zinc-200">#{paneId}</span>
                </>
              ) : null}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {oneClickMenu.map((a) => (
              <button
                key={String(a.id ?? a.title)}
                type="button"
                disabled={busy || (String(a.kind) === "pane" && !paneId)}
                onClick={() => void runOneClickAction(a, undefined, { agent: activeAgent, source: "menu" })}
                className="group relative flex aspect-square flex-col items-center justify-center overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3 text-center transition hover:border-violet-600/40 hover:bg-zinc-900/70 disabled:opacity-40"
                title={String(a.detail ?? "")}
              >
                <span className="text-3xl transition group-hover:scale-105" aria-hidden>
                  {actionEmoji(a)}
                </span>
                <div className="mt-2 w-full truncate text-[12px] font-semibold text-zinc-100">
                  {String(a.title ?? "Action")}
                </div>
                {a.detail ? <div className="mt-1 line-clamp-2 text-[10px] leading-tight text-zinc-500">{String(a.detail)}</div> : null}
                <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                  <div className="absolute -right-16 -top-16 size-40 rounded-full bg-violet-500/10 blur-2xl" />
                </div>
                <div className="pointer-events-none absolute inset-0 opacity-0 transition group-hover:opacity-100">
                  <div className="absolute -right-16 -top-16 size-40 rounded-full bg-violet-500/10 blur-2xl" />
                </div>
              </button>
            ))}
          </div>

          <div className="mt-3 text-[11px] text-zinc-500">
            ถ้าต้องการ action แบบ <span className="text-zinc-200">pane</span>: กด{" "}
            <span className="text-zinc-200">Bind agent → pane</span> ก่อน (ครั้งเดียว) แล้วปุ่มจะส่งเข้า pane ได้ทันที
          </div>
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950/30 p-4 md:p-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">WezTerm 1-click agents</div>
              <div className="mt-1 text-sm font-semibold text-zinc-100">กด agent 1 ครั้ง → รัน action “เฉพาะ agent” ทันที (ไม่รวม `_global`)</div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {filteredAgents.map((a) => (
              <AgentCard
                key={a.id}
                agent={a}
                selected={activeAgent.toLowerCase() === a.name.toLowerCase()}
                onSelect={async () => {
                  setActiveAgent(a.name);
                  const actions = agentOnlyActionsFor(a.name);
                  const pane = resolvePaneFor(a.name);
                  const pick =
                    actions.find((x) => x && typeof x === "object" && x.kind === "wezterm-spawn") ??
                    actions.find((x) => x && typeof x === "object" && x.kind === "pane") ??
                    actions[0];
                  if (!pick) {
                    append(`agent ${a.name}: ไม่มี action`);
                    return;
                  }
                  await runOneClickAction(pick, pane, { agent: a.name, source: "agent-card" });
                }}
              />
            ))}
          </div>
          </section>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-4 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Sessions</div>
            <div className="mt-3 space-y-1.5">
              {AGENTS.map((a) => {
                const key = a.name.toLowerCase();
                const selected = activeAgent.toLowerCase() === key;
                const dot = a.status === "active" ? "bg-emerald-400" : "bg-zinc-600";
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setActiveAgent(a.name)}
                    className={`flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-xs transition hover:bg-zinc-900 ${
                      selected ? "bg-zinc-900 ring-1 ring-violet-500/40" : ""
                    }`}
                  >
                    <span className={`mt-1 size-2 shrink-0 rounded-full ${dot}`} aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium capitalize text-zinc-200">{a.name}</span>
                      <span className="block truncate text-[11px] text-zinc-500">{a.sessionNote}</span>
                      <span className="block font-mono text-[10px] text-zinc-600">{a.displayId}-pulse</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>

      <section className="rounded-xl border border-zinc-800 bg-black/30 p-3">
        <h3 className="mb-2 text-[11px] font-semibold text-zinc-500">ล็อก</h3>
        <pre className="max-h-48 overflow-y-auto font-mono text-[11px] leading-relaxed text-zinc-400">
          {log.length ? log.join("\n") : "—"}
        </pre>
      </section>

      <details className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4 text-[11px] text-zinc-300">
        <summary className="cursor-pointer select-none text-zinc-400 hover:text-zinc-200">Settings (WezTerm)</summary>
        <div className="mt-3 flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-zinc-500">Run mode</span>
            {(["local", "wsl", "vps"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setRunMode(m)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  runMode === m
                    ? "border-amber-500/60 bg-amber-500/15 text-amber-200"
                    : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                {m.toUpperCase()}
              </button>
            ))}
            {runMode === "vps" ? (
              <>
                <span className="text-zinc-700">|</span>
                <span className="text-zinc-500">sshTarget</span>
                <input
                  className="min-w-48 flex-1 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono text-[11px] text-zinc-200"
                  placeholder="user@host หรือ alias ใน ~/.ssh/config"
                  value={sshTarget}
                  onChange={(e) => setSshTarget(e.target.value)}
                />
              </>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-zinc-500">Filter</span>
            {(Object.keys(CATEGORY_LABELS) as (AgentCategory | "all")[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  filter === key
                    ? "border-violet-500/60 bg-violet-500/15 text-violet-200"
                    : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                }`}
              >
                {CATEGORY_LABELS[key]}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-zinc-500">Active agent</span>
            <select
              className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-[11px] text-zinc-200"
              value={activeAgent}
              onChange={(e) => setActiveAgent(e.target.value)}
            >
              {AGENTS.map((a) => (
                <option key={a.id} value={a.name}>
                  {a.name}
                </option>
              ))}
            </select>
            <span className="text-zinc-700">|</span>
            <span className="text-zinc-500">paneId</span>
            <input
              className="w-24 rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 font-mono text-[11px] text-zinc-200"
              placeholder="#pane"
              value={paneId}
              onChange={(e) => setPaneId(e.target.value)}
              title="ใช้เมื่อ action เป็น kind=pane และยังไม่ได้ bind"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!paneId}
              onClick={() => {
                const key = activeAgent.toLowerCase();
                const id = Number(paneId);
                if (!Number.isFinite(id) || id < 0) return;
                saveBindings({ ...bindings, [key]: id });
                append(`bind: ${key} -> pane ${id}`);
              }}
              className="rounded-lg border border-emerald-900/40 bg-emerald-950/20 px-3 py-2 text-xs text-emerald-200 hover:bg-emerald-950/35 disabled:opacity-40"
            >
              Bind {activeAgent} → pane
            </button>
            <button
              type="button"
              onClick={() => {
                const key = activeAgent.toLowerCase();
                if (!(key in bindings)) return;
                const { [key]: _, ...rest } = bindings;
                saveBindings(rest);
                append(`unbind: ${key}`);
              }}
              className="rounded-lg border border-zinc-800 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-900/50"
            >
              Unbind {activeAgent}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void refresh()}
              className="rounded-lg border border-zinc-700 bg-zinc-950/40 px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-900/50 disabled:opacity-40"
            >
              Refresh panes
            </button>
          </div>
        </div>
      </details>

      <details className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4 text-[11px] text-zinc-300">
        <summary className="cursor-pointer select-none text-zinc-400 hover:text-zinc-200">tmux · คีย์ลัด</summary>
        <div className="mt-3 space-y-2 text-xs text-zinc-400">
          <p className="text-[11px] text-zinc-500">ใช้คีย์ลัดควบคุม Quick Launch / ส่งไป pane / session ใหม่</p>
          <ul className="list-inside list-disc space-y-2 rounded-xl border border-zinc-800 bg-zinc-950/30 p-4">
            <li>
              <kbd className="rounded border border-zinc-600 bg-zinc-950 px-1.5 py-0.5 font-mono text-zinc-200">Shift+Alt+1–9</kbd>{" "}
              = Quick Launch ตามสล็อต
            </li>
            <li>
              <kbd className="rounded border border-zinc-600 bg-zinc-950 px-1.5 py-0.5 font-mono text-zinc-200">Shift+Alt+Enter</kbd>{" "}
              = ส่งข้อความ (หรือ defaultPing) ไป pane ที่ผูกกับ agent โฟกัส
            </li>
            <li>
              <kbd className="rounded border border-zinc-600 bg-zinc-950 px-1.5 py-0.5 font-mono text-zinc-200">Shift+Alt+n</kbd>{" "}
              / <kbd className="rounded border border-zinc-600 bg-zinc-950 px-1.5 py-0.5 font-mono text-zinc-200">k</kbd>{" "}
              = session ใหม่ (โฟกัส oracle) / ปิดแชต Claude
            </li>
            <li>
              <kbd className="rounded border border-zinc-600 bg-zinc-950 px-1.5 py-0.5 font-mono text-zinc-200">Shift+1</kbd>{" "}
              ถึง{" "}
              <kbd className="rounded border border-zinc-600 bg-zinc-950 px-1.5 py-0.5 font-mono text-zinc-200">9</kbd>{" "}
              = โฟกัส agent ลำดับที่ 1–9
            </li>
            <li>
              <kbd className="rounded border border-zinc-600 bg-zinc-950 px-1.5 py-0.5 font-mono text-zinc-200">Shift+0</kbd>{" "}
              = agent ลำดับที่ 10
            </li>
          </ul>
        </div>
      </details>
    </div>
  );
}

/** Minimal shell-style tokenizer for spawn argv (spaces + double quotes). */
function tokenizeSpawn(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "\\" && quote && line[i + 1] === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (c === '"') {
      quote = !quote;
      continue;
    }
    if (!quote && /\s/.test(c)) {
      if (cur.length) {
        out.push(cur);
        cur = "";
      }
      continue;
    }
    cur += c;
  }
  if (cur.length) out.push(cur);
  return out;
}
