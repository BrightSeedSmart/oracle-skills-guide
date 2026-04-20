import Anthropic from "@anthropic-ai/sdk";
import { recordTokens } from "@/lib/token-store";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

// Cached system prompt base — stable text gets a cache_control breakpoint.
// Re-used across requests so Anthropic caches tokens after the first call.
const SYSTEM_BASE =
  "คุณคือ Oracle Agentic AI OS — สมองกลางที่คิด วางแผน และสร้างทุกระบบ\n" +
  "หลักการ: Nothing is Deleted · Patterns Over Intentions · Transparency\n" +
  "ตอบกระชับ ตรง และเป็นประโยชน์ ใช้ภาษาไทยเป็นหลัก (ศัพท์เทคนิคภาษาอังกฤษได้)";

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Missing ANTHROPIC_API_KEY in environment." }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const agent = typeof body === "object" && body && "agent" in body ? String((body as { agent: unknown }).agent) : "";
  const message =
    typeof body === "object" && body && "message" in body ? String((body as { message: unknown }).message) : "";

  if (!agent.trim() || !message.trim()) {
    return Response.json({ error: "Fields `agent` and `message` are required." }, { status: 400 });
  }

  const model = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model,
      max_tokens: 1024,
      system: [
        {
          type: "text",
          text: SYSTEM_BASE,
          cache_control: { type: "ephemeral" },
        },
        {
          type: "text",
          text: `Agent ที่ใช้งานอยู่: "${agent}"`,
        },
      ],
      messages: [{ role: "user", content: message }],
    });

    const block = response.content[0];
    const reply = block && block.type === "text" ? block.text : "";

    const usage = response.usage as unknown as Record<string, number> | undefined;
    const inputTokens = usage?.input_tokens;
    const outputTokens = usage?.output_tokens;
    const cacheCreationTokens = usage?.cache_creation_input_tokens;
    const cacheReadTokens = usage?.cache_read_input_tokens;
    const totalTokens =
      typeof inputTokens === "number" && typeof outputTokens === "number" ? inputTokens + outputTokens : undefined;

    recordTokens(agent, { inputTokens, outputTokens, cacheCreationTokens, cacheReadTokens });

    return Response.json({
      reply,
      usage:
        typeof inputTokens === "number" || typeof outputTokens === "number"
          ? { inputTokens, outputTokens, totalTokens, cacheCreationTokens, cacheReadTokens }
          : undefined,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upstream error";
    return Response.json({ error: msg }, { status: 502 });
  }
}
