# Frontend Agent — TODO

## Priority 1 (ทำก่อน)
- [ ] ทดสอบ `Shift+1–9` hotkeys จริงในเบราว์เซอร์ทุก OS (Windows/Mac/Linux)
- [ ] เพิ่ม visual feedback เมื่อ hotkey ถูกกด (flash / toast notification)
- [ ] `work-ops-tab.tsx` — แสดง token budget remaining ต่อ agent (จาก `.agents/agents.yaml`)

## Priority 2
- [ ] เพิ่ม "Agent Actions" panel — แสดง `agentActions` จาก config (mother มี 3 actions แล้ว)
- [ ] tmux panel — แสดง window name จาก VPS (ariadne/pythia/mnemosyne ฯลฯ)
- [ ] mobile responsive — oracle-pulse.tsx ยังไม่ดีบน screen เล็ก

## Priority 3 (ปรับปรุง)
- [ ] ย้าย inline styles ใน layout.tsx → Tailwind classes
- [ ] `oracle-pulse.tsx` refactor — แยก 1000 lines เป็น sub-components

## Done ✓
- [x] เปลี่ยน hotkey `Ctrl+Shift+1–9` → `Shift+1–9` (2 ปุ่ม)
- [x] ใช้ `e.code` แทน `e.key` (Thai keyboard safe)
- [x] อัปเดต label ทุกที่ให้ตรง
