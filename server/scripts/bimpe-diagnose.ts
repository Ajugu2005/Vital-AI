// Safe BimpeAI diagnostic: checks authentication and lists agents/workflows (ids + names only).
// Never prints the API key. Run with: npm run bimpe:diagnose [-- --send]
import "dotenv/config";
import { askAgent, bimpeStatus, describeError, getClient, resolveAgent } from "../services/bimpeClient";

const sendTest = process.argv.includes("--send");

async function main() {
  const s0 = bimpeStatus();
  console.log("API key present:", s0.configured);
  console.log("Base URL:", process.env.BIMPE_API_URL || "https://api.bimpe.ai (default)");
  const bimpe = getClient();
  if (!bimpe) {
    console.log("No BIMPEAI_API_KEY (or BIMPE_API_KEY) in .env — app will run in local fallback mode.");
    return;
  }

  try {
    console.log("\nAgents:");
    for await (const a of bimpe.agents.list({ limit: 50 })) {
      console.log(`  ${a.id}  ${a.name}  [status: ${a.status ?? "n/a"}, workflow: ${a.workflow_id ?? "none"}]`);
    }
    console.log("Authentication: OK");
  } catch (err) {
    console.log("Authentication / agents.list failed:", describeError(err));
    return;
  }

  try {
    console.log("\nWorkflows (owned):");
    for await (const w of bimpe.workflows.list({ scope: "owned", limit: 50 })) console.log(`  ${w.id}  ${w.name}`);
  } catch (err) {
    console.log("workflows.list failed:", describeError(err));
  }

  const agentId = await resolveAgent();
  const s = bimpeStatus();
  console.log("\nVital AI agent:", agentId ? `${agentId} (${s.agentName})` : `not found — ${s.lastError}`);

  if (agentId && sendTest) {
    console.log("\nSending test message to agent…");
    const t0 = Date.now();
    const reply = await askAgent({ id: `diag-${Date.now()}` },"Hello, I was discharged yesterday and I'm feeling a bit better.");
    console.log(reply ? `Agent replied in ${Date.now() - t0}ms:\n  ${reply}` : `No reply — ${bimpeStatus().lastError}`);
  }
}

main().catch((err) => console.error("Diagnostic failed:", describeError(err)));
