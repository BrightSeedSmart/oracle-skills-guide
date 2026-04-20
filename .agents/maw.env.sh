#!/usr/bin/env bash
# Oracle Team — maw environment v2
# source .agents/maw.env.sh

export MAW_PROJECT="my-oracle"
export MAW_SESSION="oracle-team"
export MAW_TOKEN_THRESHOLD=80000
export MAW_AGENTS_DIR="$(pwd)/.agents"
export MAW_SCRIPTS_DIR="$(pwd)/.agents/scripts"

# ──────────────────────────────────────────
# maw hey <agent> <message>
# ──────────────────────────────────────────
maw() {
  local cmd="${1:-help}"; shift || true
  case "$cmd" in
    hey)
      local agent="$1"; shift
      local msg="$*"
      case "$agent" in
        backend|1)  tmux send-keys -t "oracle-team:backend"  "$msg" Enter ;;
        frontend|2) tmux send-keys -t "oracle-team:frontend" "$msg" Enter ;;
        research|3) tmux send-keys -t "oracle-team:research" "$msg" Enter ;;
        all)
          tmux send-keys -t "oracle-team:backend"  "$msg" Enter
          tmux send-keys -t "oracle-team:frontend" "$msg" Enter
          tmux send-keys -t "oracle-team:research" "$msg" Enter
          ;;
        *) echo "Unknown agent: $agent. Use: backend|frontend|research|all" ;;
      esac
      ;;
    start)
      echo "Starting oracle-team session..."
      tmux new-session -d -s oracle-team -c "$OLDPWD" 2>/dev/null || true
      tmux new-window -t oracle-team -n backend  -c "/tmp/team-backend"  2>/dev/null || true
      tmux new-window -t oracle-team -n frontend -c "/tmp/team-frontend" 2>/dev/null || true
      tmux new-window -t oracle-team -n research -c "/tmp/team-research" 2>/dev/null || true
      echo "✓ Sessions ready. Attach with: maw attach"
      ;;
    attach)
      local agent="${1:-backend}"
      tmux attach -t "oracle-team:$agent"
      ;;
    status)
      echo "=== Oracle Team: oracle-team ==="
      tmux list-windows -t oracle-team 2>/dev/null || echo "Session not running"
      echo ""
      echo "Worktrees:"
      git worktree list
      echo ""
      echo "Inbox:"
      ls -t ψ/inbox/handoff/ 2>/dev/null | head -5 || echo "Empty"
      ;;
    kill)
      tmux kill-session -t oracle-team 2>/dev/null && echo "✓ Killed oracle-team" || echo "Not running"
      ;;
    token-check)
      # alert if token file exists (agents write token count to disk)
      local token_file="ψ/inbox/tokens_$(date +%Y%m%d).log"
      if [ -f "$token_file" ]; then
        local total
        total=$(awk '{sum+=$1} END{print sum}' "$token_file" 2>/dev/null || echo 0)
        if [ "$total" -ge "$MAW_TOKEN_THRESHOLD" ]; then
          echo "⚠️  TOKEN ALERT: Today's usage = $total (threshold: $MAW_TOKEN_THRESHOLD)"
        else
          echo "✓ Tokens today: $total / $MAW_TOKEN_THRESHOLD"
        fi
      else
        echo "No token log for today"
      fi
      ;;
    help|*)
      cat <<'HELP'
Oracle maw — team commands
  maw hey <backend|frontend|research|all> "<message>"
  maw start          — create tmux session
  maw attach [agent] — attach to agent pane
  maw status         — show team status
  maw kill           — kill oracle-team session
  maw token-check    — check daily token usage
HELP
      ;;
  esac
}

echo "✓ Oracle maw loaded — 'maw help' for commands"
