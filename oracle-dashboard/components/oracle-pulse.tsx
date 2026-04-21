"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AGENTS, CATEGORY_LABELS, type AgentCategory, type OracleAgent } from "@/lib/agents";
import { AgentCard } from "@/components/agent-card";
import { WorkOpsTab } from "@/components/work-ops-tab";
import { WezTermPanel } from "@/components/wezterm-panel";
import { TokenMonitor } from "@/components/token-monitor";
import { pulseBridgeHeaders } from "@/lib/pulse-bridge-client";
import { appendWorkOpsLog, endWorkSession, getWorkOpsSnapshot, startOrTouchWorkSession, touchWorkSession } from "@/lib/work-ops-store";
import { idbDeleteAttachments, idbGetAttachments, idbPutAttachment } from "@/lib/idb-attachments";

const TABS = ["Agents", "WezTerm", "Ops", "Tokens", "Voice", "API"] as const;
const UI_STATE_KEY = "oracle-pulse-ui-state:v1";

/** Minimal shell-style tokenizer for wezterm spawn argv (spaces + double-quotes). */
function tokenizeShell(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let q = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "\\" && q && line[i + 1] === '"') { cur += '"'; i++; continue; }
    if (c === '"') { q = !q; continue; }
    if (c === " " && !q) { if (cur) { out.push(cur); cur = ""; } continue; }
    cur += c;
  }
  if (cur) out.push(cur);
  return out;
}

