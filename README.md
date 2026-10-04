# Vital AI

Conversational post-discharge follow-up assistant for Nigerian patients — web chat, browser voice and BimpeAI phone calls — in English, Pidgin, Yoruba, Igbo and Hausa. Hackathon demo.

## Run the demo

1. `npm install`
2. Copy `.env.example` to `.env` and set `BIMPEAI_API_KEY`, `BIMPE_AGENT_ID` and `BIMPE_WORKFLOW_ID`. Optional: `DEMO_PATIENT_PHONE` to pre-fill the demo patients' phone number. Keys stay server-side.
3. `npm run dev` — starts the API (port 3001) and the web app together.
4. Open **http://localhost:5173**

Check the Bimpe connection with `npm run bimpe:diagnose -- --send`.

## How it works

```
Web text ─┐
Voice ────┼─► conversation layer ─► LOCAL RED-FLAG CHECK ─┬─ urgent → emergency reply + CRITICAL escalation (no AI)
Phone ────┘   (server/services/      (safety.ts)           └─ normal → BimpeAI agent (context + memory)
               conversation.ts)                                        → output validation → reply
                                                                       → safe local fallback on any failure
```

- **Same brain for every channel.** `/api/chat` (text and voice) uses `conversation.ts`. Phone calls are conducted by the Bimpe agent; the server polls each call's transcript and runs every patient turn through the same red-flag detector, escalating with `channel: "phone"`.
- **Hard safety layer first.** Concept-based red-flag detection (chest pain, breathing difficulty, severe bleeding, fainting, seizures, stroke-like symptoms, sudden severe weakness, severe allergic reaction, self-harm, immediate danger, severe pain) with clause-level negation ("I don't have chest pain" ≠ emergency; "I don't usually have chest pain, but now it hurts badly" = emergency). Urgent messages are never sent to Bimpe.
- **Conversational AI with memory.** Each session keeps history, recovery/medication/symptom/appointment state, risk level and language. Bimpe gets the context and reports structured state in a hidden `[[STATE …]]` line that is stripped before display.
- **Output validation.** Replies with dosing, stop-medication, diagnosis, dismissive or delay-care wording are replaced with a safe local reply.
- **Languages.** Detected from the message; explicit requests ("Abeg make we talk Pidgin") switch immediately. Emergency messages exist in all five languages.

## Agent prompt

`server/data/agent-prompt.md` is the Bimpe workflow system prompt. Push changes with `npx tsx server/scripts/bimpe-update-prompt.ts` (backs up the current workflow to `server/data/` first).

## API

- `GET /api/health` — AI mode and Bimpe status (no secrets)
- `POST /api/chat` — `{ message, language, sessionId, patientId?, channel?: "web_text" | "web_voice" }`
- `POST /api/escalate` — `{ sessionId, language }`
- `GET /api/session/:id`
- `GET /api/patients` — DEMO DATA patients
- `POST /api/call` — `{ phoneNumber, patientId, purpose?, testCall? }` → starts a Bimpe outbound call
- `GET /api/call/:callId` — call status, transcript and any escalation

Errors return `{ "success": false, "error": "…" }`.

## Local fallback mode

Without Bimpe credentials (or if Bimpe fails, times out or returns an unsafe reply) the app uses predefined replies in all five languages. Red-flag detection and escalation always run locally.

Demo data is stored in `server/data/sessions.json`; delete it to reset case numbers.

> Vital AI provides general follow-up support and does not replace a healthcare professional. Yoruba, Igbo and Hausa text should be reviewed by native speakers before real-world use. Demo patients are fictional.
