import type { Language } from "./i18n";

export type FollowUpField = "feeling" | "medication" | "symptoms" | "followUp";
export type Channel = "web_text" | "web_voice" | "phone";
export type RiskLevel = "routine" | "watch" | "critical";

/** DEMO DATA only — no real patient, medication, diagnosis or hospital information. */
export interface DemoPatient {
  id: string;
  name: string;
  phoneNumber: string;
  dischargeDate: string;
  preferredLanguage: Language;
  followUpDate: string;
  isDemo: true;
}

export interface EscalationCase {
  caseId: string; // escalation id, e.g. VL-2026-001
  sessionId: string;
  patientId: string | null;
  reason: string; // human-readable red flags
  redFlags: string[];
  triggerText: string;
  riskLevel: "CRITICAL";
  language: Language;
  channel: Channel;
  transcript: { role: string; text: string; at: string }[];
  createdAt: string;
  status: "case_created" | "clinician_notified";
}

export interface CallInfo {
  callId: string;
  status: string; // initiated | queued | ringing | answered | ended | busy | failed | cancelled
  isTestCall: boolean;
  purpose: string;
  destinationMasked: string;
  startedAt: string;
  durationSeconds: number | null;
  endReason: string | null;
  scannedLogIds: string[];
}

export interface HistoryEntry {
  role: "patient" | "assistant" | "system";
  text: string;
  at: string;
  channel: Channel;
  source?: "bimpe" | "local";
}

export interface SessionState {
  id: string;
  patientId: string | null;
  language: Language;
  status: "active" | "escalated" | "completed";
  followUpStatus: "in_progress" | "routine_follow_up" | "escalation_required";
  riskLevel: RiskLevel;
  recovery: string; // e.g. "Improving", "About the same", "Not improving", "Not yet reported"
  medication: string; // e.g. "Taking as instructed", "Missed a dose", "Having problems", "Not yet reported"
  symptoms: string[];
  symptomsReported: boolean;
  appointment: string; // e.g. "Scheduled", "Needs help arranging", "Not yet reported"
  appointmentNote?: string;
  pendingQuestion: FollowUpField | null;
  escalation: EscalationCase | null;
  history: HistoryEntry[];
  bimpeConversationId?: string;
  lastDetectedLanguage?: Language | null;
  call?: CallInfo;
  createdAt: string;
  updatedAt: string;
}

export interface ChatResponse {
  reply: string;
  riskLevel: "normal" | "urgent";
  status: "routine_follow_up" | "escalation_required";
  escalated: boolean;
  caseId?: string;
  redFlags?: string[];
  source: "bimpe" | "local";
  session: SessionState;
}
