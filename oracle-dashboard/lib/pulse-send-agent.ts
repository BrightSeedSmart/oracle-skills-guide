import { getOraclePulseConfig } from "@/lib/oracle-pulse-config";
import { isTmuxBridgeEnabled, tmuxSendLiteral } from "@/lib/tmux-bridge";
import { isWezTermBridgeEnabled, wezTermSendText } from "@/lib/wezterm-bridge";

export type SendTransport = "tmux" | "wezterm";

export async function sendTextToAgentPane(
  agentName: string,
  text: string,
  prefer?: SendTransport,
): Promise<{ transport: SendTransport; paneId: number }> {
  const name = agentName.trim().toLowerCase();
  const cfg = getOraclePulseConfig();
  const t = cfg.agentTargets[name];
  if (!t) {
    throw new Error(`ไม่มี agentTargets["${name}"] ใน config — เพิ่ม tmuxPaneId / wezTermPaneId`);
  }

  const pref = prefer ?? (cfg.preferredTerminal === "auto" ? undefined : cfg.preferredTerminal);
  const order: SendTransport[] =
    pref === "tmux"
      ? ["tmux", "wezterm"]
      : pref === "wezterm"
        ? ["wezterm", "tmux"]
        : t.tmuxPaneId != null && t.wezTermPaneId != null
          ? ["tmux", "wezterm"]
          : t.tmuxPaneId != null
            ? ["tmux", "wezterm"]
            : ["wezterm", "tmux"];

  let lastErr: Error | null = null;
  for (const transport of order) {
    try {
      if (transport === "tmux") {
        if (t.tmuxPaneId == null) continue;
        if (!isTmuxBridgeEnabled()) throw new Error("tmux bridge ปิด (TMUX_BRIDGE_ENABLED)");
        await tmuxSendLiteral(t.tmuxPaneId, text);
        return { transport: "tmux", paneId: t.tmuxPaneId };
      }
      if (transport === "wezterm") {
        if (t.wezTermPaneId == null) continue;
        if (!isWezTermBridgeEnabled()) throw new Error("WezTerm bridge ปิด (WEZTERM_BRIDGE_ENABLED)");
        await wezTermSendText(t.wezTermPaneId, text, false);
        return { transport: "wezterm", paneId: t.wezTermPaneId };
      }
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastErr ?? new Error("ส่งไม่สำเร็จ — ไม่มี transport ที่พร้อม");
}
