// Read-only: retrieves recent Bimpe calls and runs the local red-flag detector over patient turns.
// Prints roles and red-flag results only (no phone numbers, no key). Run: npx tsx server/scripts/bimpe-call-inspect.ts
import "dotenv/config";
import { describeError, getClient } from "../services/bimpeClient";
import { detectRedFlags } from "../services/safety";

const bimpe = getClient()!;
const agentId = process.env.BIMPE_AGENT_ID!;
try {
  const page = await bimpe.calls.list(agentId, { limit: 3, sort: "-created_on" });
  for (const c of page.data) {
    const d = await bimpe.calls.retrieve(agentId, c.id);
    const roles = [...new Set(d.conversation_logs.map((l) => l.role))];
    console.log(`call ${c.id}: ${d.status}, test=${d.is_test_call}, ${d.duration_seconds ?? "?"}s, ${d.conversation_logs.length} log entries, roles=${roles.join("/")}`);
    for (const l of d.conversation_logs.slice(0, 6)) {
      const patient = !/assistant|agent|bot|system/i.test(l.role);
      const red = patient && l.message ? detectRedFlags(l.message) : null;
      console.log(`   ${l.role.padEnd(10)} ${(l.message ?? "").slice(0, 90)}${red ? `   → red flags: ${red.urgent ? red.flags.map((f) => f.label).join(", ") : "none"}` : ""}`);
    }
  }
} catch (err) {
  console.log("failed:", describeError(err));
}
