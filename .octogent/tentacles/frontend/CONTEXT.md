# Frontend Agent — CONTEXT

## Territory
`oracle-dashboard/components/**` + `oracle-dashboard/app/page.tsx` + `app/layout.tsx` + `app/globals.css`

## Tech Stack
- React 19.2.4 — hooks only, no class components
- Next.js 16.2.4 App Router — `"use client"` at top of all components
- Tailwind CSS 4 — dark theme, zinc-950 base
- TypeScript 5 — strict mode

## Files You Own

| File | Role |
|------|------|
| `components/oracle-pulse.tsx` | **Main app** (~1000 lines) — tabs, chat, hotkeys, state |
| `components/agent-card.tsx` | Agent display card — emoji, name, ID, badge, selection ring |
| `components/mission-control-panel.tsx` | Mission tab — WezTerm/tmux panels + shortcuts doc |
| `components/mission-quick-launch.tsx` | Quick launch bar — slots [1]–[12], new/kill session |
| `components/tmux-panel.tsx` | tmux UI — list panes, send-text form, SSH hint |
| `components/wezterm-panel.tsx` | WezTerm UI — list panes, send/spawn, cross-OS commands |
| `components/work-ops-tab.tsx` | Ops analytics — sessions, tokens, cost (USD→THB), logs |
| `app/page.tsx` | Root page — renders `<OraclePulse />` only |
| `app/layout.tsx` | Root layout — Geist fonts, MetaMask error suppression |

## Keyboard Shortcuts (must not break)
| Hotkey | Action |
|--------|--------|
| `Shift+1–9` | Focus agent #1–9 (uses `e.code`, not `e.key`) |
| `Shift+0` | Focus agent #10 |
| `Shift+Alt+1–9` | Apply mission slot |
| `Shift+Alt+N` | New session → oracle agent |
| `Shift+Alt+K` | Kill session |
| `Shift+Alt+Enter` | Send to bound pane |

## State Architecture (oracle-pulse.tsx)
- `selected` — focused OracleAgent
- `tab` — current tab (Agents/Mission/Ops/Voice/API)
- `missionSlots` — loaded from `/api/pulse/config`
- `agentActions` — per-agent action buttons from config
- `autoOps` — idle session auto-close (20 min default)
- `unreadById` — unread badge per agent

## Design Rules
- All components use `"use client"` (no SSR)
- Tailwind only — no inline styles except dynamic values
- Dark theme: `bg-zinc-950 text-zinc-100` base
- Hotkeys: always use `e.code` for digit keys (not `e.key` — Thai keyboard shifts digits)
- Never block input focus checks: `el?.closest("input, textarea, select, [contenteditable=true]")`
- Token/cost display: `input_tokens × 0.000003 + output_tokens × 0.000015` USD → ×35 THB
