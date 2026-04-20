import { fetchPulseRemoteState } from "@/lib/pulse-remote-state";

/** ดึง state จาก remote (SSH cat) หรือไฟล์ local — ไม่บังคับ secret (รันใน LAN ที่เชื่อถือได้เท่านั้น) */
export async function GET() {
  const r = await fetchPulseRemoteState();
  if (!r.ok) {
    return Response.json({ ok: false, error: r.error }, { status: 404 });
  }
  return Response.json({ ok: true, data: r.data });
}
