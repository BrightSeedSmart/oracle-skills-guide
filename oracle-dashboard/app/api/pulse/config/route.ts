import { getOraclePulseConfig, invalidatePulseConfigCache } from "@/lib/oracle-pulse-config";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("reload") === "1") {
    invalidatePulseConfigCache();
  }

  const c = getOraclePulseConfig();
  return Response.json({
    pulseSchema: c.pulseSchema,
    pulseCompat: 1,
    defaultPing: c.defaultPing,
    preferredTerminal: c.preferredTerminal,
    missionSlots: c.missionSlots,
    agentTargets: c.agentTargets,
    remoteState: c.remoteState,
    autoOps: c.autoOps,
    agentActions: c.agentActions,
    pricing: c.pricing,
    installId: c.installId,
    _meta: { sources: c._sources, mtimeMs: c._mtimeMs },
  });
}
