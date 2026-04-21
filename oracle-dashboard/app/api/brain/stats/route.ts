import { dbGetCacheEntries, dbGetTokenStatsByAgent } from "@/lib/supabase";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const days = Math.max(1, Math.min(90, parseInt(url.searchParams.get("days") ?? "1", 10)));

  const [agentStats, cacheList] = await Promise.all([
    dbGetTokenStatsByAgent(days),
    dbGetCacheEntries(undefined, 50),
  ]);

  return Response.json({ agentStats, cacheList });
}
