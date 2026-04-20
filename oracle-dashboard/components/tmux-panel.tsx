"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PULSE_BRIDGE_STORAGE_KEY, pulseBridgeHeaders } from "@/lib/pulse-bridge-client";

type Pane = {
  pane_id: number;
  session_name: string;
  window_index: number;
  pane_index: number;
  title: string;
  cwd: string;
};

type StatusPayload =
  | { enabled: false; hint?: string }
  | { enabled: true; panes: Pane[]; error?: string; sshTarget?: string | null }
  | { enabled: true; sshTarget?: string | null; tmuxBin?: string };

export function TmuxPanel() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [bridgeHint, setBridgeHint] = useState<string | null>(null);
  const [secretRequired, setSecretRequired] = useState(false);
  const [secretInput, setSecretInput] = useState("");
  const [sshHint, setSshHint] = useState<string | null>(null);
  const [panes, setPanes] = useState<Pane[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const [paneId, setPaneId] = useState("");
  const [sendText, setSendText] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const literalSendLockRef = useRef(false);

  const append = useCallback((line: string) => {
    setLog((prev) => [...prev.slice(-120), line]);
  }, []);

  const refresh = useCallback(async () => {
    setBusy(true);
    setListError(null);
    try {
      const res = await fetch("/api/tmux", { headers: pulseBridgeHeaders(false) });
      const data = (await res.json()) as StatusPayload & { needsSecret?: boolean; error?: string };

      if (res.status === 401 || data.needsSecret) {
        setSecretRequired(true);
        setEnabled(true);
        setBridgeHint("ต้องการ bridge secret — ตั้ง ORACLE_PULSE_BRIDGE_SECRET หรือ WEZTERM_BRIDGE_SECRET");
        setPanes([]);
        setSshHint(null);
        return;
      }

      if (!data.enabled) {
        setEnabled(false);
        setBridgeHint("hint" in data ? String(data.hint) : "ปิดใช้ tmux bridge");
        setPanes([]);
        setSshHint(null);
        return;
      }

      if ("panes" in data) {
        setEnabled(true);
        setSecretRequired(false);
        if (data.error) setListError(data.error);
        setPanes(data.panes);
        if (data.sshTarget) setSshHint(`SSH → ${data.sshTarget}`);
        else setSshHint("รัน tmux บนเครื่องเดียวกับ Next (ไม่มี ORACLE_SSH_TARGET)");
        setPaneId((prev) => (prev ? prev : data.panes.length ? String(data.panes[0].pane_id) : ""));
        return;
      }

      setEnabled(true);
      setSecretRequired(false);
      setPanes([]);
      setSshHint(null);
    } catch (e) {
      setListError(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    const saved = sessionStorage.getItem(PULSE_BRIDGE_STORAGE_KEY);
    if (saved) setSecretInput(saved);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  function saveSecret() {
    const t = secretInput.trim();
    if (t) sessionStorage.setItem(PULSE_BRIDGE_STORAGE_KEY, t);
    else sessionStorage.removeItem(PULSE_BRIDGE_STORAGE_KEY);
    void refresh();
  }

  async function postJson(body: object) {
    const res = await fetch("/api/tmux", {
      method: "POST",
      headers: pulseBridgeHeaders(),
      body: JSON.stringify(body),
    });
    const data: { error?: string; ok?: boolean; duplicate?: boolean } = await res.json();
    if (!res.ok) throw new Error(data.error ?? res.statusText);
    return data;
  }

  async function handleSend() {
    const id = Number(paneId);
    if (!Number.isFinite(id)) {
      append("error: เลือก pane");
      return;
    }
    const text = sendText;
    if (!text.trim()) return;
    if (literalSendLockRef.current) {
      append("blocked: กำลังส่ง literal อยู่");
      return;
    }
    literalSendLockRef.current = true;
    setBusy(true);
    try {
      const out = await postJson({ action: "send-text", paneId: id, text });
      if (out.duplicate) {
        append("กันซ้ำ: ไม่ส่งข้อความซ้ำในเวลาสั้น ๆ");
        return;
      }
      append(`> tmux send-keys -l → pane %${id} (${text.length} chars)`);
      setSendText("");
    } catch (e) {
      append(`error: ${e instanceof Error ? e.message : "send failed"}`);
    } finally {
      literalSendLockRef.current = false;
      setBusy(false);
    }
  }

  if (enabled === null) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500">
        กำลังเชื่อมต่อ tmux bridge…
      </div>
    );
  }

  if (enabled === false) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-4 p-6 text-sm text-zinc-300">
        <h2 className="text-base font-semibold text-emerald-200/90">tmux bridge ปิดอยู่</h2>
        <p className="text-zinc-400">
          ตั้ง <code className="text-zinc-200">TMUX_BRIDGE_ENABLED=1</code> ใน <code className="text-zinc-200">.env.local</code> แล้วรีสตาร์ท dev
          server
        </p>
        <p className="text-xs text-zinc-500">
          ดึงผ่าน SSH: <code className="text-zinc-400">ORACLE_SSH_TARGET=user@host</code> (คีย์:{" "}
          <code className="text-zinc-400">ORACLE_SSH_IDENTITY</code>, ออปชัน{" "}
          <code className="text-zinc-400">ORACLE_SSH_EXTRA_ARGS</code>)
        </p>
        {bridgeHint ? <p className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs">{bridgeHint}</p> : null}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 md:p-6">
      <div>
        <h2 className="text-base font-semibold text-emerald-200/90">tmux (กระดูกสันหลัง mux)</h2>
        <p className="mt-1 text-xs text-zinc-500">
          รายการ pane ทุก session · ส่งข้อความแบบ literal เข้า pane (<code className="text-zinc-400">send-keys -l</code>)
        </p>
        {sshHint ? <p className="mt-2 font-mono text-[11px] text-cyan-400/90">{sshHint}</p> : null}
      </div>

      {secretRequired ? (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-900/50 bg-amber-950/20 p-4 text-sm">
          <label className="text-amber-200/90">Bridge secret</label>
          <input
            type="password"
            className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100"
            placeholder="ORACLE_PULSE_BRIDGE_SECRET"
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
          />
          <button
            type="button"
            onClick={() => saveSecret()}
            className="self-start rounded-lg bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600"
          >
            บันทึกและเชื่อมต่อ
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void refresh()}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
        >
          รีเฟรช pane
        </button>
        {busy ? <span className="text-xs text-zinc-500">กำลังทำงาน…</span> : null}
      </div>

      {listError ? (
        <p className="rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-2 text-xs text-red-200">{listError}</p>
      ) : null}

      <section className="flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
        <h3 className="text-xs font-semibold tracking-wide text-zinc-400">ส่งเข้า pane</h3>
        <label className="text-[11px] text-zinc-500">Pane</label>
        <select
          className="rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-100"
          value={paneId}
          onChange={(e) => setPaneId(e.target.value)}
        >
          {panes.length === 0 ? (
            <option value="">— ไม่มี pane (เปิด tmux session แล้วกดรีเฟรช) —</option>
          ) : (
            panes.map((p) => (
              <option key={`${p.session_name}-${p.pane_id}`} value={String(p.pane_id)}>
                %{p.pane_id} · {p.session_name}:{p.window_index}.{p.pane_index} · {p.title.slice(0, 48)}
                {p.title.length > 48 ? "…" : ""}
              </option>
            ))
          )}
        </select>
        <textarea
          className="min-h-32 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-600"
          placeholder="ข้อความ / คำสั่ง — ส่งเป็น literal (เหมาะกับ shell ที่รอคีย์อยู่)"
          value={sendText}
          onChange={(e) => setSendText(e.target.value)}
        />
        <button
          type="button"
          disabled={busy || !paneId || !sendText.trim()}
          onClick={() => void handleSend()}
          className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-40"
        >
          ส่งไปที่ pane (tmux)
        </button>
      </section>

      <section className="rounded-xl border border-zinc-800 bg-black/30 p-3">
        <h3 className="mb-2 text-[11px] font-semibold text-zinc-500">ล็อก</h3>
        <pre className="max-h-40 overflow-y-auto font-mono text-[11px] leading-relaxed text-zinc-400">
          {log.length ? log.join("\n") : "—"}
        </pre>
      </section>
    </div>
  );
}
