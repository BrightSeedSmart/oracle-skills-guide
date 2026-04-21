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
const UI_STATE_KEY = "oracle-pulse-ui-state:v2";

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

// ─── Types ───────────────────────────────────────────────────────────────────

type ClaudeUsage = { inputTokens?: number; outputTokens?: number; totalTokens?: number };
type PanelAttachment = { id: string; name: string; type: string; size: number; dataUrl: string };
type WezTermEntry = { argv: string[]; action: string; ts: number; label: string };

type AgentTask = {
  id: string;
  title: string;
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

type AgentPanelState = {
  open: boolean;
  activeTaskId: string;
  tasks: Record<string, AgentTask>;
};

function makeDefaultTask(id = "main", title = "หลัก"): AgentTask {
  return {
    id, title,
    input: "", reply: "",
    logs: ["welcome", "Use /btw to ask a quick question"],
    loading: false, claudeJobAt: null,
    lastClaudeUsage: null, lastClaudeSendAt: null, lastClaudeSendText: null,
    lastPaneSendAt: null, lastPaneSendText: null, attachments: [],
  };
}

function makeDefaultPanel(): AgentPanelState {
  return { open: true, activeTaskId: "main", tasks: { main: makeDefaultTask() } };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function OraclePulse() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Agents");
  const [filter, setFilter] = useState<AgentCategory | "all">("all");
  const [selected, setSelected] = useState<OracleAgent | null>(AGENTS[1] ?? null);
  const [panels, setPanels] = useState<Record<string, AgentPanelState>>({});
  const panelAttachmentIdsRef = useRef<Record<string, string[]>>({});
  const paneSendLocksRef = useRef<Set<string>>(new Set());
  const claudeSendLocksRef = useRef<Set<string>>(new Set());
  const quickActionLastAtRef = useRef<Record<string, number>>({});
  const shellCacheRef = useRef<string[] | null>(null);
  const projectCwdRef = useRef<string | null>(null);
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
  const [paneSendPending, setPaneSendPending] = useState<Record<string, boolean>>({});
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [wezTermHistory, setWezTermHistory] = useState<Record<string, WezTermEntry[]>>({});
  const [historyOpenKey, setHistoryOpenKey] = useState<string | null>(null);
  type WezPaneRow = { pane_id: number; tab_id: number; window_id: number; workspace: string; title: string; cwd: string };
  const [wezTermPanes, setWezTermPanes] = useState<WezPaneRow[] | null>(null);
  const [panesLoading, setPanesLoading] = useState(false);
  const [panesExpandedKey, setPanesExpandedKey] = useState<string | null>(null);
  const opsBoot = useRef(false);

  const filtered = useMemo(
    () => (filter === "all" ? AGENTS : AGENTS.filter((a) => a.category === filter)),
    [filter],
  );
  const activeCount = useMemo(() => AGENTS.filter((a) => a.status === "active").length, []);

  // ─── Panel helpers ──────────────────────────────────────────────────────────

  const getPanel = useCallback((agentName: string): AgentPanelState => {
    return panels[agentName.toLowerCase()] ?? makeDefaultPanel();
  }, [panels]);

  const setPanel = useCallback((agentName: string, patch: Partial<AgentPanelState>) => {
    const key = agentName.toLowerCase();
    setPanels((prev) => ({ ...prev, [key]: { ...(prev[key] ?? makeDefaultPanel()), ...patch } }));
  }, []);

  const setTask = useCallback((agentName: string, taskId: string, patch: Partial<AgentTask>) => {
    const key = agentName.toLowerCase();
    setPanels((prev) => {
      const panel = prev[key] ?? makeDefaultPanel();
      const task = panel.tasks[taskId] ?? makeDefaultTask(taskId);
      return { ...prev, [key]: { ...panel, tasks: { ...panel.tasks, [taskId]: { ...task, ...patch } } } };
    });
  }, []);

  const appendLog = useCallback((agentName: string, line: string, taskId?: string) => {
    const key = agentName.toLowerCase();
    setPanels((prev) => {
      const panel = prev[key] ?? makeDefaultPanel();
      const tid = taskId ?? panel.activeTaskId;
      const task = panel.tasks[tid] ?? makeDefaultTask(tid);
      return { ...prev, [key]: { ...panel, tasks: { ...panel.tasks, [tid]: { ...task, logs: [...task.logs.slice(-80), line] } } } };
    });
  }, []);

  const addTask = useCallback((agentName: string) => {
    const key = agentName.toLowerCase();
    const id = `t${Date.now()}`;
    setPanels((prev) => {
      const panel = prev[key] ?? makeDefaultPanel();
      const num = Object.keys(panel.tasks).length + 1;
      return {
        ...prev,
        [key]: { ...panel, activeTaskId: id, tasks: { ...panel.tasks, [id]: makeDefaultTask(id, `Task ${num}`) } },
      };
    });
  }, []);

  const closeTask = useCallback((agentName: string, taskId: string) => {
    const key = agentName.toLowerCase();
    setPanels((prev) => {
      const panel = prev[key];
      if (!panel) return prev;
      const { [taskId]: _removed, ...rest } = panel.tasks;
      if (Object.keys(rest).length === 0) rest.main = makeDefaultTask();
      const newActive = panel.activeTaskId === taskId ? Object.keys(rest)[0]! : panel.activeTaskId;
      return { ...prev, [key]: { ...panel, tasks: rest, activeTaskId: newActive } };
    });
  }, []);

  const renameTask = useCallback((agentName: string, taskId: string, title: string) => {
    const key = agentName.toLowerCase();
    setPanels((prev) => {
      const panel = prev[key] ?? makeDefaultPanel();
      const task = panel.tasks[taskId] ?? makeDefaultTask(taskId);
      return { ...prev, [key]: { ...panel, tasks: { ...panel.tasks, [taskId]: { ...task, title: title.trim() || task.title } } } };
    });
  }, []);

  const anyLoading = useMemo(() =>
    Object.values(panels).some((panel) =>
      Object.values(panel.tasks).some((t) => t.loading)
    ), [panels]);

  // ─── Persist ────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(UI_STATE_KEY);
      // also try old v1 key for migration
      const rawV1 = !raw ? window.localStorage.getItem("oracle-pulse-ui-state:v1") : null;
      const src = raw ?? rawV1;
      if (!src) return;
      const j = JSON.parse(src) as Record<string, unknown>;
      if (j.tab && (TABS as readonly string[]).includes(j.tab as string)) setTab(j.tab as (typeof TABS)[number]);
      if (j.filter && (["all", "core", "ops", "writing"] as const).includes(j.filter as any)) setFilter(j.filter as any);
      if (typeof j.selectedName === "string" && j.selectedName.trim()) {
        const a = AGENTS.find((x) => x.name.toLowerCase() === (j.selectedName as string).toLowerCase());
        if (a) setSelected(a);
      }
      const rawPanels = j.panels;
      if (rawPanels && typeof rawPanels === "object") {
        const next: Record<string, AgentPanelState> = {};
        for (const [k, p] of Object.entries(rawPanels as Record<string, unknown>)) {
          if (!p || typeof p !== "object") continue;
          const pObj = p as Record<string, unknown>;
          const key = k.toLowerCase();
          // v2 format: has tasks field
          if (pObj.tasks && typeof pObj.tasks === "object") {
            const tasks: Record<string, AgentTask> = {};
            for (const [tid, t] of Object.entries(pObj.tasks as Record<string, unknown>)) {
              if (!t || typeof t !== "object") continue;
              const tObj = t as Record<string, unknown>;
              tasks[tid] = {
                id: tid,
                title: typeof tObj.title === "string" ? tObj.title : "หลัก",
                input: typeof tObj.input === "string" ? tObj.input : "",
                reply: typeof tObj.reply === "string" ? tObj.reply : "",
                logs: Array.isArray(tObj.logs) ? (tObj.logs as string[]).filter((x) => typeof x === "string").slice(-80) : ["welcome", "Use /btw to ask a quick question"],
                loading: false, claudeJobAt: null,
                lastClaudeUsage: (tObj.lastClaudeUsage && typeof tObj.lastClaudeUsage === "object") ? tObj.lastClaudeUsage as ClaudeUsage : null,
                lastClaudeSendAt: null, lastClaudeSendText: null, lastPaneSendAt: null, lastPaneSendText: null,
                attachments: [],
              };
            }
            if (Object.keys(tasks).length === 0) tasks.main = makeDefaultTask();
            const activeId = typeof pObj.activeTaskId === "string" && tasks[pObj.activeTaskId] ? pObj.activeTaskId : Object.keys(tasks)[0]!;
            next[key] = { open: Boolean(pObj.open ?? true), activeTaskId: activeId, tasks };
          } else {
            // v1 migration: flat fields → wrap in "main" task
            const safeLogs = Array.isArray(pObj.logs) ? (pObj.logs as string[]).filter((x) => typeof x === "string").slice(-80) : undefined;
            const mainTask = makeDefaultTask();
            mainTask.input = typeof pObj.input === "string" ? pObj.input : "";
            mainTask.reply = typeof pObj.reply === "string" ? pObj.reply : "";
            mainTask.logs = safeLogs?.length ? safeLogs : mainTask.logs;
            mainTask.lastClaudeUsage = (pObj.lastClaudeUsage && typeof pObj.lastClaudeUsage === "object") ? pObj.lastClaudeUsage as ClaudeUsage : null;
            next[key] = { open: Boolean(pObj.open ?? true), activeTaskId: "main", tasks: { main: mainTask } };
          }
        }
        setPanels(next);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.setTimeout(() => {
      try {
        const serialPanels: Record<string, unknown> = {};
        for (const [k, panel] of Object.entries(panels)) {
          const serialTasks: Record<string, unknown> = {};
          for (const [tid, task] of Object.entries(panel.tasks)) {
            serialTasks[tid] = {
              title: task.title,
              input: task.input,
              reply: task.reply,
              logs: task.logs.slice(-80),
              lastClaudeUsage: task.lastClaudeUsage,
            };
          }
          serialPanels[k] = { open: panel.open, activeTaskId: panel.activeTaskId, tasks: serialTasks };
        }
        window.localStorage.setItem(UI_STATE_KEY, JSON.stringify({ tab, filter, selectedName: selected?.name ?? null, panels: serialPanels }));
      } catch { /* ignore */ }
    }, 150);
    return () => window.clearTimeout(id);
  }, [filter, panels, selected?.name, tab]);

  // ─── Attachments ────────────────────────────────────────────────────────────

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
    async (agentName: string, taskId: string, files: FileList | File[]) => {
      const key = agentName.toLowerCase();
      const panel = getPanel(key);
      const task = panel.tasks[taskId] ?? makeDefaultTask(taskId);
      const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
      if (!arr.length) { appendLog(key, "drop: รองรับเฉพาะรูปภาพ (image/*)", taskId); return; }
      const next = [...task.attachments];
      for (const f of arr) {
        if (next.length >= 3) { appendLog(key, "drop: จำกัด 3 รูปต่อครั้ง", taskId); break; }
        if (f.size > 6 * 1024 * 1024) { appendLog(key, `drop: ขนาดไฟล์ใหญ่เกิน: ${f.name}`, taskId); continue; }
        try {
          const dataUrl = await readFileAsDataUrl(f);
          const id = typeof crypto !== "undefined" && "randomUUID" in crypto
            ? `${Date.now()}-${(crypto as any).randomUUID()}`
            : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
          await idbPutAttachment({ id, agentKey: `${key}:${taskId}`, name: f.name, type: f.type, size: f.size, dataUrl, createdAt: Date.now() });
          next.push({ id, name: f.name, type: f.type, size: f.size, dataUrl });
        } catch { appendLog(key, `drop: อ่านไฟล์ไม่สำเร็จ: ${f.name}`, taskId); }
      }
      setTask(key, taskId, { attachments: next });
      setPanel(key, { open: true });
    },
    [appendLog, getPanel, readFileAsDataUrl, setPanel, setTask],
  );

  const removeAttachment = useCallback((agentName: string, taskId: string, idx: number) => {
    const key = agentName.toLowerCase();
    const task = (getPanel(key).tasks[taskId]) ?? makeDefaultTask(taskId);
    const removed = task.attachments[idx];
    setTask(key, taskId, { attachments: task.attachments.filter((_, i) => i !== idx) });
    if (removed?.id) void idbDeleteAttachments([removed.id]);
  }, [getPanel, setTask]);

  const clearAttachments = useCallback((agentName: string, taskId: string) => {
    const key = agentName.toLowerCase();
    const task = (getPanel(key).tasks[taskId]) ?? makeDefaultTask(taskId);
    const ids = task.attachments.map((a) => a.id).filter(Boolean);
    setTask(key, taskId, { attachments: [] });
    if (ids.length) void idbDeleteAttachments(ids);
  }, [getPanel, setTask]);

  // ─── Work Ops boot ──────────────────────────────────────────────────────────

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
    return () => { window.removeEventListener("online", apply); window.removeEventListener("offline", apply); };
  }, []);

  useEffect(() => {
    if (!autoOpsEnabled) return;
    const tick = () => {
      const now = Date.now();
      const snap = getWorkOpsSnapshot();
      for (const s of Object.values(snap.sessions)) {
        const selectedKey = selected?.name.toLowerCase();
        const panel = selectedKey ? panels[selectedKey] : undefined;
        const selectedLoading = panel ? Object.values(panel.tasks).some((t) => t.loading) : false;
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

  // ─── Send to Claude ─────────────────────────────────────────────────────────

  async function sendMessage(agentName: string, taskId: string) {
    const key = agentName.toLowerCase();
    const lockKey = `${key}:${taskId}`;
    const panel = getPanel(key);
    const task = panel.tasks[taskId] ?? makeDefaultTask(taskId);
    if (task.loading) { appendLog(key, "blocked: กำลังรอ Claude อยู่", taskId); return; }
    const message = task.input.trim();
    const hasImages = task.attachments.length > 0;
    if (!message && !hasImages) return;
    const effectiveMessage = message || "วิเคราะห์รูปนี้: 1) OCR 2) สรุปสิ่งที่เห็น 3) ถ้าเป็น UI/โค้ด ให้บอกสิ่งที่ควรแก้และขั้นตอนทำ";
    const now = Date.now();
    if (task.lastClaudeSendText === effectiveMessage && task.lastClaudeSendAt != null && now - task.lastClaudeSendAt < 2000) {
      appendLog(key, "blocked: duplicate send (cooldown 2s)", taskId); return;
    }
    if (claudeSendLocksRef.current.has(lockKey)) { appendLog(key, "blocked: กำลังส่ง Claude อยู่", taskId); return; }
    claudeSendLocksRef.current.add(lockKey);
    setTask(key, taskId, { loading: true, claudeJobAt: now, reply: "", lastClaudeSendAt: now, lastClaudeSendText: effectiveMessage });
    appendLog(key, `> ${effectiveMessage}`, taskId);
    appendWorkOpsLog("claude", `ส่งข้อความถึง Claude`, { agentName: key });
    if (autoOpsEnabled) startOrTouchWorkSession(key, "Auto: Claude");
    else touchWorkSession(key);
    try {
      const res = await fetch(hasImages ? "/api/oracle-vision" : "/api/oracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          hasImages
            ? { agent: key, taskId, message: effectiveMessage, images: task.attachments.map((a) => ({ dataUrl: a.dataUrl, type: a.type })) }
            : { agent: key, taskId, message: effectiveMessage },
        ),
      });
      const data: { reply?: string; error?: string; usage?: ClaudeUsage } = await res.json();
      if (!res.ok) {
        appendLog(key, `error: ${data.error ?? res.statusText}`, taskId);
        setTask(key, taskId, { reply: data.error ?? "Request failed" });
        appendWorkOpsLog("claude", `Claude error: ${data.error ?? res.statusText}`, { agentName: key });
        return;
      }
      const text = data.reply ?? "";
      setTask(key, taskId, { reply: text, lastClaudeUsage: data.usage ?? null });
      appendLog(key, text.slice(0, 500) + (text.length > 500 ? "…" : ""), taskId);
      appendWorkOpsLog("claude", `Claude ตอบแล้ว (${text.length} ตัวอักษร)`, {
        agentName: key, inputTokens: data.usage?.inputTokens, outputTokens: data.usage?.outputTokens, totalTokens: data.usage?.totalTokens,
      });
      if (typeof data.usage?.totalTokens === "number") {
        appendLog(key, `usage: tok=${data.usage.totalTokens} (in ${data.usage.inputTokens ?? "?"} / out ${data.usage.outputTokens ?? "?"})`, taskId);
      }
      const a = AGENTS.find((x) => x.name.toLowerCase() === key);
      if (a) setUnreadById((prev) => ({ ...prev, [a.id]: 0 }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Network error";
      appendLog(key, `error: ${msg}`, taskId);
      setTask(key, taskId, { reply: msg });
      appendWorkOpsLog("claude", `เครือข่ายล้มเหลว: ${msg}`, { agentName: key });
    } finally {
      claudeSendLocksRef.current.delete(lockKey);
      const attachIds = task.attachments.map((a) => a.id).filter(Boolean);
      if (attachIds.length) void idbDeleteAttachments(attachIds);
      setTask(key, taskId, { loading: false, claudeJobAt: null, input: "", attachments: [] });
    }
  }

  // ─── WezTerm pane list ──────────────────────────────────────────────────────

  const fetchWezTermPanes = useCallback(async () => {
    setPanesLoading(true);
    try {
      const res = await fetch("/api/wezterm", { headers: pulseBridgeHeaders() });
      if (!res.ok) { setWezTermPanes([]); return; }
      const data = await res.json() as { panes?: WezPaneRow[]; enabled?: boolean; error?: string };
      setWezTermPanes(data.panes ?? []);
    } catch {
      setWezTermPanes([]);
    } finally {
      setPanesLoading(false);
    }
  }, []);

  const activatePane = useCallback(async (paneId: number, agentName: string) => {
    appendLog(agentName, `→ activate pane #${paneId}`);
    try {
      const res = await fetch("/api/wezterm", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...pulseBridgeHeaders() },
        body: JSON.stringify({ action: "activate-pane", paneId }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) appendLog(agentName, `✓ pane #${paneId} active`);
      else appendLog(agentName, `✗ ${data.error ?? "error"}`);
    } catch (e) {
      appendLog(agentName, `✗ ${e instanceof Error ? e.message : "error"}`);
    }
  }, [appendLog]);

  // ─── Spawn WezTerm ──────────────────────────────────────────────────────────

  const spawnWezTermForAgent = useCallback(
    async (agent: OracleAgent) => {
      const key = agent.name.toLowerCase();
      setPanel(key, { open: true });
      appendLog(agent.name, `WezTerm ▶ start agent:${agent.name} (${agent.displayId})`);

      const ua = typeof navigator !== "undefined" ? navigator.userAgent.toLowerCase() : "";
      const isWin = ua.includes("windows");
      const isMac = ua.includes("macintosh");

      const actions: any[] = Array.isArray(agentActions[key]) ? agentActions[key] : [];
      const spawnAction = actions.find((a: any) => a?.kind === "wezterm-spawn");

      let body: Record<string, unknown>;
      if (spawnAction) {
        const v = spawnAction.variants as Record<string, string> | undefined;
        const text = v
          ? String(isWin ? (v.localWin ?? spawnAction.text ?? "") : (v.localUnix ?? spawnAction.text ?? ""))
          : typeof spawnAction.text === "string" ? spawnAction.text : "";
        if (!text.trim()) {
          appendLog(agent.name, `WezTerm: ไม่มีคำสั่งสำหรับ ${isWin ? "Windows" : isMac ? "macOS" : "Linux"}`);
          return;
        }
        body = { action: "spawn", argv: tokenizeShell(text), newWindow: true };
      } else {
        if (!shellCacheRef.current) {
          try {
            const pr = await fetch("/api/wezterm?probe-shell=1", { headers: pulseBridgeHeaders() });
            const pd = await pr.json() as { spawnArgv?: string[]; shell?: string; projectCwd?: string };
            if (Array.isArray(pd.spawnArgv) && pd.spawnArgv.length) {
              shellCacheRef.current = pd.spawnArgv;
              if (typeof pd.projectCwd === "string" && pd.projectCwd.trim()) projectCwdRef.current = pd.projectCwd.trim();
              appendLog(agent.name, `  shell probe: ${pd.shell ?? pd.spawnArgv[0]}`);
            }
          } catch { /* fallback */ }
        }
        const fallback = isWin ? ["powershell.exe", "-NoLogo"] : isMac ? ["zsh", "-l"] : ["bash", "-l"];
        const shellBin = (shellCacheRef.current ?? fallback)[0];
        const cwd = projectCwdRef.current;
        const agentTitle = `Oracle: ${agent.name} [${agent.displayId}]`;

        let argv: string[];
        if (isWin) {
          const cdPart = cwd ? `Set-Location '${cwd.replace(/'/g, "''")}'; ` : "";
          const initCmd = `${cdPart}$Host.UI.RawUI.WindowTitle = '${agentTitle}'; claude`;
          argv = ["powershell.exe", "-NoExit", "-NoLogo", "-Command", initCmd];
        } else {
          const cdPart = cwd ? `cd '${cwd.replace(/'/g, "'\\''")}' && ` : "";
          argv = [shellBin, "-c", `${cdPart}exec claude`];
        }
        body = { action: "start", argv };
        appendLog(agent.name, `  start: claude → ${agent.name} (${agent.displayId})`);
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
        if (res.status === 403 || data.enabled === false) {
          appendLog(agent.name, "✗ WezTerm bridge ปิดอยู่ — ตั้งค่า WEZTERM_BRIDGE_ENABLED=1 ใน .env.local");
          return;
        }
        if (data.ok) {
          appendLog(agent.name, `✓ WezTerm เปิดแล้ว${data.paneIdOut != null ? ` — pane ${data.paneIdOut}` : ""}`);
          const entryLabel = (body.argv as string[]).slice(0, 2).join(" ");
          setWezTermHistory((prev) => ({
            ...prev,
            [key]: [{ argv: body.argv as string[], action: String(body.action), ts: Date.now(), label: entryLabel }, ...(prev[key] ?? [])].slice(0, 30),
          }));
        } else {
          const errMsg = String(data.error ?? "unknown");
          appendLog(agent.name, `✗ WezTerm error: ${errMsg}`);
          if (/not found|no such file|cannot find|is not recognized|ENOENT/i.test(errMsg)) {
            if (isWin) appendLog(agent.name, "  → winget install wez.wezterm");
            else if (isMac) appendLog(agent.name, "  → brew install --cask wezterm");
            else appendLog(agent.name, "  → https://wezfurlong.org/wezterm/install/linux.html");
          }
        }
      } catch (e) {
        appendLog(agent.name, `✗ WezTerm fetch error: ${e instanceof Error ? e.message : "network failed"}`);
      }
    },
    [agentActions, appendLog, appendWorkOpsLog, setPanel],
  );

  const respawnWezTermEntry = useCallback(async (agentName: string, entry: WezTermEntry) => {
    const key = agentName.toLowerCase();
    appendLog(agentName, `WezTerm ↩ re-spawn: ${entry.label}  (${new Date(entry.ts).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })})`);
    setHistoryOpenKey(null);
    try {
      const res = await fetch("/api/wezterm", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...pulseBridgeHeaders() },
        body: JSON.stringify({ action: entry.action, argv: entry.argv }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (data.ok) {
        appendLog(agentName, `✓ re-spawn สำเร็จ`);
        setWezTermHistory((prev) => ({
          ...prev,
          [key]: [{ ...entry, ts: Date.now() }, ...(prev[key] ?? []).filter((e) => e.ts !== entry.ts)].slice(0, 30),
        }));
      } else {
        appendLog(agentName, `✗ re-spawn: ${data.error ?? "error"}`);
      }
    } catch (e) {
      appendLog(agentName, `✗ re-spawn: ${e instanceof Error ? e.message : "network error"}`);
    }
  }, [appendLog]);

  // ─── Select agent ───────────────────────────────────────────────────────────

  const selectAgent = useCallback(
    (agent: OracleAgent) => {
      const key = agent.name.toLowerCase();
      setSelected(agent);
      setUnreadById((prev) => ({ ...prev, [agent.id]: 0 }));
      setPanels((prev) => {
        const cur = prev[key];
        const wasOpen = cur?.open ?? false;
        return { ...prev, [key]: { ...(cur ?? makeDefaultPanel()), open: !wasOpen } };
      });
      appendLog(agent.name, `focused: ${agent.name} (${agent.displayId})`);
      appendWorkOpsLog("focus", `โฟกัส agent ${agent.name}`, { agentName: agent.name });
      if (autoOpsEnabled) startOrTouchWorkSession(agent.name, "Auto: focus");
    },
    [appendLog, appendWorkOpsLog, autoOpsEnabled],
  );

  const closePanel = useCallback((agentName: string) => {
    const key = agentName.toLowerCase();
    appendWorkOpsLog("system", `ปิดหน้าต่าง ${key}`);
    setPanels((prev) => ({ ...prev, [key]: { ...(prev[key] ?? makeDefaultPanel()), open: false } }));
    if (selected?.name.toLowerCase() === key) setSelected(null);
  }, [selected]);

  // ─── Config polling ─────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    const load = async (reload: boolean) => {
      try {
        const res = await fetch(`/api/pulse/config${reload ? "?reload=1" : ""}`);
        const j = (await res.json()) as {
          defaultPing?: string; installId?: string;
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
        if (re?.pollIntervalMs != null) setRemotePollMs(Math.min(120_000, Math.max(5000, Number(re.pollIntervalMs) || 20_000)));
        const ao = j.autoOps;
        if (ao && typeof ao === "object") {
          setAutoOpsEnabled(Boolean(ao.enabled ?? true));
          if (ao.idleMs != null) setAutoOpsIdleMs(Math.min(6 * 60 * 60 * 1000, Math.max(60_000, Number(ao.idleMs) || 20 * 60 * 1000)));
        }
      } catch { /* keep defaults */ }
    };
    void load(false);
    const t = setInterval(() => void load(true), 45_000);
    return () => { cancelled = true; clearInterval(t); };
  }, []);

  useEffect(() => {
    if (!remoteEnabled) { setRemoteBanner(null); setAgentRemoteNotes({}); return; }
    let cancelled = false;
    const tick = async () => {
      try {
        const r = await fetch("/api/pulse/remote-state");
        const j = (await r.json()) as { ok?: boolean; data?: { banner?: string; agents?: Record<string, { note?: string; tag?: string }> } };
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
      } catch { /* ignore */ }
    };
    void tick();
    const id = setInterval(() => void tick(), remotePollMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [remoteEnabled, remotePollMs]);

  // ─── Send to pane ───────────────────────────────────────────────────────────

  const sendToBoundPane = useCallback(async (agentName: string, taskId: string) => {
    const key = agentName.toLowerCase();
    const lockKey = `${key}:${taskId}`;
    if (paneSendLocksRef.current.has(lockKey)) { appendLog(key, "blocked: →pane กำลังส่งอยู่", taskId); return; }
    const panel = getPanel(key);
    const task = panel.tasks[taskId] ?? makeDefaultTask(taskId);
    const text = (task.input || "").trim() || defaultPing;
    const now = Date.now();
    if (task.lastPaneSendText === text && task.lastPaneSendAt != null && now - task.lastPaneSendAt < 2000) {
      appendLog(key, "blocked: duplicate →pane (cooldown 2s)", taskId); return;
    }
    paneSendLocksRef.current.add(lockKey);
    setPaneSendPending((prev) => ({ ...prev, [lockKey]: true }));
    try {
      const res = await fetch("/api/pulse/send-to-agent", {
        method: "POST",
        headers: pulseBridgeHeaders(),
        body: JSON.stringify({ agentName: key, text }),
      });
      const data = (await res.json()) as { error?: string; transport?: string; paneId?: number; duplicate?: boolean };
      if (!res.ok) throw new Error(data.error ?? res.statusText);
      if (data.duplicate) { appendLog(key, "→pane: กันซ้ำ (เซิร์ฟเวอร์)", taskId); return; }
      setTask(key, taskId, { lastPaneSendAt: Date.now(), lastPaneSendText: text, input: "" });
      appendLog(key, `pane→${data.transport ?? "?"} #${data.paneId ?? "?"}: ${text.slice(0, 80)}${text.length > 80 ? "…" : ""}`, taskId);
      appendWorkOpsLog("pane", `ส่งไป pane ${data.transport}#${data.paneId}`, { agentName: key });
    } catch (e) {
      appendLog(key, `pane-send: ${e instanceof Error ? e.message : "failed"}`, taskId);
      appendWorkOpsLog("pane", `pane error: ${e instanceof Error ? e.message : "failed"}`, { agentName: key });
    } finally {
      paneSendLocksRef.current.delete(lockKey);
      setPaneSendPending((prev) => ({ ...prev, [lockKey]: false }));
    }
  }, [appendLog, appendWorkOpsLog, defaultPing, getPanel, setTask]);

  // ─── Keyboard shortcuts ─────────────────────────────────────────────────────

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.shiftKey && e.altKey && e.key === "Enter") {
        e.preventDefault();
        if (e.repeat) return;
        if (selected) {
          const panel = getPanel(selected.name);
          void sendToBoundPane(selected.name, panel.activeTaskId);
        }
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
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [appendLog, getPanel, selectAgent, selected, sendToBoundPane]);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800/80 bg-zinc-950/90 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-zinc-900 text-lg font-semibold text-violet-300 ring-1 ring-zinc-800">Ψ</span>
          <div>
            <h1 className="text-sm font-semibold tracking-tight">Oracle Pulse</h1>
            <p className="text-[11px] text-zinc-500">ทีม / MUX · Claude API</p>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-1 rounded-lg bg-zinc-900/60 p-1 ring-1 ring-zinc-800">
          {TABS.map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${tab === t ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200"}`}>
              {t}
            </button>
          ))}
        </nav>
        <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-400">
          <span>{AGENTS.length} agents | {activeCount} active</span>
          <span className="rounded border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-mono text-[10px] text-zinc-300">
            v-next{installId ? ` · ${installId}` : ""}
          </span>
          <span className={`flex items-center gap-1.5 ${isOnline ? "text-emerald-400" : "text-red-400"}`}>
            <span className={`size-2 rounded-full ${isOnline ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.6)]"}`} />
            {isOnline ? "online" : "offline"}
          </span>
        </div>
      </header>

      {/* Sub-header */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-zinc-800/80 bg-zinc-900/40 px-4 py-2 text-[11px] text-zinc-400">
        <span>
          <span className="text-zinc-600">Claude โฟกัส:</span>{" "}
          <span className="font-medium text-violet-200">{selected ? selected.name : "—"}</span>
          {anyLoading ? <span className="ml-2 text-amber-300/90">· กำลังตอบ…</span> : null}
        </span>
        <span className="hidden text-zinc-700 sm:inline">|</span>
        <span className="max-w-md text-zinc-500">Quick Launch · pane (Shift+Alt+Enter) · Shift+1–9</span>
        {remoteBanner ? <span className="max-w-full truncate font-mono text-[10px] text-cyan-400/90">{remoteBanner}</span> : null}
        <button type="button" onClick={() => setTab("WezTerm")}
          className="ml-auto rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1 text-[10px] font-medium text-zinc-300 hover:border-violet-600/50 hover:text-violet-200">
          WezTerm
        </button>
      </div>

      {/* Main content */}
      {tab === "WezTerm" ? (
        <div className="flex flex-1 min-h-0 flex-col overflow-y-auto"><WezTermPanel /></div>
      ) : tab === "Ops" ? (
        <WorkOpsTab claudeLoading={anyLoading} claudeAgent={selected?.name ?? null}
          claudeJobAt={selected ? (() => { const p = getPanel(selected.name); return p.tasks[p.activeTaskId]?.claudeJobAt ?? null; })() : null}
          pricing={pricing} />
      ) : tab === "Tokens" ? (
        <TokenMonitor pricing={pricing} />
      ) : tab === "Agents" ? (
        <div className="flex flex-1 min-h-0">
          <main className="flex min-w-0 flex-1 flex-col gap-4 p-4 md:p-6">
            {/* Category tree */}
            <details className="rounded-lg border border-zinc-800/80 bg-zinc-900/30 px-3 py-2 text-[10px] text-zinc-500 open:pb-3">
              <summary className="cursor-pointer select-none text-zinc-400 hover:text-zinc-300">โครงทีมตามหมวด (core · ops · writing)</summary>
              <div className="mt-2 space-y-1.5 font-mono text-[10px] leading-relaxed text-zinc-500">
                {(["core", "ops", "writing"] as const).map((cat) => (
                  <div key={cat}>
                    <span className="text-violet-400/80">{cat}</span>:{" "}
                    {AGENTS.filter((a) => a.category === cat).map((a) => a.name).join(", ")}
                  </div>
                ))}
              </div>
            </details>

            {/* Category filter */}
            <div className="flex flex-wrap items-center gap-2">
              {(Object.keys(CATEGORY_LABELS) as (AgentCategory | "all")[]).map((key) => (
                <button key={key} type="button" onClick={() => setFilter(key)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${filter === key ? "border-violet-500/60 bg-violet-500/15 text-violet-200" : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"}`}>
                  {CATEGORY_LABELS[key]}
                </button>
              ))}
            </div>

            {/* Agent grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {filtered.map((agent) => {
                const agentPanel = panels[agent.name.toLowerCase()];
                const taskCount = agentPanel ? Object.keys(agentPanel.tasks).length : 0;
                const activeTask = agentPanel?.tasks[agentPanel.activeTaskId];
                const taskInfo = taskCount > 0 ? { activeTitle: activeTask?.title ?? "หลัก", count: taskCount } : undefined;
                return (
                  <AgentCard key={agent.id} agent={agent} selected={selected?.id === agent.id}
                    badge={unreadById[agent.id]} remoteLabel={agentRemoteNotes[agent.name.toLowerCase()]}
                    taskInfo={taskInfo}
                    onSelect={() => selectAgent(agent)} onDoubleClick={() => void spawnWezTermForAgent(agent)} />
                );
              })}
            </div>
          </main>

          {/* Sessions sidebar */}
          <aside className="hidden w-72 shrink-0 border-l border-zinc-800/80 bg-zinc-950/80 lg:flex lg:flex-col">
            <div className="border-b border-zinc-800/80 px-4 py-3">
              <h2 className="text-[11px] font-semibold tracking-[0.2em] text-zinc-500">SESSIONS</h2>
            </div>
            <ul className="flex-1 space-y-1 overflow-y-auto p-2">
              {AGENTS.map((a) => (
                <li key={a.id}>
                  <button type="button" onClick={() => selectAgent(a)}
                    className={`flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-xs transition hover:bg-zinc-900 ${selected?.id === a.id ? "bg-zinc-900 ring-1 ring-violet-500/40" : ""}`}>
                    <span className={`mt-1 size-2 shrink-0 rounded-full ${a.status === "active" ? "bg-emerald-400" : "bg-zinc-600"}`} aria-hidden />
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

      {/* Floating agent panels */}
      {tab === "Agents" ? (
        <div className="pointer-events-none fixed bottom-4 left-4 right-4 z-50 flex flex-wrap items-end justify-start gap-3">
          {Object.entries(panels)
            .filter(([, p]) => p.open)
            .map(([key, panelState]) => {
              const agent = AGENTS.find((a) => a.name.toLowerCase() === key);
              if (!agent) return null;
              const actions = Array.isArray(agentActions[key]) ? agentActions[key] : [];
              const activeTaskId = panelState.activeTaskId;
              const taskList = Object.values(panelState.tasks).sort((a, b) => (a.id === "main" ? -1 : b.id === "main" ? 1 : a.id.localeCompare(b.id)));
              const task = panelState.tasks[activeTaskId] ?? makeDefaultTask(activeTaskId);
              const lockKey = `${key}:${activeTaskId}`;

              return (
                <div key={key}
                  className={`pointer-events-auto w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border bg-zinc-950/95 shadow-2xl shadow-black/50 ring-1 ring-black/40 backdrop-blur ${selected?.name.toLowerCase() === key ? "border-violet-500/50" : "border-zinc-800"}`}>

                  {/* Panel header */}
                  <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-3 py-2">
                    <button type="button" onClick={() => selectAgent(agent)}
                      className="text-sm font-medium capitalize text-zinc-100 hover:text-violet-200" title="Focus">
                      {agent.emoji} {agent.name}
                    </button>
                    <div className="relative flex items-center gap-1">
                      {/* WezTerm history dropdown */}
                      {(wezTermHistory[key]?.length ?? 0) > 0 && (
                        <div className="relative">
                          <button type="button"
                            onClick={() => setHistoryOpenKey(historyOpenKey === key ? null : key)}
                            className={`rounded-md px-1.5 py-1 text-[11px] transition ${historyOpenKey === key ? "bg-zinc-700 text-zinc-200" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"}`}
                            title="ประวัติ WezTerm sessions">⏮</button>
                          {historyOpenKey === key && (
                            <div className="absolute right-0 top-full z-50 mt-1 w-64 overflow-hidden rounded-lg border border-zinc-700 bg-zinc-900 shadow-xl">
                              <div className="border-b border-zinc-800 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                                WezTerm History
                              </div>
                              <ul className="max-h-48 overflow-y-auto">
                                {(wezTermHistory[key] ?? []).map((entry, i) => (
                                  <li key={`${entry.ts}-${i}`}>
                                    <button type="button"
                                      onClick={() => void respawnWezTermEntry(agent.name, entry)}
                                      className="flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-zinc-800">
                                      <span className="truncate text-[11px] font-medium text-zinc-200">{entry.label}</span>
                                      <span className="text-[10px] text-zinc-500">
                                        {new Date(entry.ts).toLocaleDateString("th-TH", { month: "short", day: "numeric" })}{" "}
                                        {new Date(entry.ts).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })}
                                      </span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                      <button type="button" onClick={() => void spawnWezTermForAgent(agent)}
                        className="rounded-md px-2 py-1 text-xs text-zinc-400 transition hover:bg-emerald-900/50 hover:text-emerald-300"
                        title="เปิด WezTerm window ใหม่">⌨</button>
                      <button type="button" onClick={() => closePanel(key)}
                        className="rounded-md px-2 py-1 text-xs text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                        aria-label={`Close ${agent.name}`}>×</button>
                    </div>
                  </div>

                  {/* Task tabs */}
                  <div className="flex items-center gap-1 overflow-x-auto border-b border-zinc-800/60 bg-zinc-900/40 px-2 py-1 scrollbar-none">
                    {taskList.map((t) => (
                      <div key={t.id} className="flex shrink-0 items-center">
                        {editingTaskId === `${key}:${t.id}` ? (
                          <input
                            autoFocus
                            className="h-6 w-28 rounded border border-violet-500/50 bg-zinc-800 px-1 text-[11px] text-zinc-100 focus:outline-none"
                            defaultValue={t.title}
                            onBlur={(e) => { renameTask(key, t.id, e.target.value); setEditingTaskId(null); }}
                            onKeyDown={(e) => { if (e.key === "Enter") { renameTask(key, t.id, e.currentTarget.value); setEditingTaskId(null); } if (e.key === "Escape") setEditingTaskId(null); }}
                          />
                        ) : (
                          <button type="button"
                            onClick={() => setPanel(key, { activeTaskId: t.id })}
                            onDoubleClick={() => setEditingTaskId(`${key}:${t.id}`)}
                            title="คลิก: เลือก task  |  ดับเบิ้ลคลิก: เปลี่ยนชื่อ"
                            className={`flex h-6 items-center gap-1 rounded px-2 text-[11px] transition ${activeTaskId === t.id ? "bg-violet-600/30 text-violet-200 ring-1 ring-violet-500/40" : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"}`}>
                            <span className="max-w-[6rem] truncate">{t.title}</span>
                            {t.loading && <span className="text-amber-300/80">●</span>}
                          </button>
                        )}
                        {t.id !== "main" && (
                          <button type="button"
                            onClick={() => closeTask(key, t.id)}
                            className="ml-0.5 flex size-4 items-center justify-center rounded text-[10px] text-zinc-600 hover:bg-zinc-700 hover:text-zinc-200"
                            title="ปิด task นี้">×</button>
                        )}
                      </div>
                    ))}
                    <button type="button" onClick={() => addTask(key)}
                      className="ml-1 flex h-6 shrink-0 items-center justify-center rounded px-1.5 text-[11px] text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200"
                      title="เพิ่ม task ใหม่">+</button>
                  </div>

                  {/* WezTerm pane list */}
                  <div className="border-b border-zinc-800/50">
                    <button type="button"
                      onClick={() => {
                        const next = panesExpandedKey === key ? null : key;
                        setPanesExpandedKey(next);
                        if (next) void fetchWezTermPanes();
                      }}
                      className="flex w-full items-center justify-between px-3 py-1.5 text-[11px] text-zinc-500 hover:bg-zinc-800/30">
                      <span className="flex items-center gap-1.5">
                        <span>🖥</span>
                        <span>WezTerm Panes</span>
                        {wezTermPanes != null && <span className="rounded-full bg-zinc-800 px-1.5 text-[10px] text-zinc-400">{wezTermPanes.length}</span>}
                      </span>
                      <span className="flex items-center gap-1">
                        {panesExpandedKey === key && (
                          <span onClick={(e) => { e.stopPropagation(); void fetchWezTermPanes(); }}
                            className="rounded px-1 text-[10px] hover:text-zinc-200" title="Refresh">↻</span>
                        )}
                        <span className="text-[10px]">{panesExpandedKey === key ? "▲" : "▼"}</span>
                      </span>
                    </button>
                    {panesExpandedKey === key && (
                      <div className="max-h-36 overflow-y-auto bg-zinc-950/40">
                        {panesLoading ? (
                          <div className="px-3 py-2 text-[11px] text-zinc-500">กำลังโหลด…</div>
                        ) : !wezTermPanes?.length ? (
                          <div className="px-3 py-2 text-[11px] text-zinc-500">ไม่พบ pane — เปิด WezTerm ก่อน</div>
                        ) : (
                          wezTermPanes.map((pane) => (
                            <button key={pane.pane_id} type="button"
                              onClick={() => void activatePane(pane.pane_id, agent.name)}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition hover:bg-zinc-800/70">
                              <span className="shrink-0 font-mono text-[10px] text-zinc-600">#{pane.pane_id}</span>
                              <span className="min-w-0 flex-1 truncate text-[11px] text-zinc-200">{pane.title || "—"}</span>
                              <span className="shrink-0 max-w-[5rem] truncate text-[10px] text-zinc-500" title={pane.cwd}>
                                {pane.cwd ? pane.cwd.replace(/^.*[/\\]([^/\\]+)$/, "$1") : ""}
                              </span>
                              <span className="shrink-0 rounded bg-zinc-800 px-1 text-[9px] text-zinc-500">▶</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {/* Logs */}
                  <div className="max-h-40 overflow-y-auto px-3 py-2 font-mono text-[11px] leading-relaxed text-zinc-300">
                    {task.logs.map((line, i) => (
                      <div key={`${i}-${line.slice(0, 24)}`} className="whitespace-pre-wrap break-words">{line}</div>
                    ))}
                    {task.loading && <div className="text-zinc-500">กำลังตอบ…</div>}
                  </div>

                  {/* Quick actions */}
                  {actions.length ? (
                    <div className="border-t border-zinc-800 px-3 py-2">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Quick Actions</div>
                      <div className="mt-1.5 space-y-1">
                        {actions.slice(0, 6).map((a: any) => (
                          <button key={String(a.id ?? a.title)} type="button"
                            onClick={async () => {
                              const dedupKey = `${key}:${String(a.id ?? a.title)}`;
                              const t = Date.now();
                              if (t - (quickActionLastAtRef.current[dedupKey] ?? 0) < 500) return;
                              quickActionLastAtRef.current[dedupKey] = t;
                              const kind = String(a.kind ?? "copy");
                              const text = typeof a.text === "string" ? a.text : "";
                              if (kind === "pane") { setTask(key, activeTaskId, { input: text }); return; }
                              if (kind === "link" && typeof a.url === "string") { window.open(a.url, "_blank", "noopener,noreferrer"); return; }
                              if (text) { try { await navigator.clipboard.writeText(text); } catch { appendLog(key, "copy: clipboard failed", activeTaskId); } }
                            }}
                            className="w-full rounded-md border border-zinc-800 bg-zinc-900/50 px-2 py-1.5 text-left text-[11px] text-zinc-300 hover:bg-zinc-800/60">
                            <div className="font-medium text-zinc-100">{String(a.title ?? "Action")}</div>
                            {a.detail ? <div className="text-[10px] text-zinc-500">{String(a.detail)}</div> : null}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Input area */}
                  <div className="border-t border-zinc-800 p-2"
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); const files = e.dataTransfer?.files; if (files?.length) void addAttachments(key, activeTaskId, files); }}>
                    {task.attachments.length ? (
                      <div className="mb-2 flex flex-wrap gap-2">
                        {task.attachments.map((a, idx) => (
                          <div key={`${idx}-${a.name}`} className="group relative overflow-hidden rounded-md border border-zinc-800 bg-zinc-900/40">
                            <img src={a.dataUrl} alt={a.name} className="h-12 w-12 object-cover" />
                            <button type="button" onClick={() => removeAttachment(key, activeTaskId, idx)}
                              className="absolute right-1 top-1 rounded bg-black/60 px-1 text-[10px] text-zinc-200 hover:bg-black/70">×</button>
                          </div>
                        ))}
                        <div className="flex items-center gap-2 text-[10px] text-zinc-500">
                          <button type="button" onClick={() => clearAttachments(key, activeTaskId)}
                            className="rounded border border-zinc-800 bg-zinc-900/50 px-2 py-1 text-[10px] font-medium text-zinc-200 hover:bg-zinc-800/60">ล้างรูป</button>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-2 text-[10px] text-zinc-600">ลากรูปมาวางตรงนี้เพื่อแนบ</div>
                    )}
                    <div className="flex gap-2">
                      <label className="shrink-0 cursor-pointer rounded-md border border-zinc-800 bg-zinc-900/60 px-2 py-1.5 text-[10px] font-medium text-zinc-200 hover:bg-zinc-800/60">
                        รูป
                        <input type="file" accept="image/*" multiple className="hidden"
                          onChange={(e) => { const files = e.target.files; if (files?.length) void addAttachments(key, activeTaskId, files); e.currentTarget.value = ""; }} />
                      </label>
                      <input
                        className="min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
                        placeholder="ถามอะไรก็ได้…"
                        value={task.input}
                        onChange={(e) => setTask(key, activeTaskId, { input: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            if (e.repeat) return;
                            e.preventDefault();
                            void sendMessage(key, activeTaskId);
                          }
                        }}
                        disabled={task.loading || Boolean(paneSendPending[lockKey])}
                      />
                      <button type="button" onClick={() => void sendMessage(key, activeTaskId)}
                        disabled={task.loading || Boolean(paneSendPending[lockKey]) || (!task.input.trim() && task.attachments.length === 0)}
                        className="shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40">
                        {task.loading ? "…" : "ส่ง"}
                      </button>
                      <button type="button" title="ส่งไปยัง pane ที่ผูกใน config"
                        onClick={() => void sendToBoundPane(key, activeTaskId)}
                        disabled={task.loading || Boolean(paneSendPending[lockKey])}
                        className="shrink-0 rounded-md border border-cyan-800/60 bg-cyan-950/40 px-2 py-1.5 text-[10px] font-medium text-cyan-200/90 hover:bg-cyan-900/50 disabled:opacity-40">
                        →pane
                      </button>
                    </div>

                    {task.lastClaudeUsage?.totalTokens != null && !task.loading ? (
                      <div className="mt-2 text-[10px] text-zinc-500">
                        tokens: <span className="font-mono text-amber-300/90">
                          {task.lastClaudeUsage.totalTokens.toLocaleString()}
                          {task.lastClaudeUsage.inputTokens != null || task.lastClaudeUsage.outputTokens != null
                            ? ` (in ${task.lastClaudeUsage.inputTokens?.toLocaleString() ?? "?"} / out ${task.lastClaudeUsage.outputTokens?.toLocaleString() ?? "?"})`
                            : ""}
                        </span>
                      </div>
                    ) : null}
                    {task.reply && !task.loading ? <p className="mt-2 line-clamp-4 text-[11px] text-zinc-400">{task.reply}</p> : null}
                  </div>
                </div>
              );
            })}
        </div>
      ) : null}
    </div>
  );
}
