import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { buildSshArgv } from "@/lib/ssh-exec";

const execFileAsync = promisify(execFile);

export type TmuxPaneRow = {
  pane_id: number;
  session_name: string;
  window_index: number;
  pane_index: number;
  title: string;
  cwd: string;
};

const LIST_FMT =
  "#{pane_id}|||#{session_name}|||#{window_index}|||#{pane_index}|||#{pane_title}|||#{pane_current_path}";

export function isTmuxBridgeEnabled(): boolean {
  const v = process.env.TMUX_BRIDGE_ENABLED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function resolveSshTarget(): string | undefined {
  const t = process.env.ORACLE_SSH_TARGET?.trim();
  return t || undefined;
}

export function getTmuxBinForStatus(): string {
  return process.env.TMUX_BIN?.trim() || "tmux";
}

function resolveTmuxBin(): string {
  return getTmuxBinForStatus();
}

/**
 * Build [command, ...argv] for execFile: either local tmux or ssh user@host -- tmux ...
 */
export function buildTerminalArgv(tmuxSubArgs: string[]): [string, string[]] {
  const tmuxBin = resolveTmuxBin();
  const target = resolveSshTarget();

  if (!target) {
    return [tmuxBin, tmuxSubArgs];
  }

  return buildSshArgv(["--", tmuxBin, ...tmuxSubArgs], {
    target,
    sshBin: process.env.SSH_BIN?.trim(),
    identity: process.env.ORACLE_SSH_IDENTITY?.trim(),
  });
}

export async function runTmuxCli(tmuxSubArgs: string[]): Promise<{ stdout: string; stderr: string }> {
  const [cmd, args] = buildTerminalArgv(tmuxSubArgs);
  const { stdout, stderr } = await execFileAsync(cmd, args, {
    maxBuffer: 10 * 1024 * 1024,
    windowsHide: true,
  });
  return { stdout, stderr };
}

export async function tmuxListPanes(): Promise<TmuxPaneRow[]> {
  const { stdout, stderr } = await runTmuxCli(["list-panes", "-a", "-F", LIST_FMT]);
  if (stderr && /error|failed|no server/i.test(stderr) && !stdout.trim()) {
    throw new Error(stderr.trim());
  }
  const rows: TmuxPaneRow[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const t = line.trim();
    if (!t) continue;
    const parts = t.split("|||");
    if (parts.length < 6) continue;
    const rawId = parts[0] ?? "";
    const pane_id = Number(rawId.startsWith("%") ? rawId.slice(1) : rawId);
    if (!Number.isFinite(pane_id)) continue;
    rows.push({
      pane_id,
      session_name: parts[1] ?? "",
      window_index: Number(parts[2]) || 0,
      pane_index: Number(parts[3]) || 0,
      title: parts[4] ?? "",
      cwd: parts[5] ?? "",
    });
  }
  return rows;
}

export async function tmuxSendLiteral(paneId: number, text: string): Promise<void> {
  const target = `%${paneId}`;
  const { stderr } = await runTmuxCli(["send-keys", "-t", target, "-l", text]);
  if (stderr && /error|unknown|not found/i.test(stderr)) {
    throw new Error(stderr.trim());
  }
}
