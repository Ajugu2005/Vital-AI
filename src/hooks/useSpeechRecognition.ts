import { useCallback, useEffect, useRef, useState } from "react";
import type { Language } from "../types";
import { getRecognitionCtor, LANGUAGE_NAME, RECOGNITION_LOCALE, type SpeechRecognitionLike } from "../services/speech";

const ERROR_TEXT: Record<string, string> = {
  "not-allowed": "Microphone access was blocked. Allow the microphone in your browser, or use text chat.",
  "service-not-allowed": "Microphone access was blocked. Allow the microphone in your browser, or use text chat.",
  "audio-capture": "No microphone was found. Please connect one, or use text chat.",
  "no-speech": "I didn't hear anything. Tap the microphone and try again.",
  network: "Voice recognition needs an internet connection. You can still use text chat.",
};

/** If the browser hasn't finished within this time after Stop, finish with what we have. */
const STOP_TIMEOUT_MS = 2500;

/**
 * Browser speech-to-text (Web Speech API).
 * One button toggles: toggle() starts recording, and the next toggle() stops it.
 * Recording continues until the user stops it; then onFinal receives the transcript.
 */
export function useSpeechRecognition(language: Language, onFinal: (transcript: string) => void) {
  const supported = getRecognitionCtor() !== null;
  // UI state only.
  const [isRecording, setIsRecording] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);

  // The active recognizer lives in a ref so every click sees the current instance (no stale closures).
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");
  const interimRef = useRef("");
  const stopTimerRef = useRef<number | undefined>(undefined);
  const discardRef = useRef(false);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  /** Ends the session exactly once: detaches the recognizer, resets UI, delivers the transcript. */
  const finish = useCallback((rec: SpeechRecognitionLike) => {
    if (recRef.current !== rec) return; // already finished (or a stale instance)
    recRef.current = null;
    window.clearTimeout(stopTimerRef.current);
    rec.onresult = rec.onerror = rec.onend = rec.onstart = null;
    setIsRecording(false);
    setIsStopping(false);
    const text = (finalRef.current + interimRef.current).trim();
    if (text && !discardRef.current) onFinalRef.current(text);
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor || recRef.current) return; // never run two recognizers at once
    setError(null);
    setTranscript("");
    finalRef.current = "";
    interimRef.current = "";
    discardRef.current = false;

    const rec = new Ctor();
    rec.lang = RECOGNITION_LOCALE[language];
    rec.continuous = true; // keep recording until the user taps stop
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += r[0].transcript + " ";
        else interim += r[0].transcript;
      }
      interimRef.current = interim;
      setTranscript((finalRef.current + interim).trim());
    };
    rec.onerror = (e) => {
      if (e.error === "aborted") return;
      setError(
        e.error === "language-not-supported" || e.error === "bad-grammar"
          ? `Voice input isn't available for ${LANGUAGE_NAME[language]} in this browser yet. You can type your message, or switch to English or Pidgin for voice.`
          : (ERROR_TEXT[e.error] ?? `Voice input stopped (${e.error}). You can still use text chat.`),
      );
    };
    rec.onend = () => finish(rec);

    recRef.current = rec;
    setIsRecording(true); // show recording state immediately, even while the permission prompt is open
    try {
      rec.start();
    } catch {
      setError("Couldn't start the microphone. Please try again, or use text chat.");
      discardRef.current = true;
      finish(rec);
    }
  }, [language, finish]);

  const stop = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    setIsStopping(true);
    try {
      rec.stop(); // releases the microphone; browser delivers final results then fires onend
    } catch {
      /* already stopping */
    }
    // Some browsers/networks never fire onend after stop(); don't leave the button stuck.
    window.clearTimeout(stopTimerRef.current);
    stopTimerRef.current = window.setTimeout(() => {
      try {
        rec.abort();
      } catch {
        /* ignore */
      }
      finish(rec);
    }, STOP_TIMEOUT_MS);
  }, [finish]);

  /** The single microphone button handler. Reads the ref, so it always acts on the live recording. */
  const toggle = useCallback(() => {
    if (recRef.current) stop();
    else start();
  }, [start, stop]);

  const cancel = useCallback(() => {
    const rec = recRef.current;
    if (!rec) return;
    discardRef.current = true;
    try {
      rec.abort();
    } catch {
      /* ignore */
    }
    finish(rec);
  }, [finish]);

  // Release the microphone if the component unmounts mid-recording.
  useEffect(() => cancel, [cancel]);

  return { supported, isRecording, isStopping, transcript, error, toggle, cancel };
}
