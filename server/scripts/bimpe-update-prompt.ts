// Pushes server/data/agent-prompt.md to the Bimpe workflow's system_prompt.
// Backs up the current workflow first (server/data/workflow-backup-<timestamp>.json). Rules and flows are untouched.
// Run: npx tsx server/scripts/bimpe-update-prompt.ts
import "dotenv/config";
import fs from "node:fs";
import { describeError, getClient } from "../services/bimpeClient";

const workflowId = process.env.BIMPE_WORKFLOW_ID;
const bimpe = getClient();
if (!bimpe || !workflowId) {
  console.log("BIMPEAI_API_KEY and BIMPE_WORKFLOW_ID must be set in .env");
  process.exit(1);
}

try {
  const current = await bimpe.workflows.retrieve(workflowId);
  const backup = new URL(`../data/workflow-backup-${Date.now()}.json`, import.meta.url);
  fs.writeFileSync(backup, JSON.stringify(current, null, 2));
  console.log(`Backed up "${current.name}" to ${backup.pathname.split("/").pop()}`);

  const prompt = fs.readFileSync(new URL("../data/agent-prompt.md", import.meta.url), "utf8");
  const updated = await bimpe.workflows.update(workflowId, { system_prompt: prompt });
  console.log(`Updated system_prompt (${updated.system_prompt?.length ?? 0} chars). Rules: ${updated.rules.length}, flows: ${updated.flows.length} (unchanged).`);
} catch (err) {
  console.log("Update failed:", describeError(err));
  process.exit(1);
}
