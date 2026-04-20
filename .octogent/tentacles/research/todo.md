# Research Agent — TODO

## Priority 1 (ทำก่อน)
- [ ] ศึกษา octogent web UI — ติดตั้ง + ทดสอบกับ oracle-dashboard
  - repo: https://github.com/hesamsheikh/octogent
  - สรุป: ใช้ร่วมได้ไหม? ต้องปรับอะไร? → เขียนลง `ψ/learn/octogent-integration.md`
- [ ] ศึกษา Anthropic prompt caching API
  - เป้า: ลด token cost 80% สำหรับ oracle-dashboard
  - สรุปลง `ψ/learn/prompt-caching-guide.md` + เพิ่ม todo ใน backend/todo.md

## Priority 2
- [ ] ทดสอบ WezTerm GUI socket issue — หาสาเหตุที่ socket หาย
  - เช็ค: `wezterm.exe cli list` ทำงานตอนไหนได้/ไม่ได้
  - สรุปลง `ψ/learn/wezterm-socket-debug.md`
- [ ] อ่าน Oracle Skills Guide ครบ 120 skills
  - highlight skills ที่ยังไม่ได้ใช้ในโปรเจกต์นี้
  - สรุปลง `ψ/learn/unused-oracle-skills.md`

## Priority 3
- [ ] เปรียบเทียบ octogent vs maw-js vs Oracle `/team`
  - จุดแข็ง/อ่อน แต่ละระบบ
  - recommendation ว่าควรใช้อะไรเมื่อไหร่
  - สรุปลง `ψ/learn/multi-agent-comparison.md`

## Done ✓
- [x] อ่าน octogent README — เข้าใจ Tentacle model
- [x] อ่าน oracle-dashboard codebase ครบ
