import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type SshExecOptions = {
  target: string;
  sshBin?: string;
  identity?: string;
  /** ถ้าไม่ส่ง จะอ่านจาก ORACLE_SSH_EXTRA_ARGS */
  extraArgs?: string[];
};

function envExtraArgs(): string[] {
  const raw = process.env.ORACLE_SSH_EXTRA_ARGS?.trim();
  if (!raw) return [];
  return raw.split(/\s+/).filter(Boolean);
}

function shQuote(s: string): string {
  if (!/[|&;<>()$`\\"'\s!{}#*?~]/.test(s)) return s;
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

/**
 * รัน SSH: `ssh [flags] target ...remoteArgv`
 * เช่น remoteArgv = ["--", "tmux", "list-panes"] หรือ ["cat", "/abs/path"]
 *
 * Windows OpenSSH does not accept `--` as end-of-options separator, and SSH joins
 * multiple post-host args on the remote shell (splitting on `|||`, `#`, etc.).
 * Fix: strip leading `--`, quote each arg, join as one shell string.
 */
export function buildSshArgv(remoteArgv: string[], opts: SshExecOptions): [string, string[]] {
  const ssh = opts.sshBin?.trim() || process.env.SSH_BIN?.trim() || "ssh";
  const args: string[] = ["-o", "BatchMode=yes", "-o", "ConnectTimeout=15", ...(opts.extraArgs ?? envExtraArgs())];
  const id = opts.identity?.trim() || process.env.ORACLE_SSH_IDENTITY?.trim();
  if (id) args.push("-i", id);
  const cmds = remoteArgv[0] === "--" ? remoteArgv.slice(1) : remoteArgv;
  args.push(opts.target, cmds.map(shQuote).join(" "));
  return [ssh, args];
}

export async function execSshRemote(
  remoteArgv: string[],
  opts: SshExecOptions,
): Promise<{ stdout: string; stderr: string }> {
  const [cmd, argv] = buildSshArgv(remoteArgv, opts);
  const { stdout, stderr } = await execFileAsync(cmd, argv, {
    maxBuffer: 5 * 1024 * 1024,
    windowsHide: true,
  });
  return { stdout, stderr };
}
