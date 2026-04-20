import type { MissionSlotKind } from "@/lib/mission-slots";

/** ผูก pane กับชื่อ agent (lowercase) — ใช้กับ WezTerm / tmux bridge */
export type AgentPaneTarget = {
  wezTermPaneId?: number;
  tmuxPaneId?: number;
};

export type RemoteStateConfig = {
  enabled?: boolean;
  /** ถ้าไม่ระบุ ใช้ ORACLE_SSH_TARGET */
  sshTarget?: string;
  /** path บน remote (แนะนำ absolute) */
  catPath?: string;
  pollIntervalMs?: number;
};

export type AutoOpsConfig = {
  enabled?: boolean;
  /** ปิด session อัตโนมัติเมื่อไม่มี activity เกินเวลานี้ */
  idleMs?: number;
};

export type AgentAction = {
  id: string;
  title: string;
  detail?: string;
  /**
   * copy = คัดลอกคำสั่ง
   * pane = ส่งเข้า pane ที่ผูก (1-click)
   * link = เปิดลิงก์
   * wezterm-spawn = spawn pane/window ใหม่ผ่าน wezterm cli (1-click)
   */
  kind: "copy" | "pane" | "link" | "wezterm-spawn";
  /** ใช้กับ copy/pane/wezterm-spawn */
  text?: string;
  /**
   * Cross-OS / cross-runtime commands.
   * - localWin: คำสั่งสำหรับ Windows (แนะนำใช้ pwsh)
   * - localUnix: คำสั่งสำหรับ macOS/Linux (แนะนำ bash -lc)
   * - wsl: คำสั่งที่รันใน WSL (bash -lc) — บน Windows จะถูก wrap ด้วย wsl.exe อัตโนมัติ
   * - vps: คำสั่งที่รันบน VPS ผ่าน ssh (ถ้าไม่ขึ้นต้นด้วย ssh จะถูก wrap ด้วย sshTarget)
   */
  variants?: { localWin?: string; localUnix?: string; wsl?: string; vps?: string };
  /** ใช้กับ wezterm-spawn (ถ้าไม่ระบุ ใช้ false) */
  newWindow?: boolean;
  /** ใช้กับ link */
  url?: string;
  /** ถ้าไม่ระบุ ใช้ agent ที่ถูกเลือก */
  agentName?: string;
};

export type PricingConfig = {
  /** USD per 1,000,000 input tokens */
  usdPer1MInput?: number;
  /** USD per 1,000,000 output tokens */
  usdPer1MOutput?: number;
  /** Convert USD→THB */
  usdToThb?: number;
};

export type OraclePulseConfigFile = {
  pulseSchema?: number;
  /** เพิ่มเมื่อมี breaking change — client เก่ายังอ่านฟิลด์ที่รู้จักได้ */
  pulseCompat?: number;
  defaultPing?: string;
  preferredTerminal?: "auto" | "tmux" | "wezterm";
  missionSlots?: Array<{
    id: string;
    title: string;
    detail: string;
    kind: MissionSlotKind;
    agentName?: string;
    clipboardText?: string;
  }>;
  agentTargets?: Record<string, AgentPaneTarget>;
  remoteState?: RemoteStateConfig;
  autoOps?: AutoOpsConfig;
  /** Quick Actions ต่อ agent (เช่น ssh/cmd/playbook) */
  agentActions?: Record<string, AgentAction[]>;
  /** ค่าราคา token เพื่อคิดเงิน (ปรับได้) */
  pricing?: PricingConfig;
  /** ข้อความจาก Oracle รุ่นอื่น / automation */
  installId?: string;
};

export type MergedPulseConfig = {
  pulseSchema: number;
  defaultPing: string;
  preferredTerminal: "auto" | "tmux" | "wezterm";
  missionSlots: import("@/lib/mission-slots").MissionSlot[];
  agentTargets: Record<string, AgentPaneTarget>;
  remoteState: RemoteStateConfig | null;
  autoOps: { enabled: boolean; idleMs: number };
  agentActions: Record<string, AgentAction[]>;
  pricing: { usdPer1MInput: number; usdPer1MOutput: number; usdToThb: number };
  installId?: string;
  /** debug: แหล่งที่โหลด config ล่าสุด */
  _sources: string[];
  _mtimeMs: number;
};
