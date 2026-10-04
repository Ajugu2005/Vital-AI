import type { ChatMessage } from "../types";
import { AlertTriangle, HeartPulse, Phone, Stop, Volume } from "./Icons";

interface Props {
  message: ChatMessage;
  onEscalate: () => void;
  escalationSent: boolean;
  escalating: boolean;
  speaking: boolean;
  canSpeak: boolean;
  onSpeak: (message: ChatMessage) => void;
  onStopSpeaking: () => void;
}

function SpeakButton({ message, speaking, onSpeak, onStopSpeaking, tone = "teal" }: Pick<Props, "message" | "speaking" | "onSpeak" | "onStopSpeaking"> & { tone?: "teal" | "red" }) {
  const color = tone === "red" ? "text-red-700 hover:bg-red-100" : "text-teal-700 hover:bg-teal-50";
  return (
    <button
      onClick={() => (speaking ? onStopSpeaking() : onSpeak(message))}
      aria-label={speaking ? "Stop speaking" : "Play this message aloud"}
      title={speaking ? "Stop" : "Play aloud"}
      data-testid="bubble-speak"
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold ${color}`}
    >
      {speaking ? <Stop className="h-3.5 w-3.5" /> : <Volume className="h-3.5 w-3.5" />}
      {speaking ? "Stop" : "Listen"}
    </button>
  );
}

export default function MessageBubble(props: Props) {
  const { message, onEscalate, escalationSent, escalating, canSpeak } = props;

  if (message.role === "patient") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-teal-700 px-4 py-2.5 text-[15px] leading-relaxed text-white shadow-sm">
          {message.viaVoice && <span className="mb-0.5 block text-[11px] font-semibold tracking-wide text-teal-100 uppercase">🎤 Voice</span>}
          {message.text}
        </div>
      </div>
    );
  }

  if (message.role === "system") {
    return (
      <div className="mx-auto max-w-[90%] rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm text-teal-900">
        {message.text}
        {canSpeak && (
          <div className="mt-1">
            <SpeakButton {...props} />
          </div>
        )}
      </div>
    );
  }

  if (message.urgent) {
    return (
      <div className="flex gap-3">
        <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-600 text-white">
          <AlertTriangle className="h-4 w-4" />
        </div>
        <div className="max-w-[85%] overflow-hidden rounded-2xl rounded-tl-md border-2 border-red-500 bg-white shadow-md">
          <div className="flex items-center justify-between gap-3 bg-red-600 px-4 py-2 text-sm font-semibold text-white">
            <span>Potentially urgent — seek immediate medical care</span>
            {message.caseId && (
              <span className="rounded bg-white/20 px-2 py-0.5 font-mono text-xs">{message.caseId}</span>
            )}
          </div>
          <p className="px-4 py-3 text-[15px] leading-relaxed text-slate-800">{message.text}</p>
          <div className="flex flex-wrap items-center gap-2 border-t border-red-100 bg-red-50 px-4 py-3">
            <button
              onClick={onEscalate}
              disabled={escalationSent || escalating}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 disabled:cursor-default disabled:bg-red-300"
            >
              <Phone className="h-4 w-4" />
              {escalationSent ? "Healthcare professional notified" : escalating ? "Connecting…" : "Connect to Healthcare Professional"}
            </button>
            <span className="text-xs font-medium text-red-800">Emergency (Lagos): 112 · 767</span>
            {canSpeak && (
              <span className="ml-auto">
                <SpeakButton {...props} tone="red" />
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
        <HeartPulse className="h-4 w-4" />
      </div>
      <div className="max-w-[80%]">
        <div className="rounded-2xl rounded-tl-md border border-slate-200 bg-white px-4 py-2.5 text-[15px] leading-relaxed text-slate-800 shadow-sm">
          {message.text}
        </div>
        {canSpeak && (
          <div className="mt-1 pl-1">
            <SpeakButton {...props} />
          </div>
        )}
      </div>
    </div>
  );
}
