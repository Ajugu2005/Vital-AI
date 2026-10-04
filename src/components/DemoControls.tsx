import type { Language } from "../types";

export interface Demo {
  label: string;
  language: Language;
  message: string;
  tone: "normal" | "urgent" | "lang";
}

export const DEMOS: Demo[] = [
  {
    label: "Normal Recovery",
    language: "en",
    tone: "normal",
    message:
      "I'm feeling much better since I left the hospital. I'm taking my medication as prescribed and I have a follow-up appointment next week.",
  },
  {
    label: "Urgent Symptoms",
    language: "en",
    tone: "urgent",
    message: "Since I got home, I've been having serious chest pain and it is becoming difficult to breathe.",
  },
  {
    label: "Pidgin Demo",
    language: "pidgin",
    tone: "lang",
    message: "I dey feel better since I comot hospital. I dey take my medicine like dem tell me.",
  },
  {
    label: "Yoruba Demo",
    language: "yoruba",
    tone: "lang",
    message: "Mo n rilara dara lati igba ti mo ti kuro ni ile-iwosan. Mo n mu oogun mi gẹgẹ bi wọn ṣe sọ fun mi.",
  },
  {
    label: "Igbo Demo",
    language: "igbo",
    tone: "lang",
    message: "Ahụ́ na-adị m mma kemgbe m hapụrụ ụlọ ọgwụ. Ana m aṅụ ọgwụ m dịka ha gwara m.",
  },
  {
    label: "Hausa Demo",
    language: "hausa",
    tone: "lang",
    message: "Ina jin sauƙi tun lokacin da na bar asibiti. Ina shan maganina kamar yadda aka umarce ni.",
  },
];

const toneClass: Record<Demo["tone"], string> = {
  normal: "border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  urgent: "border-red-300 bg-red-50 text-red-700 hover:bg-red-100",
  lang: "border-slate-300 bg-white text-slate-700 hover:bg-slate-100",
};

export default function DemoControls({ onRun, disabled }: { onRun: (d: Demo) => void; disabled: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-xs font-semibold tracking-wide text-slate-500 uppercase">Demo scenarios</span>
      {DEMOS.map((d) => (
        <button
          key={d.label}
          onClick={() => onRun(d)}
          disabled={disabled}
          className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:opacity-50 ${toneClass[d.tone]}`}
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}
