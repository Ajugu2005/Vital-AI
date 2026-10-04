import type { Language } from "../../shared/i18n";
export type { Language };
export type { ChatResponse, SessionState, EscalationCase, DemoPatient } from "../../shared/types";

export interface ChatMessage {
  id: string;
  role: "assistant" | "patient" | "system";
  text: string;
  urgent?: boolean;
  caseId?: string;
  language?: Language;
  viaVoice?: boolean;
}
