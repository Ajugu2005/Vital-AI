// Read-only: shows the workflow prompt/rules, agent channels, phone numbers and recent calls. Never prints the API key.
import "dotenv/config";
import fs from "node:fs";
import { describeError, getClient } from "../services/bimpeClient";

const bimpe = getClient()!;
const agentId = process.env.BIMPE_AGENT_ID!;
const workflowId = process.env.BIMPE_WORKFLOW_ID!;

async function step(name: string, fn: () => Promise<unknown>) {
  try {
    console.log(`\n## ${name}`);
    await fn();
  } catch (err) {
    console.log("  failed:", describeError(err));
  }
}

await step("Workflow", async () => {
  const w = await bimpe.workflows.retrieve(workflowId);
  console.log(`  ${w.name} | owner: ${w.is_owner} | rules: ${w.rules.length} | flows: ${w.flows.length} | channels: ${w.channels}`);
  console.log("  system_prompt:\n" + (w.system_prompt ?? "(none)").split("\n").map((l) => "    " + l).join("\n"));
  console.log("  rules:", JSON.stringify(w.rules).slice(0, 800));
  console.log("  flows:", JSON.stringify(w.flows.map((f) => f.name)));
  fs.writeFileSync(new URL("../data/workflow-backup.json", import.meta.url), JSON.stringify(w, null, 2));
  console.log("  (full workflow backed up to server/data/workflow-backup.json)");
});
await step("Agent channels", async () => {
  for (const c of await bimpe.agents.channels.list(agentId)) console.log(`  ${c.type} | ${c.name} | ${c.status} | connected: ${c.is_connected}`);
});
await step("Phone numbers", async () => {
  const p = await bimpe.phoneNumbers.list();
  for (const n of p.data) console.log(`  ${n.id} | agent: ${n.agent_id === agentId ? "THIS AGENT" : n.agent_id ?? "unassigned"} | ${n.label ?? ""} | ${n.e164.slice(0, 5)}…`);
  if (!p.data.length) console.log("  (none)");
});
await step("Recent calls", async () => {
  const c = await bimpe.calls.list(agentId, { limit: 5, sort: "-created_on" });
  for (const x of c.data) console.log(`  ${x.id} | ${x.status} | test: ${x.is_test_call} | ${x.direction} | ${x.created_on} | ${x.error_reason ?? ""}`);
  if (!c.data.length) console.log("  (none)");
});
