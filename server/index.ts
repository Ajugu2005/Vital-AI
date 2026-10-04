import "dotenv/config";
import express from "express";
import cors from "cors";
import api from "./routes/api";
import { aiMode, bimpeStatus, resolveAgent } from "./services/bimpeClient";

const app = express();
app.use(cors());
app.use(express.json({ limit: "100kb" }));
app.use("/api", api);

const port = Number(process.env.PORT) || 3001;
app.listen(port, async () => {
  console.log(`Vital AI API running on http://localhost:${port}`);
  if (bimpeStatus().configured) await resolveAgent();
  const s = bimpeStatus();
  console.log(
    `AI mode: ${aiMode()} | Bimpe configured: ${s.configured} | agent found: ${Boolean(s.agentId)}` +
      (s.lastError ? ` | last error: ${s.lastError}` : ""),
  );
});
