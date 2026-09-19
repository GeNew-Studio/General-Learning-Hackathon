"use strict";

const { spawn, spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const isWin = process.platform === "win32";
const venvPython = path.join(
  root,
  ".venv",
  isWin ? "Scripts" : "bin",
  isWin ? "python.exe" : "python",
);

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function findSystemPython() {
  const candidates = isWin
    ? [
        ["py", ["-3"]],
        ["python", []],
        ["python3", []],
      ]
    : [
        ["python3", []],
        ["python", []],
      ];
  for (const [cmd, prefix] of candidates) {
    const probe = spawnSync(cmd, [...prefix, "--version"], {
      encoding: "utf8",
      shell: false,
    });
    if (probe.status === 0) return { cmd, prefix };
  }
  return null;
}

if (!fs.existsSync(venvPython)) {
  const sys = findSystemPython();
  if (!sys) {
    console.error("Python 3 is required. Install it and run npm run dev again.");
    process.exit(1);
  }
  console.log("Creating .venv …");
  run(sys.cmd, [...sys.prefix, "-m", "venv", ".venv"]);
}

const marker = path.join(root, ".venv", ".decoy-deps");
const reqs = path.join(root, "requirements.txt");
const reqStamp = fs.existsSync(reqs) ? String(fs.statSync(reqs).mtimeMs) : "";
if (!fs.existsSync(marker) || fs.readFileSync(marker, "utf8") !== reqStamp) {
  console.log("Installing Python dependencies …");
  run(venvPython, ["-m", "pip", "install", "-q", "-r", "requirements.txt"]);
  fs.writeFileSync(marker, reqStamp);
}

const envPath = path.join(root, ".env");
const examplePath = path.join(root, ".env.example");
if (!fs.existsSync(envPath) && fs.existsSync(examplePath)) {
  fs.copyFileSync(examplePath, envPath);
  console.log("Created .env from .env.example — add an API key for a live model.");
}

const port = process.env.PORT || "8787";
const host = process.env.HOST || "127.0.0.1";
const url = `http://${host}:${port}`;

async function alreadyServing() {
  try {
    const res = await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1500) });
    return res.ok;
  } catch {
    return false;
  }
}

(async () => {
  if (await alreadyServing()) {
    console.log(`FakerAI is already running at ${url}`);
    process.exit(0);
  }

  console.log(`Starting FakerAI at ${url}`);
  const child = spawn(
    venvPython,
    ["-m", "uvicorn", "app.main:app", "--reload", "--reload-dir", "app", "--host", host, "--port", String(port)],
    { cwd: root, stdio: "inherit", shell: false },
  );

  const stop = () => {
    if (!child.killed) child.kill("SIGINT");
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  child.on("exit", (code, signal) => {
    if (code && code !== 0) {
      console.error(
        `uvicorn exited (${code}${signal ? `, ${signal}` : ""}). If the port is taken, stop the other process or set PORT=…`,
      );
    }
    process.exit(code ?? 0);
  });
})();
