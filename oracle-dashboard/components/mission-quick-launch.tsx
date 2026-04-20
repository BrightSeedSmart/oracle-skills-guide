"use client";

import type { MissionSlot } from "@/lib/mission-slots";

type MissionQuickLaunchProps = {
  slots: MissionSlot[];
  activeSlotId: string | null;
  onSlot: (id: string) => void;
  onNewSession: () => void;
  onKillSession: () => void;
};

export function MissionQuickLaunch({ slots, activeSlotId, onSlot, onNewSession, onKillSession }: MissionQuickLaunchProps) {
  return (
    <div className="border-b border-cyan-950/50 bg-gradient-to-b from-zinc-950 to-zinc-900/90 px-3 py-2">
      <div className="mb-2 flex flex-wrap items-center gap-2 border border-cyan-900/40 bg-cyan-950/20 px-2 py-1.5 font-mono text-[10px] text-cyan-200/90 sm:text-[11px]">
        <span aria-hidden>🔮</span>
        <span className="font-semibold tracking-wide text-cyan-100">ORACLE MISSION CONTROL</span>
        <span className="text-cyan-600/80">·</span>
        <span className="text-cyan-400/70">Quick Launch</span>
        {activeSlotId ? (
          <>
            <span className="text-zinc-600">|</span>
            <span className="text-emerald-400/90">
              <span className="text-zinc-500">▸</span> slot [{activeSlotId}]
            </span>
          </>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-1.5 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6">
          {slots.map((slot) => {
            const hot = activeSlotId === slot.id;
            return (
              <button
                key={slot.id}
                type="button"
                title={slot.detail}
                onClick={() => onSlot(slot.id)}
                className={`group flex min-w-0 flex-col rounded-md border px-2 py-1.5 text-left transition ${
                  hot
                    ? "border-cyan-500/70 bg-cyan-950/50 text-cyan-50 shadow-[0_0_12px_rgba(34,211,238,0.12)]"
                    : "border-zinc-800 bg-zinc-900/60 text-zinc-300 hover:border-cyan-800/60 hover:bg-zinc-900"
                }`}
              >
                <span className="font-mono text-[10px] text-cyan-500/90">[{slot.id}]</span>
                <span className="text-[11px] font-medium capitalize text-zinc-100">{slot.title}</span>
                <span className="line-clamp-2 text-[9px] leading-tight text-zinc-500 group-hover:text-zinc-400">
                  {slot.detail}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex shrink-0 gap-1 border-t border-zinc-800 pt-2 lg:border-l lg:border-t-0 lg:pl-2 lg:pt-0">
          <button
            type="button"
            onClick={onNewSession}
            title="สร้าง session ใหม่ (รีเซ็ตล็อก + โฟกัส oracle)"
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-[10px] text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
          >
            [n] new
          </button>
          <button
            type="button"
            onClick={onKillSession}
            title="ปิดแชต Claude ล่าง"
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 font-mono text-[10px] text-zinc-400 hover:border-red-900/50 hover:text-red-300/90"
          >
            [k] kill
          </button>
        </div>
      </div>

      <p className="mt-1.5 hidden font-mono text-[9px] text-zinc-600 sm:block">
        Shift+Alt+1–9 = Quick Launch · Shift+Alt+Enter = ส่งข้อความไป pane ที่ผูกกับ agent โฟกัส · Shift+Alt+n/k · Shift+0–9
      </p>
    </div>
  );
}
