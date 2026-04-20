# Oracle Pulse — คู่มือตั้งค่า config

ลำดับที่แนะนำ: **`.env.local` → bridge → หา pane id → `agentTargets` → (ทางเลือก) remote state / สล็อต**

---

## 1) ไฟล์หลักอยู่ที่ไหน

| ไฟล์ | หน้าที่ |
|------|--------|
| `config/oracle-pulse.config.json` | ค่าเริ่มใน repo — `installId`, `defaultPing`, **`agentTargets`**, `remoteState` |
| `ORACLE_PULSE_CONFIG_PATH` ใน `.env.local` | ชี้ JSON นอก repo (เครื่องจริง / path ลับ) |
| `public/oracle-pulse-slots.json` | แก้ **Quick Launch สล็อต [1]–[9]** โดยไม่แก้โค้ด (ทับตาม `id`) |
| `public/oracle-pulse-slots.example.json` | ตัวอย่าง — คัดลอกเป็น `oracle-pulse-slots.json` |

---

## 2) `.env.local` (Claude + bridge)

1. ตั้ง **`ANTHROPIC_API_KEY`** สำหรับแท็บ Agents  
2. ถ้าใช้ WezTerm bridge: **`WEZTERM_BRIDGE_ENABLED=1`** (+ `WEZTERM_BIN` ถ้าไม่มีใน PATH)  
3. ถ้าใช้ tmux (หรือ tmux บน VPS ผ่าน SSH): **`TMUX_BRIDGE_ENABLED=1`** + **`ORACLE_SSH_TARGET=user@host`** ตามต้องการ  
4. **แนะนำบน LAN:** `ORACLE_PULSE_BRIDGE_SECRET=` สุ่มยาว ๆ แล้วใส่ค่าเดียวกันใน UI แท็บ Mission (เก็บ sessionStorage)

รีสตาร์ท `npm run dev` ทุกครั้งที่แก้ `.env.local`

---

## 3) หา `pane_id` ก่อนเติม `agentTargets`

**WezTerm** (บนเครื่องที่รัน Pulse):

```text
wezterm cli list --format json
```

ดูฟิลด์ `pane_id` ของ pane ที่รัน Claude / shell นั้น

**tmux** (เครื่องเดียวกับที่รัน `tmux` หรือผ่าน SSH ไปที่เครื่องนั้น):

```text
tmux list-panes -a -F '#{pane_id} #{pane_title}'
```

ใช้เลข `pane_id` เป็น **`tmuxPaneId`** ใน config

---

## 4) ตัวอย่าง `agentTargets`

แก้ใน `config/oracle-pulse.config.json` (หรือไฟล์ที่ `ORACLE_PULSE_CONFIG_PATH` ชี้):

```json
"agentTargets": {
  "oracle": { "wezTermPaneId": 0 },
  "hermes": { "tmuxPaneId": 3 }
}
```

- **`preferredTerminal`**: `"auto"` จะลองตามที่มีใน map (tmux ก่อนถ้ามีทั้งคู่ — ปรับเป็น `"tmux"` หรือ `"wezterm"` ได้)  
- หลังตั้งแล้ว: ในแอปกด **Shift+Alt+Enter** หรือปุ่ม **→pane** เพื่อส่งข้อความในช่อง (หรือ `defaultPing` ถ้าช่องว่าง) เข้า pane นั้น

---

## 5) Quick Launch สล็อต

- ค่าเริ่มอยู่ในโค้ด `lib/mission-slots.ts`  
- โอเวอร์ไรด์: ใส่ `missionSlots` ใน `oracle-pulse.config.json` **หรือ** สร้าง `public/oracle-pulse-slots.json` ดูจาก `public/oracle-pulse-slots.example.json`  
- แอปจะโหลด config ใหม่เป็นระยะ (~45s) + เปิดหน้าใหม่จะดึงทันที

---

## 6) Remote state (Oracle เก่า / automation)

ใน `oracle-pulse.config.json`:

```json
"remoteState": {
  "enabled": true,
  "sshTarget": "user@vps",
  "catPath": "/home/user/.oracle/pulse-state.json",
  "pollIntervalMs": 20000
}
```

ไฟล์ JSON บน remote แนะนำรูปแบบ:

```json
{
  "pulseSchema": 1,
  "banner": "ข้อความสั้นในแถบ Pulse",
  "agents": {
    "oracle": { "tag": "lead", "note": "branch main" }
  }
}
```

ถ้าไม่ใช้ SSH: ปิด `sshTarget` (หรือลบ) แล้วตั้ง **`catPath`** เป็น path บนเครื่องที่รัน Next (relative ต่อโฟลเดอร์โปรเจกต์ได้)

---

## 7) WezTerm เปิด Pulse จากคีย์

ดู `config/wezterm-open-pulse.example.lua` และติดตั้ง **Nerd Font** ตามคอมเมนต์ในไฟล์

---

## 8) แท็บ Ops (งาน · เวลา · ประวัติ)

- แท็บ **Ops**: จับเวลางานต่อ agent (เริ่ม/จบ), รายชื่อ **ว่าง**, **ประวัติงาน** (จบพร้อม duration), **log** การกระทำ (Claude / pane / mission)
- เก็บใน **localStorage** (`oracle-pulse-ops-log-v1`, `oracle-pulse-ops-sessions-v1`) — ส่งออก JSON ได้จากแท็บ Ops
- **Auto (แนะนำ)**: เปิด `autoOps.enabled=true` เพื่อให้ระบบ “เริ่มจับงานอัตโนมัติ” ตอนโฟกัส agent/ส่ง Claude/เลือก Mission และ auto-end เมื่อ idle เกิน `autoOps.idleMs`

---

## 9) ไฟล์ local ที่ไม่ commit

คัดลอก `config/oracle-pulse.config.example.json` → **`config/oracle-pulse.config.local.json`** แล้วตั้ง `ORACLE_PULSE_CONFIG_PATH` ชี้ไฟล์นี้ — ไฟล์ `*.local.json` ถูก ignore โดย `.gitignore`
