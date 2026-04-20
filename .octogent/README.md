# Oracle Tentacle System

octogent + maw-js + Oracle ψ รวมเป็นระบบเดียว

## Ports
| Service | Port | คำอธิบาย |
|---------|------|----------|
| Oracle Dashboard | 3000 | claude chat + tmux bridge + hotkeys |
| Octogent API | 8787 | tentacle orchestration API |
| Octogent Web | 5173 | web UI สำหรับจัดการ agents |

## เริ่มต้น

```bash
# Oracle Dashboard (already running)
cd oracle-dashboard && npm run dev

# Octogent Web UI (NEW)
bash .octogent/start.sh
```

## Tentacles

| Tentacle | Agent | Model | Territory |
|----------|-------|-------|-----------|
| `backend` | Sonnet | backend-agent | app/api/**, lib/** |
| `frontend` | Sonnet | frontend-agent | components/**, app/ |
| `research` | Haiku | research-agent | ψ/learn/, docs |

## Workflow

```
เจ้านายสั่ง
    ↓
Octogent Web UI (5173) — เห็น agents ทุกตัว
    ↓
สร้าง/อัปเดต .octogent/tentacles/<name>/todo.md
    ↓
maw_hey <agent> "อ่าน todo.md แล้วลงมือทำ"
    ↓
agent ทำงานใน worktree แยก
    ↓
report กลับที่ ψ/inbox/handoff/
```

## Tentacle vs Worktree

| | Tentacle | Worktree |
|---|---|---|
| คืออะไร | context + task scope | isolated filesystem |
| ที่อยู่ | `.octogent/tentacles/<n>/` | `/tmp/team-<name>` |
| ประกอบด้วย | CONTEXT.md + todo.md | copy of repo files |
| อายุ | ถาวร (git tracked) | ชั่วคราว (ต่อ session) |
| ใช้เมื่อ | นิยาม scope ของงาน | run agent ใน isolation |
| **ใช้คู่กัน** | ✓ tentacle บอกว่าทำอะไร | worktree คือที่ทำงาน |
