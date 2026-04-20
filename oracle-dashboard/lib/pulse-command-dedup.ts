import { createHash } from "node:crypto";

/** หน้าต่างเวลาเดียวกับ client cooldown (~2s) — กันคำสั่งซ้ำจาก double-submit / retry */
const WINDOW_MS = 2500;
const MAX_ENTRIES = 600;

const seen = new Map<string, number>();

function prune(now: number) {
  for (const [k, exp] of seen) {
    if (exp <= now) seen.delete(k);
  }
  if (seen.size <= MAX_ENTRIES) return;
  const sorted = [...seen.entries()].sort((a, b) => a[1] - b[1]);
  for (let i = 0; i < sorted.length - 400; i++) seen.delete(sorted[i]![0]);
}

function fingerprint(parts: string[]): string {
  const h = createHash("sha256");
  for (const p of parts) {
    h.update("\0");
    h.update(p);
  }
  return h.digest("hex");
}

function makeKey(namespace: string, parts: string[]) {
  return `${namespace}:${fingerprint(parts)}`;
}

/**
 * @returns true ถ้าให้ดำเนินการต่อ, false ถ้าเป็นคำสั่งซ้ำในช่วง WINDOW_MS
 */
export function consumePulseCommandDedup(namespace: string, parts: string[]): boolean {
  const now = Date.now();
  prune(now);
  const key = makeKey(namespace, parts);
  const until = seen.get(key);
  if (until != null && until > now) return false;
  seen.set(key, now + WINDOW_MS);
  return true;
}

/** เรียกเมื่อส่งล้มเหลว — ปลดล็อกให้ลองซ้ำได้ (ไม่ล็อกผู้ใช้หลัง error) */
export function releasePulseCommandDedup(namespace: string, parts: string[]): void {
  seen.delete(makeKey(namespace, parts));
}
