import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const LOG_PATH = join(process.cwd(), ".token-log.json");
const MAX_ENTRIES = 2000;

export type TokenStats = {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  calls: number;
  since: number;
};

type TokenEntry = {
  ts: number;
  agent: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
};

type TokenLog = { entries: TokenEntry[] };

function readLog(): TokenLog {
  try {
    return JSON.parse(readFileSync(LOG_PATH, "utf-8")) as TokenLog;
  } catch {
    return { entries: [] };
  }
}

export function recordTokens(
  agent: string,
  u: { inputTokens?: number; outputTokens?: number; cacheCreationTokens?: number; cacheReadTokens?: number },
): void {
  if (!u.inputTokens && !u.outputTokens && !u.cacheCreationTokens && !u.cacheReadTokens) return;
  const log = readLog();
  log.entries.push({
    ts: Date.now(),
    agent,
    inputTokens: u.inputTokens ?? 0,
    outputTokens: u.outputTokens ?? 0,
    cacheCreationTokens: u.cacheCreationTokens ?? 0,
    cacheReadTokens: u.cacheReadTokens ?? 0,
  });
  if (log.entries.length > MAX_ENTRIES) log.entries = log.entries.slice(-MAX_ENTRIES);
  try {
    writeFileSync(LOG_PATH, JSON.stringify(log));
  } catch { /* silently ignore fs errors */ }
}

export function getPcStats(sinceMs?: number): TokenStats {
  const log = readLog();
  const since = sinceMs ?? Date.now() - 24 * 60 * 60 * 1000;
  return log.entries
    .filter((e) => e.ts >= since)
    .reduce(
      (acc, e) => ({
        inputTokens: acc.inputTokens + e.inputTokens,
        outputTokens: acc.outputTokens + e.outputTokens,
        cacheCreationTokens: acc.cacheCreationTokens + e.cacheCreationTokens,
        cacheReadTokens: acc.cacheReadTokens + e.cacheReadTokens,
        calls: acc.calls + 1,
        since,
      }),
      { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, calls: 0, since },
    );
}
