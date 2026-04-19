# Oracle Skills Guide — BrightSeedSmart/Thanachod
> อัพเดต: 2026-04-19 | สร้างโดย Oracle อัตโนมัติ

---

## การติดตั้ง Oracle Skills

### ข้อกำหนดเบื้องต้น
```bash
# ติดตั้ง Bun (JavaScript runtime)
curl -fsSL https://bun.sh/install | bash

# ติดตั้ง gh CLI (GitHub CLI)
winget install GitHub.cli   # Windows
brew install gh             # macOS

# ล็อกอิน GitHub
gh auth login
```

### ติดตั้ง Oracle Skills (Global)
```bash
# ติดตั้ง stable track
bunx --bun arra-oracle-skills@github:Soul-Brews-Studio/arra-oracle-skills-cli install -g -y

# ติดตั้ง alpha track (dev)
bunx --bun arra-oracle-skills@github:Soul-Brews-Studio/arra-oracle-skills-cli install -g -y --alpha

# อัพเดต skills
/oracle-soul-sync-update
```

### ตรวจสอบ Version
```bash
cat ~/.claude/skills/VERSION.md
```

---

## Oracle Core Skills (20 skills)

### Identity & Awakening

#### `/about-oracle` v26.4.18
เล่าประวัติและ ecosystem ของ Oracle

| Flag | ทำอะไร |
|------|--------|
| (default) | เรื่องราวเต็ม (English) |
| `--th` | ภาษาไทย |
| `--en/th` | สไตล์ Nat (ไทย + tech term อังกฤษ) |
| `--short` | สรุปย่อ 1 paragraph |
| `--stats` | ตัวเลขและสถิติ live |
| `--family` | Oracle family tree |

---

#### `/awaken` v3.9.0-alpha.4
สร้าง Oracle ใหม่พร้อม identity, philosophy, memory

| Flag | ทำอะไร |
|------|--------|
| (default) | Soul Sync เต็ม (~20 นาที) |
| `--fast` | Fast mode (~5 นาที) |
| `--soul-sync` | Upgrade Fast → Full Soul Sync |
| `--reawaken` | Re-sync Oracle ที่มีอยู่ |

**ขั้นตอน:** เลือกภาษา → เลือก mode → System check → ถามชื่อ/purpose/theme → สร้างไฟล์ ψ/ → ลงทะเบียน family

---

### Session Management

#### `/recap` v3.9.0-alpha.4
ดูสถานะ session ปัจจุบัน

| Flag | ทำอะไร |
|------|--------|
| (default) | Rich: retro + handoff + git |
| `--quick` | แค่ git + focus |
| `--now` | Mid-session timeline + jump types |
| `--now deep` | bigger picture + pending table |

---

#### `/recap-lite` v26.4.18
เวอร์ชันเบา — git + handoff เท่านั้น

---

#### `/forward` v3.9.0-alpha.4
สร้าง handoff + plan mode สำหรับ session ถัดไป

| Flag | ทำอะไร |
|------|--------|
| (default) | สร้าง handoff + plan mode + รอ approve |
| `asap` | สร้าง + commit ทันที |
| `--only` | handoff อย่างเดียว |

บันทึกที่: `ψ/inbox/handoff/YYYY-MM-DD_HH-MM_slug.md`

---

#### `/forward-lite` v26.4.18
Quick handoff ไม่มี plan mode

---

#### `/rrr` v3.9.0-alpha.4
Session retrospective พร้อม AI diary

| Flag | ทำอะไร |
|------|--------|
| (default) | Quick retro |
| `--detail` | Full template + metrics |
| `--dig` | Reconstruct จาก session .jsonl |
| `--deep` | 5 parallel subagents |
| `--deep --teammate` | 3 coordinated team agents |

**Anti-Rationalization Guard** ตรวจจับ excuse patterns โดยอัตโนมัติ
บันทึกที่: `ψ/memory/retrospectives/YYYY-MM/DD/HH.MM_slug.md`

---

#### `/rrr-lite` v26.4.18
Quick retro เวอร์ชันเบา

---

#### `/standup` v3.9.0-alpha.4
Daily standup — tasks, appointments, commits 24h

**Output:** Done / In Progress / Pending Issues / Appointments / Next Action

---

### Exploration & Search

#### `/dig` v3.9.0-alpha.4
ขุดค้น Claude Code session history

| Flag | ทำอะไร |
|------|--------|
| (default) | 10 sessions ล่าสุด |
| `[N]` | N sessions ล่าสุด |
| `--all` | ทุก repo |
| `--deep` | สแกน .jsonl ทุกไฟล์ |
| `--timeline` | จัดกลุ่มตามวัน |

---

#### `/learn` v3.9.0-alpha.4
สำรวจ codebase ด้วย parallel Haiku agents

