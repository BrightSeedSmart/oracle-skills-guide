"use client";

import { useEffect, useMemo, useState } from "react";
import { AGENTS } from "@/lib/agents";
import {
  appendWorkOpsLog,
  clearWorkOpsLog,
  endWorkSession,
  exportWorkOpsJson,
  formatDurationThai,
  startWorkSession,
  useWorkOpsStore,
} from "@/lib/work-ops-store";

type WorkOpsTabProps = {
  claudeLoading: boolean;
  claudeAgent: string | null;
  claudeJobAt: number | null;
  pricing: { usdPer1MInput: number; usdPer1MOutput: number; usdToThb: number } | null;
};

function nowMs() {
  return Date.now();
}

export function WorkOpsTab({ claudeLoading, claudeAgent, claudeJobAt, pricing }: WorkOpsTabProps) {
  const snap = useWorkOpsStore();
  const [, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const sessionList = useMemo(() => Object.values(snap.sessions), [snap.sessions, snap.version]);
  const busyAgents = useMemo(() => new Set(sessionList.map((s) => s.agentName)), [sessionList]);

  const idleAgents = useMemo(
    () =>
      AGENTS.filter((a) => {
        const n = a.name.toLowerCase();
        if (busyAgents.has(n)) return false;
        if (claudeLoading && claudeAgent && claudeAgent.toLowerCase() === n) return false;
        return true;
      }),
    [busyAgents, claudeAgent, claudeLoading],
  );

  const historyRows = useMemo(
    () => [...snap.log].filter((e) => e.kind === "task").reverse().slice(0, 80),
    [snap.log, snap.version],
  );

  const totals = useMemo(() => {
    let inTok = 0;
    let outTok = 0;
    let totalTok = 0;
    for (const e of snap.log) {
      if (typeof e.inputTokens === "number") inTok += e.inputTokens;
      if (typeof e.outputTokens === "number") outTok += e.outputTokens;
      if (typeof e.totalTokens === "number") totalTok += e.totalTokens;
    }
    return { inTok, outTok, totalTok };
  }, [snap.log, snap.version]);

  const cost = useMemo(() => {
    const p = pricing ?? { usdPer1MInput: 3, usdPer1MOutput: 15, usdToThb: 32.61 };
    const usd = (totals.inTok * p.usdPer1MInput) / 1_000_000 + (totals.outTok * p.usdPer1MOutput) / 1_000_000;
    const thb = usd * p.usdToThb;
    return { usd, thb, pricing: p };
  }, [pricing, totals.inTok, totals.outTok]);

  const totalTokens = useMemo(
    () =>
      snap.log.reduce((sum, e) => {
        if (typeof e.totalTokens === "number") return sum + e.totalTokens;
        return sum;
      }, 0),
    [snap.log, snap.version],
  );

  const logTail = useMemo(() => [...snap.log].reverse().slice(0, 60), [snap.log, snap.version]);

  function downloadExport() {
    const blob = new Blob([exportWorkOpsJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `oracle-pulse-ops-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    appendWorkOpsLog("system", "ส่งออกประวัติ ops เป็น JSON");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-amber-200/90">งาน · เวลา · ว่าง · ประวัติ</h2>
          <p className="mt-1 max-w-xl text-[11px] text-zinc-500">
            จับเวลางานด้วยปุ่มเริ่ม/จบต่อ agent · Claude ที่กำลังตอบจะแสดงใน &quot;กำลังทำ&quot; อัตโนมัติ · ข้อมูลเก็บในเบราว์เซอร์ (localStorage)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadExport()}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800"
          >
            ส่งออก JSON
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm("ล้าง log ทั้งหมดในเครื่องนี้?")) clearWorkOpsLog();
            }}
            className="rounded-lg border border-red-900/40 bg-red-950/30 px-3 py-1.5 text-[11px] text-red-300/90 hover:bg-red-950/50"
          >
            ล้าง log
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">กำลังทำ</div>
          <div className="mt-1 text-2xl font-semibold text-amber-200">
            {sessionList.length + (claudeLoading && claudeAgent ? 1 : 0)}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">ว่าง (โฟกัสงาน)</div>
          <div className="mt-1 text-2xl font-semibold text-zinc-200">{idleAgents.length}</div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Tokens (รวม)</div>
          <div className="mt-1 text-2xl font-semibold text-violet-200">{totalTokens.toLocaleString()}</div>
          <div className="mt-1 text-[10px] text-zinc-500">
            in {totals.inTok.toLocaleString()} · out {totals.outTok.toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">บรรทัด log</div>
          <div className="mt-1 text-2xl font-semibold text-violet-200">{snap.log.length}</div>
        </div>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">ค่าใช้จ่าย Claude (ประมาณ)</div>
            <div className="mt-1 text-lg font-semibold text-emerald-200">
              ฿{cost.thb.toFixed(2)} <span className="text-xs text-zinc-500">(≈ ${cost.usd.toFixed(4)})</span>
            </div>
          </div>
          <div className="text-[10px] text-zinc-500">
            rate: ${cost.pricing.usdPer1MInput}/M in · ${cost.pricing.usdPer1MOutput}/M out · fx {cost.pricing.usdToThb} THB/USD
          </div>
        </div>
      </div>

      <section className="rounded-xl border border-amber-900/30 bg-amber-950/10 p-4">
        <h3 className="text-xs font-semibold text-amber-200/90">กำลังทำงาน (จับเวลา)</h3>
        <ul className="mt-3 space-y-2">
          {claudeLoading && claudeAgent && claudeJobAt ? (
            <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-violet-800/50 bg-violet-950/30 px-3 py-2 text-xs">
              <span className="font-medium capitalize text-violet-100">{claudeAgent}</span>
              <span className="font-mono text-amber-200/90">Claude API · {formatDurationThai(nowMs() - claudeJobAt)}</span>
            </li>
          ) : null}
          {sessionList.map((s) => (
            <li
              key={s.agentName}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs"
            >
              <div className="min-w-0">
                <span className="font-medium capitalize text-zinc-100">{s.agentName}</span>
                <span className="ml-2 text-zinc-500">{s.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-amber-200/90">{formatDurationThai(nowMs() - s.startedAt)}</span>
                <button
                  type="button"
                  onClick={() => endWorkSession(s.agentName)}
                  className="rounded border border-zinc-600 px-2 py-0.5 text-[10px] text-zinc-300 hover:bg-zinc-800"
                >
                  จบงาน
                </button>
              </div>
            </li>
          ))}
          {!sessionList.length && !(claudeLoading && claudeAgent) ? (
            <li className="text-[11px] text-zinc-500">— ไม่มีงานที่จับเวลา —</li>
          ) : null}
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <h3 className="text-xs font-semibold text-zinc-400">ว่าง (ไม่มี session จับเวลา และไม่ได้เรียก Claude)</h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {idleAgents.map((a) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-1 rounded-full border border-zinc-700 bg-zinc-950 px-2 py-0.5 text-[10px] text-zinc-400"
            >
              <span>{a.emoji}</span>
              <span className="capitalize">{a.name}</span>
            </span>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <h3 className="text-xs font-semibold text-zinc-400">จับเวลางานต่อ agent</h3>
        <div className="mt-3 grid max-h-[min(40vh,28rem)] gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-4">
          {AGENTS.map((a) => (
            <AgentWorkRow key={a.id} agentName={a.name} emoji={a.emoji} busy={busyAgents.has(a.name.toLowerCase())} />
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="min-h-0 rounded-xl border border-zinc-800 bg-black/20 p-3">
          <h3 className="text-xs font-semibold text-zinc-500">ประวัติงาน (จบ + ระยะเวลา)</h3>
          <div className="mt-2 max-h-56 overflow-y-auto font-mono text-[10px] leading-relaxed text-zinc-400">
            {historyRows.length ? (
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-zinc-950/95 text-zinc-600">
                  <tr>
                    <th className="py-1 pr-2">เวลา</th>
                    <th className="py-1 pr-2">agent</th>
                    <th className="py-1">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((e) => (
                    <tr key={e.id} className="border-t border-zinc-800/80">
                      <td className="whitespace-nowrap py-1 pr-2 text-zinc-500">
                        {new Date(e.ts).toLocaleString()}
                      </td>
                      <td className="py-1 pr-2 capitalize text-zinc-300">{e.agentName ?? "—"}</td>
                      <td className="py-1 text-zinc-400">
                        {e.message}
                        {e.durationMs != null ? (
                          <span className="text-amber-500/80"> · {formatDurationThai(e.durationMs)}</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <span className="text-zinc-600">—</span>
            )}
          </div>
        </section>

        <section className="min-h-0 rounded-xl border border-zinc-800 bg-black/20 p-3">
          <h3 className="text-xs font-semibold text-zinc-500">Log การทำงาน (ล่าสุด)</h3>
          <pre className="mt-2 max-h-56 overflow-y-auto font-mono text-[10px] leading-relaxed text-zinc-500">
            {logTail.map((e) => (
              <div key={e.id} className="border-b border-zinc-900/80 py-0.5">
                <span className="text-zinc-600">{new Date(e.ts).toLocaleTimeString()}</span>{" "}
                <span className="text-violet-500/80">[{e.kind}]</span>{" "}
                {e.agentName ? <span className="text-cyan-600/80">@{e.agentName} </span> : null}
                {e.message}
                {typeof e.totalTokens === "number" ? <span className="text-amber-500/80"> · tok {e.totalTokens}</span> : null}
              </div>
            ))}
          </pre>
        </section>
      </div>
    </div>
  );
}

function AgentWorkRow({ agentName, emoji, busy }: { agentName: string; emoji: string; busy: boolean }) {
  const [label, setLabel] = useState("");
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-zinc-800 bg-zinc-950/60 p-2">
      <div className="flex items-center gap-2 text-[11px] font-medium capitalize text-zinc-200">
        <span>{emoji}</span>
        {agentName}
        {busy ? <span className="rounded bg-amber-900/40 px-1.5 py-0 text-[9px] text-amber-200">กำลังจับเวลา</span> : null}
      </div>
      <input
        className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-[10px] text-zinc-200 placeholder:text-zinc-600"
        placeholder="ชื่องาน…"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <div className="flex gap-1">
        <button
          type="button"
          disabled={busy}
          onClick={() => startWorkSession(agentName, label || "งาน")}
          className="flex-1 rounded bg-amber-700/80 py-1 text-[10px] font-medium text-white hover:bg-amber-600 disabled:opacity-40"
        >
          เริ่ม
        </button>
        <button
          type="button"
          disabled={!busy}
          onClick={() => endWorkSession(agentName)}
          className="flex-1 rounded border border-zinc-700 py-1 text-[10px] text-zinc-300 hover:bg-zinc-800 disabled:opacity-40"
        >
          จบ
        </button>
      </div>
    </div>
  );
}
