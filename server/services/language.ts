// Lightweight language detection for the five supported languages.
// Returns null when unsure, so the session keeps its current language instead of flip-flopping.
import type { Language } from "../../shared/i18n";
import { normalize } from "./safety";

const NAMES: [Language, RegExp][] = [
  ["pidgin", /\b(pidgin|naija|broken english)\b/],
  ["yoruba", /\b(yoruba)\b/],
  ["igbo", /\b(igbo|ibo)\b/],
  ["hausa", /\b(hausa)\b/],
  ["en", /\b(english)\b/],
];

const SWITCH = /\b(speak|talk|use|switch|change|reply|answer|respond|continue|yarn|make we|let's|lets|can we|in|for|prefer|abeg)\b/;

const MARKERS: Record<Exclude<Language, "en">, RegExp> = {
  pidgin: /\b(dey|abeg|wetin|comot|una|sabi|wahala|pikin|sef|oya|abi|na im|no be|don|fit|wey|dem|e be like|small small|kampe|make we|i no)\b/g,
  yoruba: /\b(mo|mi|ni|ti|ara|bawo|dara|oogun|ile-iwosan|e se|o se|rilara|emi|kini|beeni|rara|n mu|ko si|mo n)\b/g,
  igbo: /\b(ahu|na-adi|adi|ogwu|kedu|biko|daalu|nke|ka|gi|ulo|mma|ana m|kemgbe|hapuru|ndo|o di)\b/g,
  hausa: /\b(ina|da|ka|na|ban|sauki|lafiya|magani|maganina|asibiti|yaya|don allah|sannu|kuma|jin|shan|tun|yanzu|ba)\b/g,
};
// Letters that only occur in these orthographies are a strong signal.
const SCRIPT: Partial<Record<Language, RegExp>> = {
  yoruba: /[ẹọṣẸỌṢ]|[àáèéìíòóùú]\S*[ẹọ]/g,
  igbo: /[ụịṅỤỊṄ]/g,
  hausa: /[ƙɗɓƘƊƁ]/g,
};

export interface LanguageDetection {
  language: Language | null; // null = unsure
  explicitRequest: boolean; // patient asked to switch
}

export function detectLanguage(raw: string): LanguageDetection {
  const text = normalize(raw);

  // Explicit request: "Abeg make we talk Pidgin", "Can we speak Yoruba?", "in Hausa please"
  if (SWITCH.test(text)) {
    for (const [lang, re] of NAMES) if (re.test(text)) return { language: lang, explicitRequest: true };
  }

  const scores: Record<Language, number> = { en: 0, pidgin: 0, yoruba: 0, igbo: 0, hausa: 0 };
  for (const lang of Object.keys(MARKERS) as Exclude<Language, "en">[]) {
    scores[lang] += text.match(MARKERS[lang])?.length ?? 0;
    scores[lang] += 2 * (raw.match(SCRIPT[lang] ?? /$^/g)?.length ? 1 : 0);
  }
  // Igbo shares "na"/"ka" with Hausa; diacritics settle most cases.
  const words = text.split(/[^a-z'-]+/).filter(Boolean);
  scores.en = words.filter((w) => /^(the|and|i|my|have|been|is|are|was|feeling|since|taking|medicine|medication|today|better|but|it|to|of|with|that|this|you|what|how)$/.test(w)).length;

  const ranked = (Object.entries(scores) as [Language, number][]).sort((a, b) => b[1] - a[1]);
  const [best, second] = ranked;
  if (best[1] < 2 || best[1] - second[1] < 1) return { language: null, explicitRequest: false };
  // Pidgin mixes with English: needs at least two Pidgin markers to win.
  if (best[0] === "en" && scores.pidgin >= 2) return { language: "pidgin", explicitRequest: false };
  return { language: best[0], explicitRequest: false };
}