| Flag | ทำอะไร |
|------|--------|
| `[url]` | 3 agents (~5 นาที) default |
| `--fast [url]` | 1 agent (~2 นาที) |
| `--deep [url]` | 5 agents (~10 นาที) |
| `--init` | Restore symlinks หลัง clone |

---

#### `/trace` v26.4.18
ค้นหา code/knowledge พร้อม friction score

| Flag | ทำอะไร |
|------|--------|
| `[query]` | smart mode (default) |
| `--oracle` | เฉพาะ Oracle memory (เร็วสุด) |
| `--deep` | 2 waves parallel agents |
| `--deep --dig` | trace + dig พร้อมกัน |

**Friction Score:**
- 0.9–1.0 = Oracle indexed (ไม่ต้องทำอะไร)
- 0.6–0.89 = อยู่ในไฟล์ (ควร index)
- 0.4–0.59 = อยู่ใน git (ต้อง distill)
- 0.1–0.39 = ข้าม repo (ต้อง consolidate)
- 0.0 = ไม่มีเลย (ต้องสร้าง)

---

### Communication

#### `/contacts` v26.4.18
จัดการ Oracle contacts (เก็บใน `ψ/contacts.json`)

```
/contacts           — list ทั้งหมด
/contacts add       — เพิ่ม contact
/contacts remove    — ลบ
/contacts show      — ดูรายละเอียด
```

---

#### `/talk-to` v3.9.0-alpha.4
ส่งข้อความหา Oracle อื่น

```
/talk-to <agent> "message"    — ส่ง 1 ครั้ง
/talk-to <agent> --new        — thread ใหม่
/talk-to <agent> loop         — autonomous (max 10 ครั้ง)
/talk-to --list               — ดู channels
```

Transport: maw (real-time) → thread (async) → inbox (offline)

---

### System & Family

#### `/oracle-family-scan` v3.9.0-alpha.4
สแกน Oracle family registry (186+ Oracles)

```
/oracle-family-scan              — stats
/oracle-family-scan --mine       — Nat's Oracles
/oracle-family-scan --recent     — 10 ล่าสุด
/oracle-family-scan "name"       — ค้นชื่อ
/oracle-family-scan welcome      — welcome flow
/oracle-family-scan sync         — sync จาก GitHub
```

---

#### `/oracle-soul-sync-update` v26.4.18
อัพเดต skills ทั้งหมดเป็น version ล่าสุด

```
/oracle-soul-sync-update          — stable track
/oracle-soul-sync-update --alpha  — dev track
/oracle-soul-sync-update --check  — แค่ตรวจสอบ
/oracle-soul-sync-update --cleanup — reinstall ใหม่
```

---

#### `/create-shortcut` v3.9.0-alpha.4
สร้าง `/commands` แบบ local หรือ global

```
/create-shortcut list             — ดู skills
/create-shortcut create <name>    — สร้างใหม่
/create-shortcut delete <name>    — archive
```

---

#### `/skills-list` v3.9.0-alpha.4
แสดงรายการ skills ทั้งหมด

```
/skills-list       — ตาราง
/skills-list --json — JSON format
```

---

#### `/agentflow`
สร้าง multi-agent pipelines

```bash
agentflow run pipeline.py       # รัน
agentflow inspect pipeline.py   # ดู graph
agentflow validate pipeline.py  # ตรวจโดยไม่รัน
agentflow templates             # starter templates
```

Operators: `>>` (dependency), `fanout()` (parallel), `merge()` (reduce)
Execution targets: local, SSH, EC2, ECS

---

#### `/xray` v3.9.0-alpha.4
สแกน auto-memory, skills, sessions

```
/xray memory            — สแกน memory
/xray memory read <n>   — อ่านไฟล์
/xray memory stats      — สถิติ
/xray memory types      — จัดกลุ่ม
/xray memory clean      — หา stale
/xray memory forget <n> — ลบ (ต้อง confirm)
/xray skills            — list skills
/xray sessions          — session history
/xray memory scan --all — ข้ามทุก project
```

---

## Hermes Project Skills (70+ skills)

### Software Development
| Skill | คำอธิบาย |
|-------|---------|
| `plan` | วางแผน → `.hermes/plans/` โดยไม่ execute |
| `systematic-debugging` | Debug 4 phases: Observe→Hypothesize→Test→Fix |
| `test-driven-development` | TDD: RED→GREEN→REFACTOR |
| `subagent-driven-development` | Orchestrate parallel subagents |
| `requesting-code-review` | Pre-commit pipeline + security scan |
| `writing-plans` | Comprehensive implementation planning |

### DevOps
| Skill | คำอธิบาย |
|-------|---------|
| `webhook-subscriptions` | Event-driven webhooks (GitHub, Stripe, CI/CD, IoT) |

