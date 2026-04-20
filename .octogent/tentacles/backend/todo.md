# Backend Agent — TODO

## Priority 1 (ทำก่อน)
- [ ] เพิ่ม prompt caching ใน `/api/oracle/route.ts` — ลด token cost ~80%
- [ ] เพิ่ม retry logic ใน `ssh-exec.ts` (max 3 retries, exponential backoff)
- [ ] validate `agentTargets` config ตอน startup — warn if paneId ไม่ match จริง

## Priority 2
- [ ] `/api/oracle-vision` — เพิ่ม test coverage + error messages ที่ชัดกว่านี้
- [ ] เพิ่ม `/api/pulse/health` endpoint — ตรวจ SSH + tmux + WezTerm ทีเดียว
- [ ] token usage logging → เขียนลง `ψ/inbox/tokens_YYYYMMDD.log`

## Priority 3 (ปรับปรุง)
- [ ] `wezterm-bridge.ts` — handle socket reconnect อัตโนมัติ
- [ ] config hot-reload — watch `oracle-pulse.config.json` แล้ว invalidate cache อัตโนมัติ

## Done ✓
- [x] แก้ Windows OpenSSH `--` separator bug
- [x] แก้ `%pane_id` parser bug
- [x] เพิ่ม TMUX_BRIDGE_ENABLED + SSH config สำหรับ VPS Ariadne
