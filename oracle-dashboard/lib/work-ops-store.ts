/**
 * สถานะงาน / log / จับเวลา — เก็บ localStorage (เบราว์เซอร์เดียวกัน)
 */

import { useSyncExternalStore } from "react";

export type WorkOpsLogKind = "system" | "claude" | "pane" | "mission" | "session" | "focus" | "task";

export type WorkOpsLogEntry = {
  id: string;
  ts: number;
  kind: WorkOpsLogKind;
  agentName?: string;
  message: string;
  durationMs?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
};

export type WorkSession = {
  agentName: string;
  startedAt: number;
  lastActivityAt: number;
  label: string;
};

export type WorkOpsSnapshot = {
  log: WorkOpsLogEntry[];
  sessions: Record<string, WorkSession>;
  version: number;
};

const STORAGE_LOG = "oracle-pulse-ops-log-v1";
const STORAGE_SESSIONS = "oracle-pulse-ops-sessions-v1";
const MAX_LOG = 400;

let snapshot: WorkOpsSnapshot = { log: [], sessions: {}, version: 0 };
const listeners = new Set<() => void>();
let hydrated = false;

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function emit() {
  snapshot = {
    log: snapshot.log,
    sessions: snapshot.sessions,
    version: snapshot.version + 1,
  };
  listeners.forEach((l) => l());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_LOG, JSON.stringify(snapshot.log.slice(-MAX_LOG)));
    localStorage.setItem(STORAGE_SESSIONS, JSON.stringify(snapshot.sessions));
  } catch {
    /* quota */
  }
}

function hydrateIfNeeded() {
  if (typeof window === "undefined") return;
  if (hydrated) return;
  hydrated = true;
  try {
    const rawLog = localStorage.getItem(STORAGE_LOG);
    if (rawLog) {
      const parsed: unknown = JSON.parse(rawLog);
      if (Array.isArray(parsed)) snapshot.log = parsed as WorkOpsLogEntry[];
    }
    const rawS = localStorage.getItem(STORAGE_SESSIONS);
    if (rawS) {
      const parsed: unknown = JSON.parse(rawS);
      if (parsed && typeof parsed === "object") snapshot.sessions = parsed as Record<string, WorkSession>;
    }
  } catch {
    /* ignore */
  }
  emit();
}

export function subscribeWorkOps(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getWorkOpsSnapshot(): WorkOpsSnapshot {
  hydrateIfNeeded();
  return snapshot;
}

function pushLog(entries: WorkOpsLogEntry[]) {
  snapshot.log = [...snapshot.log, ...entries].slice(-MAX_LOG);
}

export function appendWorkOpsLog(
  kind: WorkOpsLogKind,
  message: string,
  opts?: { agentName?: string; durationMs?: number; inputTokens?: number; outputTokens?: number; totalTokens?: number },
) {
  hydrateIfNeeded();
  pushLog([
    {
      id: uid(),
      ts: Date.now(),
      kind,
      message,
      agentName: opts?.agentName?.toLowerCase(),
      durationMs: opts?.durationMs,
      inputTokens: opts?.inputTokens,
      outputTokens: opts?.outputTokens,
      totalTokens: opts?.totalTokens,
    },
  ]);
  persist();
  emit();
}

export function startWorkSession(agentName: string, label: string) {
  hydrateIfNeeded();
  const key = agentName.trim().toLowerCase();
  const prev = snapshot.sessions[key];
  const nextSessions: Record<string, WorkSession> = { ...snapshot.sessions };
  const newLines: WorkOpsLogEntry[] = [];
  if (prev) {
    const dur = Date.now() - prev.startedAt;
    delete nextSessions[key];
    newLines.push({
      id: uid(),
      ts: Date.now(),
      kind: "task",
      agentName: key,
      message: `แทนที่งานเดิม — จบ "${prev.label}"`,
      durationMs: dur,
    });
  }
  const now = Date.now();
  nextSessions[key] = { agentName: key, startedAt: now, lastActivityAt: now, label: label.trim() || "งาน" };
  newLines.push({
    id: uid(),
    ts: Date.now(),
    kind: "session",
    agentName: key,
    message: `เริ่มงาน: ${label.trim() || "งาน"}`,
  });
  snapshot.sessions = nextSessions;
  pushLog(newLines);
  persist();
  emit();
}

export function touchWorkSession(agentName: string) {
  hydrateIfNeeded();
  const key = agentName.trim().toLowerCase();
  const s = snapshot.sessions[key];
  if (!s) return;
  snapshot.sessions = { ...snapshot.sessions, [key]: { ...s, lastActivityAt: Date.now() } };
  persist();
  emit();
}

export function startOrTouchWorkSession(agentName: string, label: string) {
  hydrateIfNeeded();
  const key = agentName.trim().toLowerCase();
  if (snapshot.sessions[key]) {
    touchWorkSession(key);
    return;
  }
  startWorkSession(key, label);
}

export function endWorkSession(agentName: string) {
  hydrateIfNeeded();
  const key = agentName.trim().toLowerCase();
  const s = snapshot.sessions[key];
  if (!s) return;
  const dur = Date.now() - s.startedAt;
  const { [key]: _, ...rest } = snapshot.sessions;
  snapshot.sessions = rest;
  pushLog([
    {
      id: uid(),
      ts: Date.now(),
      kind: "task",
      agentName: key,
      message: `จบงาน: ${s.label}`,
      durationMs: dur,
    },
  ]);
  persist();
  emit();
}

export function clearWorkOpsLog() {
  hydrateIfNeeded();
  snapshot.log = [];
  persist();
  emit();
}

export function exportWorkOpsJson(): string {
  hydrateIfNeeded();
  return JSON.stringify({ exportedAt: new Date().toISOString(), log: snapshot.log, sessions: snapshot.sessions }, null, 2);
}

export function formatDurationThai(ms: number): string {
  if (ms < 1000) return `${ms} ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s} วิ`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m} นาที ${rs} วิ`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h} ชม. ${rm} นาที`;
}

export function useWorkOpsStore(): WorkOpsSnapshot {
  return useSyncExternalStore(subscribeWorkOps, getWorkOpsSnapshot, getWorkOpsSnapshot);
}
