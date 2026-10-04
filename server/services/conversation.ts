// Vital AI conversation layer — the "same brain" for every channel (web text, browser voice, phone).
//
//   patient message → language → LOCAL RED-FLAG CHECK ─┬─ urgent → emergency reply + escalation (no AI)
//                                                       └─ normal → BimpeAI (with context + memory)
//                                                                 → output validation → reply
//                                                                 → local fallback on any failure
import { LANGUAGES, t, type Language } from "../../shared/i18n";
import type { Channel, SessionState } from "../../shared/types";
import { getPatient } from "../data/patients";
import {
  applyLocalAnalysis,
  applyModelState,
  buildAgentMessage,
  computeNext,
  computeRisk,
  isInLanguage,
  isSafeReply,
  localReply,
  parseAgentReply,
} from "./aiService";
import { askAgent, bimpeStatus } from "./bimpeClient";
import { detectLanguage } from "./language";
import { analyzeMessage, detectRedFlags } from "./safety";
import { addHistory, createCase, getSession, updateSession } from "./store";

const VALID = new Set(LANGUAGES.map((l) => l.code));
export const asLanguage = (v: unknown): Language | null => (VALID.has(v as Language) ? (v as Language) : null);

export interface PatientMessageInput {
  sessionId: string;
  text: string;
  channel: Channel;
  uiLanguage?: Language | null; // language selected in the UI, if any
  patientId?: string | null;
}

export interface PatientMessageResult {
  reply: string;
  urgent: boolean;
  redFlags: string[];
  caseId?: string;
  source: "bimpe" | "local";
  languageSwitched: boolean;
  session: SessionState;
}

/** Decides the language for this turn. Keeps the established language unless the patient clearly switches. */
function resolveLanguage(session: SessionState, text: string, uiLanguage: Language | null | undefined) {
  const before = session.language;
  const isFirstMessage = !session.history.some((h) => h.role === "patient");
  if (uiLanguage && uiLanguage !== session.language) session.language = uiLanguage; // selector changed

  const det = detectLanguage(text);
  let switched = false;
  if (det.language && det.language !== session.language) {
    // Explicit request, the very first message, or two messages in a row in the new language.
    if (det.explicitRequest || isFirstMessage || session.lastDetectedLanguage === det.language) {
      session.language = det.language;
      switched = true;
    }
  }
  session.lastDetectedLanguage = det.language;
  return { switched: switched || before !== session.language, explicit: det.explicitRequest };
}

export async function handlePatientMessage(input: PatientMessageInput): Promise<PatientMessageResult> {
  const session = getSession(input.sessionId, input.uiLanguage ?? "en", input.patientId ?? null);
  const patient = getPatient(session.patientId);
  if (patient && session.history.length === 0 && !input.uiLanguage) session.language = patient.preferredLanguage;

  const lang = resolveLanguage(session, input.text, input.uiLanguage);
  addHistory(session, { role: "patient", text: input.text, channel: input.channel });

  // 1. HARD SAFETY LAYER — always local, always first.
  const analysis = analyzeMessage(input.text);
  if (analysis.urgent) {
    const labels = analysis.redFlags.map((f) => f.label);
    session.symptoms = Array.from(new Set([...labels, ...session.symptoms]));
    session.symptomsReported = true;
    const reply = t(session.language, "urgent");
    addHistory(session, { role: "assistant", text: reply, channel: input.channel, source: "local" });
    const escalation = createCase(session, {
      reason: labels.join(", "),
      redFlags: labels,
      triggerText: input.text,
      channel: input.channel,
    });
    console.log(`[safety] RED FLAG (${labels.join(", ")}) in session ${session.id} → ${escalation.caseId}; Bimpe NOT called`);
    updateSession(session);
    return { reply, urgent: true, redFlags: labels, caseId: escalation.caseId, source: "local", languageSwitched: lang.switched, session };
  }

  // 2. Provisional state from keywords (also the fallback if the AI is unavailable).
  applyLocalAnalysis(session, analysis);

  // 3. Conversational AI with context + memory.
  let reply: string | null = null;
  let source: "bimpe" | "local" = "local";
  if (bimpeStatus().configured) {
    const raw = await askAgent(
      session,
      buildAgentMessage({ session, patient, message: input.text, analysis, languageSwitched: lang.switched }),
    );
    let parsedRaw = raw;
    // If the agent answered in the wrong language, ask once for a rewrite in the active language.
    if (raw && !isInLanguage(parseAgentReply(raw).reply, session.language)) {
      const label = LANGUAGES.find((l) => l.code === session.language)?.label ?? session.language;
      console.log(`[lang] reply not in ${session.language}; asking agent to rewrite`);
      parsedRaw =
        (await askAgent(
          session,
          `[Vital AI context — internal: your last reply was not in ${label}. Rewrite that same reply in ${label} only, naturally, and keep the final [[STATE ...]] line. Do not mention this request.]`,
        )) ?? raw;
    }
    if (parsedRaw) {
      const parsed = parseAgentReply(parsedRaw);
      if (parsed.state) applyModelState(session, parsed.state);
      if (!isSafeReply(parsed.reply)) {
        console.warn(`[safety] Bimpe reply failed output validation in session ${session.id}; using safe local reply.`);
      } else if (detectRedFlags(parsed.reply).urgent && !/112|767|emergency|immediate/i.test(parsed.reply)) {
        console.warn(`[safety] Bimpe reply mentions a red-flag symptom without urgent-care advice; using local reply.`);
      } else if (!isInLanguage(parsed.reply, session.language)) {
        console.warn(`[lang] Bimpe reply not in ${session.language}; using local translation.`);
      } else {
        reply = parsed.reply;
        source = "bimpe";
      }
    }
  }

  // 4. Safe local fallback.
  if (!reply) reply = localReply(session, analysis);

  session.pendingQuestion = computeNext(session);
  session.riskLevel = computeRisk(session);
  if (session.status !== "escalated") {
    session.followUpStatus = "routine_follow_up";
    session.status = session.pendingQuestion === null ? "completed" : "active";
  }
  addHistory(session, { role: "assistant", text: reply, channel: input.channel, source });
  updateSession(session);
  return { reply, urgent: false, redFlags: [], source, languageSwitched: lang.switched, session };
}

/** Manual escalation (button in the UI). Reuses the same case record. */
export function escalateSession(sessionId: string, language: Language | null, channel: Channel, reason?: string) {
  const session = getSession(sessionId, language ?? "en");
  if (language) session.language = language;
  const escalation = createCase(session, {
    reason: reason || "Patient requested a healthcare professional",
    redFlags: reason ? [reason] : ["Patient requested a healthcare professional"],
    triggerText: "",
    channel,
  });
  escalation.status = "clinician_notified";
  session.status = "escalated";
  session.followUpStatus = "escalation_required";
  session.riskLevel = "critical";
  const message = t(session.language, "escalated", { caseId: escalation.caseId });
  addHistory(session, { role: "system", text: message, channel });
  updateSession(session);
  return { escalation, message, session };
}
