import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "https://alqosvxszammxedqefec.supabase.co";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ?? "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** Browser-side client (anon key) — safe to expose */
export function getSupabaseClient() {
  if (!SUPABASE_ANON_KEY) throw new Error("Missing SUPABASE_ANON_KEY");
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/** Server-side admin client (service role key) — server only */
export function getSupabaseAdmin() {
  const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
  if (!key) throw new Error("Missing SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false } });
}

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_ANON_KEY);
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type OracleMessage = {
  id?: number;
  agent_key: string;
  task_id: string;
  role: "user" | "assistant";
  content: string;
  input_tokens?: number | null;
  output_tokens?: number | null;
  source: "pc" | "vps" | string;   // รองรับทั้ง PC และ VPS
  created_at?: string;
};

export type OracleTokenLog = {
  id?: number;
  agent_key: string;
  model?: string | null;
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_tokens?: number | null;
  cache_read_tokens?: number | null;
  source: "pc" | "vps" | string;
  created_at?: string;
};

export type OracleTask = {
  id?: number;
  agent_key: string;
  task_id: string;
  title: string;
  status: "active" | "completed" | "archived";
  summary?: string | null;
  source: "pc" | "vps" | string;
  created_at?: string;
  updated_at?: string;
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SOURCE = (process.env.ORACLE_SOURCE ?? process.env.ORACLE_INSTALL_ID ?? "pc") as string;

/** บันทึกข้อความ conversation */
export async function dbSaveMessage(msg: Omit<OracleMessage, "source" | "id" | "created_at">): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const sb = getSupabaseAdmin();
    await sb.from("oracle_messages").insert({ ...msg, source: SOURCE });
  } catch { /* non-critical */ }
}

/** ดึงประวัติการสนทนา N ข้อความล่าสุด (เพื่อส่งเป็น context ให้ Claude) */
export async function dbGetHistory(
  agentKey: string,
  taskId: string,
  limit = 20,
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  if (!isSupabaseConfigured()) return [];
  try {
    const sb = getSupabaseAdmin();
    const { data } = await sb
      .from("oracle_messages")
      .select("role, content")
      .eq("agent_key", agentKey)
      .eq("task_id", taskId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (!data) return [];
    return (data as { role: "user" | "assistant"; content: string }[]).reverse();
  } catch {
    return [];
  }
}

/** บันทึก token usage */
export async function dbLogTokens(log: Omit<OracleTokenLog, "source" | "id" | "created_at">): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const sb = getSupabaseAdmin();
    await sb.from("oracle_token_log").insert({ ...log, source: SOURCE });
  } catch { /* non-critical */ }
}

/** บันทึก/อัปเดต task */
export async function dbUpsertTask(task: Omit<OracleTask, "source" | "id" | "created_at" | "updated_at">): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const sb = getSupabaseAdmin();
    await sb.from("oracle_tasks").upsert(
      { ...task, source: SOURCE, updated_at: new Date().toISOString() },
      { onConflict: "agent_key,task_id" },
    );
  } catch { /* non-critical */ }
}

/** ดึง task list ทั้งหมด (จาก PC + VPS รวมกัน) */
export async function dbGetTasks(agentKey?: string): Promise<OracleTask[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const sb = getSupabaseAdmin();
    let q = sb.from("oracle_tasks").select("*").order("updated_at", { ascending: false });
    if (agentKey) q = q.eq("agent_key", agentKey);
    const { data } = await q.limit(200);
    return (data ?? []) as OracleTask[];
  } catch {
    return [];
  }
}

// ─── Cache ────────────────────────────────────────────────────────────────────

function hashQuestion(q: string): string {
  // simple deterministic hash for cache key
  let h = 0;
  const s = q.toLowerCase().replace(/\s+/g, " ").trim();
  for (let i = 0; i < s.length; i++) { h = (Math.imul(31, h) + s.charCodeAt(i)) | 0; }
  return Math.abs(h).toString(36);
}

export async function dbCheckCache(agentKey: string, question: string): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const sb = getSupabaseAdmin();
    const hash = hashQuestion(question);
    const now = new Date().toISOString();
    const { data } = await sb.from("oracle_cache")
      .select("id, answer, hit_count, input_tokens, tokens_saved")
      .eq("agent_key", agentKey).eq("q_hash", hash)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .single();
    if (!data) return null;
    const d = data as any;
    sb.from("oracle_cache")
      .update({
        hit_count:    d.hit_count + 1,
        tokens_saved: d.tokens_saved + (d.input_tokens ?? 0),
        last_hit_at:  now,
      })
      .eq("id", d.id)
      .then(() => undefined, () => undefined);
    return d.answer as string;
  } catch { return null; }
}

export async function dbStoreCache(
  agentKey: string, question: string, answer: string,
  opts: { model?: string; inputTokens?: number; ttlHours?: number } = {}
): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const sb = getSupabaseAdmin();
    const hash = hashQuestion(question);
    const expires = opts.ttlHours
      ? new Date(Date.now() + opts.ttlHours * 3_600_000).toISOString()
      : null;
    await sb.from("oracle_cache").upsert(
      { agent_key: agentKey, q_hash: hash, question, answer, model: opts.model, input_tokens: opts.inputTokens ?? 0, expires_at: expires },
      { onConflict: "agent_key,q_hash" }
    );
  } catch { /* non-critical */ }
}

export type CacheEntry = {
  id: number; agent_key: string; question: string; answer: string;
  hit_count: number; tokens_saved: number; input_tokens: number;
  model?: string; created_at: string; last_hit_at?: string;
};

export async function dbGetCacheEntries(agentKey?: string, limit = 50): Promise<CacheEntry[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const sb = getSupabaseAdmin();
    let q = sb.from("oracle_cache").select("*").order("hit_count", { ascending: false });
    if (agentKey) q = q.eq("agent_key", agentKey);
    const { data } = await q.limit(limit);
    return (data ?? []) as CacheEntry[];
  } catch { return []; }
}

export async function dbDeleteCache(id: number): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try { await getSupabaseAdmin().from("oracle_cache").delete().eq("id", id); } catch { /* ignore */ }
}

export async function dbClearAllCache(agentKey?: string): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const sb = getSupabaseAdmin();
    let q = sb.from("oracle_cache").delete();
    if (agentKey) q = (q as any).eq("agent_key", agentKey);
    else q = (q as any).neq("id", 0);
    await q;
  } catch { /* ignore */ }
}

// ─── Stats aggregation ────────────────────────────────────────────────────────

export type AgentTokenStat = {
  agent_key: string;
  total_input: number;
  total_output: number;
  calls: number;
  cache_saved: number;
};

export async function dbGetTokenStatsByAgent(sinceDays = 1): Promise<AgentTokenStat[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const sb = getSupabaseAdmin();
    const since = new Date(Date.now() - sinceDays * 86_400_000).toISOString();
    const { data } = await sb.from("oracle_token_log")
      .select("agent_key, input_tokens, output_tokens, cache_read_tokens")
      .gte("created_at", since);
    if (!data) return [];
    const map: Record<string, AgentTokenStat> = {};
    for (const row of data as any[]) {
      const k = row.agent_key;
      if (!map[k]) map[k] = { agent_key: k, total_input: 0, total_output: 0, calls: 0, cache_saved: 0 };
      map[k].total_input  += row.input_tokens  ?? 0;
      map[k].total_output += row.output_tokens ?? 0;
      map[k].cache_saved  += row.cache_read_tokens ?? 0;
      map[k].calls        += 1;
    }
    return Object.values(map).sort((a, b) => (b.total_input + b.total_output) - (a.total_input + a.total_output));
  } catch { return []; }
}
