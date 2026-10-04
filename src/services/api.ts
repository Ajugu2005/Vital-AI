import type { ChatResponse, DemoPatient, Language, SessionState } from "../types";

async function request<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, body === undefined ? undefined : {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `Request failed (${res.status})`);
  return data as T;
}

export interface CallResponse {
  success: boolean;
  callId: string;
  status: string;
  isTestCall?: boolean;
  sessionId?: string;
  session: SessionState | null;
}

export const api = {
  health: () => request<{ status: string; service: string; aiMode?: string }>("/api/health"),
  chat: (message: string, language: Language, sessionId: string, opts: { patientId?: string | null; channel?: "web_text" | "web_voice" } = {}) =>
    request<ChatResponse>("/api/chat", { message, language, sessionId, patientId: opts.patientId ?? undefined, channel: opts.channel ?? "web_text" }),
  escalate: (sessionId: string, language: Language) =>
    request<{ caseId: string; status: string; message: string; session: SessionState }>("/api/escalate", { sessionId, language }),
  patients: () => request<{ patients: DemoPatient[]; defaultPurpose: string }>("/api/patients"),
  call: (body: { phoneNumber: string; patientId: string; purpose: string; testCall: boolean }) => request<CallResponse>("/api/call", body),
  callStatus: (callId: string) => request<CallResponse>(`/api/call/${encodeURIComponent(callId)}`),
};
