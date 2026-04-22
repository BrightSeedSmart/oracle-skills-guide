"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AGENTS } from "@/lib/agents";

type VoiceStatus = "idle" | "listening" | "thinking" | "speaking";

type Message = { role: "user" | "oracle"; text: string; ts: number };

type SR = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

declare global {
  interface Window {
    SpeechRecognition: new () => SR;
    webkitSpeechRecognition: new () => SR;
  }
}

type SpeechRecognitionEvent = {
  results: SpeechRecognitionResultList;
};

export function VoiceChat() {
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [lang, setLang] = useState<"th-TH" | "en-US">("th-TH");
  const [agentKey, setAgentKey] = useState("oracle");
  const [messages, setMessages] = useState<Message[]>([]);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);

  const recognitionRef = useRef<SR | null>(null);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }
    synthRef.current = window.speechSynthesis;
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const speak = useCallback((text: string) => {
    const synth = synthRef.current;
    if (!synth) return;
    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.rate = 1.05;
    utterance.onend = () => setStatus("idle");
    utterance.onerror = () => setStatus("idle");
    setStatus("speaking");
    synth.speak(utterance);
  }, [lang]);

  const sendToOracle = useCallback(async (text: string) => {
    setStatus("thinking");
    setMessages((prev) => [...prev, { role: "user", text, ts: Date.now() }]);
    setTranscript("");
    try {
      const res = await fetch("/api/oracle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent: agentKey, message: text, taskId: "voice", modelTier: "auto" }),
      });
      const data = await res.json() as { reply?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Request failed");
      const reply = data.reply ?? "";
      setMessages((prev) => [...prev, { role: "oracle", text: reply, ts: Date.now() }]);
      speak(reply);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "error";
      setError(msg);
      setStatus("idle");
    }
  }, [agentKey, speak]);

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
    setStatus("idle");
  }, []);

  const startListening = useCallback(() => {
    const SR = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SR) return;
    setError(null);
    const rec = new SR();
    rec.lang = lang;
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    recognitionRef.current = rec;

    rec.onstart = () => setStatus("listening");
    rec.onresult = (e: SpeechRecognitionEvent) => {
      const result = Array.from(e.results).map((r) => (r as SpeechRecognitionResult)[0]?.transcript ?? "").join("");
      setTranscript(result);
    };
    rec.onerror = (e: { error: string }) => {
      setError(`mic: ${e.error}`);
      setStatus("idle");
    };
    rec.onend = () => {
      const finalText = transcript;
      if (finalText.trim()) void sendToOracle(finalText.trim());
      else setStatus("idle");
    };
    rec.start();
  }, [lang, sendToOracle, transcript]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const handleMicClick = useCallback(() => {
    if (status === "listening") { stopListening(); return; }
    if (status === "speaking") { stopSpeaking(); return; }
    if (status === "idle") { startListening(); return; }
  }, [status, startListening, stopListening, stopSpeaking]);

  if (!supported) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-sm text-zinc-500">
        Browser นี้ไม่รองรับ Web Speech API — ใช้ Chrome หรือ Edge แทน
      </div>
    );
  }

  const micColors: Record<VoiceStatus, string> = {
    idle: "bg-zinc-800 hover:bg-zinc-700 text-zinc-300",
    listening: "bg-red-600 hover:bg-red-500 text-white shadow-[0_0_20px_rgba(239,68,68,0.5)]",
    thinking: "bg-violet-700 text-violet-200 cursor-not-allowed",
    speaking: "bg-emerald-700 hover:bg-emerald-600 text-white shadow-[0_0_20px_rgba(52,211,153,0.4)]",
  };

  const statusLabel: Record<VoiceStatus, string> = {
    idle: "กด เพื่อพูด",
    listening: "กำลังฟัง… (กดอีกครั้งเพื่อหยุด)",
    thinking: "Oracle กำลังคิด…",
    speaking: "Oracle กำลังพูด… (กดเพื่อหยุด)",
  };

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 md:p-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={agentKey}
          onChange={(e) => setAgentKey(e.target.value)}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 focus:border-violet-500/50 focus:outline-none"
        >
          {AGENTS.map((a) => (
            <option key={a.name} value={a.name.toLowerCase()}>
              {a.emoji} {a.name}
            </option>
          ))}
        </select>
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value as "th-TH" | "en-US")}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 focus:border-violet-500/50 focus:outline-none"
        >
          <option value="th-TH">ภาษาไทย</option>
          <option value="en-US">English</option>
        </select>
        <button
          type="button"
          onClick={() => setMessages([])}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
        >
          ล้างประวัติ
        </button>
      </div>

      {/* Chat log */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex h-full items-center justify-center text-xs text-zinc-600">
            กดปุ่ม mic แล้วพูดเลย — Oracle จะฟังและตอบด้วยเสียง
          </div>
        )}
        {messages.map((m) => (
          <div
            key={m.ts}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-indigo-600/30 text-indigo-100 ring-1 ring-indigo-500/30"
                  : "bg-zinc-800/80 text-zinc-100 ring-1 ring-zinc-700/50"
              }`}
            >
              <div className="mb-1 text-[10px] font-medium text-zinc-500">
                {m.role === "user" ? "คุณ" : `Oracle · ${agentKey}`}
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
            </div>
          </div>
        ))}
        {transcript && (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-xl bg-indigo-600/15 px-3 py-2 text-sm italic text-indigo-300/70 ring-1 ring-indigo-500/20">
              {transcript}…
            </div>
          </div>
        )}
        <div ref={logEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-800/50 bg-red-950/30 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Mic button */}
      <div className="flex flex-col items-center gap-2 pb-2">
        <button
          type="button"
          onClick={handleMicClick}
          disabled={status === "thinking"}
          className={`flex size-20 items-center justify-center rounded-full text-3xl transition-all duration-200 ${micColors[status]}`}
          aria-label={statusLabel[status]}
        >
          {status === "listening" ? "⏹" : status === "speaking" ? "🔊" : status === "thinking" ? "⟳" : "🎙"}
        </button>
        <span className="text-xs text-zinc-500">{statusLabel[status]}</span>
      </div>
    </div>
  );
}
