import Anthropic from "@anthropic-ai/sdk";
import { recordTokens } from "@/lib/token-store";
import { dbCheckCache, dbGetHistory, dbLogTokens, dbSaveMessage, dbStoreCache } from "@/lib/supabase";

const MODEL_SONNET = "claude-sonnet-4-6";
const MODEL_HAIKU  = "claude-haiku-4-5-20251001";
const DEFAULT_MODEL = MODEL_SONNET;

const SYSTEM_BASE =
  "คุณคือ Oracle Agentic AI OS — สมองกลางที่คิด วางแผน และสร้างทุกระบบ\n" +
  "หลักการ: Nothing is Deleted · Patterns Over Intentions · Transparency\n" +
  "ตอบกระชับ ตรง และเป็นประโยชน์ ใช้ภาษาไทยเป็นหลัก (ศัพท์เทคนิคภาษาอังกฤษได้)";

/** Auto-route: Haiku สำหรับ query สั้น/ง่าย, Sonnet สำหรับงานซับซ้อน */
function selectModel(message: string, tier: string): string {
  if (process.env.ANTHROPIC_MODEL?.trim()) return process.env.ANTHROPIC_MODEL.trim();
  if (tier === "haiku")  return MODEL_HAIKU;
  if (tier === "sonnet") return MODEL_SONNET;
  // auto: ข้อความสั้น + ไม่มีคำสั่งซับซ้อน → Haiku
  const isSimple = message.length < 180 &&
    !/code|script|เขียน|สร้าง|ออกแบบ|วิเคราะห์|analyze|implement|refactor|debug/i.test(message);
  return isSimple ? MODEL_HAIKU : MODEL_SONNET;
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return Response.json({ error: "Missing ANTHROPIC_API_KEY in environment." }, { status: 500 });

  let body: unknown;
  try { body = await req.json(); }
  catch { return Response.json({ error: "Invalid JSON body." }, { status: 400 }); }

  const b = body as Record<string, unknown>;
  const agent   = typeof b.agent   === "string" ? b.agent.trim()   : "";
  const message = typeof b.message === "string" ? b.message.trim() : "";
  const taskId  = typeof b.taskId  === "string" ? b.taskId         : "main";
  const tier    = typeof b.modelTier === "string" ? b.modelTier    : "auto";
  const useCache = b.useCache !== false; // default true

  if (!agent || !message) {
    return Response.json({ error: "Fields `agent` and `message` are required." }, { status: 400 });
  }

  // ─── 1. Check response cache ────────────────────────────────────────────────
  if (useCache) {
    const cached = await dbCheckCache(agent, message);
    if (cached) {
      void dbLogTokens({ agent_key: agent, model: "cache-hit", input_tokens: 0, output_tokens: 0, cache_read_tokens: 0 });
      return Response.json({
        reply: cached,
        fromCache: true,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0, cacheHit: true },
      });
    }
  }

  // ─── 2. Load conversation history (max 16 turns) ────────────────────────────
  const history = await dbGetHistory(agent, taskId, 16);

  const model  = selectModel(message, tier);
  const client = new Anthropic({ apiKey });

  try {
    const messages: Anthropic.MessageParam[] = [
      ...history,
      { role: "user", content: message },
    ];

    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      system: [
        { type: "text", text: SYSTEM_BASE, cache_control: { type: "ephemeral" } },
        { type: "text", text: `Agent: "${agent}" | Task: "${taskId}" | Model: ${model}` },
      ],
      messages,
    });

    const block = response.content[0];
    const reply = block?.type === "text" ? block.text : "";

    const usage   = response.usage as unknown as Record<string, number> | undefined;
    const inTok   = usage?.input_tokens;
    const outTok  = usage?.output_tokens;
    const creTok  = usage?.cache_creation_input_tokens;
    const rdTok   = usage?.cache_read_input_tokens;
    const total   = typeof inTok === "number" && typeof outTok === "number" ? inTok + outTok : undefined;

    recordTokens(agent, { inputTokens: inTok, outputTokens: outTok, cacheCreationTokens: creTok, cacheReadTokens: rdTok });

    // ─── 3. Persist to Supabase (fire-and-forget) ─────────────────────────────
    void dbSaveMessage({ agent_key: agent, task_id: taskId, role: "user",      content: message });
    void dbSaveMessage({ agent_key: agent, task_id: taskId, role: "assistant", content: reply, input_tokens: inTok, output_tokens: outTok });
    void dbLogTokens({ agent_key: agent, model, input_tokens: inTok, output_tokens: outTok, cache_creation_tokens: creTok, cache_read_tokens: rdTok });

    // ─── 4. Auto-cache short stable answers (ไม่ cache คำตอบที่ขึ้นกับ context) ──
    const isCacheable = reply.length < 2000 && message.length < 300 &&
      !/วันนี้|ตอนนี้|ล่าสุด|now|today|current/i.test(message);
    if (isCacheable && useCache) {
      void dbStoreCache(agent, message, reply, { model, inputTokens: inTok, ttlHours: 72 });
    }

    return Response.json({
      reply,
      model,
      fromCache: false,
      usage: typeof inTok === "number" || typeof outTok === "number"
        ? { inputTokens: inTok, outputTokens: outTok, totalTokens: total, cacheCreationTokens: creTok, cacheReadTokens: rdTok }
        : undefined,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upstream error";
    return Response.json({ error: msg }, { status: 502 });
  }
}
