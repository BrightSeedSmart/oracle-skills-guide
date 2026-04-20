"use client";

import { useState } from "react";
import { TmuxPanel } from "@/components/tmux-panel";
import { WezTermPanel } from "@/components/wezterm-panel";

const SUB = ["WezTerm", "tmux", "คีย์ลัด"] as const;

export function MissionControlPanel() {
  const [sub, setSub] = useState<(typeof SUB)[number]>("WezTerm");

  return (
    <div className="flex flex-1 min-h-0 flex-col">
      <div className="flex flex-wrap gap-1 border-b border-zinc-800/90 bg-zinc-950/80 px-3 py-2">
        {SUB.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSub(s)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              sub === s ? "bg-zinc-800 text-white ring-1 ring-zinc-700" : "text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {sub === "WezTerm" ? (
          <WezTermPanel />
        ) : sub === "tmux" ? (
          <TmuxPanel />
        ) : (
          <div className="mx-auto max-w-2xl space-y-5 p-6 text-sm text-zinc-300">
            <h2 className="text-base font-semibold text-violet-200">Mission Control — คีย์ลัด</h2>
            <p className="text-xs leading-relaxed text-zinc-500">
              ลด friction: ใช้คีย์ลัดเลือก Claude agent โดยไม่ต้องคลิก — ทำงานเมื่อโฟกัสไม่อยู่ในช่องพิมพ์ (input / textarea / select)
            </p>
            <ul className="list-inside list-disc space-y-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-400">
              <li>
                <kbd className="rounded border border-zinc-600 bg-zinc-950 px-1.5 py-0.5 font-mono text-zinc-200">
                  Shift+Alt+1–9
                </kbd>{" "}
                = Quick Launch ตามสล็อตในแถบ Mission (โหลดจาก config / public JSON)
              </li>
              <li>
                <kbd className="rounded border border-zinc-600 bg-zinc-950 px-1.5 py-0.5 font-mono text-zinc-200">
                  Shift+Alt+Enter
                </kbd>{" "}
                = ส่งข้อความในช่อง (หรือ defaultPing) ไป pane ที่ผูกกับ agent โฟกัส — ต้องตั้ง{" "}
                <code className="text-zinc-500">agentTargets</code> ใน config
              </li>
              <li>
                <kbd className="rounded border border-zinc-600 bg-zinc-950 px-1.5 py-0.5 font-mono text-zinc-200">
                  Shift+Alt+n
                </kbd>{" "}
                /{" "}
                <kbd className="rounded border border-zinc-600 bg-zinc-950 px-1.5 py-0.5 font-mono text-zinc-200">k</kbd>{" "}
                = session ใหม่ (โฟกัส oracle) / ปิดแชต Claude
              </li>
              <li>
                <kbd className="rounded border border-zinc-600 bg-zinc-950 px-1.5 py-0.5 font-mono text-zinc-200">
                  Shift+1
                </kbd>{" "}
                ถึง{" "}
                <kbd className="rounded border border-zinc-600 bg-zinc-950 px-1.5 py-0.5 font-mono text-zinc-200">9</kbd>{" "}
                = โฟกัส agent ลำดับที่ 1–9 ในรายการ Oracle
              </li>
              <li>
                <kbd className="rounded border border-zinc-600 bg-zinc-950 px-1.5 py-0.5 font-mono text-zinc-200">
                  Shift+0
                </kbd>{" "}
                = agent ลำดับที่ 10
              </li>
              <li>หลังกดจะสลับไปแท็บ Agents และเปิดแชต Claude ของ agent นั้น (เมื่อไม่ได้พิมพ์ในช่องข้อความ)</li>
              <li>
                แท็บ <strong className="text-zinc-300">Ops</strong>: จับเวลางานต่อ agent ว่าง/ไม่ว่าง ประวัติ session และ log การกระทำ (เก็บในเบราว์เซอร์)
              </li>
              <li>
                Config: <code className="text-zinc-500">config/oracle-pulse.config.json</code> หรือ{" "}
                <code className="text-zinc-500">ORACLE_PULSE_CONFIG_PATH</code> · โอเวอร์ไรด์สล็อตด้วย{" "}
                <code className="text-zinc-500">public/oracle-pulse-slots.json</code>
              </li>
            </ul>
            <p className="text-xs text-zinc-600">
              WezTerm: ตั้งคีย์ใน <code className="text-zinc-500">wezterm.lua</code> ให้เปิดเบราว์เซอร์ที่ Pulse หรือยิง HTTP
              มาที่ bridge ได้ (ขั้นสูง)
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
