#!/usr/bin/env bash
# Oracle Meta-Orchestrator
# สร้าง tmux sessions, ปลุก agents, monitor tokens
# Usage: bash .agents/orchestrator.sh [backend|frontend|research|all] "task"

set -euo pipefail

ORACLE_HOME="F:/Ai/my-Oracle"
INBOX="$ORACLE_HOME/ψ/inbox"
TOKEN_THRESHOLD=80000
SLACK_RELAY="ORACLE_NAME=my-oracle node ~/.oracle/relay.js send --to ariadne --msg"

log() { echo "[ORCH $(date +%H:%M:%S)] $*"; }

token_alert() {
  local agent="$1" tokens="$2"
  if [ "$tokens" -ge "$TOKEN_THRESHOLD" ]; then
    log "⚠️  TOKEN ALERT: $agent used ${tokens} tokens (threshold: ${TOKEN_THRESHOLD})"
    eval "$SLACK_RELAY 'TOKEN ALERT: agent $agent used ${tokens} tokens'" 2>/dev/null || true
  fi
}

spawn_agent() {
  local name="$1" workdir="$2" model="$3" task="$4"
  local session="oracle-$name"
  local ts
  ts=$(date +%Y%m%d_%H%M%S)
  local report_path="$INBOX/handoff/${ts}_from_${name}.md"

  mkdir -p "$INBOX/handoff"

  log "Spawning $name → $workdir (model: $model)"

  tmux new-session -d -s "$session" -c "$workdir" 2>/dev/null || \
    tmux new-window -t "$session" -c "$workdir" 2>/dev/null || true

  local prompt="You are oracle-$name agent. TASK: $task
WORKING DIR: $workdir
When done: write summary to $report_path
Format: 'DONE: <summary>'
If blocked: write 'BLOCKED: <reason>'
Monitor: report token count if >$TOKEN_THRESHOLD
Execute immediately, no confirmation needed."

  tmux send-keys -t "$session" "claude --dangerously-skip-permissions -p '$prompt'" Enter
  log "✓ $name spawned in tmux session: $session"
}

case "${1:-all}" in
  backend)
    spawn_agent "backend" "/tmp/team-backend" "sonnet" "${2:-รอคำสั่ง}"
    ;;
  frontend)
    spawn_agent "frontend" "/tmp/team-frontend" "sonnet" "${2:-รอคำสั่ง}"
    ;;
  research)
    spawn_agent "research" "/tmp/team-research" "haiku" "${2:-รอคำสั่ง}"
    ;;
  all)
    task="${2:-ตรวจสอบสถานะและรายงาน}"
    spawn_agent "backend"  "/tmp/team-backend"  "sonnet" "$task"
    spawn_agent "frontend" "/tmp/team-frontend" "sonnet" "$task"
    spawn_agent "research" "/tmp/team-research" "haiku"  "$task"
    ;;
  status)
    log "=== Oracle Fleet Status ==="
    tmux ls 2>/dev/null || echo "No active sessions"
    echo "--- Inbox ---"
    ls -t "$INBOX/handoff/" 2>/dev/null | head -10 || echo "Empty"
    ;;
  *)
    echo "Usage: orchestrator.sh [backend|frontend|research|all|status] 'task'"
    ;;
esac
