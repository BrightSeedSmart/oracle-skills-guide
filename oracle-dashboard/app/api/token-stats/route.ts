import { getPcStats, type TokenStats } from "@/lib/token-store";
import { execSshRemote } from "@/lib/ssh-exec";

// Compact Python to tally Claude JSONL usage on VPS (last 24h).
// Uses only double-quotes so shQuote wraps cleanly in single-quotes via SSH.
const VPS_PY = `import json,time
from pathlib import Path
c=time.time()-86400
b=Path.home()/".claude"/"projects"
t={"i":0,"o":0,"cr":0,"cc":0,"n":0}
def u(x,d=0):
 if d>4:return
 if isinstance(x,dict):
  if "input_tokens"in x:return x
  for v in x.values():
   r=u(v,d+1)
   if r:return r
 elif isinstance(x,list):
  for v in x:
   r=u(v,d+1)
   if r:return r
if b.exists():
 for f in b.rglob("*.jsonl"):
  try:
   if f.stat().st_mtime<c:continue
   for l in open(f,errors="ignore"):
    try:
     x=u(json.loads(l.strip()))
     if x:t["i"]+=x.get("input_tokens",0);t["o"]+=x.get("output_tokens",0);t["cr"]+=x.get("cache_read_input_tokens",0);t["cc"]+=x.get("cache_creation_input_tokens",0);t["n"]+=1
    except:pass
  except:pass
print(json.dumps({"inputTokens":t["i"],"outputTokens":t["o"],"cacheReadTokens":t["cr"],"cacheCreationTokens":t["cc"],"calls":t["n"]}))`;

// In-memory cache for VPS results (60s TTL — avoid slow SSH per request)
let vpsCache: { data: TokenStats; at: number } | null = null;
const VPS_CACHE_TTL = 60_000;

async function fetchVpsStats(forceRefresh: boolean): Promise<{ data: TokenStats | null; error?: string }> {
  const target = process.env.ORACLE_SSH_TARGET?.trim();
  if (!target || process.env.TMUX_BRIDGE_ENABLED !== "1") {
    return { data: null, error: "SSH not configured (set ORACLE_SSH_TARGET + TMUX_BRIDGE_ENABLED=1)" };
  }

  if (!forceRefresh && vpsCache && Date.now() - vpsCache.at < VPS_CACHE_TTL) {
    return { data: vpsCache.data };
  }

  try {
    const { stdout } = await execSshRemote(["python3", "-c", VPS_PY], { target });
    const raw = JSON.parse(stdout.trim()) as Record<string, number>;
    const data: TokenStats = {
      inputTokens: raw.inputTokens ?? 0,
      outputTokens: raw.outputTokens ?? 0,
      cacheCreationTokens: raw.cacheCreationTokens ?? 0,
      cacheReadTokens: raw.cacheReadTokens ?? 0,
      calls: raw.calls ?? 0,
      since: Date.now() - 86_400_000,
    };
    vpsCache = { data, at: Date.now() };
    return { data };
  } catch (e) {
    const msg = e instanceof Error ? e.message.slice(0, 300) : String(e);
    // Return stale cache on error rather than nothing
    return { data: vpsCache?.data ?? null, error: msg };
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const forceRefresh = url.searchParams.get("refresh") === "1";
  if (forceRefresh) vpsCache = null;

  const pc = getPcStats();
  const { data: vps, error: vpsError } = await fetchVpsStats(forceRefresh);

  const combined: TokenStats = {
    inputTokens: pc.inputTokens + (vps?.inputTokens ?? 0),
    outputTokens: pc.outputTokens + (vps?.outputTokens ?? 0),
    cacheCreationTokens: pc.cacheCreationTokens + (vps?.cacheCreationTokens ?? 0),
    cacheReadTokens: pc.cacheReadTokens + (vps?.cacheReadTokens ?? 0),
    calls: pc.calls + (vps?.calls ?? 0),
    since: pc.since,
  };

  return Response.json({ pc, vps, vpsError, combined, cachedVps: !forceRefresh && Boolean(vps) });
}
