"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type TokenStats = {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  calls: number;
  since: number;
};

type StatsResponse = {
  pc: TokenStats;
  vps: TokenStats | null;
  vpsError?: string;
  combined: TokenStats;
  cachedVps?: boolean;
};

type Pricing = { usdPer1MInput: number; usdPer1MOutput: number; usdToThb: number };

function calcCost(s: TokenStats, p: Pricing) {
  const usd = (s.inputTokens * p.usdPer1MInput) / 1_000_000 + (s.outputTokens * p.usdPer1MOutput) / 1_000_000;
  return { usd, thb: usd * p.usdToThb };
}

function cacheHitRate(s: TokenStats): number {
  const cacheable = s.inputTokens + s.cacheReadTokens;
  if (!cacheable) return 0;
  return (s.cacheReadTokens / cacheable) * 100;
}

function fmt(n: number) {
  return n.toLocaleString();
}

function StatRow({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="text-[11px] text-zinc-500">{label}</span>
      <span className={`font-mono text-[11px] ${accent ?? "text-zinc-200"}`}>{value}</span>
    </div>
  );
}

function SidePanel({
  title,
  badge,
  stats,
  pricing,
  error,
  loading,
}: {
  title: string;
  badge: string;
  stats: TokenStats | null;
  pricing: Pricing;
  error?: string;
  loading: boolean;
}) {
  const cost = stats ? calcCost(stats, pricing) : null;
  const hitRate = stats ? cacheHitRate(stats) : 0;
  const savedTokens = stats ? stats.cacheReadTokens : 0;

  return (
    <div className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">{title}</span>
        <span className="rounded-full bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-500">{badge}</span>
        {loading && <span className="ml-auto text-[9px] text-zinc-600 animate-pulse">กำลังโหลด…</span>}
      </div>

      {error && !stats ? (
        <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-2 text-[10px] text-red-400/80">
          {error.slice(0, 120)}
        </div>
      ) : stats ? (
        <div className="space-y-0.5">
          <StatRow label="Input tokens" value={fmt(stats.inputTokens)} />
          <StatRow label="Output tokens" value={fmt(stats.outputTokens)} />
          <StatRow
            label="Cache hit (อ่าน)"
            value={fmt(stats.cacheReadTokens)}
            accent={stats.cacheReadTokens > 0 ? "text-emerald-400" : undefined}
          />
          <StatRow label="Cache created" value={fmt(stats.cacheCreationTokens)} accent="text-sky-400" />
          <div className="my-1.5 border-t border-zinc-800" />
          <StatRow
            label="รวม tokens"
            value={fmt(stats.inputTokens + stats.outputTokens)}
            accent="text-violet-300"
          />
          <StatRow label="API calls" value={fmt(stats.calls)} />
          <StatRow
            label="Cache hit rate"
            value={`${hitRate.toFixed(1)}%`}
            accent={hitRate > 50 ? "text-emerald-400" : hitRate > 20 ? "text-amber-400" : undefined}
          />
          {savedTokens > 0 && (
            <StatRow
              label="ประหยัด input"
              value={`${fmt(savedTokens)} tok`}
              accent="text-emerald-400"
            />
          )}
          <div className="my-1.5 border-t border-zinc-800" />
          {cost && (
            <StatRow
              label="ค่าใช้จ่าย"
              value={`฿${cost.thb.toFixed(3)} ($${cost.usd.toFixed(4)})`}
              accent="text-amber-200"
            />
          )}
        </div>
      ) : (
        <div className="text-[11px] text-zinc-600">— ไม่มีข้อมูล —</div>
      )}

      {error && stats && (
        <div className="mt-2 text-[9px] text-amber-600/70">⚠ {error.slice(0, 80)} (ข้อมูลเก่า)</div>
      )}
    </div>
  );
}

