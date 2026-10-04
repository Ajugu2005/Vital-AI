import { useCallback, useEffect, useRef, useState } from "react";
import { LANGUAGES, t } from "../../shared/i18n";
import DemoControls, { type Demo } from "../components/DemoControls";
import FollowUpSidebar from "../components/FollowUpSidebar";
import { AlertTriangle, HeartPulse, Phone, Refresh, Send } from "../components/Icons";
import MessageBubble from "../components/MessageBubble";
import VoicePanel from "../components/VoicePanel";
import { api } from "../services/api";
import { speak, stopSpeaking, ttsSupported } from "../services/speech";
import type { ChatMessage, DemoPatient, Language, SessionState } from "../types";
import PatientCallPanel from "../components/PatientCallPanel";

let counter = 0;
const uid = () => `${Date.now()}-${counter++}`;
const newSessionId = () => `PT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

const QUESTION_KEY = {
  feeling: "askFeeling",
  medication: "askMedication",
  symptoms: "askSymptoms",
  followUp: "askFollowUp",
} as const;

function introMessages(language: Language): ChatMessage[] {
  return [
    { id: uid(), role: "assistant", text: t(language, "intro"), language },
    { id: uid(), role: "assistant", text: t(language, "askLanguage"), language },
    { id: uid(), role: "assistant", text: t(language, "askFeeling"), language },
  ];
}

export default function FollowUpPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [sessionId, setSessionId] = useState(newSessionId);
  const [messages, setMessages] = useState<ChatMessage[]>(() => introMessages("en"));
  const [session, setSession] = useState<SessionState | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [escalating, setEscalating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<string>("…");
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [patientId, setPatientId] = useState<string | null>(null);
  const patientIdRef = useRef(patientId);
  patientIdRef.current = patientId;
  const autoSpeakRef = useRef(autoSpeak);
  autoSpeakRef.current = autoSpeak;
  const endRef = useRef<HTMLDivElement>(null);
  const canSpeak = ttsSupported();

  const speakMessage = useCallback((m: ChatMessage) => {
    const ok = speak(m.text, m.language ?? "en", () => setSpeakingId((id) => (id === m.id ? null : id)));
    setSpeakingId(ok ? m.id : null);
  }, []);

  const stopAll = useCallback(() => {
    stopSpeaking();
    setSpeakingId(null);
  }, []);

  const respond = useCallback(
    (m: ChatMessage) => {
      setMessages((list) => [...list, m]);
      if (autoSpeakRef.current) speakMessage(m);
    },
    [speakMessage],
  );

  useEffect(() => {
    api
      .health()
      .then((h) => setAiMode(h.aiMode === "bimpe" ? "Bimpe AI" : "Local safe mode"))
      .catch(() => setAiMode("API offline"));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const reset = useCallback((lang: Language) => {
    stopAll();
    const id = newSessionId();
    setSessionId(id);
    setLanguage(lang);
    setSession(null);
    setError(null);
    setMessages(introMessages(lang));
    return id;
  }, [stopAll]);

  // Text and voice both go through this same /api/chat call (same safety layer + Bimpe pipeline).
  const send = useCallback(
    async (text: string, lang: Language, sid: string, viaVoice = false) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      if (!viaVoice) setInput("");
      setError(null);
      setMessages((m) => [...m, { id: uid(), role: "patient", text: trimmed, viaVoice }]);
      setLoading(true);
      try {
        const res = await api.chat(trimmed, lang, sid, {
          patientId: patientIdRef.current,
          channel: viaVoice ? "web_voice" : "web_text",
        });
        setSession(res.session);
        // The server may switch language (patient asked, or clearly wrote in another language).
        const replyLang = res.session.language;
        if (replyLang !== lang) setLanguage(replyLang);
        respond({
          id: uid(),
          role: "assistant",
          text: res.reply,
          urgent: res.riskLevel === "urgent",
          caseId: res.caseId,
          language: replyLang,
        });
      } catch (err) {
        setError(
          err instanceof Error && err.message && !/fetch/i.test(err.message)
            ? err.message
            : "Could not reach the Vital AI server. Please check that it is running (npm run dev).",
        );
      } finally {
        setLoading(false);
      }
    },
    [respond],
  );

  const escalate = useCallback(async () => {
    setEscalating(true);
    try {
      const res = await api.escalate(sessionId, language);
      setSession(res.session);
      respond({ id: uid(), role: "system", text: res.message, language });
    } catch {
      setError("Escalation request failed. If this is an emergency, call 112 now.");
    } finally {
      setEscalating(false);
    }
  }, [sessionId, language, respond]);

  const changeLanguage = (lang: Language) => {
    if (lang === language) return;
    setLanguage(lang);
    const q = session?.pendingQuestion === undefined ? "feeling" : session.pendingQuestion;
    setMessages((m) => [
      ...m,
      { id: uid(), role: "assistant", text: t(lang, "languageSet"), language: lang },
      ...(q ? [{ id: uid(), role: "assistant" as const, text: t(lang, QUESTION_KEY[q]), language: lang }] : []),
    ]);
  };

  const runDemo = (demo: Demo) => {
    const sid = reset(demo.language);
    void send(demo.message, demo.language, sid);
  };

  // Selecting a DEMO patient starts a new follow-up linked to that patient record.
  const selectPatient = (p: DemoPatient | null) => {
    setPatientId(p?.id ?? null);
    patientIdRef.current = p?.id ?? null;
    reset(p?.preferredLanguage ?? language);
  };

  const lastReply = [...messages].reverse().find((m) => m.role !== "patient") ?? null;
  const escalated = session?.status === "escalated";
  const escalationSent = session?.escalation?.status === "clinician_notified";

  return (
    <div className="flex min-h-full flex-col">
      {/* Top bar */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm">
              <HeartPulse className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg leading-tight font-bold text-slate-900">
                Vital <span className="text-teal-700">AI</span>
              </h1>
              <p className="text-xs text-slate-500">Post-discharge follow-up assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:inline-flex">
              <span className={`h-2 w-2 rounded-full ${aiMode === "API offline" ? "bg-red-500" : "bg-emerald-500"}`} />
              {aiMode}
            </span>
            <label className="sr-only" htmlFor="lang">
              Preferred language
            </label>
            <select
              id="lang"
              value={language}
              onChange={(e) => changeLanguage(e.target.value as Language)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
            <button
              onClick={() => reset(language)}
              title="Start a new follow-up"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            >
              <Refresh className="h-4 w-4" />
              <span className="hidden sm:inline">New follow-up</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[1fr_360px]">
        <div className="flex min-w-0 flex-col gap-6">
        <VoicePanel
          language={language}
          processing={loading}
          speakingId={speakingId}
          lastReply={lastReply}
          autoSpeak={autoSpeak}
          onAutoSpeakChange={(v) => {
            setAutoSpeak(v);
            if (!v) stopAll();
          }}
          onTranscript={(text) => void send(text, language, sessionId, true)}
          onSpeak={speakMessage}
          onStopSpeaking={stopAll}
        />

        {/* Chat */}
        <section className="flex h-[640px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-3">
            <DemoControls onRun={runDemo} disabled={loading} />
          </div>

          {escalated && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-200 bg-red-600 px-5 py-3 text-white">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <AlertTriangle className="h-5 w-5" />
                Escalation Required · Case {session?.escalation?.caseId} · Emergency: 112 / 767
              </div>
              <button
                onClick={escalate}
                disabled={escalating || escalationSent}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-default disabled:opacity-80"
              >
                <Phone className="h-4 w-4" />
                {escalationSent ? "Clinician notified" : "Connect to Healthcare Professional"}
              </button>
            </div>
          )}

          <div className="flex-1 space-y-4 overflow-y-auto bg-slate-50/60 px-5 py-5">
            {messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                onEscalate={escalate}
                escalating={escalating}
                escalationSent={escalationSent}
                canSpeak={canSpeak}
                speaking={speakingId === m.id}
                onSpeak={speakMessage}
                onStopSpeaking={stopAll}
              />
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                  <HeartPulse className="h-4 w-4" />
                </div>
                <div className="rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-400">
                  Vital AI is reviewing your response…
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">{error}</div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input, language, sessionId);
            }}
            className="flex gap-2 border-t border-slate-200 bg-white px-4 py-3"
          >
            <label htmlFor="msg" className="sr-only">
              Your message
            </label>
            <input
              id="msg"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Tell Vital AI how you are feeling…"
              autoComplete="off"
              className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-[15px] focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Send
            </button>
          </form>
        </section>
        </div>

        <div className="flex flex-col gap-4">
          <PatientCallPanel selectedId={patientId} onSelect={selectPatient} />
          <FollowUpSidebar session={session} language={language} onEscalate={escalate} escalating={escalating} />
        </div>
      </main>
    </div>
  );
}
