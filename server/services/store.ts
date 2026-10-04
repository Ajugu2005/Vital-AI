// Simple local JSON-file store for demo sessions and escalation cases.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Language } from "../../shared/i18n";
import type { Channel, EscalationCase, HistoryEntry, SessionState } from "../../shared/types";

const DATA_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "data", "sessions.json");
const MAX_HISTORY = 60;

interface Db {
  sessions: Record<string, SessionState>;
  cases: EscalationCase[];
}

function load(): Db {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as Db;
  } catch {
    return { sessions: {}, cases: [] };
  }
}

const db: Db = load();

function save() {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2));
  } catch (err) {
    console.warn("Could not persist demo data:", err);
  }
}

export function getSession(id: string, language: Language = "en", patientId: string | null = null): SessionState {
  const now = new Date().toISOString();
  if (!db.sessions[id]) {
    db.sessions[id] = {
      id,
      patientId,
      language,
      status: "active",
      followUpStatus: "in_progress",
      riskLevel: "routine",
      recovery: "Not yet reported",
      medication: "Not yet reported",
      symptoms: [],
      symptomsReported: false,
      appointment: "Not yet reported",
      pendingQuestion: "feeling",
      escalation: null,
      history: [],
      createdAt: now,
      updatedAt: now,
    };
  }
  const s = db.sessions[id];
  // Back-fill sessions saved by older versions.
  s.history ??= [];
  s.riskLevel ??= s.status === "escalated" ? "critical" : "routine";
  s.patientId ??= patientId;
  s.createdAt ??= s.updatedAt ?? now;
  if (patientId && !s.patientId) s.patientId = patientId;
  return s;
}

export function findSession(id: string): SessionState | null {
  return db.sessions[id] ? getSession(id) : null;
}

export function addHistory(session: SessionState, entry: Omit<HistoryEntry, "at">) {
  session.history.push({ ...entry, at: new Date().toISOString() });
  if (session.history.length > MAX_HISTORY) session.history.splice(0, session.history.length - MAX_HISTORY);
}

export function updateSession(session: SessionState) {
  session.updatedAt = new Date().toISOString();
  db.sessions[session.id] = session;
  save();
}

export interface CaseInput {
  reason: string;
  redFlags?: string[];
  triggerText?: string;
  channel?: Channel;
}

/** Creates the session's escalation case, or adds new red flags to the existing one. */
export function createCase(session: SessionState, input: CaseInput): EscalationCase {
  const transcript = session.history.slice(-12).map(({ role, text, at }) => ({ role, text, at }));
  if (session.escalation) {
    const e = session.escalation;
    const newFlags = (input.redFlags ?? []).filter((f) => !e.redFlags.includes(f));
    if (newFlags.length) {
      e.redFlags.push(...newFlags);
      e.reason = e.redFlags.join(", ");
    }
    e.transcript = transcript;
    updateSession(session);
    return e;
  }
  const year = new Date().getFullYear();
  const escalation: EscalationCase = {
    caseId: `VL-${year}-${String(db.cases.length + 1).padStart(3, "0")}`,
    sessionId: session.id,
    patientId: session.patientId,
    reason: input.reason,
    redFlags: input.redFlags ?? [],
    triggerText: input.triggerText ?? "",
    riskLevel: "CRITICAL",
    language: session.language,
    channel: input.channel ?? "web_text",
    transcript,
    createdAt: new Date().toISOString(),
    status: "case_created",
  };
  db.cases.push(escalation);
  session.escalation = escalation;
  session.status = "escalated";
  session.followUpStatus = "escalation_required";
  session.riskLevel = "critical";
  updateSession(session);
  return escalation;
}

export function listCases() {
  return db.cases;
}
