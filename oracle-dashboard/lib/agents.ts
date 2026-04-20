export type AgentCategory = "writing" | "ops" | "core";

export type OracleAgent = {
  id: number;
  displayId: string;
  emoji: string;
  name: string;
  status: "active" | "idle";
  category: AgentCategory;
  sessionNote: string;
};

export const AGENTS: OracleAgent[] = [
  { id: 1, displayId: "01", emoji: "🔥", name: "fireman", status: "active", category: "ops", sessionNote: "pulse-oracle" },
  { id: 2, displayId: "02", emoji: "🏠", name: "mother", status: "active", category: "core", sessionNote: "mother-awaken-athena" },
  { id: 3, displayId: "03", emoji: "⚡", name: "neo", status: "active", category: "core", sessionNote: "pulse-oracle" },
  { id: 4, displayId: "04", emoji: "🔮", name: "oracle", status: "active", category: "core", sessionNote: "01-pulse" },
  { id: 5, displayId: "05", emoji: "🧠", name: "athena", status: "idle", category: "writing", sessionNote: "draft-loop" },
  { id: 6, displayId: "06", emoji: "📊", name: "analyst", status: "idle", category: "ops", sessionNote: "metrics-watch" },
  { id: 7, displayId: "07", emoji: "✍️", name: "scribe", status: "active", category: "writing", sessionNote: "longform" },
  { id: 8, displayId: "08", emoji: "🛰️", name: "hermes", status: "active", category: "ops", sessionNote: "delegate-bridge" },
  { id: 9, displayId: "09", emoji: "🧭", name: "pathfinder", status: "idle", category: "core", sessionNote: "trace" },
  { id: 10, displayId: "10", emoji: "🪶", name: "haiku", status: "active", category: "writing", sessionNote: "swarm-lead" },
  { id: 11, displayId: "11", emoji: "🧪", name: "lab", status: "idle", category: "ops", sessionNote: "experiments" },
  { id: 12, displayId: "12", emoji: "🌊", name: "tide", status: "active", category: "core", sessionNote: "resonance" },
  { id: 13, displayId: "13", emoji: "🦾", name: "forge", status: "active", category: "ops", sessionNote: "build-pipeline" },
  { id: 14, displayId: "14", emoji: "📡", name: "relay", status: "idle", category: "ops", sessionNote: "inbox" },
  { id: 15, displayId: "15", emoji: "🕯️", name: "keeper", status: "idle", category: "core", sessionNote: "vault" },
  { id: 16, displayId: "16", emoji: "🧩", name: "mosaic", status: "active", category: "writing", sessionNote: "outline-merge" },
  { id: 17, displayId: "17", emoji: "🪐", name: "orbit", status: "idle", category: "core", sessionNote: "family-scan" },
  { id: 18, displayId: "18", emoji: "🗺️", name: "carto", status: "idle", category: "ops", sessionNote: "infra-map" },
  { id: 19, displayId: "19", emoji: "🎼", name: "conductor", status: "active", category: "core", sessionNote: "maw-meta" },
  { id: 20, displayId: "20", emoji: "🔭", name: "sweep", status: "idle", category: "writing", sessionNote: "research-swarm" },
  { id: 21, displayId: "21", emoji: "🧱", name: "mason", status: "active", category: "ops", sessionNote: "ci-watch" },
  { id: 22, displayId: "22", emoji: "🜁", name: "aether", status: "idle", category: "core", sessionNote: "soul-sync" },
  { id: 23, displayId: "23", emoji: "⚙️", name: "cog", status: "active", category: "ops", sessionNote: "automation" },
  { id: 24, displayId: "24", emoji: "✨", name: "spark", status: "active", category: "writing", sessionNote: "ideas" },
];

export const CATEGORY_LABELS: Record<AgentCategory | "all", string> = {
  all: "All",
  writing: "Writing",
  ops: "Ops",
  core: "Core",
};
