import Anthropic from "@anthropic-ai/sdk";
import { recordTokens } from "@/lib/token-store";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

function parseDataUrl(dataUrl: string): { mediaType: string; data: string } | null {
  const m = /^data:([^;]+);base64,(.+)$/i.exec(dataUrl.trim());
  if (!m) return null;
  const mediaType = m[1] ?? "";
  const data = m[2] ?? "";
  if (!mediaType.startsWith("image/") || !data) return null;
  return { mediaType, data };
}

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
  const imagesRaw =
    typeof body === "object" && body && "images" in body ? ((body as { images: unknown }).images as unknown) : undefined;

  const images = Array.isArray(imagesRaw) ? imagesRaw : [];
  const parsed = images
    .slice(0, 3)
    .map((x) => {
      const dataUrl = x && typeof x === "object" && "dataUrl" in (x as any) ? String((x as any).dataUrl) : "";
      const p = parseDataUrl(dataUrl);
      return p;
    })
    .filter((x): x is { mediaType: string; data: string } => Boolean(x));

  if (!agent.trim() || !message.trim() || parsed.length === 0) {
    return Response.json({ error: "Fields `agent`, `message`, and at least 1 image are required." }, { status: 400 });
  }

  const model = process.env.ANTHROPIC_MODEL?.trim() || DEFAULT_MODEL;
  const client = new Anthropic({ apiKey });

  try {
    const content: any[] = [
      ...parsed.map((img) => ({
        type: "image",
        source: { type: "base64", media_type: img.mediaType, data: img.data },
      })),
      { type: "text", text: message },
    ];

    const response = await client.messages.create({
      model,
      max_tokens: 1400,
      system: `คุณคือ Oracle Agent ชื่อ "${agent}" ทำ 3 อย่าง: (1) OCR ถ้ามีตัวหนังสือ (2) สรุปสิ่งที่เห็น (3) ถ้าเป็น UI/โค้ด ให้แนะนำสิ่งที่ควรแก้ + ขั้นตอนทำ`,
      messages: [{ role: "user", content }],
    });

    const block = response.content[0];
    const reply = block && block.type === "text" ? block.text : "";

    const usageRaw = response.usage as unknown as Record<string, number> | undefined;
    const inputTokens = usageRaw?.input_tokens;
    const outputTokens = usageRaw?.output_tokens;
    const totalTokens =
      typeof inputTokens === "number" && typeof outputTokens === "number" ? inputTokens + outputTokens : undefined;

    recordTokens(agent, { inputTokens, outputTokens });

    return Response.json({
      reply,
      usage:
        typeof inputTokens === "number" || typeof outputTokens === "number"
          ? { inputTokens, outputTokens, totalTokens }
          : undefined,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Upstream error";
    return Response.json({ error: msg }, { status: 502 });
  }
}

