"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AGENTS, type OracleAgent } from "@/lib/agents";

type Action = {
  id: string;
  label: string;
  sub?: string;
  icon?: string;
  group: string;
  onRun: () => void;
};

type Props = {
  onSelectAgent: (agent: OracleAgent) => void;
  onSpawnWezTerm: (agent: OracleAgent) => void;
  onAddTask: (agentKey: string) => void;
  onSendMessage: (agentKey: string, taskId: string, text: string) => void;
  activePanels: Record<string, { open: boolean; activeTaskId: string; tasks: Record<string, { title: string }> }>;
};

export function CommandPalette({ onSelectAgent, onSpawnWezTerm, onAddTask, onSendMessage, activePanels }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // ─── Open / close ───────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQuery("");
        setCursor(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
  }, [open]);

  // ─── Build actions ──────────────────────────────────────────────────────────
  const buildActions = useCallback((): Action[] => {
    const actions: Action[] = [];

    // Agent quick-open
    for (const agent of AGENTS) {
      actions.push({
        id: `agent:${agent.name}`,
        label: `${agent.emoji} ${agent.name}`,
        sub: agent.sessionNote,
        group: "Agents",
        onRun: () => { onSelectAgent(agent); setOpen(false); },
      });
      actions.push({
        id: `wez:${agent.name}`,
        label: `⌨ WezTerm → ${agent.name}`,
        sub: "เปิด Claude ใน terminal",
        group: "WezTerm",
        onRun: () => { onSpawnWezTerm(agent); setOpen(false); },
      });
      // Active tasks for this agent
      const panel = activePanels[agent.name.toLowerCase()];
      if (panel?.open) {
        for (const [tid, task] of Object.entries(panel.tasks)) {
          actions.push({
            id: `task:${agent.name}:${tid}`,
            label: `📋 ${agent.name} › ${task.title}`,
            sub: tid === panel.activeTaskId ? "active" : "task",
            group: "Tasks",
            onRun: () => { onSelectAgent(agent); setOpen(false); },
          });
        }
        actions.push({
          id: `newtask:${agent.name}`,
          label: `+ New task — ${agent.name}`,
          sub: "สร้าง task ใหม่",
          group: "Tasks",
          onRun: () => { onAddTask(agent.name.toLowerCase()); setOpen(false); },
        });
      }
    }

    // Quick send to active agent
    const q = query.startsWith(">") ? query.slice(1).trim() : "";
    if (q) {
      for (const agent of AGENTS) {
        const panel = activePanels[agent.name.toLowerCase()];
        if (!panel?.open) continue;
        actions.unshift({
          id: `send:${agent.name}`,
          label: `▶ ส่งให้ ${agent.emoji} ${agent.name}: "${q.slice(0, 40)}"`,
          sub: "Enter เพื่อส่ง",
          group: "Send",
          onRun: () => {
            onSendMessage(agent.name.toLowerCase(), panel.activeTaskId, q);
            setOpen(false);
            setQuery("");
          },
        });
      }
    }

    return actions;
  }, [activePanels, onAddTask, onSelectAgent, onSendMessage, onSpawnWezTerm, query]);

  // ─── Filter ─────────────────────────────────────────────────────────────────
  const rawQ = query.startsWith(">") ? "" : query.toLowerCase();
  const all = buildActions();
  const filtered = rawQ
    ? all.filter((a) => `${a.label} ${a.sub ?? ""} ${a.group}`.toLowerCase().includes(rawQ))
    : query.startsWith(">")
      ? all.filter((a) => a.group === "Send")
      : all;

  // Group them
  const grouped: Record<string, Action[]> = {};
  for (const a of filtered.slice(0, 60)) {
    (grouped[a.group] ??= []).push(a);
  }
  const flat = Object.values(grouped).flat();

  // ─── Keyboard nav ───────────────────────────────────────────────────────────
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, flat.length - 1)); }
    if (e.key === "ArrowUp")   { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    if (e.key === "Enter" && flat[cursor]) { flat[cursor].onRun(); }
  };

  useEffect(() => {
    const el = listRef.current?.children[cursor] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  useEffect(() => { setCursor(0); }, [query]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/60 backdrop-blur-sm pt-[10vh]"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-900 shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-zinc-800 px-4 py-3">
          <span className="text-zinc-500">⌕</span>
          <input
            ref={inputRef}
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
            placeholder="พิมพ์ชื่อ agent / task…  หรือ > ข้อความ เพื่อส่งทันที"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />
          <kbd className="rounded border border-zinc-700 bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-500">Esc</kbd>
        </div>

        {/* Results */}
        <ul ref={listRef} className="max-h-[60vh] overflow-y-auto py-2">
          {Object.entries(grouped).map(([group, items]) => (
            <li key={group}>
              <div className="px-4 py-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">{group}</div>
              {items.map((action) => {
                const idx = flat.indexOf(action);
                return (
                  <button
                    key={action.id}
                    type="button"
                    onClick={action.onRun}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left transition ${idx === cursor ? "bg-violet-600/25 text-violet-100" : "text-zinc-300 hover:bg-zinc-800"}`}
                  >
                    <span className="flex-1 truncate text-sm">{action.label}</span>
                    {action.sub && (
                      <span className="shrink-0 truncate text-[11px] text-zinc-500">{action.sub}</span>
                    )}
                  </button>
                );
              })}
            </li>
          ))}
          {flat.length === 0 && (
            <li className="px-4 py-6 text-center text-sm text-zinc-500">ไม่พบ — ลองพิมพ์ชื่อ agent หรือ &gt; ข้อความ</li>
          )}
        </ul>

        {/* Footer hint */}
        <div className="flex items-center gap-4 border-t border-zinc-800 px-4 py-2 text-[10px] text-zinc-600">
          <span><kbd className="rounded border border-zinc-700 bg-zinc-800 px-1">↑↓</kbd> เลือก</span>
          <span><kbd className="rounded border border-zinc-700 bg-zinc-800 px-1">Enter</kbd> ยืนยัน</span>
          <span><kbd className="rounded border border-zinc-700 bg-zinc-800 px-1">&gt; ข้อความ</kbd> ส่งให้ agent</span>
          <span className="ml-auto"><kbd className="rounded border border-zinc-700 bg-zinc-800 px-1">Ctrl+K</kbd> toggle</span>
        </div>
      </div>
    </div>
  );
}
