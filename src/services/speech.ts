// Browser speech helpers: Web Speech API recognition locales + SpeechSynthesis playback.
import type { Language } from "../types";

/** Recognition locale per language. Pidgin has no recognizer, so Nigerian English is the closest. */
export const RECOGNITION_LOCALE: Record<Language, string> = {
  en: "en-NG",
  pidgin: "en-NG",
  yoruba: "yo-NG",
  igbo: "ig-NG",
  hausa: "ha-NG",
};

/** Preferred voice locales, best first. Falls back to any English voice if none match. */
const VOICE_LOCALES: Record<Language, string[]> = {
  en: ["en-NG", "en-GB", "en-US"],
  pidgin: ["en-NG", "en-GB", "en-US"],
  yoruba: ["yo-NG", "yo", "en-NG", "en-GB", "en-US"],
  igbo: ["ig-NG", "ig", "en-NG", "en-GB", "en-US"],
  hausa: ["ha-NG", "ha", "en-NG", "en-GB", "en-US"],
};

export const LANGUAGE_NAME: Record<Language, string> = {
  en: "English",
  pidgin: "Pidgin",
  yoruba: "Yoruba",
  igbo: "Igbo",
  hausa: "Hausa",
};

type RecognitionCtor = new () => SpeechRecognitionLike;
export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

export function getRecognitionCtor(): RecognitionCtor | null {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const ttsSupported = () => typeof window !== "undefined" && "speechSynthesis" in window;

function pickVoice(language: Language): { voice: SpeechSynthesisVoice | null; native: boolean } {
  const voices = window.speechSynthesis.getVoices();
  const norm = (l: string) => l.replace("_", "-").toLowerCase();
  for (const locale of VOICE_LOCALES[language]) {
    const want = locale.toLowerCase();
    const match =
      voices.find((v) => norm(v.lang) === want && /google|natural|online/i.test(v.name)) ??
      voices.find((v) => norm(v.lang) === want) ??
      (want.length === 2 ? voices.find((v) => norm(v.lang).startsWith(want + "-")) : undefined);
    if (match) {
      const native = language === "en" || language === "pidgin" || !norm(match.lang).startsWith("en");
      return { voice: match, native };
    }
  }
  return { voice: voices.find((v) => norm(v.lang).startsWith("en")) ?? null, native: language === "en" || language === "pidgin" };
}

/** True if a native voice for this language is installed (otherwise an English voice is used). */
export function hasNativeVoice(language: Language): boolean {
  return ttsSupported() ? pickVoice(language).native : false;
}

// ---------------------------------------------------------------------------------------------
// Text-to-speech providers. The browser engine is the default; a Nigerian-voice provider
// (server-side TTS returning audio) can be plugged in later with setTtsProvider().

export interface TtsProvider {
  name: string;
  supported(): boolean;
  /** Speaks text; calls onEnd when finished, stopped or failed. Returns false if it could not start. */
  speak(text: string, language: Language, onEnd?: () => void): boolean;
  stop(): void;
}

let speakToken = 0;

export const browserTts: TtsProvider = {
  name: "browser-speechSynthesis",
  supported: ttsSupported,
  speak(text, language, onEnd) {
    if (!ttsSupported()) return false;
    try {
      const synth = window.speechSynthesis;
      synth.cancel();
      const token = ++speakToken;
      const { voice } = pickVoice(language);
      // Long text is split into sentences because Chrome cuts off long utterances.
      const chunks = text.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
      chunks.forEach((chunk, i) => {
        const u = new SpeechSynthesisUtterance(chunk);
        if (voice) {
          u.voice = voice;
          u.lang = voice.lang;
        } else {
          u.lang = VOICE_LOCALES[language][0];
        }
        u.rate = 0.95;
        if (i === chunks.length - 1) {
          u.onend = () => token === speakToken && onEnd?.();
          u.onerror = () => token === speakToken && onEnd?.();
        }
        synth.speak(u);
      });
      return true;
    } catch {
      return false; // never block the chat if speech fails
    }
  },
  stop() {
    if (!ttsSupported()) return;
    speakToken++;
    window.speechSynthesis.cancel();
  },
};

let provider: TtsProvider = browserTts;

export function setTtsProvider(next: TtsProvider) {
  provider.stop();
  provider = next;
}

export const speak = (text: string, language: Language, onEnd?: () => void) => provider.speak(text, language, onEnd);
export const stopSpeaking = () => provider.stop();