export function OraclePulse() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Agents");
  const [filter, setFilter] = useState<AgentCategory | "all">("all");
  const [selected, setSelected] = useState<OracleAgent | null>(AGENTS[1] ?? null);
  type ClaudeUsage = { inputTokens?: number; outputTokens?: number; totalTokens?: number };
  type PanelAttachment = { id: string; name: string; type: string; size: number; dataUrl: string };
  type AgentPanelState = {
    open: boolean;
    input: string;
    reply: string;
    logs: string[];
    loading: boolean;
    claudeJobAt: number | null;
    lastClaudeUsage: ClaudeUsage | null;
    lastClaudeSendAt: number | null;
    lastClaudeSendText: string | null;
    lastPaneSendAt: number | null;
    lastPaneSendText: string | null;
    attachments: PanelAttachment[];
  };
  const [panels, setPanels] = useState<Record<string, AgentPanelState>>({});
  const panelAttachmentIdsRef = useRef<Record<string, string[]>>({});
  /** กันส่ง →pane พร้อมกันหลายครั้งก่อน state อัปเดต */
  const paneSendLocksRef = useRef<Set<string>>(new Set());
  /** กันส่ง Claude สองครั้งก่อน loading ขึ้น (double-click / Enter ซ้ำ) */
  const claudeSendLocksRef = useRef<Set<string>>(new Set());
  /** กันคลิก Quick Actions ซ้ำเร็วเกินไป */
  const quickActionLastAtRef = useRef<Record<string, number>>({});
  /** cache ผล probe-shell ไม่ต้อง probe ซ้ำทุกครั้ง */
  const shellCacheRef = useRef<string[] | null>(null);
  // Avoid hydration mismatch: render "online" first, then sync real status after mount
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [autoOpsEnabled, setAutoOpsEnabled] = useState(true);
  const [autoOpsIdleMs, setAutoOpsIdleMs] = useState(20 * 60 * 1000);
  const [unreadById, setUnreadById] = useState<Record<number, number>>({ 2: 1 });
  const [defaultPing, setDefaultPing] = useState("/btw status");
  const [remoteBanner, setRemoteBanner] = useState<string | null>(null);
  const [installId, setInstallId] = useState<string | null>(null);
  const [agentRemoteNotes, setAgentRemoteNotes] = useState<Record<string, string>>({});
  const [agentActions, setAgentActions] = useState<Record<string, any[]>>({});
  const [pricing, setPricing] = useState<{ usdPer1MInput: number; usdPer1MOutput: number; usdToThb: number } | null>(null);
  const [remotePollMs, setRemotePollMs] = useState(20_000);
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  /** ปิดปุ่ม →pane ขณะส่ง (อัปเดต UI ทันที — ref อย่างเดียวไม่ re-render) */
  const [paneSendPending, setPaneSendPending] = useState<Record<string, boolean>>({});
  const opsBoot = useRef(false);

  const filtered = useMemo(
    () => (filter === "all" ? AGENTS : AGENTS.filter((a) => a.category === filter)),
    [filter],
  );

  const activeCount = useMemo(() => AGENTS.filter((a) => a.status === "active").length, []);

  const getPanel = useCallback(
    (agentName: string): AgentPanelState => {
      const key = agentName.toLowerCase();
      const cur = panels[key];
      return (
        cur ?? {
          open: true,
          input: "",
          reply: "",
          logs: ["welcome", "Use /btw to ask a quick question"],
          loading: false,
          claudeJobAt: null,
          lastClaudeUsage: null,
          lastClaudeSendAt: null,
          lastClaudeSendText: null,
          lastPaneSendAt: null,
          lastPaneSendText: null,
          attachments: [],
        }
      );
    },
    [panels],
  );

  const setPanel = useCallback(
    (agentName: string, patch: Partial<AgentPanelState>) => {
      const key = agentName.toLowerCase();
      setPanels((prev) => ({ ...prev, [key]: { ...getPanel(key), ...patch } }));
    },
    [getPanel],
  );

  const appendLog = useCallback((agentName: string, line: string) => {
    const key = agentName.toLowerCase();
    setPanels((prev) => {
      const p =
        prev[key] ??
        ({
          open: true,
          input: "",
          reply: "",
          logs: ["welcome", "Use /btw to ask a quick question"],
          loading: false,
          claudeJobAt: null,
          lastClaudeUsage: null,
          lastClaudeSendAt: null,
          lastClaudeSendText: null,
          lastPaneSendAt: null,
          lastPaneSendText: null,
          attachments: [],
        } satisfies AgentPanelState);
      return { ...prev, [key]: { ...p, logs: [...p.logs.slice(-80), line] } };
    });
  }, []);

  const anyLoading = useMemo(() => Object.values(panels).some((p) => p.loading), [panels]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(UI_STATE_KEY);
      if (!raw) return;
      const j = JSON.parse(raw) as {
        tab?: string;
        filter?: string;
        selectedName?: string | null;
        panels?: Record<string, Partial<AgentPanelState> & { attachmentIds?: string[] }>;
      };
      if (j.tab && (TABS as readonly string[]).includes(j.tab)) setTab(j.tab as (typeof TABS)[number]);
      if (j.filter && (["all", "core", "ops", "writing"] as const).includes(j.filter as any)) setFilter(j.filter as any);
      if (typeof j.selectedName === "string" && j.selectedName.trim()) {
        const a = AGENTS.find((x) => x.name.toLowerCase() === j.selectedName!.toLowerCase());
        if (a) setSelected(a);
      }
      if (j.panels && typeof j.panels === "object") {
        const next: Record<string, AgentPanelState> = {};
        const attachIdsByPanel: Record<string, string[]> = {};
        for (const [k, p] of Object.entries(j.panels)) {
          if (!p || typeof p !== "object") continue;
          const key = k.toLowerCase();
          const safeLogs = Array.isArray(p.logs) ? p.logs.filter((x) => typeof x === "string").slice(-80) : undefined;
          const attachmentIds = Array.isArray((p as any).attachmentIds)
            ? (p as any).attachmentIds.filter((x: any) => typeof x === "string").slice(0, 3)
            : [];
          if (attachmentIds.length) attachIdsByPanel[key] = attachmentIds;
          next[key] = {
            open: Boolean(p.open ?? true),
            input: typeof p.input === "string" ? p.input : "",
            reply: typeof p.reply === "string" ? p.reply : "",
            logs: safeLogs?.length ? safeLogs : ["welcome", "Use /btw to ask a quick question"],
            loading: false,
            claudeJobAt: null,
            lastClaudeUsage: p.lastClaudeUsage && typeof p.lastClaudeUsage === "object" ? (p.lastClaudeUsage as any) : null,
            lastClaudeSendAt: null,
            lastClaudeSendText: null,
            lastPaneSendAt: null,
            lastPaneSendText: null,
            attachments: [],
          };
        }
        setPanels(next);
        panelAttachmentIdsRef.current = attachIdsByPanel;
        for (const [panelKey, ids] of Object.entries(attachIdsByPanel)) {
          void (async () => {
            try {
              const got = await idbGetAttachments(ids);
              if (!got.length) return;
              setPanels((prev) => {
                const cur = prev[panelKey];
                if (!cur) return prev;
                const attachments: PanelAttachment[] = got
                  .sort((a, b) => a.createdAt - b.createdAt)
                  .slice(0, 3)
                  .map((a) => ({ id: a.id, name: a.name, type: a.type, size: a.size, dataUrl: a.dataUrl }));
                return { ...prev, [panelKey]: { ...cur, attachments } };
              });
            } catch {
              /* ignore */
            }
          })();
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.setTimeout(() => {
      try {
        const serialPanels: Record<string, Partial<AgentPanelState> & { attachmentIds?: string[] }> = {};
        for (const [k, p] of Object.entries(panels)) {
          serialPanels[k] = {
            open: p.open,
            input: p.input,
            reply: p.reply,
            logs: p.logs.slice(-80),
            lastClaudeUsage: p.lastClaudeUsage,
            attachmentIds: p.attachments.map((a) => a.id).slice(0, 3),
          };
        }
        window.localStorage.setItem(
          UI_STATE_KEY,
          JSON.stringify({
            tab,
            filter,
            selectedName: selected?.name ?? null,
            panels: serialPanels,
          }),
        );
      } catch {
        /* ignore */
      }
    }, 150);
    return () => window.clearTimeout(id);
  }, [filter, panels, selected?.name, tab]);

  const readFileAsDataUrl = useCallback(async (file: File) => {
    const dataUrl: string = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onerror = () => reject(new Error("FileReader failed"));
      r.onload = () => resolve(String(r.result ?? ""));
      r.readAsDataURL(file);
    });
    return dataUrl;
  }, []);

  const addAttachments = useCallback(
    async (agentName: string, files: FileList | File[]) => {
      const key = agentName.toLowerCase();
      const p = getPanel(key);
      const arr = Array.from(files);
      const imgs = arr.filter((f) => f.type.startsWith("image/"));
      if (!imgs.length) {
        appendLog(key, "drop: รองรับเฉพาะรูปภาพ (image/*)");
        return;
      }
      const next = [...p.attachments];
      for (const f of imgs) {
        if (next.length >= 3) {
          appendLog(key, "drop: จำกัด 3 รูปต่อครั้ง");
          break;
        }
        if (f.size > 6 * 1024 * 1024) {
          appendLog(key, `drop: ขนาดไฟล์ใหญ่เกิน (max 6MB): ${f.name}`);
          continue;
        }
        try {
          const dataUrl = await readFileAsDataUrl(f);
          const id =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? `${Date.now()}-${(crypto as any).randomUUID()}`
              : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
          await idbPutAttachment({ id, agentKey: key, name: f.name, type: f.type, size: f.size, dataUrl, createdAt: Date.now() });
          next.push({ id, name: f.name, type: f.type, size: f.size, dataUrl });
        } catch (e) {
          appendLog(key, `drop: อ่านไฟล์ไม่สำเร็จ: ${f.name}`);
        }
      }
      setPanel(key, { attachments: next, open: true });
    },
    [appendLog, getPanel, readFileAsDataUrl, setPanel],
  );

  const removeAttachment = useCallback(
    (agentName: string, idx: number) => {
      const key = agentName.toLowerCase();
      const p = getPanel(key);
      const removed = p.attachments[idx];
      const next = p.attachments.filter((_, i) => i !== idx);
      setPanel(key, { attachments: next });
      if (removed?.id) void idbDeleteAttachments([removed.id]);
    },
    [getPanel, setPanel],
  );

  const clearAttachments = useCallback(
    (agentName: string) => {
      const key = agentName.toLowerCase();
      const p = getPanel(key);
      const ids = p.attachments.map((a) => a.id).filter(Boolean);
      setPanel(key, { attachments: [] });
      if (ids.length) void idbDeleteAttachments(ids);
    },
    [getPanel, setPanel],
  );

  useEffect(() => {
    if (opsBoot.current) return;
    opsBoot.current = true;
    appendWorkOpsLog("system", "Oracle Pulse โหลด");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const apply = () => {
      const next = navigator.onLine;
      setIsOnline(next);
      appendWorkOpsLog("system", next ? "สถานะ: ออนไลน์" : "สถานะ: ออฟไลน์");
    };
    window.addEventListener("online", apply);
    window.addEventListener("offline", apply);
    return () => {
      window.removeEventListener("online", apply);
      window.removeEventListener("offline", apply);
    };
  }, []);

  useEffect(() => {
    if (!autoOpsEnabled) return;
    const tick = () => {
      const now = Date.now();
      const snap = getWorkOpsSnapshot();
      for (const s of Object.values(snap.sessions)) {
        const selectedKey = selected?.name.toLowerCase();
        const selectedLoading = selectedKey ? panels[selectedKey]?.loading : false;
        if (selectedLoading && selectedKey === s.agentName) continue;
        const last = s.lastActivityAt ?? s.startedAt;
        if (now - last > autoOpsIdleMs) {
          appendWorkOpsLog("system", `Auto: ปิดงาน (idle)`, { agentName: s.agentName });
          endWorkSession(s.agentName);
        }
      }
    };
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [autoOpsEnabled, autoOpsIdleMs, panels, selected]);

  async function sendMessage(agentName: string) {
    const key = agentName.toLowerCase();
    const p = getPanel(key);
    if (p.loading) {
      appendLog(key, "blocked: กำลังรอ Claude อยู่");
      return;
    }
    const message = p.input.trim();
    const hasImages = p.attachments.length > 0;
    if (!message && !hasImages) return;
    const effectiveMessage =
      message || "วิเคราะห์รูปนี้: 1) OCR 2) สรุปสิ่งที่เห็น 3) ถ้าเป็น UI/โค้ด ให้บอกสิ่งที่ควรแก้และขั้นตอนทำ";
    const now = Date.now();
    if (p.lastClaudeSendText === effectiveMessage && p.lastClaudeSendAt != null && now - p.lastClaudeSendAt < 2000) {
      appendLog(key, "blocked: duplicate send (cooldown 2s)");
      return;
    }
    if (claudeSendLocksRef.current.has(key)) {
      appendLog(key, "blocked: กำลังส่ง Claude อยู่");
      return;
    }
    claudeSendLocksRef.current.add(key);
    setPanel(key, { loading: true, claudeJobAt: now, reply: "", lastClaudeSendAt: now, lastClaudeSendText: effectiveMessage });
    appendLog(key, `> ${effectiveMessage}`);
    appendWorkOpsLog("claude", `ส่งข้อความถึง Claude`, { agentName: key });
    if (autoOpsEnabled) startOrTouchWorkSession(key, "Auto: Claude");
    else touchWorkSession(key);
    try {
      const res = await fetch(hasImages ? "/api/oracle-vision" : "/api/oracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          hasImages
            ? { agent: key, message: effectiveMessage, images: p.attachments.map((a) => ({ dataUrl: a.dataUrl, type: a.type })) }
            : { agent: key, message: effectiveMessage },
        ),
      });
      const data: { reply?: string; error?: string; usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number } } =
        await res.json();
      if (!res.ok) {
        appendLog(key, `error: ${data.error ?? res.statusText}`);
        setPanel(key, { reply: data.error ?? "Request failed" });
        appendWorkOpsLog("claude", `Claude error: ${data.error ?? res.statusText}`, { agentName: key });
        return;
      }
      const text = data.reply ?? "";
      setPanel(key, { reply: text, lastClaudeUsage: data.usage ?? null });
      appendLog(key, text.slice(0, 500) + (text.length > 500 ? "…" : ""));
      appendWorkOpsLog("claude", `Claude ตอบแล้ว (${text.length} ตัวอักษร)`, {
        agentName: key,
        inputTokens: data.usage?.inputTokens,
        outputTokens: data.usage?.outputTokens,
        totalTokens: data.usage?.totalTokens,
      });
      if (typeof data.usage?.totalTokens === "number") {
        appendLog(key, `usage: tok=${data.usage.totalTokens} (in ${data.usage.inputTokens ?? "?"} / out ${data.usage.outputTokens ?? "?"})`);
      }
      const a = AGENTS.find((x) => x.name.toLowerCase() === key);
      if (a) setUnreadById((prev) => ({ ...prev, [a.id]: 0 }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      appendLog(key, `error: ${msg}`);
      setPanel(key, { reply: msg });
      appendWorkOpsLog("claude", `เครือข่ายล้มเหลว: ${msg}`, { agentName: key });
    } finally {
      claudeSendLocksRef.current.delete(key);
      const ids = p.attachments.map((a) => a.id).filter(Boolean);
      if (ids.length) void idbDeleteAttachments(ids);
      setPanel(key, { loading: false, claudeJobAt: null, input: "", attachments: [] });
    }
  }

  const spawnWezTermForAgent = useCallback(
    async (agent: OracleAgent) => {
      const key = agent.name.toLowerCase();
      setPanel(key, { open: true });
      appendLog(agent.name, `WezTerm ▶ spawn agent:${agent.name} (${agent.displayId})`);

      // OS detection — userAgent is reliable across browsers; navigator.platform is deprecated
      const ua = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
      const isWin = ua.includes("windows");
      const isMac = ua.includes("macintosh");
      // Linux = neither isWin nor isMac

      const actions: any[] = Array.isArray(agentActions[key]) ? agentActions[key] : [];
      const spawnAction = actions.find((a: any) => a?.kind === "wezterm-spawn");

      let body: Record<string, unknown>;
      if (spawnAction) {
        const v = spawnAction.variants as Record<string, string> | undefined;
        // Resolve platform-specific command: localWin → Windows, localUnix → macOS/Linux
        const text = v
          ? String(isWin ? (v.localWin ?? spawnAction.text ?? "") : (v.localUnix ?? spawnAction.text ?? ""))
          : typeof spawnAction.text === "string" ? spawnAction.text : "";
        if (!text.trim()) {
          appendLog(agent.name, `WezTerm: ไม่มีคำสั่งสำหรับ ${isWin ? "Windows" : isMac ? "macOS" : "Linux"}`);
          appendLog(agent.name, `  → เพิ่ม agentActions["${key}"][].variants.${isWin ? "localWin" : "localUnix"} ใน oracle-pulse.config.json`);
          return;
        }
        body = { action: "spawn", argv: tokenizeShell(text), newWindow: true };
      } else {
        // Probe server-side for available shell (cached after first use)
        if (!shellCacheRef.current) {
          try {
            const pr = await fetch("/api/wezterm?probe-shell=1", { headers: pulseBridgeHeaders() });
            const pd = await pr.json() as { spawnArgv?: string[]; shell?: string };
            if (Array.isArray(pd.spawnArgv) && pd.spawnArgv.length) {
              shellCacheRef.current = pd.spawnArgv;
              appendLog(agent.name, `  shell probe: ${pd.shell ?? pd.spawnArgv[0]}`);
            }
          } catch { /* fallback */ }
        }
        const fallback = isWin ? ["powershell.exe", "-NoLogo"] : isMac ? ["zsh", "-l"] : ["bash", "-l"];
        const defaultShell = shellCacheRef.current ?? fallback;
        body = { action: "spawn", argv: defaultShell, newWindow: true };
        appendLog(agent.name, `  spawn: ${defaultShell[0]}`);
      }

      appendLog(agent.name, `  cmd: ${String(body.action)} [${(body.argv as string[]).join(", ")}]`);
      appendWorkOpsLog("system", `WezTerm spawn: ${agent.name}`, { agentName: agent.name });

      try {
        const res = await fetch("/api/wezterm", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...pulseBridgeHeaders() },
          body: JSON.stringify(body),
        });
        const data = await res.json() as { ok?: boolean; error?: string; paneIdOut?: unknown; enabled?: boolean };

        // Bridge disabled
        if (res.status === 403 || data.enabled === false) {
          appendLog(agent.name, "✗ WezTerm bridge ปิดอยู่ — ต้องตั้งค่าก่อน:");
          appendLog(agent.name, "  1. เพิ่ม WEZTERM_BRIDGE_ENABLED=1 ใน .env.local");
          appendLog(agent.name, "  2. restart: npm run dev");
          appendLog(agent.name, "  3. ติดตั้ง WezTerm ถ้ายังไม่มี:");
          if (isWin) appendLog(agent.name, "     winget install wez.wezterm");
          else if (isMac) appendLog(agent.name, "     brew install --cask wezterm");
          else appendLog(agent.name, "     https://wezfurlong.org/wezterm/install/linux.html");
          return;
        }

        if (data.ok) {
          appendLog(agent.name, `✓ WezTerm เปิดแล้ว${data.paneIdOut != null ? ` — pane ${data.paneIdOut}` : ""}`);
        } else {
          const errMsg = String(data.error ?? "unknown");
          appendLog(agent.name, `✗ WezTerm error: ${errMsg}`);
          // Binary not found
          if (/not found|no such file|cannot find|is not recognized|ENOENT/i.test(errMsg)) {
            appendLog(agent.name, "  WezTerm ยังไม่ได้ติดตั้ง หรือ PATH ยังไม่ถูกต้อง:");
            if (isWin) {
              appendLog(agent.name, "  → winget install wez.wezterm");
              appendLog(agent.name, "  → หรือ WEZTERM_BIN=C:\\Program Files\\WezTerm\\wezterm.exe ใน .env.local");
            } else if (isMac) {
              appendLog(agent.name, "  → brew install --cask wezterm");
            } else {
              appendLog(agent.name, "  → https://wezfurlong.org/wezterm/install/linux.html");
            }
          }
        }
      } catch (e) {
        appendLog(agent.name, `✗ WezTerm fetch error: ${e instanceof Error ? e.message : "network failed"}`);
      }
    },
    [agentActions, appendLog, appendWorkOpsLog, setPanel],
  );

  const selectAgent = useCallback(
    (agent: OracleAgent) => {
      const key = agent.name.toLowerCase();
      setSelected(agent);
      setUnreadById((prev) => ({ ...prev, [agent.id]: 0 }));
      setPanels((prev) => {
        const cur = prev[key];
        const wasOpen = cur?.open ?? false;
        const fresh: AgentPanelState = cur ?? {
          open: !wasOpen,
          input: "",
          reply: "",
          logs: ["welcome", "Use /btw to ask a quick question"],
          loading: false,
          claudeJobAt: null,
          lastClaudeUsage: null,
          lastClaudeSendAt: null,
          lastClaudeSendText: null,
          lastPaneSendAt: null,
          lastPaneSendText: null,
          attachments: [],
        };
        return { ...prev, [key]: { ...fresh, open: !wasOpen } };
      });
      appendLog(agent.name, `focused: ${agent.name} (${agent.displayId})`);
      appendWorkOpsLog("focus", `โฟกัส agent ${agent.name}`, { agentName: agent.name });
      if (autoOpsEnabled) startOrTouchWorkSession(agent.name, "Auto: focus");
    },
    [appendLog, appendWorkOpsLog, autoOpsEnabled],
  );

  const closePanel = useCallback(
    (agentName: string) => {
      const key = agentName.toLowerCase();
      appendWorkOpsLog("system", `ปิดหน้าต่าง ${key}`);
      setPanels((prev) => ({ ...prev, [key]: { ...getPanel(key), open: false } }));
      if (selected?.name.toLowerCase() === key) setSelected(null);
    },
    [getPanel, selected],
  );

  // Mission tab removed

  useEffect(() => {
    let cancelled = false;
    const load = async (reload: boolean) => {
      try {
        const res = await fetch(`/api/pulse/config${reload ? "?reload=1" : ""}`);
        const j = (await res.json()) as {
          defaultPing?: string;
          installId?: string;
          remoteState?: { enabled?: boolean; catPath?: string; pollIntervalMs?: number };
          autoOps?: { enabled?: boolean; idleMs?: number };
          agentActions?: Record<string, unknown>;
          pricing?: { usdPer1MInput?: number; usdPer1MOutput?: number; usdToThb?: number };
        };
        if (cancelled) return;
        if (typeof j.defaultPing === "string" && j.defaultPing.trim()) setDefaultPing(j.defaultPing.trim());
        if (typeof j.installId === "string" && j.installId) setInstallId(j.installId);
        if (j.agentActions && typeof j.agentActions === "object") setAgentActions(j.agentActions as Record<string, any[]>);
        if (j.pricing && typeof j.pricing === "object") {
          const inUsd = Math.max(0, Number(j.pricing.usdPer1MInput) || 3);
          const outUsd = Math.max(0, Number(j.pricing.usdPer1MOutput) || 15);
          const fx = Math.max(0, Number(j.pricing.usdToThb) || 32.61);
          setPricing({ usdPer1MInput: inUsd, usdPer1MOutput: outUsd, usdToThb: fx });
        }
        const re = j.remoteState;
        const en = Boolean(re?.enabled && re?.catPath?.trim());
        setRemoteEnabled(en);
        if (re?.pollIntervalMs != null) {
          setRemotePollMs(Math.min(120_000, Math.max(5000, Number(re.pollIntervalMs) || 20_000)));
        }
        const ao = j.autoOps;
        if (ao && typeof ao === "object") {
          setAutoOpsEnabled(Boolean(ao.enabled ?? true));
          if (ao.idleMs != null) setAutoOpsIdleMs(Math.min(6 * 60 * 60 * 1000, Math.max(60_000, Number(ao.idleMs) || 20 * 60 * 1000)));
        }
      } catch {
        /* keep defaults */
      }
    };
    void load(false);
    const t = setInterval(() => void load(true), 45_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    if (!remoteEnabled) {
      setRemoteBanner(null);
      setAgentRemoteNotes({});
      return;
    }
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await fetch("/api/pulse/remote-state");
        const j = (await r.json()) as {
          ok?: boolean;
          data?: { banner?: string; agents?: Record<string, { note?: string; tag?: string }> };
        };
        if (cancelled || !j.ok || !j.data) return;
        if (typeof j.data.banner === "string") setRemoteBanner(j.data.banner);
        const notes: Record<string, string> = {};
        if (j.data.agents && typeof j.data.agents === "object") {
          for (const [k, v] of Object.entries(j.data.agents)) {
            if (v && typeof v === "object") {
              const bits = [v.tag, v.note].filter((x): x is string => typeof x === "string" && x.length > 0);
              if (bits.length) notes[k.toLowerCase()] = bits.join(" · ");
            }
          }
        }
        setAgentRemoteNotes(notes);
      } catch {
        /* ignore */
      }
    };
    void tick();
    const id = setInterval(() => void tick(), remotePollMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [remoteEnabled, remotePollMs]);

  // Mission removed

  const sendToBoundPane = useCallback(async (agentName: string) => {
    const key = agentName.toLowerCase();
    if (paneSendLocksRef.current.has(key)) {
      appendLog(key, "blocked: →pane กำลังส่งอยู่");
      return;
    }
    const p = getPanel(key);
    const text = (p.input || "").trim() || defaultPing;
    const now = Date.now();
    if (p.lastPaneSendText === text && p.lastPaneSendAt != null && now - p.lastPaneSendAt < 2000) {
      appendLog(key, "blocked: duplicate →pane (cooldown 2s)");
      return;
    }
    paneSendLocksRef.current.add(key);
    setPaneSendPending((prev) => ({ ...prev, [key]: true }));
    try {
      const res = await fetch("/api/pulse/send-to-agent", {
        method: "POST",
        headers: pulseBridgeHeaders(),
        body: JSON.stringify({ agentName: key, text }),
      });
      const data = (await res.json()) as {
        error?: string;
        transport?: string;
        paneId?: number;
        duplicate?: boolean;
      };
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      if (data.duplicate) {
        appendLog(key, "→pane: กันซ้ำ (เซิร์ฟเวอร์ — ไม่ส่งซ้ำ)");
        return;
      }
      setPanel(key, { lastPaneSendAt: Date.now(), lastPaneSendText: text });
      appendLog(key, `pane→${data.transport ?? "?"} #%${data.paneId ?? "?"}: ${text.slice(0, 80)}${text.length > 80 ? "…" : ""}`);
      appendWorkOpsLog("pane", `ส่งไป pane ${data.transport}#${data.paneId}`, { agentName: key });
      setPanel(key, { input: "" });
    } catch (e) {
      appendLog(key, `pane-send: ${e instanceof Error ? e.message : "failed"}`);
      appendWorkOpsLog("pane", `pane error: ${e instanceof Error ? e.message : "failed"}`, {
        agentName: key,
      });
    } finally {
      paneSendLocksRef.current.delete(key);
      setPaneSendPending((prev) => ({ ...prev, [key]: false }));
    }
  }, [appendLog, appendWorkOpsLog, defaultPing, getPanel, setPanel]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && e.altKey && e.key === "Enter") {
        e.preventDefault();
        if (e.repeat) return;
        if (selected) void sendToBoundPane(selected.name);
        return;
      }

      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [contenteditable=true]")) return;

      if (!e.shiftKey) return;
      const digitMatch = e.code.match(/^Digit([0-9])$/);
      if (!digitMatch) return;
      const digit = digitMatch[1]!;

      const idx = digit === "0" ? 9 : parseInt(digit, 10) - 1;
      if (idx < 0 || idx >= AGENTS.length) return;
      e.preventDefault();
      const agent = AGENTS[idx];
      selectAgent(agent);
      setTab("Agents");
      appendLog(agent.name, `hotkey: focus ${agent.name} (${agent.displayId})`);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [appendLog, selectAgent, selected, sendToBoundPane]);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-zinc-900 text-lg font-semibold text-violet-300 ring-1 ring-zinc-800">
            Ψ
          </span>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">Oracle Pulse</h1>
            <p className="text-[11px] text-zinc-500">ทีม / MUX · Claude API</p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-1 rounded-lg bg-zinc-900/60 p-1 ring-1 ring-zinc-800">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
                tab === t ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>

        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
          <span>
            {AGENTS.length} agents | {activeCount} active
          </span>
          <span className="rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-mono text-[10px] text-zinc-300">
            v-next{installId ? ` · ${installId}` : ""}
          </span>
          <span className={`flex items-center gap-1.5 ${isOnline ? "text-emerald-400" : "text-red-400"}`}>
            <span
              className={`size-2 rounded-full ${isOnline ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]"}`}
            />
            {isOnline ? "online" : "offline"}
          </span>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-zinc-800/80 bg-zinc-900/40 px-4 py-2 text-[11px] text-zinc-400">
        <span>
          <span className="text-zinc-600">Claude โฟกัส:</span>{" "}
          <span className="font-medium text-violet-200">{selected ? selected.name : "—"}</span>
          {anyLoading ? <span className="ml-2 text-amber-300/90">· กำลังตอบ…</span> : null}
        </span>
        <span className="hidden text-zinc-700 sm:inline">|</span>
        <span className="max-w-md text-zinc-500">
          Quick Launch · pane (Shift+Alt+Enter) · Shift+1–9
        </span>
        {remoteBanner ? (
          <span className="max-w-full truncate font-mono text-[10px] text-cyan-400/90" title={remoteBanner}>
            remote: {remoteBanner}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setTab("WezTerm")}
          className="ml-auto rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] font-medium text-zinc-300 hover:border-violet-600/50 hover:text-violet-200"
        >
          WezTerm
        </button>
      </div>

      {tab === "WezTerm" ? (
        <div className="flex flex-1 min-h-0 flex-col overflow-y-auto">
          <WezTermPanel />
        </div>
      ) : tab === "Ops" ? (
        <WorkOpsTab
          claudeLoading={anyLoading}
          claudeAgent={selected?.name ?? null}
          claudeJobAt={selected ? getPanel(selected.name).claudeJobAt : null}
          pricing={pricing}
        />
      ) : tab === "Tokens" ? (
        <TokenMonitor pricing={pricing} />
      ) : tab === "Agents" ? (
        <div className="flex flex-1 min-h-0">
          <main className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-6">
            <details className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 px-3 py-2 text-[10px] text-zinc-500 open:pb-3">
              <summary className="cursor-pointer select-none text-zinc-400 hover:text-zinc-300">
                โครงทีมตามหมวด (ลูก / แม่ — core · ops · writing)
              </summary>
              <div className="mt-2 space-y-1.5 font-mono text-[10px] leading-relaxed text-zinc-500">
                {(["core", "ops", "writing"] as const).map((cat) => (
                  <div key={cat}>
                    <span className="text-violet-400/80">{cat}</span>:{" "}
                    {AGENTS.filter((a) => a.category === cat)
                      .map((a) => a.name)
                      .join(", ")}
                  </div>
                ))}
              </div>
            </details>

            <div className="flex flex-wrap items-center gap-2">
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

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {filtered.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  selected={selected?.id === agent.id}
                  badge={unreadById[agent.id]}
                  remoteLabel={agentRemoteNotes[agent.name.toLowerCase()]}
                  onSelect={() => selectAgent(agent)}
                  onDoubleClick={() => void spawnWezTermForAgent(agent)}
                />
              ))}
            </div>
          </main>

          <aside className="hidden w-72 shrink-0 border-l border-zinc-800/80 bg-zinc-950/80 lg:flex lg:flex-col">
            <div className="border-b border-zinc-800/80 px-4 py-3">
              <h2 className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500">SESSIONS</h2>
            </div>
            <ul className="flex-1 space-y-1 overflow-y-auto p-2">
              {AGENTS.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => selectAgent(a)}
                    className={`flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-xs transition hover:bg-zinc-900 ${
                      selected?.id === a.id ? "bg-zinc-900 ring-1 ring-violet-500/40" : ""
                    }`}
                  >
                    <span
                      className={`mt-1 size-2 shrink-0 rounded-full ${
                        a.status === "active" ? "bg-emerald-400" : "bg-zinc-600"
                      }`}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium capitalize text-zinc-200">{a.name}</span>
                      <span className="block truncate text-[11px] text-zinc-500">{a.sessionNote}</span>
                      <span className="block font-mono text-[10px] text-zinc-600">{a.displayId}-pulse</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500">
          {tab} — ยังไม่ได้เชื่อม (เวอร์ชันถัดไป)
        </div>
      )}

      {tab === "Agents" ? (
        <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-50 flex flex-wrap items-end justify-start gap-3">
          {Object.entries(panels)
            .filter(([, p]) => p.open)
            .map(([key, p]) => {
              const agent = AGENTS.find((a) => a.name.toLowerCase() === key);
              if (!agent) return null;
              const actions = Array.isArray(agentActions[key]) ? agentActions[key] : [];
              return (
                <div
                  key={key}
                  className={`pointer-events-auto w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border bg-zinc-950/95 shadow-2xl shadow-black/50 ring-1 ring-black/40 backdrop-blur ${
                    selected?.name.toLowerCase() === key ? "border-violet-500/50" : "border-zinc-800"
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-3 py-2">
                    <button
                      type="button"
                      onClick={() => selectAgent(agent)}
                      className="text-sm font-medium capitalize text-zinc-100 hover:text-violet-200"
                      title="Focus"
                    >
                      {agent.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => closePanel(key)}
                      className="rounded-md px-2 py-1 text-xs text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                      aria-label={`Close ${agent.name}`}
                    >
                      ×
                    </button>
                  </div>

                  <div className="max-h-48 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-300">
                    {p.logs.map((line, i) => (
                      <div key={`${i}-${line.slice(0, 24)}`} className="whitespace-pre-wrap break-words">
                        {line}
                      </div>
                    ))}
                    {p.loading && <div className="text-zinc-500">กำลังตอบ…</div>}
                  </div>

                  {actions.length ? (
                    <div className="border-t border-zinc-800 px-3 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Quick Actions</div>
                      <div className="mt-2 space-y-1.5">
                        {actions.slice(0, 6).map((a: any) => (
                          <button
                            key={String(a.id ?? a.title)}
                            type="button"
                            onClick={async () => {
                              const dedupKey = `${key}:${String(a.id ?? a.title)}`;
                              const t = Date.now();
                              const prevTap = quickActionLastAtRef.current[dedupKey] ?? 0;
                              if (t - prevTap < 500) return;
                              quickActionLastAtRef.current[dedupKey] = t;

                              const kind = String(a.kind ?? "copy");
                              const text = typeof a.text === "string" ? a.text : "";
                              if (kind === "pane") {
                                setPanel(key, { input: text });
                                appendLog(key, `action→pane 준비: ${String(a.title ?? "action")}`);
                                return;
                              }
                              if (kind === "link" && typeof a.url === "string") {
                                window.open(a.url, "_blank", "noopener,noreferrer");
                                appendWorkOpsLog("system", `เปิดลิงก์: ${String(a.title ?? "link")}`, { agentName: key });
                                return;
                              }
                              if (text) {
                                try {
                                  await navigator.clipboard.writeText(text);
                                  appendWorkOpsLog("system", `คัดลอกคำสั่ง: ${String(a.title ?? "copy")}`, { agentName: key });
                                } catch (e) {
                                  const msg = e instanceof Error ? e.message : "clipboard failed";
                                  appendLog(key, `copy: ${msg}`);
                                  appendWorkOpsLog("system", `คัดลอกไม่สำเร็จ: ${msg}`, { agentName: key });
                                }
                              }
                            }}
                            className="w-full rounded-md border border-zinc-800 bg-zinc-900/50 px-2 py-1.5 text-left text-[11px] text-zinc-300 hover:bg-zinc-800/60"
                          >
                            <div className="font-medium text-zinc-100">{String(a.title ?? "Action")}</div>
                            {a.detail ? <div className="text-[10px] text-zinc-500">{String(a.detail)}</div> : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div
                    className="border-t border-zinc-800 p-2"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const files = e.dataTransfer?.files;
                      if (files && files.length) void addAttachments(key, files);
                    }}
                    title="ลากรูปมาวางเพื่อแนบ"
                  >
                    {p.attachments.length ? (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {p.attachments.map((a, idx) => (
                          <div
                            key={`${idx}-${a.name}`}
                            className="group relative overflow-hidden rounded-md border border-zinc-800 bg-zinc-900/40"
                          >
                            <img src={a.dataUrl} alt={a.name} className="h-12 w-12 object-cover" />
                            <button
                              type="button"
                              onClick={() => removeAttachment(key, idx)}
                              className="absolute right-1 top-1 rounded bg-black/60 px-1 text-[10px] text-zinc-200 hover:bg-black/70"
                              aria-label="Remove image"
                              title="ลบรูป"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                          <span>ลากเพิ่มได้ (สูงสุด 3 รูป)</span>
                          <button
                            type="button"
                            onClick={() => clearAttachments(key)}
                            className="rounded border border-zinc-800 bg-zinc-900/50 px-2 py-1 text-[10px] font-medium text-zinc-200 hover:bg-zinc-800/60"
                          >
                            ล้างรูป
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-2 text-[10px] text-zinc-600">ลากรูปมาวางตรงนี้เพื่อแนบ (รองรับ image/*)</div>
                    )}
                    <div className="flex gap-2">
                      <label className="shrink-0 cursor-pointer rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1.5 text-[10px] font-medium text-zinc-200 hover:bg-zinc-800/60">
                        รูป
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            const files = e.target.files;
                            if (files && files.length) void addAttachments(key, files);
                            e.currentTarget.value = "";
                          }}
                        />
                      </label>
                      <input
                        className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
                        placeholder="ถามอะไรก็ได้…"
                        value={p.input}
                        onChange={(e) => setPanel(key, { input: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            if (e.repeat) return;
                            e.preventDefault();
                            void sendMessage(key);
                          }
                        }}
                        disabled={p.loading || Boolean(paneSendPending[key])}
                      />
                      <button
                        type="button"
                        onClick={() => void sendMessage(key)}
                        disabled={
                          p.loading ||
                          Boolean(paneSendPending[key]) ||
                          (!p.input.trim() && p.attachments.length === 0)
                        }
                        className="shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {p.loading ? "…" : "ส่ง"}
                      </button>
                      <button
                        type="button"
                        title="ส่งไปยัง tmux/WezTerm pane ที่ผูกใน config"
                        onClick={() => void sendToBoundPane(key)}
                        disabled={p.loading || Boolean(paneSendPending[key])}
                        className="shrink-0 rounded-md border border-cyan-800/60 bg-cyan-950/40 px-2 py-1.5 text-[10px] font-medium text-cyan-200/90 hover:bg-cyan-900/50 disabled:opacity-40"
                      >
                        →pane
                      </button>
                    </div>

                    {p.lastClaudeUsage?.totalTokens != null && !p.loading ? (
                      <div className="mt-2 text-[10px] text-zinc-500">
                        tokens ล่าสุด:{" "}
                        <span className="font-mono text-amber-300/90">
                          {p.lastClaudeUsage.totalTokens.toLocaleString()}
                          {p.lastClaudeUsage.inputTokens != null || p.lastClaudeUsage.outputTokens != null
                            ? ` (in ${p.lastClaudeUsage.inputTokens?.toLocaleString() ?? "?"} / out ${p.lastClaudeUsage.outputTokens?.toLocaleString() ?? "?"})`
                            : ""}
                        </span>
                      </div>
                    ) : null}
                    {p.reply && !p.loading ? <p className="mt-2 line-clamp-4 text-[11px] text-zinc-400">{p.reply}</p> : null}
                  </div>
                </div>
              );
            })}
        </div>
      ) : null}
    </div>
  );
}
