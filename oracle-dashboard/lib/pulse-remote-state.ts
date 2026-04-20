import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { execSshRemote } from "@/lib/ssh-exec";
import { getOraclePulseConfig } from "@/lib/oracle-pulse-config";
import { resolveSshTarget } from "@/lib/tmux-bridge";

export type PulseRemotePayload = {
  pulseSchema?: number;
  banner?: string;
  installId?: string;
  /** โน้ตต่อ agent — รองรับ Oracle รุ่นเก่า/ใหม่จาก automation */
  agents?: Record<string, { note?: string; tag?: string; status?: string }>;
  [key: string]: unknown;
};

export async function fetchPulseRemoteState(): Promise<{ ok: true; data: PulseRemotePayload } | { ok: false; error: string }> {
  const cfg = getOraclePulseConfig();
  const rs = cfg.remoteState;
  if (!rs?.enabled || !rs.catPath?.trim()) {
    return { ok: false, error: "remoteState disabled or catPath missing" };
  }

  const target = rs.sshTarget?.trim() || resolveSshTarget();
  const path = rs.catPath.trim();

  try {
    if (target) {
      const { stdout, stderr } = await execSshRemote(["cat", path], { target });
      if (stderr && /error|denied|no such file/i.test(stderr) && !stdout.trim()) {
        return { ok: false, error: stderr.trim() };
      }
      const data = JSON.parse(stdout.trim()) as PulseRemotePayload;
      return { ok: true, data };
    }

    const localPath = isAbsolute(path) ? path : join(process.cwd(), path);
    if (!existsSync(localPath)) {
      return { ok: false, error: `local file not found: ${localPath}` };
    }
    const raw = readFileSync(localPath, "utf8");
    const data = JSON.parse(raw) as PulseRemotePayload;
    return { ok: true, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "remote state read failed";
    return { ok: false, error: msg };
  }
}