export function TokenMonitor({ pricing }: { pricing: Pricing | null }) {
  const p: Pricing = pricing ?? { usdPer1MInput: 3, usdPer1MOutput: 15, usdToThb: 32.61 };
  const [data, setData] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastFetch, setLastFetch] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStats = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      const url = forceRefresh ? "/api/token-stats?refresh=1" : "/api/token-stats";
      const res = await fetch(url);
      if (res.ok) {
        const json = (await res.json()) as StatsResponse;
        setData(json);
        setLastFetch(Date.now());
      }
    } catch {
      /* ignore network errors */
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch + auto-refresh every 90s
  useEffect(() => {
    fetchStats();
    timerRef.current = setInterval(() => fetchStats(), 90_000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [fetchStats]);

  const combined = data?.combined;
  const combinedCost = combined ? calcCost(combined, p) : null;
  const totalCacheHit = combined ? cacheHitRate(combined) : 0;
  const sinceLabel = data ? new Date(data.pc.since).toLocaleString() : "";

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-amber-200/90">Token Monitor · ทั้ง 2 ฝั่ง</h2>
          <p className="mt-1 text-[11px] text-zinc-500">
            PC (local API) + VPS Ariadne · ช่วง 24ชม.{sinceLabel ? ` (ตั้งแต่ ${sinceLabel})` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastFetch && (
            <span className="text-[10px] text-zinc-600">
              อัปเดต {new Date(lastFetch).toLocaleTimeString()}
              {data?.cachedVps && " · VPS cached"}
            </span>
          )}
          <button
            type="button"
            onClick={() => fetchStats(true)}
            disabled={loading}
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-[11px] text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? "กำลังโหลด…" : "รีเฟรช VPS"}
          </button>
        </div>
      </div>

      {/* Summary banner */}
      {combined && (
        <div className="grid gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-violet-900/40 bg-violet-950/20 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">รวม tokens</div>
            <div className="mt-1 text-2xl font-semibold text-violet-200">
              {fmt(combined.inputTokens + combined.outputTokens)}
            </div>
            <div className="mt-0.5 text-[10px] text-zinc-500">
              in {fmt(combined.inputTokens)} · out {fmt(combined.outputTokens)}
            </div>
          </div>
          <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">Cache saved</div>
            <div className="mt-1 text-2xl font-semibold text-emerald-300">
              {fmt(combined.cacheReadTokens)}
            </div>
            <div className="mt-0.5 text-[10px] text-zinc-500">hit rate {totalCacheHit.toFixed(1)}%</div>
          </div>
          <div className="rounded-xl border border-amber-900/40 bg-amber-950/20 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">ค่าใช้จ่ายรวม</div>
            <div className="mt-1 text-2xl font-semibold text-amber-200">
              ฿{combinedCost?.thb.toFixed(2)}
            </div>
            <div className="mt-0.5 text-[10px] text-zinc-500">≈ ${combinedCost?.usd.toFixed(4)}</div>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">API calls</div>
            <div className="mt-1 text-2xl font-semibold text-zinc-200">{fmt(combined.calls)}</div>
            <div className="mt-0.5 text-[10px] text-zinc-500">PC + VPS</div>
          </div>
        </div>
      )}

      {/* Two-column breakdown */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <SidePanel
          title="PC (local)"
          badge="localhost:3000"
          stats={data?.pc ?? null}
          pricing={p}
          loading={loading}
        />
        <SidePanel
          title="VPS Ariadne"
          badge="root@72.60.77.195"
          stats={data?.vps ?? null}
          pricing={p}
          error={data?.vpsError}
          loading={loading}
        />
      </div>

      {/* Cache savings note */}
      {combined && combined.cacheReadTokens > 0 && (
        <div className="rounded-xl border border-emerald-900/30 bg-emerald-950/10 p-4">
          <div className="text-[11px] font-semibold text-emerald-300/90">ประโยชน์จาก Prompt Caching</div>
          <div className="mt-1 text-[11px] text-zinc-400">
            ประหยัดได้{" "}
            <span className="font-semibold text-emerald-300">{fmt(combined.cacheReadTokens)} tokens</span>
            {" "}จาก cache reads ·{" "}
            ถ้าไม่มี cache จะต้องส่ง input tokens เพิ่มอีก{" "}
            <span className="font-semibold text-amber-300">
              ≈ ฿{calcCost({ ...combined, inputTokens: combined.cacheReadTokens, outputTokens: 0 } as TokenStats, p).thb.toFixed(3)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
