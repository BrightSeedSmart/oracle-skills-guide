import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export type WezTermPaneRow = {
  window_id: number;
  tab_id: number;
  pane_id: number;
  workspace: string;
  size: { rows: number; cols: number };
  title: string;
  cwd: string;
};

export function isWezTermBridgeEnabled(): boolean {
  const v = process.env.WEZTERM_BRIDGE_ENABLED?.trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes";
}

export function resolveWezTermBin(): string {
  const fromEnv = process.env.WEZTERM_BIN?.trim();
  if (fromEnv) return fromEnv;
  return process.platform === "win32" ? "wezterm.exe" : "wezterm";
}

function preferMuxFlag(): string[] {
  const v = process.env.WEZTERM_PREFER_MUX?.trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes") return ["--prefer-mux"];
  return [];
}

function shouldRetryPreferMux(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /failed to connect to Socket\("gui-sock-\d+"\)/i.test(msg);
}

export async function wezTermListPanes(): Promise<WezTermPaneRow[]> {
  const bin = resolveWezTermBin();
  const base = ["cli", ...preferMuxFlag(), "list", "--format", "json"];
  const run = async (args: string[]) => {
    const { stdout, stderr } = await execFileAsync(bin, args, {
      maxBuffer: 10 * 1024 * 1024,
      windowsHide: true,
    });
    if (stderr && /error/i.test(stderr) && !stdout.trim()) {
      throw new Error(stderr.trim());
    }
    const parsed: unknown = JSON.parse(stdout.trim());
    if (!Array.isArray(parsed)) {
      throw new Error("Unexpected list output: expected JSON array");
    }
    return parsed as WezTermPaneRow[];
  };
  try {
    return await run(base);
  } catch (e) {
    if (preferMuxFlag().length === 0 && shouldRetryPreferMux(e)) {
      return await run(["cli", "--prefer-mux", "list", "--format", "json"]);
    }
    throw e;
  }
}

export async function wezTermSendText(paneId: number, text: string, noPaste: boolean): Promise<void> {
  const bin = resolveWezTermBin();
  const argsBase = ["cli", ...preferMuxFlag(), "send-text", "--pane-id", String(paneId)];
  const args = noPaste ? [...argsBase, "--no-paste"] : argsBase;

  const run = (argv: string[]) =>
    new Promise<void>((resolve, reject) => {
      const proc = spawn(bin, argv, { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
      let stderr = "";
      proc.stderr?.setEncoding("utf8");
      proc.stderr?.on("data", (c: string) => {
        stderr += c;
      });
      proc.on("error", reject);
      proc.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(stderr.trim() || `wezterm exited with ${code}`));
      });
      proc.stdin?.write(text, "utf8");
      proc.stdin?.end();
    });

  try {
    await run(args);
  } catch (e) {
    if (preferMuxFlag().length === 0 && shouldRetryPreferMux(e)) {
      const muxBase = ["cli", "--prefer-mux", "send-text", "--pane-id", String(paneId)];
      const muxArgs = noPaste ? [...muxBase, "--no-paste"] : muxBase;
      await run(muxArgs);
      return;
    }
    throw e;
  }
}

/** Launch a new WezTerm window even when the GUI is not yet running. Uses
 *  `wezterm start` (not `cli spawn`), so no GUI socket required. */
export async function wezTermStart(
  argv: string[],
  opts: { cwd?: string } = {},
): Promise<void> {
  if (!argv.length) throw new Error("start requires at least one program argument");
  const bin = resolveWezTermBin();
  const args = ["start"];
  if (opts.cwd?.trim()) args.push("--cwd", opts.cwd.trim());
  args.push("--", ...argv);
  await execFileAsync(bin, args, { windowsHide: false, timeout: 5000 });
}

export async function wezTermSpawn(
  argv: string[],
  opts: { cwd?: string; newWindow?: boolean; domainName?: string; workspace?: string; windowId?: number },
): Promise<string> {
  if (!argv.length) throw new Error("spawn requires at least one program argument");
  const bin = resolveWezTermBin();
  const makeArgs = (preferMux: boolean) => {
    const parts = ["cli", ...(preferMux ? ["--prefer-mux"] : preferMuxFlag()), "spawn"];
    if (opts.newWindow) parts.push("--new-window");
    if (opts.workspace?.trim()) {
      if (!opts.newWindow) {
        throw new Error("workspace requires newWindow=true");
      }
      parts.push("--workspace", opts.workspace.trim());
    }
    if (opts.domainName?.trim()) parts.push("--domain-name", opts.domainName.trim());
    if (typeof opts.windowId === "number" && Number.isFinite(opts.windowId) && opts.windowId >= 0) {
      parts.push("--window-id", String(opts.windowId));
    }
    if (opts.cwd?.trim()) parts.push("--cwd", opts.cwd.trim());
    parts.push("--", ...argv);
    return parts;
  };

  const run = async (args: string[]) => {
    const { stdout, stderr } = await execFileAsync(bin, args, {
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });
    if (stderr && /error/i.test(stderr) && !stdout.trim()) {
      throw new Error(stderr.trim());
    }
    return stdout.trim();
  };

  try {
    return await run(makeArgs(false));
  } catch (e) {
    if (preferMuxFlag().length === 0 && shouldRetryPreferMux(e)) {
      return await run(makeArgs(true));
    }
    throw e;
  }
}
