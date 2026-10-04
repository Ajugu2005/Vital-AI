// Outbound phone follow-up through BimpeAI telephony.
// The Bimpe agent conducts the call itself (its workflow prompt carries the same safety rules).
// Vital AI adds its own LOCAL safety layer on top: while the call runs, it polls the call
// transcript and scans every patient turn with the same red-flag detector used for web chat,
// creating an escalation case (channel: phone) if anything urgent is said.
import type { SessionState } from "../../shared/types";
import { getPatient } from "../data/patients";
import { describeError, getCall, startCall } from "./bimpeClient";
import { detectRedFlags } from "./safety";
import { addHistory, createCase, findSession, getSession, updateSession } from "./store";

export const DEFAULT_PURPOSE =
  "Follow up with the patient after hospital discharge to check recovery, medication adherence, new or worsening symptoms, and follow-up appointment status. This is a supportive healthcare follow-up and does not replace care from a healthcare professional.";

const POLL_MS = 8_000;
const MAX_MONITOR_MS = 30 * 60_000;
const FINAL = new Set(["ended", "busy", "failed", "cancelled"]);
const monitors = new Set<string>();

/** Accepts +234…, 234…, or Nigerian local 0XXXXXXXXXX; returns E.164 or null. */
export function normalizePhone(input: unknown): string | null {
  if (typeof input !== "string") return null;
  let p = input.replace(/[\s\-().]/g, "");
  if (/^0\d{10}$/.test(p)) p = "+234" + p.slice(1);
  else if (/^234\d{10}$/.test(p)) p = "+" + p;
  return /^\+[1-9]\d{7,14}$/.test(p) ? p : null;
}

const mask = (e164: string) => e164.slice(0, 4) + "•".repeat(Math.max(0, e164.length - 7)) + e164.slice(-3);

export class CallError extends Error {
  constructor(
    message: string,
    public httpStatus: number,
  ) {
    super(message);
  }
}

export async function startPatientCall(opts: { phoneNumber: unknown; patientId?: unknown; purpose?: unknown; testCall?: unknown }) {
  const destination = normalizePhone(opts.phoneNumber);
  if (!destination) throw new CallError("Enter a valid phone number, e.g. +2348012345678 or 08012345678.", 400);
  const patient = getPatient(typeof opts.patientId === "string" ? opts.patientId : null);
  if (opts.patientId && !patient) throw new CallError("Unknown patient.", 404);
  const purpose = typeof opts.purpose === "string" && opts.purpose.trim() ? opts.purpose.trim().slice(0, 500) : DEFAULT_PURPOSE;
  const isTestCall = opts.testCall !== false; // test mode unless explicitly disabled

  let result;
  try {
    result = await startCall(destination, isTestCall);
  } catch (err) {
    throw new CallError(`Unable to initiate call: ${describeError(err)}`, 502);
  }
  if (result.status !== "initiated" || !result.callId) {
    throw new CallError(`Unable to initiate call (${result.status}${result.detail ? `: ${result.detail}` : ""}).`, 502);
  }

  const session = getSession(`call-${result.callId}`, patient?.preferredLanguage ?? "en", patient?.id ?? null);
  session.call = {
    callId: result.callId,
    status: "initiated",
    isTestCall,
    purpose,
    destinationMasked: mask(destination),
    startedAt: new Date().toISOString(),
    durationSeconds: null,
    endReason: null,
    scannedLogIds: [],
  };
  addHistory(session, { role: "system", text: `Outbound ${isTestCall ? "test " : ""}call started (${purpose})`, channel: "phone" });
  updateSession(session);
  monitorCall(session.id);
  return session;
}

/** Pulls the latest call state + transcript from Bimpe and runs the local safety layer on new patient turns. */
export async function refreshCall(sessionId: string): Promise<SessionState | null> {
  const session = findSession(sessionId);
  if (!session?.call) return session;
  const detail = await getCall(session.call.callId);
  session.call.status = detail.status;
  session.call.durationSeconds = detail.duration_seconds;
  session.call.endReason = detail.end_reason ?? detail.error_reason;

  for (const log of detail.conversation_logs ?? []) {
    if (session.call.scannedLogIds.includes(log.id) || !log.message) continue;
    session.call.scannedLogIds.push(log.id);
    const isPatient = !/assistant|agent|bot|system/i.test(log.role);
    addHistory(session, { role: isPatient ? "patient" : "assistant", text: log.message, channel: "phone", source: isPatient ? undefined : "bimpe" });
    if (!isPatient) continue;
    const red = detectRedFlags(log.message);
    if (red.urgent) {
      const labels = red.flags.map((f) => f.label);
      session.symptoms = Array.from(new Set([...labels, ...session.symptoms]));
      session.symptomsReported = true;
      const e = createCase(session, { reason: labels.join(", "), redFlags: labels, triggerText: log.message, channel: "phone" });
      console.log(`[safety] RED FLAG on call ${session.call.callId} (${labels.join(", ")}) → ${e.caseId}`);
    }
  }
  updateSession(session);
  return session;
}

function monitorCall(sessionId: string) {
  if (monitors.has(sessionId)) return;
  monitors.add(sessionId);
  const started = Date.now();
  const tick = async () => {
    try {
      const s = await refreshCall(sessionId);
      if (!s?.call || FINAL.has(s.call.status) || Date.now() - started > MAX_MONITOR_MS) {
        monitors.delete(sessionId);
        if (s?.call) console.log(`[call] ${s.call.callId} finished monitoring: ${s.call.status}`);
        return;
      }
    } catch (err) {
      console.warn(`[call] monitor error: ${describeError(err)}`);
    }
    setTimeout(tick, POLL_MS);
  };
  setTimeout(tick, POLL_MS);
}
