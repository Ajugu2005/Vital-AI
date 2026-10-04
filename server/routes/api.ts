import { Router, type Response } from "express";
import type { Channel, ChatResponse } from "../../shared/types";
import { listPatients } from "../data/patients";
import { aiMode, bimpeStatus } from "../services/bimpeClient";
import { CallError, DEFAULT_PURPOSE, refreshCall, startPatientCall } from "../services/calls";
import { asLanguage, escalateSession, handlePatientMessage } from "../services/conversation";
import { findSession, getSession, listCases } from "../services/store";

const router = Router();
const fail = (res: Response, status: number, error: string) => res.status(status).json({ success: false, error });
const asChannel = (v: unknown): Channel => (v === "web_voice" || v === "phone" ? v : "web_text");

router.get("/health", (_req, res) => {
  const bimpe = bimpeStatus();
  // No secrets here: only booleans and a sanitized error class / HTTP status.
  res.json({
    status: "ok",
    service: "Vital AI",
    aiMode: aiMode(),
    bimpeConfigured: bimpe.configured,
    bimpeAvailable: bimpe.available,
    bimpeAgentFound: Boolean(bimpe.agentId),
    bimpeLastError: bimpe.lastError,
  });
});

// Web text + browser voice share this endpoint and the same conversation layer.
router.post("/chat", async (req, res) => {
  const { message, language, sessionId, patientId, channel } = req.body ?? {};
  if (typeof message !== "string" || !message.trim()) return fail(res, 400, "message is required");
  if (message.length > 2000) return fail(res, 413, "message is too long");
  try {
    const r = await handlePatientMessage({
      sessionId: typeof sessionId === "string" && sessionId ? sessionId : "demo",
      text: message.trim(),
      channel: asChannel(channel),
      uiLanguage: asLanguage(language),
      patientId: typeof patientId === "string" ? patientId : null,
    });
    const escalated = r.session.status === "escalated";
    const body: ChatResponse = {
      reply: r.reply,
      riskLevel: r.urgent ? "urgent" : "normal",
      status: escalated ? "escalation_required" : "routine_follow_up",
      escalated,
      caseId: r.caseId ?? r.session.escalation?.caseId,
      redFlags: r.redFlags,
      source: r.source,
      session: r.session,
    };
    res.json(body);
  } catch (err) {
    console.error("chat failed:", err);
    fail(res, 500, "Unable to process the message. If this is an emergency, call 112 or 767 now.");
  }
});

router.post("/escalate", (req, res) => {
  const { sessionId, language, reason, channel } = req.body ?? {};
  const { escalation, message, session } = escalateSession(
    typeof sessionId === "string" && sessionId ? sessionId : "demo",
    asLanguage(language),
    asChannel(channel),
    typeof reason === "string" ? reason : undefined,
  );
  res.json({ success: true, caseId: escalation.caseId, status: "escalation_required", riskLevel: "CRITICAL", message, session });
});

router.get("/session/:id", (req, res) => {
  res.json(getSession(req.params.id));
});

router.get("/cases", (_req, res) => {
  res.json(listCases());
});

// DEMO DATA patients.
router.get("/patients", (_req, res) => {
  res.json({ success: true, demo: true, patients: listPatients(), defaultPurpose: DEFAULT_PURPOSE });
});

// Outbound phone follow-up via BimpeAI telephony.
router.post("/call", async (req, res) => {
  const { phoneNumber, patientId, purpose, testCall } = req.body ?? {};
  if (!bimpeStatus().configured) return fail(res, 503, "BimpeAI is not configured on the server.");
  try {
    const session = await startPatientCall({ phoneNumber, patientId, purpose, testCall });
    res.json({ success: true, callId: session.call!.callId, status: session.call!.status, isTestCall: session.call!.isTestCall, sessionId: session.id, session });
  } catch (err) {
    if (err instanceof CallError) return fail(res, err.httpStatus, err.message);
    console.error("call failed:", err);
    fail(res, 500, "Unable to initiate call");
  }
});

router.get("/call/:callId", async (req, res) => {
  const sessionId = `call-${req.params.callId}`;
  if (!findSession(sessionId)) return fail(res, 404, "Call not found");
  try {
    const session = await refreshCall(sessionId);
    res.json({ success: true, callId: req.params.callId, status: session?.call?.status, session });
  } catch {
    // Bimpe unreachable: return the last known state rather than failing the UI.
    res.json({ success: true, stale: true, callId: req.params.callId, status: findSession(sessionId)?.call?.status, session: findSession(sessionId) });
  }
});

export default router;
