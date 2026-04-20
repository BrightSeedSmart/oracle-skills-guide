import type { OracleAgent } from "@/lib/agents";
import { AGENTS } from "@/lib/agents";

export type MissionSlotKind = "agent" | "clipboard" | "mission";

export type MissionSlot = {
  /** ปุ่ม Quick Launch — รองรับ 1–12 จาก JSON */
  id: string;
  title: string;
  detail: string;
  kind: MissionSlotKind;
  /** ชื่อ agent ใน AGENTS (lowercase) */
  agentName?: string;
  /** คัดลอกไปวางใน WezTerm/tmux */
  clipboardText?: string;
};

/** Quick Launch ค่าเริ่มต้น — โอเวอร์ไรด์ด้วย config/oracle-pulse.config.json หรือ public/oracle-pulse-slots.json */
export const MISSION_QUICK_SLOTS: MissionSlot[] = [
  {
    id: "1",
    title: "oracle",
    detail: "/my-Oracle → claude",
    kind: "agent",
    agentName: "oracle",
  },
  {
    id: "2",
    title: "hermes",
    detail: "/hermes-agent → claude",
    kind: "agent",
    agentName: "hermes",
  },
  {
    id: "3",
    title: "server",
    detail: "VPS / SSH shell",
    kind: "clipboard",
    clipboardText: "ssh user@your-vps-host",
  },
  {
    id: "4",
    title: "studio",
    detail: "/oracle-studio → bun dev",
    kind: "clipboard",
    clipboardText: "cd oracle-studio && bun dev",
  },
  {
    id: "5",
    title: "graph",
    detail: "/graph-oracle → claude",
    kind: "agent",
    agentName: "pathfinder",
  },
];

export function findAgentByName(name: string): OracleAgent | undefined {
  const n = name.trim().toLowerCase();
  return AGENTS.find((a) => a.name.toLowerCase() === n);
}

export function findMissionSlot(slots: MissionSlot[], id: string): MissionSlot | undefined {
  return slots.find((s) => s.id === id);
}
