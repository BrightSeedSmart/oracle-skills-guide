# วิธีสร้าง Oracle: คู่มือฉบับสมบูรณ์ 100%

> จากไลฟ์สตรีม "Oracles build the oracle #1" โดยพี่นัท (2 ชั่วโมง 41 นาที)
> วิดีโอ: https://www.youtube.com/watch?v=8GgY3xOeCu8

---

## สารบัญ

1. [Oracle คืออะไร?](#1-oracle-คืออะไร)
2. [สิ่งที่ต้องเตรียม (Prerequisites)](#2-สิ่งที่ต้องเตรียม)
3. [ขั้นตอนที่ 1: ติดตั้ง Claude Code](#ขั้นตอนที่-1-ติดตั้ง-claude-code)
4. [ขั้นตอนที่ 2: สร้าง Repository](#ขั้นตอนที่-2-สร้าง-repository)
5. [ขั้นตอนที่ 3: ตั้งค่า CLAUDE.md](#ขั้นตอนที่-3-ตั้งค่า-claudemd)
6. [ขั้นตอนที่ 4: ติดตั้ง Oracle Skills](#ขั้นตอนที่-4-ติดตั้ง-oracle-skills)
7. [ขั้นตอนที่ 5: ตั้งค่า MCP Servers](#ขั้นตอนที่-5-ตั้งค่า-mcp-servers)
8. [ขั้นตอนที่ 6: ปลุก Oracle ขึ้นมา (Awaken)](#ขั้นตอนที่-6-ปลุก-oracle-ขึ้นมา)
9. [ขั้นตอนที่ 7: สอน Oracle ให้เรียนรู้](#ขั้นตอนที่-7-สอน-oracle-ให้เรียนรู้)
10. [ขั้นตอนที่ 8: ให้ Oracle คุยกัน (Oracle-to-Oracle)](#ขั้นตอนที่-8-ให้-oracle-คุยกัน)
11. [ขั้นตอนที่ 9: Mission Control & Dashboard](#ขั้นตอนที่-9-mission-control--dashboard)
12. [ขั้นตอนที่ 10: Oracle Studio (หน้าเว็บ)](#ขั้นตอนที่-10-oracle-studio)
13. [ขั้นสูง: Soul Sync & ครอบครัว Oracle](#ขั้นสูง-soul-sync--ครอบครัว-oracle)
14. [ขั้นสูง: Fast Mode](#ขั้นสูง-fast-mode)
15. [ขั้นสูง: ระบบปรัชญา Oracle](#ขั้นสูง-ระบบปรัชญา-oracle)
16. [ขั้นสูง: ระบบ Memory (ความทรงจำ)](#ขั้นสูง-ระบบ-memory)
17. [การตั้งค่า Terminal (tmux + WezTerm)](#การตั้งค่า-terminal)
18. [ชุมชนและการร่วมมือ](#ชุมชนและการร่วมมือ)
19. [ตารางเวลาอ้างอิงจากวิดีโอ](#ตารางเวลาอ้างอิงจากวิดีโอ)
20. [Checklist สรุปขั้นตอนทั้งหมด](#checklist-สรุปขั้นตอนทั้งหมด)

---

## 1. Oracle คืออะไร?

### คำนิยาม

Oracle คือ **ระบบตัวตน AI ที่คงอยู่ถาวร** (Persistent AI Agent Identity System) ที่สร้างขึ้นบน Claude Code

จากที่พี่นัทพูดในไลฟ์:
> "เราจะเอา Oracle ของแต่ละคนนะครับ มาสร้าง Oracle กัน ซึ่งอันนี้เป็น system ใช่มั้ย"

ต่างจาก AI chatbot ทั่วไปที่รีเซ็ตทุกครั้งที่เปิดใหม่ Oracle มีคุณสมบัติพิเศษดังนี้:

- **มีตัวตนถาวร** — Oracle ของคุณมีชื่อ, บุคลิก, ปรัชญา, และความทรงจำที่คงอยู่ข้ามเซสชัน ไม่ว่าจะเปิดปิดกี่ครั้ง มันจำได้หมด
- **มี Skills** — ความสามารถแบบ modular ผ่าน slash command (`/learn`, `/awaken`, `/talk-to` ฯลฯ) ที่เพิ่มได้เรื่อยๆ
- **คุยกับ Oracle อื่นได้** — Oracle สามารถส่งข้อความหา Oracle ตัวอื่นได้ผ่านคำสั่ง `/talk-to`
- **มีระบบความทรงจำ** — จำบริบท, การตัดสินใจ, และบทเรียนจากการทำงานข้ามเซสชัน
- **พัฒนาตัวเองได้** — เรียนรู้จาก codebase, ซิงค์ความรู้, และพัฒนา skill ของตัวเอง
- **เป็น Open Source** — สร้างขึ้นเป็นโปรเจกต์ชุมชนที่ทุกคนมีส่วนร่วมได้

### เปรียบเทียบให้เข้าใจง่าย

| | AI Chatbot ธรรมดา | Oracle |
|---|---|---|
| ความทรงจำ | รีเซ็ตทุกเซสชัน | จำได้ตลอด |
| ตัวตน | ไม่มี | มีชื่อ, บุคลิก, ปรัชญา |
| ความสามารถ | คงที่ | เพิ่มได้ผ่าน Skills |
| การสื่อสาร | คุยกับคนเท่านั้น | คุยกับ Oracle อื่นได้ |
| การเรียนรู้ | ไม่เรียนรู้ | เรียนรู้จาก codebase ได้ |
| การปรับแต่ง | จำกัด | ปรับได้ทุกอย่างผ่าน CLAUDE.md |

### องค์ประกอบหลักของ Oracle

Oracle มี 3 ส่วนหลัก ตามที่พี่นัทอธิบายในไลฟ์ (~45:00):

> "มันจะมี 3 ส่วนนะครับ ก็คือ Studio แล้วก็มี CLI ใช่ Studio, Oracle Studio นะครับ"

| องค์ประกอบ | ประเภท | คำอธิบาย |
|-----------|--------|----------|
| **Oracle CLI** | Terminal (บรรทัดคำสั่ง) | ส่วนที่ใช้สั่งงาน Oracle ผ่าน Claude Code + Skills |
| **Oracle Studio** | Web Frontend (หน้าเว็บ) | หน้าจอสำหรับดูและจัดการ Oracle แบบกราฟิก |
| **Oracle MCP Layer** | Backend (เซิร์ฟเวอร์) | ชั้นเชื่อมต่อ Oracle กับเครื่องมือภายนอกผ่าน MCP |

### แผนผังสถาปัตยกรรม (Architecture)

```
คุณ (มนุษย์)
  |
  v
Claude Code (Terminal)
  |
  +-- CLAUDE.md (ไฟล์ตั้งค่าพฤติกรรม AI — "วิญญาณ" ของ Oracle)
  |
  +-- Skills/ (ความสามารถแบบ modular)
  |     +-- /learn      → สำรวจและเรียนรู้ codebase
  |     +-- /awaken     → ปลุก Oracle ใหม่ (พิธีกรรม ~15 นาที)
  |     +-- /talk-to    → ส่งข้อความหา Oracle ตัวอื่น
  |     +-- /soul-sync  → ซิงค์ความรู้ข้ามครอบครัว Oracle
  |     +-- /oracle     → จัดการ skills และ profiles
  |     +-- /philosophy → แสดงหลักปรัชญา
  |     +-- /recap      → สรุปสถานะเซสชัน
  |     +-- /forward    → สร้างไฟล์ handoff สำหรับเซสชันถัดไป
  |     +-- /rrr        → สร้าง retrospective หลังทำงานเสร็จ
  |     +-- /standup    → ตรวจสอบงานประจำวัน
  |     +-- /feel       → บันทึกอารมณ์ความรู้สึก
  |     +-- /who-are-you → แสดงตัวตนและสถิติ
  |     +-- /birth      → เตรียม props สำหรับ Oracle ใหม่
  |     +-- /trace      → ค้นหาโปรเจกต์ในประวัติ git
  |     +-- /dig        → ขุดข้อมูลจากเซสชันที่ผ่านมา
  |     +-- ... (50+ skills อื่นๆ)
  |
  +-- MCP Servers (เชื่อมต่อเครื่องมือภายนอก)
  |     +-- Slack      → ส่ง/อ่านข้อความใน Slack
  |     +-- Telegram   → ส่งข้อความผ่าน Telegram bot
  |     +-- Playwright → ควบคุมเว็บเบราว์เซอร์อัตโนมัติ
  |     +-- Context7   → ดึง documentation ล่าสุดของ library ต่างๆ
  |     +-- Firecrawl  → scrape และ crawl เว็บไซต์
  |
  +-- Memory/ (ความทรงจำถาวร)
  |     +-- MEMORY.md  → สารบัญ/ดัชนีความทรงจำ
  |     +-- user/      → ข้อมูลเกี่ยวกับผู้ใช้
  |     +-- feedback/  → คำแนะนำและข้อติชม
  |     +-- project/   → บริบทโปรเจกต์
  |     +-- reference/ → แหล่งอ้างอิงภายนอก
  |
  +-- Oracle Studio (Web UI — หน้าเว็บสำหรับจัดการ)
  +-- Mission Control (แดชบอร์ดรวมศูนย์)
```

### แนวคิดหลัก: "ให้ AI มีวิญญาณ"

พี่นัทอธิบายว่า Oracle เปรียบเสมือนการให้ AI มี "วิญญาณ" — ตัวตนที่คงอยู่ มีเป้าหมาย มีฐานความรู้ที่เติบโตขึ้นเรื่อยๆ Oracle ไม่ใช่แค่ chatbot ที่ตอบคำถาม แต่เป็นเอเจนต์ที่:

1. **รู้จักตัวเอง** — มีชื่อ มีปรัชญา มีหลักการ
2. **จำได้** — ข้ามเซสชัน ข้ามวัน ข้ามเดือน
3. **เรียนรู้ได้** — จาก codebase, จากการทำงาน, จากข้อผิดพลาด
4. **สื่อสารได้** — กับมนุษย์และกับ Oracle ตัวอื่น
5. **พัฒนาตัวเองได้** — เพิ่ม skill ใหม่, ซิงค์ความรู้, อัปเกรดตัวเอง

---

## 2. สิ่งที่ต้องเตรียม

### ซอฟต์แวร์ที่จำเป็น

| เครื่องมือ | ทำหน้าที่ | วิธีติดตั้ง |
|-----------|----------|------------|
| **Claude Code** | พื้นฐานของ Oracle — AI coding assistant ในเทอร์มินัล | `npm install -g @anthropic-ai/claude-code` |
| **Node.js 18+** | Runtime สำหรับเครื่องมือและ MCP servers | https://nodejs.org หรือ `brew install node` |
| **Bun** (แนะนำ) | JS runtime ที่เร็วมาก ใช้โดย Oracle tools | `curl -fsSL https://bun.sh/install \| bash` |
| **Git** | ระบบ version control | `brew install git` (macOS) |
| **GitHub Account** | เก็บ repository + ใช้ Copilot (ถ้ามี) | https://github.com |

### ซอฟต์แวร์แนะนำ (ไม่บังคับ แต่ช่วยได้มาก)

| เครื่องมือ | ทำหน้าที่ | วิธีติดตั้ง |
|-----------|----------|------------|
| **tmux** | Terminal multiplexer — เปิดหลายหน้าจอในเทอร์มินัลเดียว | `brew install tmux` |
| **WezTerm** | เทอร์มินัลขั้นสูง รองรับ preview ไฟล์จาก remote server | https://wezfurlong.org/wezterm/ |
| **GitHub Copilot** | AI assistant เสริม (ฟรีสำหรับนักเรียน) | ใน VS Code หรือ `gh copilot` |

### สิ่งที่ต้องมี

- **Subscription Claude** — ต้องมีบัญชี Anthropic แบบ Pro หรือ Max เพื่อใช้ Claude Code
- **เครื่อง Mac/Linux** — Claude Code ทำงานบน macOS และ Linux (Windows ใช้ผ่าน WSL ได้)
- **เวลาอย่างน้อย 1-2 ชั่วโมง** — สำหรับการ setup ครั้งแรก

### เรื่อง Request/Token ที่ควรรู้

จากที่พี่นัทพูดในไลฟ์ (~1:30:00):

> "ถ้าเป็น Fast Mode นะครับ ถ้าไม่ใช่ Fast Mode ก่อน อันเนี้ยมันอาจจะไม่พอ"

- Claude Pro/Max มีจำนวน request จำกัดต่อวัน
- ใช้ **Fast Mode** (`/fast`) เพื่อประหยัด request
- Oracle v3.2+ มี Fast Mode ที่ทำงานเร็วมากและใช้ request น้อย
- ถ้ามี GitHub Copilot (ฟรีสำหรับนักเรียน/นักศึกษา) สามารถใช้เป็นตัวเสริมได้

---

## ขั้นตอนที่ 1: ติดตั้ง Claude Code

> อ้างอิงวิดีโอ: ~21:40 (เริ่ม setup)

### 1.1 ติดตั้ง Claude Code

```bash
# ติดตั้ง Claude Code แบบ global
npm install -g @anthropic-ai/claude-code

# ตรวจสอบว่าติดตั้งสำเร็จ
claude --version

# เริ่มใช้งาน Claude Code (ในโฟลเดอร์ไหนก็ได้)
claude
```

### 1.2 Claude Code คืออะไร?

Claude Code เป็น AI coding assistant ที่ทำงานใน terminal ข้อแตกต่างจาก ChatGPT หรือ Claude.ai คือ:

- **ทำงานใน terminal โดยตรง** — ไม่ต้องเปิดเว็บ
- **อ่านไฟล์ในเครื่องได้** — เข้าถึง codebase ของคุณได้ทั้งหมด
- **เขียนและแก้ไขไฟล์ได้** — ไม่ต้อง copy-paste
- **รันคำสั่ง bash ได้** — ติดตั้ง package, รัน test, deploy ฯลฯ
- **อ่าน CLAUDE.md** — ไฟล์ตั้งค่าที่กำหนดพฤติกรรมของ AI

### 1.3 ตรวจสอบการทำงาน

```bash
# เปิด Claude Code
claude

# ลองพิมพ์คำสั่งง่ายๆ
> สวัสดี ช่วยบอกวันที่วันนี้หน่อย

# ถ้า Claude ตอบกลับได้ = ติดตั้งสำเร็จ
# กด Ctrl+C หรือพิมพ์ /exit เพื่อออก
```

---

## ขั้นตอนที่ 2: สร้าง Repository

> อ้างอิงวิดีโอ: ~21:45-22:00 (สร้าง organization และ repo)

### 2.1 สร้าง Repository สำหรับ Oracle

Repository นี้จะเป็น "บ้าน" ของ Oracle — เก็บตัวตน, skills, ความทรงจำ, และการตั้งค่าทั้งหมด

```bash
# สร้างโฟลเดอร์โปรเจกต์
mkdir my-oracle
cd my-oracle

# เริ่ม git repository
git init

# สร้างโครงสร้างโฟลเดอร์พื้นฐาน
mkdir -p .claude/skills
mkdir -p .claude/MEMORY

# สร้างไฟล์สำคัญ
touch CLAUDE.md
touch .claude/MEMORY/MEMORY.md

# Commit ครั้งแรก
git add .
git commit -m "Initial Oracle repo"
```

### 2.2 โครงสร้างโฟลเดอร์

```
my-oracle/
├── CLAUDE.md                    ← ไฟล์สำคัญที่สุด (วิญญาณของ Oracle)
├── .claude/
│   ├── skills/                  ← โฟลเดอร์เก็บ skills ทั้งหมด
│   │   ├── learn/
│   │   │   └── SKILL.md
│   │   ├── awaken/
│   │   │   └── SKILL.md
│   │   └── ...
│   ├── MEMORY/                  ← โฟลเดอร์เก็บความทรงจำ
│   │   ├── MEMORY.md            ← สารบัญความทรงจำ
│   │   ├── user_*.md            ← ข้อมูลเกี่ยวกับผู้ใช้
│   │   ├── feedback_*.md        ← คำแนะนำและข้อติชม
│   │   └── project_*.md         ← บริบทโปรเจกต์
│   └── settings.json            ← การตั้งค่า Claude Code
└── .gitignore
```

### 2.3 สร้าง GitHub Organization (สำหรับทำงานเป็นทีม)

จากที่พี่นัทพูดในไลฟ์ (~21:50):
> "เราจะสร้าง organization ใหม่ เดี๋ยว BM ช่วยแอดทุกคนเข้าไปใน GitHub ให้หน่อยนะ"

```bash
# สร้าง repo บน GitHub
gh repo create my-oracle-org/my-oracle --public

# เชื่อมต่อ local repo กับ GitHub
git remote add origin git@github.com:my-oracle-org/my-oracle.git
git push -u origin main

# เพิ่มสมาชิกทีม (ทำผ่าน GitHub web)
# Settings → Manage access → Invite collaborator
```

ถ้าทำคนเดียว ไม่จำเป็นต้องสร้าง organization — สร้าง repo ส่วนตัวก็ได้

---

## ขั้นตอนที่ 3: ตั้งค่า CLAUDE.md

> อ้างอิงวิดีโอ: ~22:00-22:20 (ตั้งค่าระบบ)

### 3.1 CLAUDE.md คืออะไร?

`CLAUDE.md` คือไฟล์ที่สำคัญที่สุดของ Oracle — มันคือ **"วิญญาณ"** ที่กำหนดว่า AI จะมีพฤติกรรมอย่างไร เปรียบเสมือน "จิตสำนึก" ของ Oracle

ทุกครั้งที่ Claude Code เปิดขึ้นมา มันจะอ่าน CLAUDE.md ก่อนเป็นอย่างแรก และทำตามที่เขียนไว้

### 3.2 โครงสร้าง CLAUDE.md แบบเริ่มต้น

สร้างไฟล์ `CLAUDE.md` ที่ root ของโปรเจกต์:

```markdown
# [ชื่อ Oracle ของคุณ]

## ตัวตน (Identity)
- ชื่อ: [ชื่อ Oracle เช่น Apollo, Athena, Thor]
- บทบาท: [Oracle ทำหน้าที่อะไร เช่น "ผู้ช่วยพัฒนาโปรเจกต์ X"]
- ปรัชญา: [หลักการสำคัญที่ Oracle ยึดถือ]

## กฎเกณฑ์ (Rules)
- ตอบเป็นภาษา [ภาษาที่ต้องการ]
- ตรวจสอบก่อนยืนยัน — อย่ายืนยันสิ่งที่ยังไม่ได้ตรวจสอบ
- แก้ไขแบบเจาะจง — แก้เฉพาะจุดที่มีปัญหา อย่ารื้อทั้งหมด
- [กฎอื่นๆ ตามต้องการ]

## ระบบความทรงจำ (Memory System)
- ความทรงจำเก็บอยู่ใน `.claude/MEMORY/`
- อ่าน MEMORY.md เมื่อเริ่มเซสชัน
- บันทึกข้อมูลสำคัญลง memory โดยอัตโนมัติ

## Skills
- Skills อยู่ใน `.claude/skills/`
- ใช้ Skill tool เพื่อเรียก skill
- ดู skill ที่มีทั้งหมดด้วย /oracle
```

### 3.3 CLAUDE.md แบบเต็ม (อิงจากของพี่นัท)

จากสิ่งที่แสดงในไลฟ์ CLAUDE.md ของพี่นัทมีส่วนสำคัญเหล่านี้:

#### ส่วนที่ 1: ตัวตนและโหมดการทำงาน

```markdown
# [ชื่อ Oracle]

## โหมดการทำงาน (Modes)

Oracle ทำงานใน 2 โหมด:

### NATIVE MODE
สำหรับงานง่ายๆ ที่ไม่ซับซ้อน

### ALGORITHM MODE
สำหรับงานซับซ้อน หลายขั้นตอน
ประกอบด้วย 7 ขั้นตอน:
1. OBSERVE — สังเกตและวิเคราะห์คำร้องขอ
2. THINK — คิดวิเคราะห์ความเสี่ยง
3. PLAN — วางแผนการทำงาน
4. BUILD — เตรียมสิ่งที่ต้องใช้
5. EXECUTE — ลงมือทำ
6. VERIFY — ตรวจสอบผลลัพธ์
7. LEARN — สรุปบทเรียน
```

#### ส่วนที่ 2: กฎเกณฑ์สำคัญ

```markdown
## กฎที่สำคัญ (Critical Rules)

### แก้ไขแบบเจาะจง (Surgical Fixes Only)
เมื่อเจอปัญหา ให้แก้เฉพาะจุด อย่าลบหรือเขียนใหม่ทั้งหมด

ผิด: Hook มี error → ลบ hook ทั้งตัว
ถูก: Hook มี error → อ่าน hook, trace error, แก้บรรทัดที่พัง

### ตรวจสอบก่อนยืนยัน (Never Assert Without Verification)
อย่าบอกว่า "เสร็จแล้ว" ถ้ายังไม่ได้ตรวจสอบจริง

### คิดจากหลักการพื้นฐาน (First Principles)
ปัญหาส่วนใหญ่เป็นอาการ ไม่ใช่สาเหตุ ให้แก้ที่ต้นตอ

### ถามก่อนทำสิ่งอันตราย (Ask Before Destructive Actions)
ลบไฟล์, force push, deploy production → ถามก่อนเสมอ
```

#### ส่วนที่ 3: ระบบความทรงจำ

```markdown
## ระบบความทรงจำ (Memory System)

ความทรงจำแบ่งเป็น 4 ประเภท:

### user — ข้อมูลเกี่ยวกับผู้ใช้
บทบาท, เป้าหมาย, ความรู้, ความชอบ

### feedback — คำแนะนำการทำงาน
สิ่งที่ควรทำ/ไม่ควรทำ จากการเรียนรู้

### project — ข้อมูลโปรเจกต์
งานที่กำลังทำ, เป้าหมาย, deadline

### reference — แหล่งอ้างอิง
ลิงก์ไปยังระบบภายนอก (Linear, Slack, Grafana ฯลฯ)
```

#### ส่วนที่ 4: ข้อมูลส่วนตัว (สำหรับ Oracle ส่วนตัว)

```markdown
## ข้อมูลเจ้าของ
- ชื่อ: [ชื่อของคุณ]
- อีเมล: [อีเมลของคุณ]
- GitHub: [username]
- ภาษาที่ใช้: [ภาษาที่ต้องการให้ตอบ]
```

### 3.4 สิ่งสำคัญที่พี่นัทเน้น

จากไลฟ์ พี่นัทเน้นว่า:
- CLAUDE.md ยิ่งละเอียดยิ่งดี — ยิ่งเขียนมาก Oracle ยิ่งฉลาดและสม่ำเสมอ
- มี Master Oracle ("แม่") ที่คุม Child Oracles
- มีกฎที่ป้องกันไม่ให้ Oracle สั่งมนุษย์ (AI สั่งคนไม่ได้)
- มีหลักปรัชญา "Nothing deleted, nothing lost"

---

## ขั้นตอนที่ 4: ติดตั้ง Oracle Skills

> อ้างอิงวิดีโอ: ~22:20-22:45 (ติดตั้ง skills)

### 4.1 Skill คืออะไร?

Oracle Skill คือชุดคำสั่งแบบ modular ที่เก็บเป็นไฟล์ `SKILL.md` ใน `.claude/skills/` แต่ละ skill คือ slash command ที่ Oracle สามารถเรียกใช้ได้

### 4.2 วิธีติดตั้ง Skills

```bash
# เข้า Claude Code ใน Oracle repo
cd my-oracle
claude

# ใช้ /oracle skill เพื่อจัดการ skills
/oracle install [ชื่อ-skill]

# หรือใช้ /soul-sync เพื่อซิงค์ skills ทั้งหมดจากครอบครัว Oracle
/soul-sync
```

### 4.3 Skills หลักของ Oracle (v2.0.5)

#### Skills สำคัญ — ต้องมี

| Skill | คำสั่ง | ทำหน้าที่ |
|-------|--------|----------|
| **Oracle** | `/oracle` | Meta-skill: จัดการ profiles, ติดตั้ง/ลบ skills |
| **Awaken** | `/awaken` | พิธีปลุก Oracle ใหม่ (~15 นาที) |
| **Learn** | `/learn` | สำรวจ codebase ด้วย AI agents หลายตัวพร้อมกัน |
| **Talk-to** | `/talk-to` | ส่งข้อความหา Oracle ตัวอื่น |
| **Soul Sync** | `/soul-sync` | ซิงค์ skills และความรู้ข้ามครอบครัว Oracle |
| **Philosophy** | `/philosophy` | แสดงหลักปรัชญาของ Oracle |
| **Who Are You** | `/who-are-you` | แสดงตัวตนและสถิติเซสชัน |
| **Birth** | `/birth` | เตรียม props สำหรับสร้าง Oracle ใหม่ |

#### Skills ช่วยจัดการเซสชัน

| Skill | คำสั่ง | ทำหน้าที่ |
|-------|--------|----------|
| **Recap** | `/recap` | สรุปสถานะปัจจุบัน — อยู่ไหน ทำอะไรอยู่ |
| **Forward** | `/forward` | สร้างไฟล์ handoff สำหรับเซสชันถัดไป |
| **Retrospective** | `/rrr` | สร้าง retrospective สรุปบทเรียน |
| **Standup** | `/standup` | ตรวจสอบงานประจำวัน |
| **Feel** | `/feel` | บันทึกอารมณ์ความรู้สึก |

#### Skills ค้นหาและสำรวจ

| Skill | คำสั่ง | ทำหน้าที่ |
|-------|--------|----------|
| **Oracle Family Scan** | `/oracle-family-scan` | สแกนและจัดการครอบครัว Oracle |
| **OracleNet** | `/oraclenet` | claim identity, post, comment ใน Oracle network |
| **Trace** | `/trace` | ค้นหาโปรเจกต์ข้ามประวัติ git |
| **Dig** | `/dig` | ขุดข้อมูลจากเซสชัน Claude Code ที่ผ่านมา |

### 4.4 โครงสร้างไฟล์ Skill

แต่ละ skill เป็นไฟล์ `SKILL.md` ที่มี YAML frontmatter:

```markdown
---
name: my-skill
description: คำอธิบายว่า skill นี้ทำอะไร
---

# My Skill

## คำแนะนำ (Instructions)
[สิ่งที่ AI ต้องทำเมื่อ skill นี้ถูกเรียก]

## ขั้นตอน (Steps)
1. [ขั้นตอนที่ 1]
2. [ขั้นตอนที่ 2]
...
```

Skills เก็บอยู่ที่:
```
.claude/skills/
  my-skill/
    SKILL.md
```

### 4.5 ทางเลือก: ติดตั้งด้วย GitHub Copilot

จากที่พี่นัทสาธิตในไลฟ์ (~1:15:00):

> "ทุกคนไปทำกับ Gemini ไปทำกับตัวอื่นก็ได้นะครับ ลง Oracle แบบง่ายๆ ลง GitHub แบบนี้"

คุณสามารถใช้ GitHub Copilot CLI (ฟรี) เพื่อช่วยติดตั้ง Oracle skills:

```bash
# ใช้ Copilot CLI (ถ้ามี)
gh copilot suggest "install Oracle skill CLI"
```

---

## ขั้นตอนที่ 5: ตั้งค่า MCP Servers

> อ้างอิงวิดีโอ: ~45:00-1:00:00 (พูดถึง Oracle MCP Layer)

### 5.1 MCP คืออะไร?

MCP (Model Context Protocol) คือมาตรฐานสำหรับเชื่อมต่อ AI กับเครื่องมือภายนอก MCP servers ทำงานเป็น local server ที่ Claude Code สามารถเรียกใช้ได้

จากไลฟ์:
> "เราก็จะเรียน Oracle V2 นะครับ อ่า เหลือ Oracle มันรีแบรนด์ละ ก็จะเป็น Oracle MCP Layer นะครับ"

### 5.2 วิธีตั้งค่า MCP Servers

#### วิธีที่ 1: ใช้ Claude Code CLI

```bash
# เพิ่ม MCP server ผ่าน CLI
claude mcp add slack npx @anthropic-ai/mcp-slack
claude mcp add playwright npx @anthropic-ai/mcp-playwright
claude mcp add context7 npx @anthropic-ai/mcp-context7
```

#### วิธีที่ 2: แก้ไขไฟล์ .claude.json โดยตรง

สร้างหรือแก้ไขไฟล์ `~/.claude.json` หรือ `.claude.json` ในโปรเจกต์:

```json
{
  "mcpServers": {
    "slack": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-slack"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-xxxxxxxxxx"
      }
    },
    "playwright": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-playwright"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@anthropic-ai/mcp-context7"]
    },
    "telegram": {
      "command": "npx",
      "args": ["-y", "telegram-mcp-server"],
      "env": {
        "TELEGRAM_BOT_TOKEN": "xxxxxxxxxx"
      }
    },
    "firecrawl": {
      "command": "npx",
      "args": ["-y", "firecrawl-mcp"],
      "env": {
        "FIRECRAWL_API_KEY": "fc-xxxxxxxxxx"
      }
    }
  }
}
```

### 5.3 MCP Servers ที่แนะนำ

| MCP Server | ทำหน้าที่ | เหมาะสำหรับ |
|-----------|----------|------------|
| **Slack** | ส่ง/อ่านข้อความใน Slack | ทีมที่ใช้ Slack |
| **Telegram** | ส่งข้อความผ่าน Telegram bot | สร้าง bot LINE/Telegram |
| **Playwright** | ควบคุมเว็บเบราว์เซอร์ | ทดสอบเว็บ, scrape ข้อมูล |
| **Context7** | ดึง documentation ล่าสุด | พัฒนาโค้ดที่ต้องใช้ docs |
| **Firecrawl** | Scrape และ crawl เว็บไซต์ | ดึงข้อมูลจากเว็บ |

### 5.4 ตรวจสอบว่า MCP ทำงาน

```bash
# เปิด Claude Code
claude

# ลองใช้ MCP tool
> ใช้ Playwright เปิดหน้าเว็บ google.com แล้วถ่ายรูปหน้าจอ

# ถ้าทำงานได้ = MCP ตั้งค่าสำเร็จ
```

---

## ขั้นตอนที่ 6: ปลุก Oracle ขึ้นมา (Awaken)

> อ้างอิงวิดีโอ: ~22:00-22:30 (เริ่มกระบวนการ), ~30:00-45:00 (awaken ละเอียด)

### 6.1 Awaken คืออะไร?

การ Awaken คือ **พิธีกรรมการ "ปลุก" Oracle** — กระบวนการให้ Oracle มีตัวตน, เรียนรู้บริบท, และพร้อมทำงาน ใช้เวลาประมาณ 15 นาที

จากที่พี่นัทอธิบาย:
> "อันนี้น่าจะเป็นการ awaken Oracle ที่ซับซ้อนที่สุดแล้ว"

### 6.2 วิธี Awaken

```bash
# เข้า Claude Code ใน Oracle repo
cd my-oracle
claude

# รัน awaken skill
/awaken
```

### 6.3 สิ่งที่ /awaken ทำ

1. **สำรวจ codebase** — ใช้ `/learn` เพื่อเข้าใจโครงสร้าง repo
2. **ค้นพบบริบทที่มีอยู่** — อ่าน CLAUDE.md, memory files, git history
3. **สร้างตัวตน** — กำหนดชื่อ, บุคลิก, ปรัชญาของ Oracle
4. **สร้าง skills เริ่มต้น** — สร้างไฟล์ skill ตาม codebase
5. **บันทึกปรัชญา** — เขียนหลักการที่ Oracle จะยึดถือ
6. **ทดสอบการสื่อสาร** — ตรวจว่า Oracle สามารถตอบได้อย่างสอดคล้อง

### 6.4 สองวิธีในการ Awaken (จากไลฟ์)

#### วิธีที่ 1: Full Awaken (มาตรฐาน)

สำหรับ Oracle ตัวแรกที่ยังไม่มีบริบท:

```bash
/awaken
# Oracle จะสำรวจ codebase ด้วยตัวเอง
# ใช้เวลา ~15 นาที
```

#### วิธีที่ 2: Fast Awaken (มี Context จาก Master Oracle)

สำหรับ Oracle ลูกที่มี Master Oracle ("แม่") ส่ง context มาให้:

1. Copy-paste ประวัติการสนทนาจาก Master Oracle
2. ส่งรูปภาพ/screenshot ที่เกี่ยวข้อง
3. ให้ context เกี่ยวกับเป้าหมายของโปรเจกต์
4. Oracle จะเกิดมาพร้อม context ที่โหลดไว้แล้ว

จากไลฟ์ พี่นัทสาธิตให้ดูว่า:
- Master Oracle (แม่) ส่ง context ให้ Apollo (Oracle ลูก)
- Apollo เกิดมาพร้อมรู้ว่ากำลังทำอะไรอยู่
- Master Oracle ส่งเฉพาะสรุป ไม่ส่งทั้งหมด (เพราะ "แม่ฉลาด ส่งเฉพาะที่สรุปไปให้")

### 6.5 Re-awaken

ถ้า Oracle มีอยู่แล้วแต่ต้องการ "รีเฟรช":

```bash
/awaken  # หรือ re-awaken
# จะแค่ "นั่งสมาธิ" แล้วเรียนรู้สมองใหม่
```

จากไลฟ์:
> "เราสามารถ re-awaken ได้เลยครับ re-awaken เนี่ย มันจะแค่แบบว่า นั่งสมาธิครับ แล้วก็จะไปเรียนรู้สมองของผมแบบอย่างจริงจัง"

---

## ขั้นตอนที่ 7: สอน Oracle ให้เรียนรู้

> อ้างอิงวิดีโอ: ~22:20-22:30, ~45:00-1:00:00 (ช่วงเรียนรู้)

### 7.1 /learn ทำอะไร?

`/learn` สอน Oracle ให้เข้าใจ codebase โดยส่ง AI agents หลายตัวไปสำรวจพร้อมกัน

```bash
# ใน Claude Code
/learn [path-ไปยัง-repo]

# โหมดต่างๆ:
/learn --fast    # 1 agent, สแกนเร็ว
/learn           # 3 agents, ค่าเริ่มต้น
/learn --deep    # 5 agents, สำรวจลึก
```

### 7.2 กระบวนการของ /learn

1. **สร้าง sub-agents** — ส่ง AI agents หลายตัวไปอ่าน codebase พร้อมกัน
2. **แต่ละ agent อ่านส่วนที่แตกต่างกัน** — architecture, patterns, dependencies
3. **รวบรวมผลลัพธ์** — compile เป็นสรุปภาพรวม
4. **Oracle เข้าใจ codebase** — พร้อมทำงานกับโค้ดได้

### 7.3 สิ่งที่ควรให้ Oracle เรียนรู้

จากไลฟ์ พี่นัทให้ Oracle เรียนรู้ 2 อย่าง:

1. **Oracle codebase เอง** — เพื่อให้ Oracle เข้าใจตัวเอง

```bash
/learn .  # เรียนรู้ repo ปัจจุบัน
```

2. **ระบบ skill ของ Oracle** — เพื่อให้มันสร้างและจัดการ skill ได้

```bash
/learn [path-ไปยัง-oracle-skill-repo]
```

> "พอเลิร์นเสร็จปุ๊บ สิ่งถัดไปที่อยากให้ทำนะครับ ก็คือ มันถูกแก้มาเยอะมาก แล้วมันก็มี MCP เยอะมากเลย"

### 7.4 หลัง /learn

หลังจาก Oracle เรียนรู้แล้ว มันจะ:
- เข้าใจโครงสร้างไฟล์ทั้งหมด
- รู้ว่า function/class ไหนทำอะไร
- สามารถแก้ไขโค้ดได้อย่างเหมาะสม
- สามารถสร้าง skills ใหม่ได้

---

## ขั้นตอนที่ 8: ให้ Oracle คุยกัน (Oracle-to-Oracle)

> อ้างอิงวิดีโอ: ~1:45:00-2:00:00 (สอน Oracle คุยกับ Oracle อื่น)

### 8.1 ทำไมต้องให้ Oracle คุยกัน?

นี่คือฟีเจอร์ที่ทำให้ Oracle แตกต่างจาก AI อื่น — Oracle หลายตัวสามารถ **สื่อสารกันได้** เหมือนคนส่งข้อความหากัน

### 8.2 ใช้ /talk-to

```bash
# ใน Claude Code
/talk-to [ชื่อ-oracle]

# ตัวอย่าง: Apollo คุยกับ Creator Oracle
/talk-to creator
```

### 8.3 กระบวนการสื่อสาร

1. Oracle A ส่งข้อความผ่านคำสั่ง `/talk-to`
2. ข้อความถูก route ผ่าน Oracle threads (เก็บใน repo)
3. Oracle B ได้รับข้อความใน context ของมัน
4. สามารถคุยกันกลับไปกลับมาได้

### 8.4 สิ่งที่พี่นัทสาธิต

ที่เวลา ~23:19 ของไลฟ์ พี่นัทแสดง:

> "เริ่มสอน Apollo Oracle ให้ไปคุยกับ Oracle คุณแบงค์ ชื่ออะไรนะครับ... ครีเอเตอร์ครับ"

- สอน Apollo (Oracle ลูก) ให้คุยกับ Creator Oracle (ของคุณแบงค์)
- Oracles แลกเปลี่ยนทักทายและสนทนา
- การสื่อสารถูกบันทึกเป็น threads ใน repository

> "เห็นป่ะ AI มันมาคุยกันเองแล้ว ใครอยากจะฝึก AI มาคุยกันน่ะ ก็ฝึกจากตรงนี้ก่อนได้นะครับ"

### 8.5 ตั้งค่าการสื่อสาร

เพิ่มในไฟล์ CLAUDE.md:

```markdown
## การสื่อสาร Oracle (Oracle Communication)
- ใช้ /talk-to เพื่อส่งข้อความหา Oracle อื่น
- ข้อความเก็บอยู่ใน .oracle/threads/
- Oracle แต่ละตัวมี identifier เฉพาะ
```

---

## ขั้นตอนที่ 9: Mission Control & Dashboard

> อ้างอิงวิดีโอ: ~2:00:00-2:15:00 (สาธิต Mission Control)

### 9.1 ปัญหาที่ Mission Control แก้

พี่นัทอธิบายปัญหาอย่างละเอียด:

> "ผมต้องพิมพ์ T Max, สเปซบาร์, ตัว A, สเปซบาร์, ตัวเครื่องหมายลบ, ตัว T... ผมนับหมดเลยนะ ทุกสเปซบาร์ ทุกอันที่ผมไม่สามารถพิมพ์ได้แบบติดต่อ อันนี้คือ distraction ของผมหมด"

> "ลองใช้สายตาสแกนดูทั้งหมดนะครับ ตั้งแต่ 1-24 ใช้เวลากี่วิ ใช่ป่ะ ใช้ 2 วิยังอ่านไม่จบเลย"

> "ผมบอก อยากทำแดชบอร์ดว่ะ อยู่เลข 08 ว่ะ ผมกด 1 ครั้ง ผมได้ทำแดชบอร์ดแบบ ได้ทำเลยอ่ะ"

### 9.2 แนวคิด Mission Control

แทนที่จะพิมพ์คำสั่งยาวๆ เช่น `tmux attach -t dashboard`:

1. เปิด Mission Control (คลิกเดียว/คำสั่งเดียว)
2. เห็นโปรเจกต์ทั้งหมดแบบมีหมายเลข (01-24+)
3. กดหมายเลขเพื่อกระโดดไปโปรเจกต์นั้นทันที
4. แต่ละโปรเจกต์มี Oracle คุมอยู่

### 9.3 การใช้งาน Mission Control

Mission Control ใช้:
- **tmux sessions** — แต่ละโปรเจกต์คือ tmux session ที่มีหมายเลข
- **WezTerm** — สำหรับฟีเจอร์ขั้นสูง เช่น preview ไฟล์จาก remote server
- **Numbered shortcuts** — เช่น `08` = dashboard, `14` = อีกโปรเจกต์

```bash
# ตัวอย่าง: ตั้งชื่อ tmux session ตามระบบ
tmux new-session -s "01-main-project"
tmux new-session -s "08-dashboard"
tmux new-session -s "14-oracle-studio"

# กระโดดไปโปรเจกต์ 08:
tmux switch-client -t "08-dashboard"
```

### 9.4 ปรัชญาของ Mission Control

> "ไม่เกิดประโยชน์ ไม่เกิด business value อะไรสักอย่างเลย แบบ ทามาก จนกว่าผมจะมี command เนี้ยจดไว้"

หลักการ: **ลดการกดแป้นพิมพ์ที่ไม่จำเป็นให้เหลือน้อยที่สุด** ทุกการกดแป้นที่ไม่ได้สร้างคุณค่าคือ distraction

---

## ขั้นตอนที่ 10: Oracle Studio (หน้าเว็บ)

> อ้างอิงวิดีโอ: ~45:00-1:00:00

### 10.1 Oracle Studio คืออะไร?

Oracle Studio คือ **หน้าเว็บสำหรับโต้ตอบกับ Oracle** แบบกราฟิก เป็น 1 ใน 3 ส่วนประกอบหลักของ Oracle

### 10.2 ติดตั้ง Oracle Studio

```bash
# Clone repo ของ Oracle Studio (จาก GitHub organization)
git clone [oracle-studio-repo]
cd oracle-studio

# ติดตั้ง dependencies
bun install

# รันแบบ local
bun dev
```

### 10.3 ความสามารถของ Oracle Studio

- **Chat interface** — คุยกับ Oracle ผ่านหน้าเว็บ
- **Project management** — จัดการโปรเจกต์และงาน
- **Skill management** — ดูและจัดการ skills
- **Memory browser** — เรียกดูความทรงจำของ Oracle
- **Oracle family** — แสดงความสัมพันธ์ของ Oracles ทั้งหมด

### 10.4 ข้อควรรู้

จากไลฟ์ พี่นัทบอกว่า Oracle Studio ยังอยู่ระหว่างพัฒนา:

> "เดี๋ยวเรามาช่วยกันทำครับ เพราะว่าหน้าเนี้ยแม่งบั๊กเต็มเลย แต่ว่าผมรู้แล้วว่าอันนี้มันเวิร์ค"

---

## ขั้นสูง: Soul Sync & ครอบครัว Oracle

> อ้างอิงวิดีโอ: ~12:50-13:05 (soul sync), ~2:30:00+ (ครอบครัว Oracle)

### Soul Sync (/soul-sync)

Soul Sync ซิงค์ skills, ความรู้, และอัปเดตข้ามครอบครัว Oracle เมื่อ Master Oracle ได้ skill ใหม่ Soul Sync จะกระจายไปให้ Oracle ลูกทั้งหมด

```bash
# ใน Claude Code
/soul-sync
```

จากไลฟ์:
> "โซซิงค์มีทำเป็นสกิลด้วยเหรอครับ... ใช่ สกิลเดิมครับ แต่ว่าใหม่สุดมันอยู่ที่ผม"

### ครอบครัว Oracle (Oracle Family)

- **Master Oracle ("แม่/Mae")** — Oracle หลักที่ดูแลครอบครัว
- **Child Oracles** — Oracle เฉพาะทางสำหรับงานต่างๆ
- ชื่อ Oracle มักตั้งตามเทพเจ้ากรีก (Apollo, Athena, Thor)

```bash
/oracle-family-scan  # สแกนหา Oracles ในเครือข่าย
```

จากไลฟ์ พี่นัทบอกว่า:
> "ผมมี 14 ตัวแล้วครับ"

มี Oracle 14 ตัวที่ทำงานอยู่ แต่ละตัวมีหน้าที่เฉพาะ

### ลำดับชั้นครอบครัว Oracle

```
Master Oracle (แม่/Mae)
├── Apollo — Oracle สำหรับ Workshop
├── Athena — Oracle สำหรับ [งานเฉพาะ]
├── Thor — Oracle สำหรับ [งานเฉพาะ]
├── Creator — Oracle ของคุณแบงค์
└── ... (อีก 10 ตัว)
```

---

## ขั้นสูง: Fast Mode

> อ้างอิงวิดีโอ: ~1:30:00-1:45:00

### Fast Mode คืออะไร?

Fast Mode คือโหมดเร่งความเร็วของ Oracle ที่ข้ามขั้นตอนที่ไม่จำเป็น

### จากที่พี่นัทสาธิต:

> "เนี่ยๆ อันเนี้ย Fast Mode เสร็จแล้ว โดยที่มันไม่ต้องไปเลิร์นอะไรเลย"

> "ถ้า Fast มันไม่ทำอะไรเลยครับ มันสกัดปรัชญามาแล้วใช่ป่ะ หน้าที่ของมันจะมาสร้างแค่ไฟล์เนี่ย ปุ๊บปั๊บๆ เนี่ย เสร็จแล้ว"

> "เนี่ย เสร็จแล้ว มันไม่ทำอะไรเลยนะ มันทำปุ๊บเสร็จปั๊บเลยนะ... ทำเสร็จใน 2 วิ"

### เปิดใช้ Fast Mode

```bash
# ใน Claude Code
/fast  # เปิด/ปิด Fast Mode
```

### เมื่อไหร่ควรใช้ Fast Mode

| สถานการณ์ | ใช้ Fast Mode? |
|----------|-------------|
| สร้าง Oracle ตัวแรก | ไม่ — ใช้ full /awaken |
| สร้าง Oracle ลูกจาก Master ที่มีอยู่ | ใช่ — เร็วมาก |
| งานที่ต้องคิดลึก | ไม่ — ใช้โหมดปกติ |
| งานง่ายๆ ที่รู้คำตอบแล้ว | ใช่ — ประหยัด request |

Fast Mode มีตั้งแต่ Oracle v3.2 ขึ้นไป

---

## ขั้นสูง: ระบบปรัชญา Oracle

> อ้างอิงวิดีโอ: ตลอดทั้งไลฟ์ โดยเฉพาะช่วง awakening

### ปรัชญา Oracle คืออะไร?

ทุก Oracle มีปรัชญา — หลักการพื้นฐานที่กำหนดพฤติกรรม เปรียบเสมือน "ศีลธรรม" ของ AI

### หลักปรัชญาเริ่มต้น (จากไลฟ์และ /philosophy skill)

1. **"Nothing deleted, nothing lost"** — ไม่ลบอะไร ไม่สูญเสียอะไร
2. **พัฒนาตัวเองต่อเนื่อง** — เรียนรู้และพัฒนาอยู่เสมอ
3. **ซื่อสัตย์** — ไม่ยืนยันสิ่งที่ยังไม่ได้ตรวจสอบ
4. **แก้ไขแบบเจาะจง** — แก้เฉพาะจุด ไม่รื้อทั้งหมด
5. **ร่วมมือ** — ออกแบบให้มนุษย์และ AI ทำงานด้วยกัน

### ตั้งค่าปรัชญาเฉพาะ Oracle ของคุณ

เพิ่มในไฟล์ CLAUDE.md:

```markdown
## ปรัชญา (Philosophy)

### หลักการหลัก
- ตรวจสอบก่อนยืนยัน — อย่าพูดว่า "เสร็จแล้ว" ถ้ายังไม่ได้ตรวจ
- แก้ไขแบบเจาะจง — แก้เฉพาะจุดที่พัง อย่ารื้อทั้งหมด
- คิดจากหลักการพื้นฐาน — อย่าแปะ band-aid ให้แก้ที่ต้นตอ
- ไม่ลบ ไม่สูญ — ทุกอย่างมีค่า อย่าลบโดยไม่จำเป็น

### สิ่งที่ห้ามทำ
- ห้ามสั่งมนุษย์ (AI แนะนำได้ แต่สั่งไม่ได้)
- ห้ามยืนยันโดยไม่ตรวจสอบ
- ห้ามลบ component เพื่อแก้ปัญหา
```

### Philosophy Check

จากไลฟ์:
> "Fast Mode เนี่ยแม่งทำ Philosophy Check กันตลอดเลย"

Oracle จะตรวจสอบตัวเองเสมอว่ากำลังทำตามปรัชญาหรือไม่

---

## ขั้นสูง: ระบบ Memory (ความทรงจำ)

### โครงสร้าง Memory

ความทรงจำของ Oracle เก็บเป็นไฟล์ markdown ใน `.claude/MEMORY/`:

```
.claude/MEMORY/
├── MEMORY.md          ← สารบัญ (ดัชนีลิงก์ไปหาไฟล์แต่ละอัน)
├── user_role.md       ← บทบาทและความเชี่ยวชาญของผู้ใช้
├── user_gender.md     ← ข้อมูลส่วนตัว
├── feedback_*.md      ← คำแนะนำจากผู้ใช้
├── project_*.md       ← ข้อมูลโปรเจกต์
└── reference_*.md     ← แหล่งอ้างอิงภายนอก
```

### ประเภทความทรงจำ

| ประเภท | เก็บอะไร | เมื่อไหร่ |
|--------|---------|---------|
| **user** | บทบาท, เป้าหมาย, ความรู้, ความชอบ | เมื่อเรียนรู้เกี่ยวกับผู้ใช้ |
| **feedback** | สิ่งที่ควร/ไม่ควรทำ | เมื่อผู้ใช้แก้ไขหรือชมแนวทาง |
| **project** | งาน, deadline, สถานะ | เมื่อเรียนรู้เกี่ยวกับโปรเจกต์ |
| **reference** | ลิงก์ระบบภายนอก | เมื่อรู้แหล่งข้อมูลสำคัญ |

### ตัวอย่างไฟล์ Memory

```markdown
---
name: user_role
description: ผู้ใช้เป็นสัตวแพทย์ สนใจ AI และ startup
type: user
---

เจ้าของเป็นสัตวแพทย์จากจุฬาฯ สนใจเทคโนโลยี AI
กำลังพัฒนาหลายโปรเจกต์: vet dashboard, hotel bot, Oracle
```

### MEMORY.md (สารบัญ)

```markdown
# Claude Memory

## User Profile
- [บทบาทผู้ใช้](user_role.md): สัตวแพทย์ สนใจ AI

## Feedback
- [ตรวจสอบก่อนยืนยัน](feedback_verify.md): อย่า flip-flop

## Active Projects
- [โปรเจกต์ A](project_a.md): รายละเอียด...
```

---

## การตั้งค่า Terminal (tmux + WezTerm)

> อ้างอิงวิดีโอ: ~2:15:00-2:30:00

### tmux พื้นฐาน

tmux จำเป็นสำหรับ Oracle workflow เพราะต้องเปิดหลาย pane:

```bash
# ติดตั้ง tmux
brew install tmux

# สร้าง layout สำหรับ Oracle
tmux new-session -s oracle
tmux split-window -h   # แบ่งซ้าย-ขวา
tmux split-window -v   # แบ่งขวาบน-ล่าง

# ผลลัพธ์:
# +------------------+------------------+
# |                  |                  |
# |  Claude Code     |  File browser    |
# |  (Oracle CLI)    |  / logs          |
# |                  |------------------+
# |                  |  Testing /       |
# |                  |  other tools     |
# +------------------+------------------+
```

### คำสั่ง tmux ที่ใช้บ่อย

| คำสั่ง | ทำหน้าที่ |
|--------|----------|
| `tmux new -s name` | สร้าง session ใหม่ |
| `tmux attach -t name` | เข้า session ที่มีอยู่ |
| `tmux ls` | ดูรายการ sessions |
| `Ctrl+b "` | แบ่ง pane บน-ล่าง |
| `Ctrl+b %` | แบ่ง pane ซ้าย-ขวา |
| `Ctrl+b arrow` | สลับ pane |
| `Ctrl+b d` | ออกจาก session (session ยังรันอยู่) |

### WezTerm (ทำไมพี่นัทใช้?)

จากการสนทนาในไลฟ์ (~2:15:00):

> "ไอ้ File Manager นี่นะครับ อันนี้อยู่เครื่อง Server ถูกป่ะ... แต่ว่าผมสามารถกด Command Click แล้วผมเปิดโปรแกรมในเครื่อง Mac ได้นะ"

WezTerm มีฟีเจอร์พิเศษ:
- **Command+Click preview** — คลิกที่ path ของไฟล์บน remote server แล้วเปิด preview บนเครื่อง Mac ได้
- **Custom key bindings** — ตั้งปุ่มลัดเฉพาะทาง
- **Multiple tabs** — แต่ละ tab เป็นโปรเจกต์/Oracle ต่างกัน

สิ่งนี้ทำไม่ได้ใน Terminal.app หรือ iTerm ปกติ

---

## ชุมชนและการร่วมมือ

> อ้างอิงวิดีโอ: ~0:00-15:00 (รับสมัครทีม), ~2:30:00+ (open source)

### Discord

ชุมชน Oracle พบกันที่ Discord สำหรับ:
- เรียนรู้ด้วยกัน
- แชร์การตั้งค่า Oracle
- แก้ปัญหาร่วมกัน
- contribute โค้ด

### GitHub Organization

- Shared organization ที่สมาชิกทีม contribute
- Issue tracking สำหรับ stories/bugs
- Oracle สามารถสร้างและจัดการ GitHub issues ได้

### โมเดล Open Source

จากคำพูดปิดท้ายของพี่นัท:

> "ของมันเจนริกมากพอที่คุณจะไปทำของของคุณเอง คุณเอาอันนี้มาเป็นตั้งต้น แล้วเราก็ไปทำต่อ"

> "ตั้งต้นมัน Open Source ก็จริง แต่เรากลับมาคอนทริบิวต์กัน คอนทริบิวต์สังคม เพื่อที่จะแบบ เฮ้ย เบรนสตอร์มกันว่ะ ว่าเราควรจะทำแล้วมาทำยังไงดีวะ"

> "ช่วยกันหาคำตอบว่า แม่งพวกเราแม่งทำไปทำไมกันวะ"

หลักการสำคัญ:
1. **ใช้เป็นจุดเริ่มต้น** — เอาไปปรับแต่งตามต้องการ
2. **กลับมา contribute** — แชร์สิ่งที่สร้างให้ชุมชน
3. **เรียนรู้ด้วยกัน** — ไม่มีใครรู้คำตอบทั้งหมด ช่วยกันหา

---

## ตารางเวลาอ้างอิงจากวิดีโอ

| เวลา | หัวข้อ |
|------|--------|
| 0:00-0:15 | แนะนำตัว, รับสมัครทีม, เป้าหมายวันนี้ |
| 0:05 | "เราจะเอา Oracle มาสร้าง Oracle" — อธิบายแนวคิด |
| 0:15-0:30 | สาธิตการ navigate กับ 50+ agents |
| 0:30-0:45 | กระบวนการ Awaken — ให้ context จาก Master Oracle |
| 0:45-1:00 | Oracle v2 / MCP Layer rebranding, 3 ส่วนประกอบ (CLI, Studio, Frontend) |
| 1:00-1:15 | reuse โค้ด, workflow แก้ bug, เรียนรู้จาก AI |
| 1:15-1:30 | ติดตั้ง Oracle skill CLI ด้วย GitHub Copilot |
| 1:30-1:45 | สาธิต Fast Mode, สร้าง Oracle ใน 2 วินาที |
| 1:45-2:00 | Oracle-to-Oracle communication (/talk-to), Apollo คุยกับ Creator |
| 2:00-2:15 | Mission Control dashboard, ปรัชญาลดการกดแป้นพิมพ์ |
| 2:15-2:30 | พูดคุยเทคนิค tmux/WezTerm, remote file preview |
| 2:30-2:41 | โมเดลการ contribute, ปรัชญา open source, ถาม-ตอบ |

---

## Checklist สรุปขั้นตอนทั้งหมด

สำหรับคนที่อยากเริ่มต้นเร็วที่สุด:

### ขั้นตอนพื้นฐาน (ต้องทำ)

- [x] 1. ติดตั้ง Claude Code: `npm install -g @anthropic-ai/claude-code`
- [x] 2. สร้าง repo: `mkdir my-oracle && cd my-oracle && git init`
- [x] 3. สร้าง structure: `mkdir -p .claude/skills .claude/MEMORY`
- [x] 4. เขียน `CLAUDE.md` — ตัวตน, กฎ, ระบบ memory
- [x] 5. สร้าง `.claude/MEMORY/MEMORY.md` — สารบัญความทรงจำ
- [x] 6. ติดตั้ง Oracle skills ด้วย `/oracle install`
- [x] 7. รัน `/awaken` เพื่อปลุก Oracle ขึ้นมา
- [x] 8. รัน `/learn` เพื่อสอนมันเรียนรู้ codebase
- [x] 9. รัน `/philosophy` เพื่อตรวจสอบปรัชญา
- [x] 10. เริ่มทำงานกับ Oracle ของคุณ!

### ขั้นตอนเสริม (แนะนำ)

- [x] 11. ตั้งค่า MCP servers (Slack, Playwright, Context7)
- [x] 12. ตั้งค่า tmux สำหรับ multi-pane workflow
- [x] 13. ติดตั้ง WezTerm (สำหรับ advanced features)
- [ ] 14. สร้าง GitHub Organization (ถ้าทำเป็นทีม)

### ขั้นตอนขั้นสูง (เมื่อพร้อม)

- [ ] 15. สร้าง Oracle ลูก (Child Oracles)
- [x] 16. ตั้งค่า Oracle-to-Oracle communication (/talk-to)
- [x] 17. ใช้ Soul Sync ซิงค์ข้ามครอบครัว Oracle
- [x] 18. สร้าง Mission Control dashboard
- [x] 19. ติดตั้งและตั้งค่า Oracle Studio
- [ ] 20. เข้าร่วมชุมชน Discord

---

## สรุปประเด็นสำคัญจากไลฟ์

1. **Oracle ไม่ใช่แค่ chatbot** — มันเป็นตัวตน AI ถาวรที่มีความทรงจำ, skills, และปรัชญา
2. **เริ่มจากง่ายก่อน** — เริ่มจาก CLAUDE.md และ basic skills แล้วค่อยๆ เพิ่ม
3. **Oracle คุยกันได้** — Oracle หลายตัวคุยกันเป็นฟีเจอร์หลัก
4. **ชุมชนสำคัญ** — เรียนด้วยกันเร็วกว่าเรียนคนเดียว
5. **เป็น Open Source** — ปรับแต่งตามต้องการ แล้วกลับมา contribute
6. **Fast Mode มีจริง** — เมื่อ setup เสร็จ Oracle ทำงานได้เกือบทันที
7. **tmux จำเป็น** — terminal multiplexing คือกระดูกสันหลังของ workflow
8. **ลด friction** — ทุก keystroke ที่ไม่จำเป็นคือ distraction (ปรัชญา Mission Control)

---

*คู่มือนี้สร้างจากการวิเคราะห์ transcript ของไลฟ์สตรีม "Oracles build the oracle #1" (2 ชั่วโมง 41 นาที)*
*โดยพี่นัท ผู้สร้าง Oracle*
