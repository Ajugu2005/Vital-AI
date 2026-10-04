// Server-side BimpeAI client (official @bimpeai/sdk).
// The API key is read from the environment here and never leaves the server.
import { randomUUID } from "node:crypto";
import { BimpeAI, ApiError } from "@bimpeai/sdk";

const AGENT_NAME = "Vital AI";
const REPLY_TIMEOUT_MS = 25_000;
const POLL_INTERVAL_MS = 1_000;

export interface BimpeStatus {
  configured: boolean;
  available: boolean | null; // null = not yet tested
  agentId: string | null;
  agentName: string | null;
  lastError: string | null;
}

const status: BimpeStatus = { configured: false, available: null, agentId: null, agentName: null, lastError: null };
let client: BimpeAI | null = null;
const conversations = new Map<string, string>(); // our sessionId -> Bimpe conversation id

const apiKey = () => process.env.BIMPEAI_API_KEY || process.env.BIMPE_API_KEY || "";

export function getClient(): BimpeAI | null {
  if (client) return client;
  const key = apiKey();
  if (!key) return null;
  client = new BimpeAI({
    apiKey: key,
    baseUrl: process.env.BIMPE_API_URL || "https://api.bimpe.ai",
    timeout: 20_000,
    maxRetries: 1,
  });
  return client;
}

/** Describes an error without ever including credentials. */
export function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { message?: unknown; errors?: unknown; details?: unknown } | undefined;
    const extra = body?.errors ?? body?.details;
    const msg =
      (typeof body?.message === "string" ? `: ${body.message.slice(0, 160)}` : "") +
      (extra ? ` ${JSON.stringify(extra).slice(0, 300)}` : "");
    return `${err.constructor.name} (HTTP ${err.status}${err.code ? `, ${err.code}` : ""})${msg}`;
  }
  if (err instanceof Error) return `${err.constructor.name}: ${err.message.replace(/sk_[A-Za-z0-9_-]+/g, "sk_***")}`;
  return "Unknown error";
}

/** Uses BIMPE_AGENT_ID if set, otherwise finds the agent named "Vital AI". */
export async function resolveAgent(): Promise<string | null> {
  status.configured = Boolean(apiKey());
  if (status.agentId) return status.agentId;
  const bimpe = getClient();
  if (!bimpe) return null;

  try {
    const fromEnv = process.env.BIMPE_AGENT_ID;
    if (fromEnv) {
      const agent = await bimpe.agents.retrieve(fromEnv);
      status.agentId = agent.id;
      status.agentName = agent.name;
    } else {
      // Several agents can share a name; prefer one that has a workflow attached.
      let best: { id: string; name: string; workflow_id: string | null } | null = null;
      for await (const agent of bimpe.agents.list({ search: AGENT_NAME, limit: 50 })) {
        if (agent.name.trim().toLowerCase() !== AGENT_NAME.toLowerCase()) continue;
        if (!best || (!best.workflow_id && agent.workflow_id)) best = agent;
      }
      if (best) {
        status.agentId = best.id;
        status.agentName = best.name;
      }
      if (!status.agentId) throw new Error(`No agent named "${AGENT_NAME}" found for this API key`);
    }
    status.available = true;
    status.lastError = null;
    return status.agentId;
  } catch (err) {
    status.available = false;
    status.lastError = describeError(err);
    console.warn("BimpeAI agent lookup failed:", status.lastError);
    return null;
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Sends one patient message to the Vital AI agent and waits for the agent's reply.
 * Returns null on any failure or timeout so the caller can use the local fallback.
 */
export async function askAgent(
  session: { id: string; bimpeConversationId?: string },
  message: string,
): Promise<string | null> {
  const bimpe = getClient();
  const agentId = await resolveAgent();
  if (!bimpe || !agentId) return null;
  const sessionId = session.id;

  const deadline = Date.now() + REPLY_TIMEOUT_MS;
  console.log(`[bimpe] sending non-urgent message for session ${sessionId}`);
  try {
    // One Bimpe conversation per Vital AI session, so the agent keeps its own memory too.
    let conversationId = session.bimpeConversationId ?? conversations.get(sessionId);
    let sent: { id: string; role: string; message: string | null; created_at: string; conversation_id?: string };

    if (conversationId) {
      sent = await bimpe.conversations.messages.send(agentId, conversationId, { message, role: "user" });
    } else {
      const channelUserId = randomUUID(); // Bimpe webchat requires a UUID per end user
      sent = await bimpe.conversations.send(agentId, {
        message,
        role: "user",
        channel_type: "webchat",
        channel_user_id: channelUserId,
        channel_username: "Vital AI patient",
        is_test_channel: true,
      });
      conversationId = sent.conversation_id;
      if (!conversationId) {
        // The created message may not include its conversation id; look it up by channel address.
        const page = await bimpe.conversations.list(agentId, { channel: "test_webchat", search: channelUserId, limit: 5 });
        conversationId = page.data.find((c) => c.channel_user_id === channelUserId)?.id ?? page.data[0]?.id;
      }
      if (!conversationId) throw new Error("Could not determine Bimpe conversation id");
      conversations.set(sessionId, conversationId);
      session.bimpeConversationId = conversationId;
    }

    // The API normally returns the agent's reply directly.
    if (sent.role === "assistant" && sent.message) {
      status.available = true;
      status.lastError = null;
      return sent.message;
    }

    // Otherwise poll for the agent's reply.
    const sentAt = Date.parse(sent.created_at) || Date.now() - 1000;
    while (Date.now() < deadline) {
      await sleep(POLL_INTERVAL_MS);
      const page = await bimpe.conversations.messages.list(agentId, conversationId, { limit: 10, sort: "-created_at" });
      const reply = page.data
        .filter((m) => m.role === "assistant" && m.message && m.id !== sent.id && Date.parse(m.created_at) >= sentAt)
        .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))[0];
      if (reply?.message) {
        status.available = true;
        status.lastError = null;
        return reply.message;
      }
    }
    throw new Error(`No agent reply within ${REPLY_TIMEOUT_MS / 1000}s`);
  } catch (err) {
    status.available = false;
    status.lastError = describeError(err);
    console.warn("BimpeAI unavailable, using local fallback:", status.lastError);
    return null;
  }
}

export function bimpeStatus(): BimpeStatus {
  status.configured = Boolean(apiKey());
  return { ...status };
}

export const aiMode = () => {
  const s = bimpeStatus();
  return s.configured && s.available !== false ? "bimpe" : "local";
};

// ---------------------------------------------------------------------------------------------
// Telephony (outbound calls are conducted by the Bimpe agent itself)

export interface CallStartResult {
  status: "initiated" | "busy" | "failed";
  callId: string | null;
  detail: string | null;
}

export async function startCall(destination: string, isTestCall: boolean): Promise<CallStartResult> {
  const bimpe = getClient();
  const agentId = await resolveAgent();
  if (!bimpe || !agentId) throw new Error("BimpeAI is not configured");
  console.log(`[bimpe] starting outbound ${isTestCall ? "TEST " : ""}call to ${destination.slice(0, 5)}…`);
  // maxRetries: 0 — a retried call request could ring the patient twice.
  const r = await bimpe.calls.make(agentId, { destination, is_test_call: isTestCall }, { maxRetries: 0, timeout: 20_000 });
  return { status: r.status, callId: r.call_id ?? null, detail: r.detail ?? null };
}

export async function getCall(callId: string) {
  const bimpe = getClient();
  const agentId = await resolveAgent();
  if (!bimpe || !agentId) throw new Error("BimpeAI is not configured");
  return bimpe.calls.retrieve(agentId, callId);
}
