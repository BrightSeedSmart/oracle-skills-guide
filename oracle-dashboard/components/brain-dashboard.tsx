"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AGENTS } from "@/lib/agents";

type TokenStats = { inputTokens: number; outputTokens: number; cacheCreationTokens: number; cacheReadTokens: number; calls: number };
type AgentStat  = { agent_key: string; total_input: number; total_output: number; calls: number; cache_saved: number };
type CacheEntry = { id: number; agent_key: string; question: string; answer: string; hit_count: number; input_tokens: number; created_at: string; last_hit_at?: string };
type QuickCmd   = { id: string; label: string; icon: string; agentKey: string; text: string };

const MODEL_TIER_KEY = "oracle-brain-model-tier";
const QUICK_CMDS_KEY = "oracle-brain-quick-cmds";

const DEFAULT_QUICK: QuickCmd[] = [
  { id: "q1", label: "สถานะระบบ",   icon: "📊", agentKey: "oracle",   text: "สรุปสถานะระบบ Oracle ทั้งหมด" },
  { id: "q2", label: "Task วันนี้",  icon: "📋", agentKey: "fireman",  text: "มีงานอะไรค้างอยู่บ้าง สรุปให้หน่อย" },
  { id: "q3", label: "VPS status",  icon: "🛰️", agentKey: "hermes",   text: "ตรวจสอบสถานะ VPS Ariadne" },
  { id: "q4", label: "สรุปวันนี้",  icon: "💡", agentKey: "oracle",   text: "สรุปสิ่งที่ทำไปวันนี้ทั้งหมด" },
  { id: "q5", label: "Idea ใหม่",   icon: "✨", agentKey: "spark",    text: "เสนอ idea ใหม่ที่น่าสนใจสำหรับวันนี้" },
  { id: "q6", label: "Debug help",  icon: "🔥", agentKey: "fireman",  text: "ช่วย debug ปัญหาที่กำลังเจออยู่" },
];

type Props = {
  pricing: { usdPer1MInput: number; usdPer1MOutput: number; usdToThb: number } | null;
  onSelectAgent: (agentKey: string) => void;
  onSendMessage: (agentKey: string, text: string) => void;
};

