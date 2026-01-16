require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const app = express();
app.use(cors());
app.use(express.json());

const CHECK_INTERVAL_MS = 5000;

const {
  PORT,
  RPC_URL,
  PRIVATE_KEY,
  PROXY_FILE_PATH,
  DEPLOY_SCRIPT_PATH,
  UPGRADE_SCRIPT_PATH,
  FORGE_PROJECT_PATH,
} = process.env;

let IMPL_ADDRESS = "";
let PROXY_ADDRESS = "";
let lastHealthy = true;

function runCommand(command, cwd) {
  const output = execSync(command, { stdio: "pipe", cwd });
  return output.toString();
}

function isForgeBuilt() {
  const outDir = path.join(FORGE_PROJECT_PATH, "out");
  const cacheDir = path.join(FORGE_PROJECT_PATH, "cache");
  return fs.existsSync(outDir) && fs.existsSync(cacheDir);
}

function forgeBuildIfNeeded() {
  if (isForgeBuilt()) return;

  try {
    const version = runCommand("forge --version", FORGE_PROJECT_PATH).trim();
    runCommand("forge build", FORGE_PROJECT_PATH);
    saveBuildStatus("built", version);
  } catch {
    saveBuildStatus("failed", null);
    throw new Error("Forge build failed");
  }
}

async function isRpcHealthy() {
  try {
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_blockNumber",
        params: [],
        id: 1
      })
    });
    if (!response.ok) return false;
    const json = await response.json();
    return Boolean(json.result);
  } catch {
    return false;
  }
}

function resetState() {
  IMPL_ADDRESS = "";
  PROXY_ADDRESS = "";
  if (fs.existsSync(PROXY_FILE_PATH)) fs.unlinkSync(PROXY_FILE_PATH);
}

function loadState() {
  if (fs.existsSync(PROXY_FILE_PATH)) {
    PROXY_ADDRESS = fs.readFileSync(PROXY_FILE_PATH, "utf8").trim();
  }
  if (fs.existsSync(PROXY_FILE_PATH)) {
    IMPL_ADDRESS = fs.readFileSync(PROXY_FILE_PATH, "utf8").trim();
  }
}

setInterval(async () => {
  const healthy = await isRpcHealthy();
  if (!healthy && lastHealthy) resetState();
  lastHealthy = healthy;
}, CHECK_INTERVAL_MS);

loadState();

app.post("/deploy-v1", (req, res) => {
  try {
    forgeBuildIfNeeded();

    const output = runCommand(
      `forge script ${DEPLOY_SCRIPT_PATH} --rpc-url ${RPC_URL} --broadcast --private-key ${PRIVATE_KEY}`,
      FORGE_PROJECT_PATH
    );

    const implMatch = output.match(/AssetToken Implementation:\s*(0x[a-fA-F0-9]{40})/);
    const proxyMatch = output.match(/AssetToken Proxy:\s*(0x[a-fA-F0-9]{40})/);

    if (!proxyMatch || !implMatch) {
      return res.status(500).json({ error: "Deployment parsing failed" });
    }

    PROXY_ADDRESS = proxyMatch[1];
    IMPL_ADDRESS = implMatch[1];

    fs.writeFileSync(PROXY_FILE_PATH, PROXY_ADDRESS);

    res.json({
      message: "V1 deployed",
      proxy: PROXY_ADDRESS,
      impl: IMPL_ADDRESS,
      logs: output
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/upgrade-to-v2", (req, res) => {
  if (!PROXY_ADDRESS) {
    return res.status(400).json({ error: "V1 not deployed" });
  }

  try {
    forgeBuildIfNeeded();

    const output = runCommand(
      `PROXY_ADDRESS=${PROXY_ADDRESS} forge script ${UPGRADE_SCRIPT_PATH} --rpc-url ${RPC_URL} --broadcast --private-key ${PRIVATE_KEY}`,
      FORGE_PROJECT_PATH
    );

    const newImplMatch = output.match(/New implementation:\s*(0x[a-fA-F0-9]{40})/);
    if (!newImplMatch) {
      return res.status(500).json({ error: "Upgrade failed" });
    }

    IMPL_ADDRESS = newImplMatch[1];

    res.json({
      message: "Upgraded to V2",
      proxy: PROXY_ADDRESS,
      new_impl: IMPL_ADDRESS,
      logs: output
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/addresses", (req, res) => {
  if (!PROXY_ADDRESS) {
    return res.status(404).json({ error: "Not deployed" });
  }
  res.json({ proxy: PROXY_ADDRESS, impl: IMPL_ADDRESS });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

