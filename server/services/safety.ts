// Deterministic, rule-based analysis of patient messages.
// Red-flag detection ALWAYS runs locally before any AI is involved — it never depends on Bimpe.
// It works on symptom *concepts* (body part + distress wording) per clause, with negation handling,
// plus phrase lists for Pidgin, Yoruba, Igbo and Hausa. This is escalation logic, not diagnosis.

export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip tone marks / dots (ẹ→e, ụ→u, ṣ→s)
    .replace(/ƙ/g, "k")
    .replace(/ɗ/g, "d")
    .replace(/ɓ/g, "b")
    .replace(/[’‘`]/g, "'")
    .toLowerCase();
}

export interface RedFlag {
  id: string;
  label: string;
}

interface FlagRule extends RedFlag {
  patterns: RegExp[];
  phrases?: string[]; // multilingual fixed phrases
}

const W = "[^.!?;]"; // any char within a sentence

const RULES: FlagRule[] = [
  {
    id: "chest_pain",
    label: "Chest pain",
    patterns: [
      new RegExp(`\\bchest\\b${W}{0,40}?\\b(pain\\w*|hurt\\w*|ach\\w*|squeez\\w*|tight\\w*|pressure|heav\\w*|crush\\w*|burn\\w*|press\\w*)`),
      new RegExp(`\\b(pain|pains|ache|tightness|pressure|squeezing|heaviness|discomfort)\\b${W}{0,15}\\b(in|on|around|across)\\b${W}{0,10}\\bchest\\b`),
      /\bheart\b[^.!?;]{0,15}\b(pain\w*|hurt\w*)/,
    ],
    phrases: [
      "aya mi n dun", "aya n dun", "irora aya", "aya mi dun",
      "obi na-egbu m mgbu", "obi m na-egbu", "mgbu n'obi", "mgbu na obi",
      "ciwon kirji", "kirji na ciwo", "kirjina na ciwo", "kirjina yana ciwo",
    ],
  },
  {
    id: "breathing",
    label: "Difficulty breathing",
    patterns: [
      new RegExp(`\\b(can't|cant|cannot|can not|unable to|couldn't|struggl\\w*|hard to|difficult|difficulty|trouble|problem\\w*|hardly|barely|no fit|not able to)\\b${W}{0,20}\\bbreath\\w*`),
      new RegExp(`\\bbreath\\w*\\b${W}{0,25}\\b(hard|difficult\\w*|struggl\\w*|short|shallow|tight\\w*|cut\\w*|labou?red|bad|worse|stopp\\w*|heavy)`),
      /\b(short(ness)? of breath|breathless\w*|out of breath|gasping|catch my breath|choking|suffocat\w*)\b/,
    ],
    phrases: [
      "breath dey cut", "breath dey hold me", "air no dey",
      "mi o le mi", "emi n kuru", "mimi n le",
      "enweghi m ike iku ume", "anaghi m eku ume", "iku ume na-esiri m ike", "ume na-esiri m ike",
      "wahalar numfashi", "ba na iya numfashi", "numfashi na wahala", "numfashi yana wahala",
    ],
  },
  {
    id: "bleeding",
    label: "Severe bleeding",
    patterns: [
      new RegExp(`\\b(bleed\\w*|blood)\\b${W}{0,25}\\b(heav\\w*|a lot|lots|plenty|won't stop|wont stop|not stopp\\w*|no gree stop|too much|soak\\w*|everywhere|pouring|gushing|non-?stop)`),
      new RegExp(`\\b(heav\\w*|severe\\w*|lots of|a lot of|plenty|serious\\w*)\\b${W}{0,10}\\b(bleed\\w*|blood)\\b`),
      new RegExp(`\\b(cough\\w*|vomit\\w*|throw\\w* up|spit\\w*)\\b${W}{0,15}\\bblood\\b`),
    ],
    phrases: ["blood dey commot", "blood dey comot", "eje n jade", "eje pupo", "obara na-agba", "obara buru ibu", "zubar jini", "jini mai yawa", "jini na zuba"],
  },
  {
    id: "consciousness",
    label: "Fainting / loss of consciousness",
    patterns: [/\b(passed out|pass out|fainted|faint\w*|blacked out|black out|collaps\w*|unconscious\w*|lost consciousness|loss of consciousness|knocked out)\b/],
    phrases: ["i faint", "i don faint", "mo daku", "daku", "dara mba", "na suma", "suma"],
  },
  {
    id: "seizure",
    label: "Seizure / fits",
    patterns: [/\b(seizure\w*|convuls\w*|fitting)\b/, /\b(having|had|have|get|getting|got|dey get)\b[^.!?;]{0,8}\b(a )?fits?\b/, /\bjerking\b[^.!?;]{0,20}\b(uncontrol\w*|can't stop)/],
    phrases: ["gilegile", "warapa", "farfadiya", "akwukwu"],
  },
  {
    id: "stroke",
    label: "Stroke-like symptoms",
    patterns: [
      new RegExp(`\\bface\\b${W}{0,25}\\b(droop\\w*|weak\\w*|numb\\w*|twist\\w*|drag\\w*|paraly\\w*|crooked|fall\\w*)`),
      new RegExp(`\\b(speech|talk\\w*|speak\\w*|words)\\b${W}{0,25}\\b(slur\\w*|strange|funny|weird|not clear|unclear|jumbled|can't come out)`),
      /\bslurr\w*\b/,
      new RegExp(`\\bone side\\b${W}{0,25}\\b(weak\\w*|numb\\w*|can't move|paraly\\w*|dead)`),
      new RegExp(`\\b(weak\\w*|numb\\w*)\\b${W}{0,15}\\bone side\\b`),
      new RegExp(`\\b(can't|cannot|unable to)\\b${W}{0,6}\\bmove\\b${W}{0,10}\\b(arm|leg|hand|side)`),
      /\bstroke\b/,
    ],
  },
  {
    id: "sudden_weakness",
    label: "Sudden severe weakness",
    patterns: [new RegExp(`\\b(sudden\\w*|severe\\w*|extreme\\w*)\\b${W}{0,15}\\bweak\\w*`), /\btoo weak to (stand|walk|move|get up)\b/],
  },
  {
    id: "allergic",
    label: "Severe allergic reaction",
    patterns: [
      new RegExp(`\\b(swell\\w*|swollen|puff\\w*)\\b${W}{0,25}\\b(face|lips?|tongue|throat|mouth)\\b`),
      new RegExp(`\\b(face|lips?|tongue|throat)\\b${W}{0,20}\\b(swell\\w*|swollen|closing)`),
      /\b(anaphyla\w*|severe allergic\w*)\b/,
    ],
  },
  {
    id: "self_harm",
    label: "Risk of self-harm",
    patterns: [/\b(kill myself|end my life|suicid\w*|harm myself|hurt myself|don't want to live|want to die)\b/],
  },
  {
    id: "danger",
    label: "Patient reports immediate danger",
    patterns: [/\b(immediate danger|in danger|i'm dying|i am dying|going to die|gonna die|i dey die|emergency|help me now|need help now|call (an |the )?ambulance)\b/],
  },
  {
    id: "severe_pain",
    label: "Severe or rapidly worsening symptoms",
    patterns: [
      new RegExp(`\\b(severe|unbearable|excruciating|worst|extreme)\\b${W}{0,15}\\bpain\\w*`),
      new RegExp(`\\bpain\\w*\\b${W}{0,20}\\b(unbearable|excruciating|getting worse (fast|quickly)|too much|don too much|dey too much)\\b`),
      new RegExp(`\\b(rapidly|quickly|very fast)\\b${W}{0,10}\\bworse\\w*`),
    ],
    phrases: ["irora nla", "irora to le", "mgbu siri ike", "ciwo mai tsanani"],
  },
];

const NEGATION = /\b(no|not|never|without|don't|dont|do not|doesn't|does not|didn't|did not|haven't|have not|hasn't|has not|isn't|is not|wasn't|was not|aren't|nor|neither|no longer|free of|denies)\b/;
// Wording where a negation word is part of the symptom itself ("won't stop bleeding", "can't breathe").
const SYMPTOM_NEGATIONS = /\b(won't|wont|will not|doesn't|does not|not|no gree|can't|cannot|can not|no fit|unable to|couldn't)\s+(stop\w*|breath\w*|catch|move|come out)/g;

/** Splits text into clauses so "I don't usually have chest pain, but now my chest hurts" is two clauses. */
function clauses(text: string): string[] {
  return text
    .split(/[.!?;\n]+|,|\b(?:but|however|although|though|except|yet|and|now|then|plus)\b/)
    .map((c) => c.trim())
    .filter(Boolean);
}

function isNegated(clause: string, index: number, matched: string): boolean {
  const before = clause.slice(Math.max(0, index - 40), index);
  if (NEGATION.test(before.split(/\s+/).slice(-6).join(" "))) return true;
  // Negation inside the match after the first word, e.g. "chest no dey pain", "breathing is not difficult".
  const rest = matched.replace(/^\S+/, "").replace(SYMPTOM_NEGATIONS, "");
  return NEGATION.test(rest);
}

function phraseHit(clause: string, phrase: string): number {
  const p = normalize(phrase);
  let i = clause.indexOf(p);
  while (i !== -1) {
    if (i === 0 || /[^a-z']/.test(clause[i - 1])) return i;
    i = clause.indexOf(p, i + 1);
  }
  return -1;
}

export interface RedFlagResult {
  urgent: boolean;
  flags: RedFlag[];
  evidence: string[]; // the clauses that triggered
}

/** Hard red-flag detection. Conservative: when in doubt it escalates. */
export function detectRedFlags(raw: string): RedFlagResult {
  const flags = new Map<string, RedFlag>();
  const evidence: string[] = [];
  for (const clause of clauses(normalize(raw))) {
    for (const rule of RULES) {
      if (flags.has(rule.id)) continue;
      let hit = false;
      for (const re of rule.patterns) {
        const m = re.exec(clause);
        if (m && !isNegated(clause, m.index, m[0])) {
          hit = true;
          break;
        }
      }
      if (!hit && rule.phrases) {
        for (const ph of rule.phrases) {
          const i = phraseHit(clause, ph);
          if (i !== -1 && !isNegated(clause, i, normalize(ph))) {
            hit = true;
            break;
          }
        }
      }
      if (hit) {
        flags.set(rule.id, { id: rule.id, label: rule.label });
        evidence.push(clause);
      }
    }
  }
  return { urgent: flags.size > 0, flags: [...flags.values()], evidence };
}

// ---------------------------------------------------------------------------------------------
// Lightweight keyword extraction for the follow-up sidebar. Used as a FALLBACK only — when Bimpe
// is available, the model reports the structured state itself (see aiService.ts).

function findTerm(text: string, terms: string[]): boolean {
  return terms.some((t) => {
    const nt = normalize(t);
    let idx = text.indexOf(nt);
    while (idx !== -1) {
      if (/[^a-z']/.test(idx === 0 ? " " : text[idx - 1])) return true;
      idx = text.indexOf(nt, idx + 1);
    }
    return false;
  });
}

const OTHER_SYMPTOMS: [string, string[]][] = [
  ["Dizziness", ["dizzy", "dizziness", "lightheaded", "light-headed", "head dey turn", "giddy"]],
  ["Weakness / tiredness", ["weak", "weakness", "tired", "fatigue", "no strength", "body dey weak"]],
  ["Headache", ["headache", "head dey pain", "my head hurts"]],
  ["Nausea / vomiting", ["nausea", "nauseous", "vomit", "throwing up", "feel sick"]],
  ["Fever", ["fever", "temperature", "hot body", "body dey hot"]],
  ["Cough", ["cough"]],
  ["Swelling", ["swelling", "swollen", "leg dey swell"]],
  ["Pain", ["pain", "hurting", "aching", "sore", "dey pain"]],
  ["Trouble sleeping", ["can't sleep", "cant sleep", "trouble sleeping", "no fit sleep"]],
];

export interface Analysis {
  urgent: boolean;
  urgentSymptoms: string[];
  redFlags: RedFlag[];
  recovery: "better" | "same" | "worse" | null;
  medication: "yes" | "no" | null;
  medicationQuestion: boolean;
  otherSymptoms: string[];
  noNewSymptoms: boolean;
  followUp: "scheduled" | "needs_help" | null;
  yes: boolean;
  no: boolean;
}

export function analyzeMessage(raw: string): Analysis {
  const red = detectRedFlags(raw);
  const text = ` ${normalize(raw)} `;
  const has = (terms: string[]) => findTerm(text, terms);

  const recovery = has([
    "not feeling well", "not feeling better", "not better", "feeling worse", "getting worse", "still sick", "still feel sick",
    "not improving", "body no dey well", "i no dey feel fine", "i no too dey well",
    "ara mi o ya", "ara mi ko ya", "ahu adighi m mma", "ba na jin sauki", "ban ji sauki",
  ])
    ? "worse"
    : has(["same as before", "about the same", "no change", "not much change", "same way"])
      ? "same"
      : has([
            "better", "feeling good", "feeling well", "feel fine", "feeling fine", "improving", "recovering well", "doing well",
            "i've been okay", "i have been okay", "i'm okay", "i am okay", "i dey fine", "i dey kampe", "body dey better",
            "rilara dara", "ara mi ti ya", "ara mi ya", "mo ti ya", "na-adi m mma", "adi m mma", "ahu di m mma",
            "jin sauki", "samun sauki", "ina lafiya",
          ])
        ? "better"
        : null;

  const medication = has(["haven't missed", "havent missed", "never missed", "not missed", "didn't miss", "did not miss"])
    ? "yes"
    : has([
          "not taking", "stopped taking", "stop taking", "forgot", "forget to take", "missed", "ran out", "haven't been taking",
          "havent been taking", "didn't take", "didnt take", "did not take", "skipped", "no dey take", "i don stop",
          "medicine don finish", "mi o mu oogun", "mi ko mu oogun", "anaghi m anu ogwu", "ba na shan magani",
        ])
      ? "no"
      : has([
            "taking my medication", "taking my medicine", "taking my meds", "taking the medication", "taking my tablets",
            "taking all my", "as prescribed", "as instructed", "take my medicine", "take my medication",
            "dey take my medicine", "dey take my drugs", "dey take the medicine",
            "mu oogun", "n lo oogun", "anu ogwu", "na-anu ogwu", "shan maganina", "shan magani", "ina shan",
          ])
        ? "yes"
        : null;

  const medicationQuestion =
    /\b(double|extra|increase|decrease|reduce|skip|stop|halve|how many|how much|change|more)\b[^.!?]{0,25}\b(dose|dosage|tablets?|pills?|medicine|medication|meds|drugs?)\b/.test(text);

  // Non-urgent symptoms, with the same clause-level negation as red flags ("I don't have chest pain" ≠ pain).
  const otherSymptoms = OTHER_SYMPTOMS.filter(([, terms]) =>
    clauses(normalize(raw)).some((c) =>
      terms.some((term) => {
        const i = phraseHit(c, term);
        return i !== -1 && !isNegated(c, i, normalize(term));
      }),
    ),
  ).map(([label]) => label);

  const noNewSymptoms = has([
    "no new symptoms", "no symptoms", "nothing new", "no problems", "no problem", "nothing concerning", "no new problem",
    "nothing worrying", "i no notice anything", "nothing dey worry me", "ko si ami", "enweghi ihe", "babu wata alama",
  ]);

  const followUp = has([
    "need help", "don't have an appointment", "dont have an appointment", "no appointment", "need an appointment",
    "help me book", "help me arrange", "i no get appointment", "need help with follow",
  ])
    ? "needs_help"
    : has(["appointment", "follow-up visit", "follow up visit", "clinic next", "see the doctor next", "see my doctor", "ipade", "nhoputa", "ranar ganin likita", "ganin likita"])
      ? "scheduled"
      : null;

  const yes = /^\s*(yes|yeah|yep|yes o|yes na|beeni|bee ni|ee|eh|ehh|okay|ok)\b/.test(text);
  const no = /^\s*(no|nope|no o|rara|mba|a'a|aa)\b/.test(text);

  return {
    urgent: red.urgent,
    urgentSymptoms: red.flags.map((f) => f.label),
    redFlags: red.flags,
    recovery,
    medication,
    medicationQuestion,
    otherSymptoms,
    noNewSymptoms,
    followUp,
    yes,
    no,
  };
}
