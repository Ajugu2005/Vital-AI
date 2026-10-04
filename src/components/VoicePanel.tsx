import { useEffect, useState } from "react";
import { useSpeechRecognition } from "../hooks/useSpeechRecognition";
import { hasNativeVoice, LANGUAGE_NAME, stopSpeaking, ttsSupported } from "../services/speech";
import type { ChatMessage, Language } from "../types";
import { AlertTriangle, Mic, Stop, Volume } from "./Icons";

interface Props {
  language: Language;
  processing: boolean;
  speakingId: string | null;
  lastReply: ChatMessage | null;
  autoSpeak: boolean;
  onAutoSpeakChange: (value: boolean) => void;
  onTranscript: (text: string) => void;
  onSpeak: (message: ChatMessage) => void;
  onStopSpeaking: () => void;
}

type Phase = "idle" | "recording" | "stopping" | "processing" | "speaking";

const PHASE_LABEL: Record<Phase, string> = {
  idle: "🎤 Tap to speak",
  recording: "🔴 Recording… tap to stop",
  stopping: "Finishing recording…",
  processing: "Processing…",
  speaking: "Speaking…",
};

export default function VoicePanel(props: Props) {
  const { language, processing, speakingId, lastReply, autoSpeak } = props;
  const rec = useSpeechRecognition(language, props.onTranscript);
  const [voiceReady, setVoiceReady] = useState(false);
  const tts = ttsSupported();

  // Voices load asynchronously in Chrome.
  useEffect(() => {
    if (!tts) return;
    const update = () => setVoiceReady(window.speechSynthesis.getVoices().length > 0);
    update();
    window.speechSynthesis.addEventListener("voiceschanged", update);
    return () => window.speechSynthesis.removeEventListener("voiceschanged", update);
  }, [tts]);

  const phase: Phase = rec.isStopping
    ? "stopping"
    : rec.isRecording
      ? "recording"
      : processing
        ? "processing"
        : speakingId
          ? "speaking"
          : "idle";
  const nativeVoice = voiceReady && hasNativeVoice(language);
  const busy = phase === "stopping" || phase === "processing";

  // The SAME button starts and stops recording.
  const onMic = () => {
    if (!rec.isRecording) {
      stopSpeaking(); // don't let the microphone pick up Vital AI's own voice
      props.onStopSpeaking();
    }
    rec.toggle();
  };

  const micClass =
    phase === "recording"
      ? "bg-red-600 text-white ring-8 ring-red-200 hover:bg-red-700"
      : busy
        ? "bg-slate-300 text-slate-600 cursor-wait"
        : "bg-teal-700 text-white ring-8 ring-teal-100 hover:bg-teal-800";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-label="Talk to Vital AI">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold tracking-wide text-slate-900 uppercase">Talk to Vital AI</h2>
          <p className="text-xs text-slate-500">
            Voice follow-up in {LANGUAGE_NAME[language]} · uses the same safety checks as text chat
          </p>
        </div>
        {tts && (
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
            <input
              type="checkbox"
              checked={autoSpeak}
              onChange={(e) => props.onAutoSpeakChange(e.target.checked)}
              className="h-4 w-4 accent-teal-700"
            />
            Read replies aloud
          </label>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-[180px_1fr]">
        {/* Microphone */}
        <div className="flex flex-col items-center justify-center gap-3">
          <button
            type="button"
            onClick={onMic}
            disabled={!rec.supported || busy}
            aria-pressed={rec.isRecording}
            aria-label={rec.isRecording ? "Stop recording" : "Start speaking"}
            data-testid="mic-button"
            data-state={phase}
            className={`relative flex h-24 w-24 items-center justify-center rounded-full shadow-lg transition-colors focus:outline-none focus-visible:ring-8 focus-visible:ring-teal-300 disabled:cursor-not-allowed disabled:ring-0 ${micClass}`}
          >
            {phase === "recording" && (
              <span className="pointer-events-none absolute inset-0 animate-ping rounded-full bg-red-400 opacity-40" />
            )}
            {busy ? (
              <span className="h-8 w-8 animate-spin rounded-full border-4 border-slate-500 border-t-transparent" />
            ) : phase === "recording" ? (
              <Stop className="relative h-9 w-9" />
            ) : (
              <Mic className="h-10 w-10" />
            )}
          </button>
          <span
            data-testid="voice-phase"
            className={`text-center text-sm font-semibold ${phase === "recording" ? "text-red-700" : "text-slate-700"}`}
          >
            {rec.supported ? PHASE_LABEL[phase] : "Voice input unavailable"}
          </span>
          {phase === "speaking" && (
            <button
              onClick={props.onStopSpeaking}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Stop className="h-3.5 w-3.5" /> Stop speaking
            </button>
          )}
        </div>

        {/* Transcript + response */}
        <div className="flex min-w-0 flex-col gap-3">
          {!rec.supported && (
            <p className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Voice input isn't supported in this browser. You can still use text chat.
            </p>
          )}
          {rec.error && (
            <p data-testid="voice-error" className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {rec.error}
            </p>
          )}
          {language === "pidgin" && rec.supported && (
            <p className="text-xs text-slate-500">
              Pidgin is recognised with a Nigerian English speech model, so some words may be transcribed in English spelling.
            </p>
          )}

          <div>
            <div className="mb-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">Transcript</div>
            <div
              data-testid="voice-transcript"
              className={`min-h-[48px] rounded-xl border px-3 py-2.5 text-[15px] ${
                rec.isRecording ? "border-red-300 bg-red-50/40" : "border-slate-200 bg-slate-50"
              } ${rec.transcript ? "text-slate-800" : "text-slate-400 italic"}`}
            >
              {rec.transcript ? `“${rec.transcript}”` : rec.isRecording ? "Listening…" : "Your words will appear here."}
            </div>
          </div>

          <div>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
              <Volume className="h-3.5 w-3.5" /> Vital AI
            </div>
            {lastReply ? (
              <div
                data-testid="voice-reply"
                className={`rounded-xl border px-3 py-2.5 text-[15px] leading-relaxed ${
                  lastReply.urgent ? "border-red-400 bg-red-50 text-red-900" : "border-teal-200 bg-teal-50/60 text-slate-800"
                }`}
              >
                {lastReply.urgent && (
                  <div className="mb-1 flex items-center gap-1.5 text-sm font-bold text-red-700">
                    <AlertTriangle className="h-4 w-4" /> Urgent — seek immediate medical care
                    {lastReply.caseId && <span className="ml-auto rounded bg-red-600 px-2 py-0.5 font-mono text-xs text-white">{lastReply.caseId}</span>}
                  </div>
                )}
                {lastReply.text}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-[15px] text-slate-400 italic">
                Vital AI's reply will appear here.
              </div>
            )}
          </div>

          {lastReply && tts && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => props.onSpeak(lastReply)}
                data-testid="replay-response"
                className="inline-flex items-center gap-1.5 rounded-lg border border-teal-300 bg-white px-3 py-1.5 text-sm font-semibold text-teal-800 hover:bg-teal-50"
              >
                <Volume className="h-4 w-4" /> Replay response
              </button>
              {speakingId && (
                <button
                  onClick={props.onStopSpeaking}
                  data-testid="stop-speaking"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <Stop className="h-4 w-4" /> Stop
                </button>
              )}
              {voiceReady && !nativeVoice && (
                <span className="text-xs text-slate-500">
                  No {LANGUAGE_NAME[language]} voice is installed on this device — reading with the closest English voice.
                </span>
              )}
            </div>
          )}
          {!tts && (
            <p className="text-xs text-slate-500">Spoken replies aren't supported in this browser — replies are shown as text.</p>
          )}
        </div>
      </div>
    </section>
  );
}
