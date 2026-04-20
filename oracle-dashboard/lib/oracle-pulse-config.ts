import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { MergedPulseConfig, OraclePulseConfigFile } from "@/lib/oracle-pulse-config.types";
import { MISSION_QUICK_SLOTS, type MissionSlot, type MissionSlotKind } from "@/lib/mission-slots";

const DEFAULT_PING = "/btw status";

let cache: { merged: MergedPulseConfig; mtime: number; pathKey: string } | null = null;

function configPathCandidates(): string[] {
  const fromEnv = process.env.ORACLE_PULSE_CONFIG_PATH?.trim();
  const list: string[] = [];
  if (fromEnv) list.push(fromEnv);
  list.push(join(process.cwd(), "config", "oracle-pulse.config.json"));
  return list;
}

function readJsonFile(path: string): OraclePulseConfigFile | null {
  try {
    if (!existsSync(path)) return null;
    const raw = readFileSync(path, "utf8");
    return JSON.parse(raw) as OraclePulseConfigFile;
  } catch {
    return null;
  }
}

function readPublicSlotsOverride(): Partial<Pick<OraclePulseConfigFile, "missionSlots">> | null {
  const p = join(process.cwd(), "public", "oracle-pulse-slots.json");
  const j = readJsonFile(p);
  if (!j?.missionSlots) return null;
  return { missionSlots: j.missionSlots };
}

function publicSlotsMtime(): number {
  const p = join(process.cwd(), "public", "oracle-pulse-slots.json");
  try {
    if (!existsSync(p)) return 0;
    return statSync(p).mtimeMs;
  } catch {
    return 0;
  }
}

function normalizeSlot(raw: unknown): MissionSlot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? "").trim();
  if (!/^(?:[1-9]|1[0-2])$/.test(id)) return null;
  const title = String(o.title ?? "").trim();
  const detail = String(o.detail ?? "").trim();
  const kind = String(o.kind ?? "agent") as MissionSlotKind;
  if (kind !== "agent" && kind !== "clipboard" && kind !== "mission") return null;
  if (!title) return null;
  const slot: MissionSlot = { id, title, detail: detail || title, kind };
  if (typeof o.agentName === "string" && o.agentName.trim()) slot.agentName = o.agentName.trim().toLowerCase();
  if (typeof o.clipboardText === "string" && o.clipboardText.length) slot.clipboardText = o.clipboardText;
  return slot;
}

function mergeSlots(
  base: MissionSlot[],
  fileSlots?: OraclePulseConfigFile["missionSlots"],
  publicSlots?: OraclePulseConfigFile["missionSlots"],
): MissionSlot[] {
  const byId = new Map<string, MissionSlot>();
  for (const s of base) byId.set(s.id, { ...s });
  const apply = (arr: OraclePulseConfigFile["missionSlots"] | undefined) => {
    if (!arr?.length) return;
    for (const raw of arr) {
      const n = normalizeSlot(raw);
      if (n) byId.set(n.id, n);
    }
  };
  apply(fileSlots);
  apply(publicSlots);
  return [...byId.values()].sort((a, b) => Number(a.id) - Number(b.id));
}

export function getOraclePulseConfig(): MergedPulseConfig {
  const candidates = configPathCandidates();
  let file: OraclePulseConfigFile | null = null;
  let usedPath = "";
  for (const p of candidates) {
    const j = readJsonFile(p);
    if (j) {
      file = j;
      usedPath = p;
      break;
    }
  }

  const pub = readPublicSlotsOverride();
  const mtime = usedPath && existsSync(usedPath) ? statSync(usedPath).mtimeMs : 0;
  const pubMt = publicSlotsMtime();
  const pathKey = `${usedPath}|mt:${mtime}|pubmt:${pubMt}`;

  if (cache && cache.pathKey === pathKey) {
    return cache.merged;
  }

  const sources: string[] = ["defaults:lib/mission-slots"];
  if (usedPath) sources.push(`file:${usedPath}`);
  if (pub?.missionSlots?.length) sources.push("override:public/oracle-pulse-slots.json");

  const merged: MergedPulseConfig = {
    pulseSchema: file?.pulseSchema ?? 1,
    defaultPing: typeof file?.defaultPing === "string" && file.defaultPing.trim() ? file.defaultPing.trim() : DEFAULT_PING,
    preferredTerminal:
      file?.preferredTerminal === "tmux" || file?.preferredTerminal === "wezterm" || file?.preferredTerminal === "auto"
        ? file.preferredTerminal
        : "auto",
    missionSlots: mergeSlots(MISSION_QUICK_SLOTS, file?.missionSlots, pub?.missionSlots),
    agentTargets: file?.agentTargets && typeof file.agentTargets === "object" ? { ...file.agentTargets } : {},
    remoteState: (() => {
      const fromFile = file?.remoteState && typeof file.remoteState === "object" ? { ...file.remoteState } : null;
      const envTarget = process.env.ORACLE_SSH_TARGET?.trim();
      if (!fromFile) {
        return envTarget ? { enabled: false, sshTarget: envTarget } : null;
      }
      if (!fromFile.sshTarget && envTarget) {
        return { ...fromFile, sshTarget: envTarget };
      }
      return fromFile;
    })(),
    autoOps: {
      enabled: Boolean(file?.autoOps?.enabled ?? true),
      idleMs: Math.min(6 * 60 * 60 * 1000, Math.max(60_000, Number(file?.autoOps?.idleMs) || 20 * 60 * 1000)),
    },
    agentActions: file?.agentActions && typeof file.agentActions === "object" ? (file.agentActions as any) : {},
    pricing: {
      // Claude Sonnet 4 (2026): $3/M input, $15/M output (override in config if needed)
      usdPer1MInput: Math.max(0, Number(file?.pricing?.usdPer1MInput) || 3),
      usdPer1MOutput: Math.max(0, Number(file?.pricing?.usdPer1MOutput) || 15),
      usdToThb: Math.max(0, Number(file?.pricing?.usdToThb) || 32.61),
    },
    installId: typeof file?.installId === "string" ? file.installId : undefined,
    _sources: sources,
    _mtimeMs: mtime,
  };

  cache = { merged, mtime: Math.max(mtime, pubMt), pathKey };
  return merged;
}

/** เรียกหลังแก้ไฟล์ config ด้วยมือ (เช่น admin route ในอนาคต) */
export function invalidatePulseConfigCache() {
  cache = null;
}
