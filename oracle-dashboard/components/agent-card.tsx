"use client";

import { useRef } from "react";
import type { OracleAgent } from "@/lib/agents";

type AgentCardProps = {
  agent: OracleAgent;
  selected: boolean;
  badge?: number;
  /** จาก remote state / automation (Oracle รุ่นอื่น) */
  remoteLabel?: string;
  onSelect: () => void;
  /** ดับเบิ้ลคลิก → spawn WezTerm window ของ agent นี้ */
  onDoubleClick?: () => void;
};

export function AgentCard({ agent, selected, badge, remoteLabel, onSelect, onDoubleClick }: AgentCardProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = () => {
    if (!onDoubleClick) { onSelect(); return; }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      onDoubleClick();
      return;
    }
    timerRef.current = setTimeout(() => { timerRef.current = null; onSelect(); }, 220);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title="คลิก: เปิด panel  |  ดับเบิ้ลคลิก: เปิด WezTerm"
      className={`group relative flex aspect-square flex-col items-center justify-center rounded-xl border bg-zinc-900/80 p-3 text-center transition hover:bg-zinc-800/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70 ${
        selected
          ? "border-violet-500 shadow-[0_0_0_1px_rgba(139,92,246,0.35)]"
          : "border-zinc-800 hover:border-zinc-700"
      }`}
    >
      {selected && (
        <span
          className="absolute right-2 top-2 size-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]"
          aria-hidden
        />
      )}
      {badge != null && badge > 0 && (
        <span className="absolute left-2 top-2 flex min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold leading-none text-white">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
      <span className="text-4xl transition group-hover:scale-105" aria-hidden>
        {agent.emoji}
      </span>
      <span className="mt-2 w-full truncate text-sm font-medium capitalize text-zinc-100">
        {agent.name}
      </span>
      <span className="text-[11px] tabular-nums text-zinc-500">{agent.displayId}</span>
      {remoteLabel ? (
        <span className="mt-1 line-clamp-2 w-full text-[9px] leading-tight text-cyan-500/90">{remoteLabel}</span>
      ) : null}
    </button>
  );
}