export function BrainDashboard({ pricing, onSelectAgent, onSendMessage }: Props) {
  const [pcStats,     setPcStats]     = useState<TokenStats | null>(null);
  const [vpsStats,    setVpsStats]    = useState<TokenStats | null>(null);
  const [agentStats,  setAgentStats]  = useState<AgentStat[]>([]);
  const [cacheList,   setCacheList]   = useState<CacheEntry[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [modelTier,   setModelTier]   = useState<"auto"|"haiku"|"sonnet">("auto");
  const [quickCmds,   setQuickCmds]   = useState<QuickCmd[]>(DEFAULT_QUICK);
  const [editingCmd,  setEditingCmd]  = useState<string | null>(null);
  const [statsRange,  setStatsRange]  = useState<1|7|30>(1);
  const [activeAgent, setActiveAgent] = useState<string>("oracle");
  const loadedRef = useRef(false);

  // ─── Load prefs from localStorage ─────────────────────────────────────────
  useEffect(() => {
    try {
      const t = localStorage.getItem(MODEL_TIER_KEY);
      if (t === "auto" || t === "haiku" || t === "sonnet") setModelTier(t);
      const q = localStorage.getItem(QUICK_CMDS_KEY);
      if (q) setQuickCmds(JSON.parse(q) as QuickCmd[]);
    } catch { /* ignore */ }
  }, []);

  const saveModelTier = (t: "auto"|"haiku"|"sonnet") => {
    setModelTier(t);
    try { localStorage.setItem(MODEL_TIER_KEY, t); } catch { /* ignore */ }
  };

  // ─── Fetch stats ───────────────────────────────────────────────────────────
  const fetchStats = useCallback(async (refresh = false) => {
    setLoading(true);
    try {
      // Local + VPS token stats
      const tsRes = await fetch(`/api/token-stats${refresh ? "?refresh=1" : ""}`);
      if (tsRes.ok) {
        const j = await tsRes.json() as { pc?: TokenStats; vps?: TokenStats };
        if (j.pc) setPcStats(j.pc);
        if (j.vps) setVpsStats(j.vps);
      }
      // Supabase per-agent stats
      const sbRes = await fetch(`/api/brain/stats?days=${statsRange}`);
      if (sbRes.ok) {
        const j = await sbRes.json() as { agentStats?: AgentStat[]; cacheList?: CacheEntry[] };
        if (j.agentStats) setAgentStats(j.agentStats);
        if (j.cacheList)  setCacheList(j.cacheList);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [statsRange]);

  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    void fetchStats();
  }, [fetchStats]);

  useEffect(() => { loadedRef.current = false; void fetchStats(); }, [statsRange, fetchStats]);

  // ─── Helpers ───────────────────────────────────────────────────────────────
  const fmt = (n: number) => n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n/1000).toFixed(1)}k` : String(n);

  const cost = (input: number, output: number) => {
    if (!pricing) return null;
    const usd = (input / 1e6) * pricing.usdPer1MInput + (output / 1e6) * pricing.usdPer1MOutput;
    return usd < 0.01 ? `฿${(usd * pricing.usdToThb).toFixed(2)}` : `$${usd.toFixed(3)}`;
  };

  const pc  = pcStats  ?? { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, calls: 0 };
  const vps = vpsStats ?? { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, calls: 0 };
  const total = { in: pc.inputTokens + vps.inputTokens, out: pc.outputTokens + vps.outputTokens, calls: pc.calls + vps.calls };
  const cacheHits = cacheList.reduce((s, e) => s + e.hit_count, 0);
  const tokensSaved = cacheList.reduce((s, e) => s + e.input_tokens * e.hit_count, 0);
  const maxTok = Math.max(...agentStats.map(a => a.total_input + a.total_output), 1);

  const deleteCache = async (id: number) => {
    await fetch(`/api/brain/cache/${id}`, { method: "DELETE" });
    setCacheList(l => l.filter(e => e.id !== id));
  };

  const clearAllCache = async () => {
    await fetch("/api/brain/cache", { method: "DELETE" });
    setCacheList([]);
  };

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4 md:p-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🧠</span>
          <div>
            <h2 className="text-base font-semibold text-zinc-100">Oracle Brain OS</h2>
            <p className="text-[11px] text-zinc-500">สมองกลาง · ควบคุมทุกระบบ · ลด token อัจฉริยะ</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {["1","7","30"].map(d => (
            <button key={d} type="button" onClick={() => setStatsRange(Number(d) as 1|7|30)}
              className={`rounded-full px-3 py-1 text-xs transition ${statsRange === Number(d) ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"}`}>
              {d}d
            </button>
          ))}
          <button type="button" onClick={() => void fetchStats(true)}
            className={`rounded-full bg-zinc-800 px-3 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition ${loading ? "opacity-50" : ""}`}>
            {loading ? "⟳" : "↻"} refresh
          </button>
        </div>
      </div>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Agents",       value: String(AGENTS.length), sub: `${AGENTS.filter(a=>a.status==="active").length} active`,  icon: "🤖" },
          { label: "Tokens",       value: fmt(total.in + total.out), sub: `${total.calls} calls · ${cost(total.in, total.out) ?? "—"}`, icon: "⚡" },
          { label: "Cache hits",   value: String(cacheHits),    sub: `${fmt(tokensSaved)} tok saved`,  icon: "💾" },
          { label: "Cache ratio",  value: tokensSaved > 0 ? `${Math.round(tokensSaved/(tokensSaved+total.in+total.out)*100)}%` : "—", sub: "token saved", icon: "📉" },
        ].map(k => (
          <div key={k.label} className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <div className="flex items-start justify-between">
              <span className="text-lg">{k.icon}</span>
              <span className="text-[10px] text-zinc-600">{k.label}</span>
            </div>
            <div className="mt-2 text-xl font-bold tabular-nums text-zinc-100">{k.value}</div>
            <div className="mt-0.5 text-[11px] text-zinc-500">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Token breakdown PC vs VPS ── */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-400">Token Usage — PC vs VPS</span>
          <span className="text-[10px] text-zinc-600">{statsRange}d</span>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "PC 🖥", s: pc },
            { label: "VPS 🛰 Ariadne", s: vps },
          ].map(({ label, s }) => (
            <div key={label}>
              <div className="mb-1 text-[11px] text-zinc-500">{label}</div>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-400">Input</span>
                  <span className="font-mono text-zinc-200">{fmt(s.inputTokens)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-400">Output</span>
                  <span className="font-mono text-zinc-200">{fmt(s.outputTokens)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-emerald-600">Cache read</span>
                  <span className="font-mono text-emerald-400">{fmt(s.cacheReadTokens)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-zinc-600">Calls</span>
                  <span className="font-mono text-zinc-400">{s.calls}</span>
                </div>
                <div className="flex justify-between text-[11px] border-t border-zinc-800 pt-1">
                  <span className="text-zinc-500">Cost</span>
                  <span className="font-mono text-amber-300">{cost(s.inputTokens, s.outputTokens) ?? "—"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Per-agent token bars ── */}
      {agentStats.length > 0 && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
          <div className="mb-3 text-xs font-semibold text-zinc-400">Token per Agent (Supabase · {statsRange}d)</div>
          <div className="space-y-2">
            {agentStats.slice(0, 12).map(a => {
              const tok = a.total_input + a.total_output;
              const pct = Math.round(tok / maxTok * 100);
              const ag  = AGENTS.find(x => x.name.toLowerCase() === a.agent_key);
              return (
                <div key={a.agent_key} className="flex items-center gap-3">
                  <button type="button" onClick={() => onSelectAgent(a.agent_key)}
                    className="w-20 shrink-0 truncate text-left text-[11px] text-zinc-300 hover:text-violet-300">
                    {ag?.emoji ?? "🤖"} {a.agent_key}
                  </button>
                  <div className="flex-1 overflow-hidden rounded-full bg-zinc-800 h-2">
                    <div className="h-2 rounded-full bg-violet-500/70 transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-12 text-right font-mono text-[10px] text-zinc-400">{fmt(tok)}</span>
                  <span className="w-10 text-right text-[10px] text-emerald-500">{a.cache_saved > 0 ? `−${fmt(a.cache_saved)}` : ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Model routing ── */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="mb-3 text-xs font-semibold text-zinc-400">🔀 Model Routing — ลด token อัตโนมัติ</div>
        <div className="grid grid-cols-3 gap-2">
          {([
            { v: "auto",   label: "Auto",   sub: "Haiku สำหรับ query สั้น\nSonnet สำหรับงานซับซ้อน", icon: "🤖" },
            { v: "haiku",  label: "Haiku",  sub: "ประหยัด ~75%\nเร็ว · เหมาะ Q&A ทั่วไป",           icon: "⚡" },
            { v: "sonnet", label: "Sonnet", sub: "คุณภาพสูงสุด\nเหมาะ code · วิเคราะห์ลึก",         icon: "🎯" },
          ] as const).map(m => (
            <button key={m.v} type="button" onClick={() => saveModelTier(m.v)}
              className={`rounded-lg border p-3 text-left transition ${modelTier === m.v ? "border-violet-500 bg-violet-600/20 text-violet-100" : "border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"}`}>
              <div className="flex items-center gap-1.5">
                <span>{m.icon}</span>
                <span className="text-sm font-semibold">{m.label}</span>
                {modelTier === m.v && <span className="ml-auto text-[10px] text-violet-400">✓</span>}
              </div>
              <p className="mt-1 whitespace-pre-line text-[10px] leading-relaxed opacity-70">{m.sub}</p>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-zinc-600">
          การตั้งค่านี้ส่งผลกับทุก agent · ใช้ ANTHROPIC_MODEL ใน .env.local เพื่อ override ถาวร
        </p>
      </div>

      {/* ── Response Cache ── */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-zinc-400">💾 Response Cache</span>
            <span className="ml-2 rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-500">{cacheList.length} entries</span>
          </div>
          <button type="button" onClick={clearAllCache}
            className="rounded-md border border-red-900/50 px-2 py-1 text-[10px] text-red-400 hover:bg-red-950/40 transition">
            ล้าง cache ทั้งหมด
          </button>
        </div>
        {cacheList.length === 0 ? (
          <p className="text-[11px] text-zinc-600">ยังไม่มี cache — ระบบจะ cache คำตอบที่ใช้ซ้ำได้อัตโนมัติ</p>
        ) : (
          <div className="space-y-1.5 max-h-52 overflow-y-auto">
            {cacheList.map(e => (
              <div key={e.id} className="flex items-start gap-3 rounded-lg bg-zinc-800/50 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[11px] text-zinc-200">{e.question}</p>
                  <div className="mt-0.5 flex gap-3 text-[10px] text-zinc-600">
                    <span className="text-emerald-500">hit {e.hit_count}×</span>
                    <span>saved {fmt(e.input_tokens * e.hit_count)} tok</span>
                    <span>{e.agent_key}</span>
                  </div>
                </div>
                <button type="button" onClick={() => void deleteCache(e.id)}
                  className="shrink-0 text-zinc-600 hover:text-red-400 text-[11px]">×</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Quick Commands ── */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-400">⚡ Quick Commands</span>
          <span className="text-[10px] text-zinc-600">คลิกเพื่อส่งทันที · Ctrl+K สำหรับค้นหา</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {quickCmds.map(cmd => (
            <button key={cmd.id} type="button"
              onClick={() => { onSelectAgent(cmd.agentKey); onSendMessage(cmd.agentKey, cmd.text); }}
              className="flex items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800/50 px-3 py-2.5 text-left transition hover:border-violet-600/50 hover:bg-zinc-700/60">
              <span className="text-base">{cmd.icon}</span>
              <div className="min-w-0">
                <div className="truncate text-[12px] font-medium text-zinc-200">{cmd.label}</div>
                <div className="truncate text-[10px] text-zinc-500">{cmd.agentKey}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── System info ── */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3">
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] sm:grid-cols-4">
          {[
            ["PC Source",    process.env.ORACLE_SOURCE ?? "pc"],
            ["Supabase",     "alqosvxszammxedqefec"],
            ["Model Auto",   modelTier === "auto" ? "Haiku+Sonnet" : modelTier],
            ["Cache TTL",    "72h auto-expire"],
          ].map(([k, v]) => (
            <div key={k}>
              <span className="text-zinc-600">{k}: </span>
              <span className="font-mono text-zinc-400">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
