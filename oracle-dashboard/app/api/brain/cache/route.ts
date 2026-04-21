import { dbClearAllCache, dbGetCacheEntries } from "@/lib/supabase";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const agent = url.searchParams.get("agent") ?? undefined;
  const limit = Math.min(200, parseInt(url.searchParams.get("limit") ?? "50", 10));
  const entries = await dbGetCacheEntries(agent, limit);
  return Response.json({ entries });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const agent = url.searchParams.get("agent") ?? undefined;
  await dbClearAllCache(agent);
  return Response.json({ ok: true });
}