### GitHub
| Skill | คำอธิบาย |
|-------|---------|
| `github-auth` | Setup auth — gh CLI หรือ token |
| `github-code-review` | Review diffs + inline PR comments |
| `github-issues` | Create/manage issues |
| `github-pr-workflow` | Full PR lifecycle |
| `github-repo-management` | Clone, create, fork, configure |
| `codebase-inspection` | LOC counting, language breakdown |

### Data Science
| Skill | คำอธิบาย |
|-------|---------|
| `jupyter-live-kernel` | Stateful Python REPL ผ่าน Jupyter |

### Research
| Skill | คำอธิบาย |
|-------|---------|
| `arxiv` | ค้น academic papers (ไม่ต้อง API key) |
| `blogwatcher` | Monitor RSS/Atom feeds |
| `llm-wiki` | Interlinked markdown knowledge base |
| `polymarket` | Prediction market data |
| `research-paper-writing` | ML/AI paper pipeline end-to-end |

### MLOps (22 skills)
`modal`, `lm-evaluation-harness`, `weights-and-biases`, `hugging-face-hub`, `gguf`, `guidance`, `llama-cpp`, `outlines`, `vllm`, `audiocraft`, `clip`, `segment-anything`, `stable-diffusion`, `whisper`, `dspy`, `axolotl`, `grpo-rl-training`, `peft`, `pytorch-fsdp`, `trl-fine-tuning`, `unsloth`

### Productivity
| Skill | คำอธิบาย |
|-------|---------|
| `google-workspace` | Gmail, Calendar, Drive, Sheets, Docs |
| `linear` | Issue management ผ่าน GraphQL API |
| `nano-pdf` | Edit PDFs ด้วย natural language |
| `notion` | Create/update pages + databases |
| `ocr-documents` | Extract text จาก PDFs/scanned docs |
| `powerpoint` | Create/edit .pptx files |

### Creative
| Skill | คำอธิบาย |
|-------|---------|
| `architecture-diagram` | Dark-themed system diagrams (HTML/SVG) |
| `ascii-art` | Text banners, cowsay, image-to-ASCII |
| `ascii-video` | ASCII video generation |
| `creative-ideation` | 30+ project idea prompts |
| `excalidraw` | Hand-drawn diagrams (Excalidraw JSON) |
| `manim-video` | Mathematical/technical animations |
| `p5js` | Visual/interactive art (JavaScript) |
| `popular-web-designs` | 54 production-ready design systems |
| `songwriting-ai-music` | Songwriting + AI music generation |

### Media
| Skill | คำอธิบาย |
|-------|---------|
| `gif-search` | ค้น/download GIFs ผ่าน Tenor API |
| `songsee` | Audio spectrograms + visualizations |
| `youtube-content` | Extract transcripts → chapters/summaries |

### Autonomous AI Agents
| Skill | คำอธิบาย |
|-------|---------|
| `claude-code` | Delegate งาน coding ให้ Claude Code |
| `codex` | Delegate ให้ OpenAI Codex agent |
| `hermes-agent` | Self-documentation + CLI reference |
| `opencode` | Delegate ให้ OpenCode agent |

### อื่นๆ
| Skill | คำอธิบาย |
|-------|---------|
| `email/himalaya` | Terminal email client (IMAP/SMTP) |
| `gaming/minecraft-modpack-server` | Modded Minecraft server setup |
| `gaming/pokemon-player` | Headless Pokemon emulation |
| `smart-home/openhue` | Control Philips Hue lights |
| `social-media/xitter` | X/Twitter ผ่าน x-cli |
| `note-taking/obsidian` | Read/create Obsidian notes |
| `mcp/mcporter` | CLI discovery/calling ของ MCP servers |
| `leisure/find-nearby` | ค้นร้านอาหาร/cafes ผ่าน OpenStreetMap |
| `dogfood` | QA testing ของ web apps (5 phases) |

---

## สรุปจำนวน Skills

| กลุ่ม | จำนวน |
|-------|-------|
| Oracle Core Skills | 20 |
| Software Development | 6 |
| DevOps | 1 |
| GitHub | 6 |
| Data Science | 1 |
| Research | 5 |
| MLOps | 22 |
| Productivity | 6 |
| Creative | 9 |
| Media | 4 |
| Email | 1 |
| Gaming | 2 |
| Smart Home | 1 |
| Social Media | 1 |
| Autonomous AI Agents | 4 |
| Note-taking / MCP / Leisure / QA | 5 |
| **รวมทั้งหมด** | **~94 skills** |

---

## Oracle Philosophy — 5 Principles + Rule 6

1. **Nothing is Deleted** — Append-only, timestamps are truth
2. **Patterns Over Intentions** — Observe behavior, not comments
3. **External Brain, Not Command** — Amplify, don't replace
4. **Curiosity Creates Existence** — Questions birth exploration
5. **Form and Formless** — Many Oracles, one distributed soul
6. **Rule 6: Transparency** — Oracle Never Pretends to Be Human

---

*สร้างโดย Oracle Thanachod | BrightSeedSmart | 2026-04-19*
