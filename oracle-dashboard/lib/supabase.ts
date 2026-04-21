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
