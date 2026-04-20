# Backend Agent — CONTEXT

## Territory
`oracle-dashboard/app/api/**` + `oracle-dashboard/lib/**`

## Tech Stack
- Next.js 16.2.4 API Routes (App Router)
- Node.js 22+ / TypeScript 5
- Anthropic SDK 0.90.0
- SSH via `execFile` (Windows OpenSSH)

## Files You Own

### API Routes
| File | Role |
|------|------|
| `app/api/oracle/route.ts` | Claude text API — POST {agent, message} → {reply, usage} |
| `app/api/oracle-vision/route.ts` | Claude vision API — base64 images max 3 |
| `app/api/tmux/route.ts` | tmux bridge — list panes / send-text via SSH |
| `app/api/wezterm/route.ts` | WezTerm bridge — list / send / spawn |
| `app/api/pulse/config/route.ts` | Config endpoint — merged JSON + cache |
| `app/api/pulse/send-to-agent/route.ts` | Route text → agent pane (tmux or WezTerm) |
| `app/api/pulse/remote-state/route.ts` | Poll remote agent state via SSH cat |

### Libraries
| File | Role |
|------|------|
| `lib/ssh-exec.ts` | SSH argv builder — Windows `--` strip + shell-quote fix |
| `lib/tmux-bridge.ts` | tmux CLI wrapper — `%pane_id` parser, LIST_FMT |
| `lib/wezterm-bridge.ts` | WezTerm CLI — list/send/spawn, --prefer-mux retry |
| `lib/pulse-send-agent.ts` | Route text to pane — preferredTerminal + fallback |
| `lib/pulse-bridge-secret.ts` | Bridge secret validation from env |
| `lib/oracle-pulse-config.ts` | Config merge + mtime cache |
| `lib/oracle-pulse-config.types.ts` | Full config schema types |

## Known Issues
- `ssh-exec.ts` stripped `--` separator (Windows OpenSSH doesn't support it)
- `#{pane_id}` outputs `%0`–`%N` — must strip `%` before `Number()` parse
- `ORACLE_PULSE_BRIDGE_SECRET` not set = open endpoints (LAN only)
- Config cache invalidated via `?reload=1`

## Env Vars You Control
```
ANTHROPIC_API_KEY, ANTHROPIC_MODEL
TMUX_BRIDGE_ENABLED, TMUX_BIN
WEZTERM_BRIDGE_ENABLED, WEZTERM_BIN, WEZTERM_PREFER_MUX
ORACLE_SSH_TARGET, ORACLE_SSH_IDENTITY, ORACLE_SSH_EXTRA_ARGS, SSH_BIN
ORACLE_PULSE_BRIDGE_SECRET, ORACLE_PULSE_CONFIG_PATH
```

## Design Rules
- Never throw from API routes — return `{ error: string }` with status ≥ 400
- SSH commands must be shell-quoted single-string (not multi-arg) for Windows
- All pane IDs are `%N` in tmux — store as number N (strip `%`)
- Max text payload: 48KB per send-text call
