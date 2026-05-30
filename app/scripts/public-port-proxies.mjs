import http from "node:http";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn, execFileSync } from "node:child_process";

// ── Port / path configuration — all injectable via env vars ─────────────────
const NEXT_PORT       = parseInt(process.env.NEXT_PORT       || "3000",  10);
const ANNOTATOR_PORT  = parseInt(process.env.ANNOTATOR_PORT  || "7077",  10);
const EDITOR_PORT     = parseInt(process.env.EDITOR_PORT     || "8077",  10);
const PUBLIC_PORT_NUM = parseInt(process.env.PUBLIC_PORT     || "8100",  10);
const GATEWAY_PORT    = parseInt(process.env.GATEWAY_PORT    || "18789", 10);

// APP_PORT: the single public-facing port in unified/Docker mode.
// When set, one port handles everything: website + /tartanak/edit + /tartanak/ (gateway).
const APP_PORT  = parseInt(process.env.APP_PORT || "0", 10);

// BASE_PATH: URL prefix when the app is mounted under a sub-path (usually empty).
const BASE_PATH = (process.env.BASE_PATH || "").replace(/\/+$/, "");

// Legacy two-port mode (dev/direct use, kept for backward compat).
const UNIFIED_PORT    = APP_PORT || parseInt(process.env.UNIFIED_PORT || "0", 10);
const DASHBOARD_PORT  = GATEWAY_PORT; // alias kept for the old unified code path

const routes = [
  { listen: PUBLIC_PORT_NUM, target: NEXT_PORT },
  { listen: EDITOR_PORT, target: NEXT_PORT, editor: true },
];

const editRequestsFile = path.join(process.cwd(), "ui-edit-requests.jsonl");
const agentRunsFile = path.join(process.cwd(), "ui-edit-agent-runs.jsonl");
const agentLogsDir = path.join(process.cwd(), ".ui-edit-agent-runs");
const tartanakDir = path.join(process.cwd(), ".tartanak");
const placementsDir = path.join(tartanakDir, "placements");
const tartanakCli = process.env.TARTANAK_CLI || path.join(process.cwd(), "../gateway/dist/index.js");
const configuredTartanakAgentId = process.env.TARTANAK_UI_EDIT_AGENT || "";
const tartanakAgentId = configuredTartanakAgentId === "dev" ? "" : configuredTartanakAgentId;
const tartanakNode = resolveTartanakNode();

// ── Config & session auth ────────────────────────────────────────────────────
const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const workDir = path.resolve(scriptDir, "../../");
const configFile = path.join(workDir, ".tartanak-config.json");

function readConfig() {
  try {
    if (fs.existsSync(configFile)) return JSON.parse(fs.readFileSync(configFile, "utf8"));
  } catch { /* ignore */ }
  return {};
}

function writeConfig(updates) {
  const current = readConfig();
  fs.writeFileSync(configFile, JSON.stringify({ ...current, ...updates }, null, 2));
}

function hashPassword(pw) {
  return crypto.createHash("sha256").update(String(pw)).digest("hex");
}

function isPasswordProtected() {
  if (process.env.EDITOR_PASSWORD) return true;
  return Boolean(readConfig().editorPasswordHash);
}

function checkPassword(pw) {
  const envPw = process.env.EDITOR_PASSWORD;
  if (envPw) return pw === envPw;
  const cfg = readConfig();
  if (!cfg.editorPasswordHash) return true;
  return hashPassword(pw) === cfg.editorPasswordHash;
}

const activeSessions = new Map();
const SESSION_COOKIE = "tk-session";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getCookie(req, name) {
  const header = req.headers.cookie || "";
  const match = header.split(";").map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : null;
}

function isAuthorizedRequest(req) {
  if (!isPasswordProtected()) return true;
  const token = getCookie(req, SESSION_COOKIE);
  if (!token) return false;
  const session = activeSessions.get(token);
  if (!session) return false;
  if (Date.now() - session.createdAt > SESSION_TTL_MS) { activeSessions.delete(token); return false; }
  return true;
}

function createSession() {
  const token = crypto.randomBytes(32).toString("hex");
  activeSessions.set(token, { createdAt: Date.now() });
  return token;
}

function resolveTartanakNode() {
  const candidates = [
    process.env.TARTANAK_NODE,
    "/usr/bin/node",
    "/usr/local/bin/node",
    process.execPath,
  ].filter(Boolean);

  for (const candidate of candidates) {
    try {
      const version = execFileSync(candidate, ["-p", "process.versions.node"], {
        encoding: "utf8",
        timeout: 4000,
      }).trim();
      const major = Number(String(version).split(".")[0]);
      if (Number.isFinite(major) && major >= 22) {
        return candidate;
      }
    } catch {
      // Try the next candidate.
    }
  }

  return process.env.TARTANAK_NODE || "/usr/bin/node";
}

function isProcessAlive(pid) {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function readAgentLogTail(filePath, maxChars = 1200) {
  try {
    if (!fs.existsSync(filePath)) return "";
    const raw = fs.readFileSync(filePath, "utf8");
    return raw.trim().slice(-maxChars);
  } catch {
    return "";
  }
}

function findAgentRun(requestId) {
  if (!requestId || !fs.existsSync(agentRunsFile)) return null;
  const lines = fs.readFileSync(agentRunsFile, "utf8").trim().split("\n").filter(Boolean);
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    try {
      const row = JSON.parse(lines[index]);
      if (row.requestId === requestId) return row;
    } catch {
      // Ignore malformed rows.
    }
  }
  return null;
}

function resolveAgentRunStatus(run) {
  if (!run) {
    return { status: "unknown", error: "run_not_found" };
  }

  const stderr = readAgentLogTail(run.stderrPath);
  const stdout = readAgentLogTail(run.stdoutPath, 2400);
  const alive = isProcessAlive(run.pid);

  if (stderr && /requires Node|Unknown agent id|Error:/i.test(stderr)) {
    return { status: "failed", error: stderr, stdout, alive: false };
  }

  if (alive) {
    return { status: "running", error: "", stdout, alive: true };
  }

  if (stdout && /"status"\s*:\s*"ok"/.test(stdout)) {
    return { status: "completed", error: "", stdout, alive: false };
  }

  if (stderr) {
    return { status: "failed", error: stderr, stdout, alive: false };
  }

  return { status: "finished", error: "", stdout, alive: false };
}

function pagePlacementPath(pageUrl) {
  const normalized = String(pageUrl || "unknown").replace(/^https?:\/\//, "").replace(/[?#].*$/, "");
  const hash = crypto.createHash("sha256").update(normalized).digest("hex").slice(0, 18);
  return path.join(placementsDir, `${hash}.json`);
}

function readPlacementStore(pageUrl) {
  try {
    const file = pagePlacementPath(pageUrl);
    if (!fs.existsSync(file)) {
      return {
        version: 5,
        pageUrl: String(pageUrl || ""),
        updatedAt: null,
        placements: {},
      };
    }
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    return {
      version: 5,
      pageUrl: String(parsed.pageUrl || pageUrl || ""),
      updatedAt: parsed.updatedAt || null,
      placements: parsed.placements && typeof parsed.placements === "object" ? parsed.placements : {},
    };
  } catch {
    return {
      version: 5,
      pageUrl: String(pageUrl || ""),
      updatedAt: null,
      placements: {},
    };
  }
}

function writePlacementStore(pageUrl, placements) {
  fs.mkdirSync(placementsDir, { recursive: true });
  const store = {
    version: 5,
    pageUrl: String(pageUrl || ""),
    updatedAt: new Date().toISOString(),
    placements: placements && typeof placements === "object" ? placements : {},
  };
  fs.writeFileSync(pagePlacementPath(pageUrl), `${JSON.stringify(store, null, 2)}\n`, "utf8");
  return store;
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(data));
}

function appendJsonl(file, data) {
  fs.appendFileSync(file, `${JSON.stringify(data)}\n`, "utf8");
}

function buildAgentTask(request) {
  return [
    "You are handling a submitted Tartanak UI edit request from pc77.",
    "",
    `Goal: implement the requested website change directly in ${process.env.WORKSPACE_DIR || process.cwd()}, verify it, and keep the live preview working.`,
    "",
    "Request JSON:",
    JSON.stringify(request, null, 2),
    "",
    "If target.placement is present, the user dragged the selected element or changed its layer in the live editor. Treat the placement delta/final rect/zIndex as part of the requested visual layout change.",
    "If target.type is 'page' or target.selector is 'body', the user submitted a top-panel page-level prompt without selecting a specific element. Treat it as a whole-page design/content request and inspect app/page.tsx plus relevant components.",
    "",
    "The request target may include rich editor metadata: selector, xpath, domPath, componentHint, estimatedSourceFile, computedStyles, tailwindClasses, nonTailwindClasses, documentRect, placement, and zIndex. Prefer estimatedSourceFile/componentHint first, then fall back to app/page.tsx or nearby components. For Tailwind-based edits, modify className strings rather than adding inline styles unless the element already uses inline styles.",
    "",
    "Workflow:",
    "1. Inspect the relevant app/source files before editing.",
    "2. Apply the smallest focused change that satisfies the user's prompt.",
    "3. Run a meaningful verification gate such as node --check, lint/build, curl, or direct inspection.",
    "4. If the running preview/proxy must be restarted for the change to appear, restart only the needed local service.",
    "5. Append a concise completion note to memory/2026-05-25.md, including the request id and verification.",
    "",
    "Do not ask the user for clarification unless the request is impossible to interpret from the selected element and prompt.",
  ].join("\n");
}

function dispatchEditRequestToAgent(request) {
  fs.mkdirSync(agentLogsDir, { recursive: true });

  const sessionId = `ui-edit-${request.id}`;
  const stdoutPath = path.join(agentLogsDir, `${request.id}.out.log`);
  const stderrPath = path.join(agentLogsDir, `${request.id}.err.log`);
  try {
    fs.writeFileSync(stdoutPath, "");
    fs.writeFileSync(stderrPath, "");
  } catch {
    // Fresh logs are best-effort; append mode still works if truncation fails.
  }
  const stdout = fs.openSync(stdoutPath, "a");
  const stderr = fs.openSync(stderrPath, "a");
  const args = [
    tartanakCli,
    "agent",
    "--session-id",
    sessionId,
    "--message",
    buildAgentTask(request),
    "--thinking",
    "medium",
    "--timeout",
    "900",
    "--json",
  ];
  if (tartanakAgentId) {
    args.splice(2, 0, "--agent", tartanakAgentId);
  }

  const startedAt = new Date().toISOString();
  try {
    const child = spawn(tartanakNode, args, {
      cwd: process.cwd(),
      detached: true,
      stdio: ["ignore", stdout, stderr],
      env: {
        ...process.env,
        TARTANAK_UI_EDIT_REQUEST_ID: request.id,
        TARTANAK_UI_EDIT_PAGE_URL: request.pageUrl || "",
      },
    });
    child.unref();
    fs.closeSync(stdout);
    fs.closeSync(stderr);

    child.on("exit", (code) => {
      const agentStatus = code === 0 ? "completed" : "failed";
      appendJsonl(agentRunsFile, {
        requestId: request.id,
        status: agentStatus,
        finishedAt: new Date().toISOString(),
        exitCode: code,
        pid: child.pid,
        agentId: tartanakAgentId || "default",
        sessionId,
        stdoutPath,
        stderrPath,
      });
      // Notify all connected editor panels via SSE.
      broadcastSSE("agent-done", { requestId: request.id, status: agentStatus, exitCode: code });
    });

    const run = {
      requestId: request.id,
      status: "started",
      startedAt,
      pid: child.pid,
      agentId: tartanakAgentId || "default",
      nodeBin: tartanakNode,
      sessionId,
      stdoutPath,
      stderrPath,
    };
    appendJsonl(agentRunsFile, run);
    broadcastSSE("agent-running", { requestId: request.id, status: "started" });

    setTimeout(() => {
      const launch = resolveAgentRunStatus(run);
      if (launch.status === "failed") {
        appendJsonl(agentRunsFile, {
          requestId: request.id,
          status: "failed_to_launch",
          finishedAt: new Date().toISOString(),
          pid: child.pid,
          agentId: tartanakAgentId || "default",
          sessionId,
          error: launch.error,
          stdoutPath,
          stderrPath,
        });
        broadcastSSE("agent-done", { requestId: request.id, status: "failed", exitCode: -1 });
      }
    }, 700);

    return run;
  } catch (error) {
    try {
      fs.closeSync(stdout);
      fs.closeSync(stderr);
    } catch {
      // Ignore cleanup failures; the dispatch error below is the useful signal.
    }
    const run = {
      requestId: request.id,
      status: "failed_to_start",
      startedAt,
      agentId: tartanakAgentId || "default",
      sessionId,
      error: error instanceof Error ? error.message : "spawn_failed",
      stdoutPath,
      stderrPath,
    };
    appendJsonl(agentRunsFile, run);
    return run;
  }
}

async function handleEditRequest(req, res) {
  if (req.method !== "POST") {
    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
    return;
  }

  try {
    const rawBody = await readRequestBody(req);
    const payload = JSON.parse(rawBody || "{}");
    const prompt = String(payload.prompt || "").trim();

    if (prompt.length < 3) {
      sendJson(res, 400, { ok: false, error: "prompt_required" });
      return;
    }

    const request = {
      id: `uie_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      pageUrl: String(payload.pageUrl || ""),
      sessionId: String(payload.sessionId || ""),
      target: {
        name: String(payload.target?.name || ""),
        selector: String(payload.target?.selector || ""),
        xpath: String(payload.target?.xpath || ""),
        domPath: Array.isArray(payload.target?.domPath) ? payload.target.domPath : [],
        componentHint: String(payload.target?.componentHint || ""),
        estimatedSourceFile: String(payload.target?.estimatedSourceFile || ""),
        tag: String(payload.target?.tag || ""),
        type: String(payload.target?.type || ""),
        role: String(payload.target?.role || ""),
        text: String(payload.target?.text || "").slice(0, 500),
        html: String(payload.target?.html || "").slice(0, 1200),
        media: payload.target?.media || null,
        attributes: payload.target?.attributes || {},
        computedStyles: payload.target?.computedStyles || {},
        tailwindClasses: Array.isArray(payload.target?.tailwindClasses) ? payload.target.tailwindClasses : [],
        nonTailwindClasses: Array.isArray(payload.target?.nonTailwindClasses) ? payload.target.nonTailwindClasses : [],
        rect: payload.target?.rect || null,
        documentRect: payload.target?.documentRect || null,
        placement: payload.target?.placement || null,
        zIndex: payload.target?.zIndex || null,
      },
      prompt,
      intent: typeof payload.intent === "object" && payload.intent ? payload.intent : { type: String(payload.intent || "change") },
      priority: String(payload.priority || "normal"),
    };

    appendJsonl(editRequestsFile, request);
    const agentRun = dispatchEditRequestToAgent(request);
    const launchProbe =
      agentRun.status === "started" ? resolveAgentRunStatus(agentRun) : { status: agentRun.status, error: agentRun.error || "" };
    const agentDispatched = agentRun.status === "started" && launchProbe.status !== "failed";
    sendJson(res, 200, {
      ok: true,
      id: request.id,
      agentDispatched,
      agentRun,
      agentStatus: launchProbe.status,
      agentError: launchProbe.error || "",
      message: agentDispatched
        ? "Edit request sent to the Tartanak agent pipeline."
        : "Edit request saved, but the Tartanak agent could not be started automatically.",
    });
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      error: error instanceof Error ? error.message : "bad_request",
    });
  }
}

async function handleAgentStatus(req, res) {
  try {
    const url = new URL(req.url || "/", "http://127.0.0.1");
    const requestId = url.searchParams.get("requestId") || "";
    const run = findAgentRun(requestId);
    const resolved = resolveAgentRunStatus(run);
    sendJson(res, 200, {
      ok: true,
      requestId,
      run,
      status: resolved.status,
      alive: resolved.alive,
      error: resolved.error,
      stdoutTail: resolved.stdout || "",
    });
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      error: error instanceof Error ? error.message : "bad_request",
    });
  }
}

async function handlePlacements(req, res) {
  try {
    if (req.method === "GET") {
      const url = new URL(req.url || "/", "http://127.0.0.1");
      sendJson(res, 200, { ok: true, store: readPlacementStore(url.searchParams.get("pageUrl") || "") });
      return;
    }

    if (req.method === "POST") {
      const rawBody = await readRequestBody(req);
      const payload = JSON.parse(rawBody || "{}");
      const store = writePlacementStore(payload.pageUrl || "", payload.placements || {});
      sendJson(res, 200, { ok: true, store });
      return;
    }

    sendJson(res, 405, { ok: false, error: "method_not_allowed" });
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      error: error instanceof Error ? error.message : "bad_request",
    });
  }
}

// Static-asset file extensions and Next.js internal paths that must bypass the annotator.
function isStaticAssetPath(p) {
  if (!p) return false;
  if (p.startsWith("/_next/")) return true;
  return /\.(js|css|woff2?|ttf|otf|eot|ico|png|jpe?g|gif|svg|webp|avif|mp4|webm|map|json)(\?|$)/i.test(p);
}

function resolveEditorRequest(rawUrl) {
  // Preserve query string through all routing decisions.
  const rawStr = String(rawUrl || "/");
  const qIdx = rawStr.indexOf("?");
  const path = qIdx >= 0 ? rawStr.slice(0, qIdx) : rawStr;
  const query = qIdx >= 0 ? rawStr.slice(qIdx) : "";

  if (path === "/" || path === "/edit" || path === "/edit/") {
    return { kind: "landing" };
  }

  const editMatch = path.match(/^\/edit\/([^/]+:\d+)(\/.*)?$/);
  if (editMatch) {
    const targetRoot = `/${editMatch[1]}`;
    const rest = editMatch[2] || "";
    const directPort = Number(editMatch[1].split(":")[1]) || 3000;
    if (isStaticAssetPath(rest)) {
      return { kind: "static", upstreamPath: (rest || "/") + query, directPort, proxyBase: targetRoot };
    }
    return {
      kind: "target",
      upstreamPath: (rest || "/") + query, // strip host:port prefix — proxy routes directly to Next.js
      proxyBase: targetRoot,
      injectEditor: true,
      canonicalPath: `/edit${targetRoot}`,
    };
  }

  const directMatch = path.match(/^\/([^/]+:\d+)(\/.*)?$/);
  if (directMatch) {
    const targetRoot = `/${directMatch[1]}`;
    const rest = directMatch[2] || "";
    const directPort = Number(directMatch[1].split(":")[1]) || 3000;
    if (isStaticAssetPath(rest)) {
      return { kind: "static", upstreamPath: (rest || "/") + query, directPort, proxyBase: targetRoot };
    }
    return {
      kind: "target",
      upstreamPath: (rest || "/") + query, // strip host:port prefix
      proxyBase: targetRoot,
      injectEditor: true,
      canonicalPath: `/edit${targetRoot}`,
    };
  }

  return { kind: "passthrough", upstreamPath: rawStr, proxyBase: "", injectEditor: false, canonicalPath: path };
}

function getEditorLandingPage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Tartanak UI Editor</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #08111f;
      color: #ecfeff;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    .shell { width: min(720px, calc(100vw - 32px)); }
    .mark {
      width: 82px;
      height: 82px;
      display: grid;
      place-items: center;
      border: 1px solid rgba(20,184,166,.4);
      border-radius: 22px;
      background: radial-gradient(circle at 30% 25%, rgba(45,212,191,.42), transparent 42%), #0f172a;
      box-shadow: 0 24px 70px rgba(20,184,166,.22);
      font-size: 38px;
      font-weight: 950;
      margin-bottom: 26px;
      position: relative;
    }
    .mark:after {
      content: "";
      position: absolute;
      inset: -8px;
      border-radius: 28px;
      border: 1px solid rgba(244,114,182,.42);
      animation: pulse 1.8s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(.96); opacity: .45; }
      50% { transform: scale(1.08); opacity: 1; }
    }
    h1 { margin: 0; font-size: clamp(34px, 7vw, 72px); line-height: .95; letter-spacing: 0; }
    p { margin: 18px 0 0; color: #a7f3d0; font-size: 18px; line-height: 1.7; max-width: 640px; }
    a {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-height: 48px;
      margin-top: 28px;
      padding: 0 18px;
      border-radius: 8px;
      background: #2dd4bf;
      color: #042f2e;
      text-decoration: none;
      font-weight: 900;
    }
    code {
      display: block;
      margin-top: 16px;
      padding: 12px 14px;
      border: 1px solid rgba(148,163,184,.22);
      border-radius: 8px;
      background: rgba(15,23,42,.7);
      color: #fce7f3;
      overflow-wrap: anywhere;
    }
  </style>
</head>
<body>
  <main class="shell">
    <div class="mark" aria-hidden="true">T</div>
    <h1>Tartanak UI Editor</h1>
    <p>Open a target page, right-click or click any element, write a prompt in the CMS panel, and Tartanak applies the change in the workspace. The public site stays clean.</p>
    <a href="/edit/localhost:3000">Open CMS editor for localhost:3000</a>
    <code>https://pc77.skycode.win/edit/localhost:3000</code>
    <code>https://pc77.skycode.win/localhost:3000</code>
  </main>
</body>
</html>`;
}

// ──────────────────────────────────────────────────────────────────────────
// NEW getTartanakEditorScript + getTartanakEditorShell
// ──────────────────────────────────────────────────────────────────────────

function getTartanakEditorScript() {
  return `<script data-tartanak-editor>
(function(){
  if(window.__tartanakEditor)return;
  window.__tartanakEditor=true;
  if(!window.CSS)window.CSS={};
  if(!CSS.escape)CSS.escape=function(v){return String(v).replace(/[^a-zA-Z0-9_-]/g,function(c){return'\\\\'+c;});};

  var S={editMode:false,selected:null,lastTarget:null,drag:null,pendingDrag:null,suppressClick:false,
    placements:{},nextLayer:1000,snapGrid:8,moveMode:false,queue:[],historyOpen:false,agentRunning:false};

  var sty=document.createElement('style');
  sty.setAttribute('data-tartanak-editor','1');
  sty.textContent=[
    '#tk-topbar{position:fixed;top:0;left:50%;transform:translateX(-50%);z-index:2147483646;display:flex;align-items:center;gap:8px;padding:7px 14px;background:rgba(8,17,31,.92);border:1px solid rgba(20,184,166,.25);border-top:none;border-radius:0 0 16px 16px;backdrop-filter:blur(20px);box-shadow:0 8px 32px rgba(2,6,23,.35);transition:border-color .2s,box-shadow .2s}',
    '#tk-topbar[data-edit-on]{border-color:rgba(45,212,191,.55);box-shadow:0 8px 40px rgba(45,212,191,.15),0 8px 32px rgba(2,6,23,.35)}',
    '.tk-tb-logo{width:26px;height:26px;display:grid;place-items:center;border-radius:7px;border:1px solid rgba(20,184,166,.4);background:rgba(15,23,42,.8);color:#fff;font:950 13px/1 Inter,sans-serif;flex:0 0 auto}',
    '#tk-edit-toggle{display:flex;align-items:center;gap:5px;padding:5px 11px;border-radius:999px;border:1px solid rgba(148,163,184,.22);background:rgba(15,23,42,.7);color:#94a3b8;font:700 11px/1 Inter,sans-serif;cursor:pointer;white-space:nowrap;transition:all .2s}',
    '#tk-edit-toggle[aria-pressed=true]{border-color:rgba(45,212,191,.5);background:rgba(45,212,191,.1);color:#2dd4bf}',
    '.tk-tb-dot{width:6px;height:6px;border-radius:50%;background:#334155;transition:all .2s;flex:0 0 auto}',
    '#tk-edit-toggle[aria-pressed=true] .tk-tb-dot{background:#2dd4bf;box-shadow:0 0 5px #2dd4bf}',
    '.tk-tb-btn{display:none;align-items:center;gap:5px;padding:5px 10px;border-radius:999px;border:1px solid rgba(148,163,184,.18);background:rgba(15,23,42,.7);color:#94a3b8;font:700 11px/1 Inter,sans-serif;cursor:pointer;white-space:nowrap}',
    '.tk-tb-btn[data-q]:not([data-q="0"]){color:#fde68a;border-color:rgba(251,191,36,.3);background:rgba(251,191,36,.07)}',
    '#tk-run-btn{display:none;padding:5px 12px;border-radius:999px;border:none;background:#2dd4bf;color:#042f2e;font:800 11px/1 Inter,sans-serif;cursor:pointer;white-space:nowrap}',
    '#tk-run-btn:disabled{opacity:.5;cursor:not-allowed}',
    '#tk-tb-status{font:600 11px/1 Inter,sans-serif;color:#5eead4;white-space:nowrap;max-width:240px;overflow:hidden;text-overflow:ellipsis}',
    '#tk-countdown{display:none;align-items:center;gap:4px;padding:4px 10px;border-radius:999px;border:1px solid rgba(45,212,191,.28);background:rgba(45,212,191,.08);color:#5eead4;font:700 11px/1 Inter,sans-serif;white-space:nowrap}',
    '#tk-countdown strong{color:#2dd4bf;font:900 13px/1 Inter,sans-serif}',
    '#tk-hist-panel{position:fixed;top:50px;left:50%;transform:translateX(-50%);z-index:2147483645;width:min(560px,calc(100vw - 20px));max-height:min(520px,calc(100vh - 70px));display:none;flex-direction:column;border:1px solid rgba(20,184,166,.22);border-radius:12px;background:rgba(8,17,31,.97);box-shadow:0 20px 64px rgba(2,6,23,.5);overflow:hidden}',
    '#tk-hist-list{flex:1;overflow-y:auto;padding:8px;display:grid;gap:6px}',
    '.tk-cmd{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:start;padding:10px;border-radius:8px;border:1px solid rgba(148,163,184,.1);background:rgba(15,23,42,.6)}',
    '.tk-cmd-meta{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:4px}',
    '.tk-badge{display:inline-block;padding:1px 6px;border-radius:999px;font:700 10px/1.4 ui-monospace,monospace;white-space:nowrap}',
    '.tk-b-tag{background:rgba(99,102,241,.15);color:#a5b4fc;border:1px solid rgba(99,102,241,.22)}',
    '.tk-b-comp{background:rgba(244,114,182,.1);color:#f9a8d4;border:1px solid rgba(244,114,182,.18)}',
    '.tk-b-src{background:rgba(251,191,36,.08);color:#fde68a;border:1px solid rgba(251,191,36,.16)}',
    '.tk-cmd-text{color:#e2e8f0;font:500 12px/1.5 Inter,sans-serif;word-break:break-word}',
    '.tk-cmd-path{color:#475569;font:500 10px/1.3 ui-monospace,monospace;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;direction:ltr}',
    '.tk-cmd-del{width:24px;height:24px;border-radius:6px;border:1px solid rgba(148,163,184,.12);background:rgba(15,23,42,.8);color:#475569;font:600 13px/24px sans-serif;cursor:pointer;flex:0 0 auto;text-align:center;padding:0;transition:all .15s}',
    '.tk-cmd-del:hover{border-color:rgba(239,68,68,.35);color:#f87171;background:rgba(239,68,68,.08)}',
    '#tk-hist-foot{display:flex;gap:8px;padding:10px;border-top:1px solid rgba(148,163,184,.1)}',
    '#tk-hist-clear{flex:1;min-height:32px;border:1px solid rgba(148,163,184,.15);border-radius:8px;background:rgba(15,23,42,.8);color:#64748b;font:700 11px/1 Inter,sans-serif;cursor:pointer}',
    '#tk-hist-run{flex:2;min-height:32px;border:none;border-radius:8px;background:#2dd4bf;color:#042f2e;font:800 11px/1 Inter,sans-serif;cursor:pointer}',
    '#tk-hist-run:disabled{opacity:.5;cursor:not-allowed}',
    '#tk-hist-empty{padding:28px 16px;text-align:center;color:#334155;font:500 13px/1.5 Inter,sans-serif}',
    '#tk-prompt{position:fixed;z-index:2147483647;width:min(380px,calc(100vw - 20px));border:1px solid rgba(45,212,191,.32);border-radius:12px;background:rgba(8,17,31,.98);box-shadow:0 20px 64px rgba(2,6,23,.55);display:none;overflow:hidden}',
    '#tk-prompt-head{padding:10px 12px 8px;border-bottom:1px solid rgba(148,163,184,.1)}',
    '#tk-prompt-info{display:flex;flex-wrap:wrap;gap:3px;margin-bottom:3px}',
    '#tk-prompt-name{color:#475569;font:500 11px/1.3 ui-monospace,monospace;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '#tk-prompt-body{padding:10px 12px 4px}',
    '#tk-prompt-ta{width:100%;min-height:80px;max-height:160px;border:1px solid rgba(148,163,184,.18);border-radius:8px;background:#020617;color:#f8fafc;font:500 13px/1.5 Inter,sans-serif;padding:8px 10px;resize:vertical;outline:none;direction:rtl;text-align:right;box-sizing:border-box}',
    '#tk-prompt-ta:focus{border-color:#2dd4bf;box-shadow:0 0 0 3px rgba(45,212,191,.1)}',
    '#tk-prompt-ta::placeholder{color:#334155}',
    '#tk-prompt-hint{padding:4px 12px 8px;color:#334155;font:500 10px/1.3 Inter,sans-serif}',
    '#tk-prompt-foot{display:flex;gap:8px;padding:0 12px 10px}',
    '#tk-prompt-add{flex:1;min-height:34px;border:none;border-radius:8px;background:#2dd4bf;color:#042f2e;font:800 11px/1 Inter,sans-serif;cursor:pointer}',
    '#tk-prompt-cancel{min-height:34px;padding:0 12px;border:1px solid rgba(148,163,184,.18);border-radius:8px;background:rgba(15,23,42,.8);color:#94a3b8;font:700 11px/1 Inter,sans-serif;cursor:pointer}',
    '.tk-ring{position:fixed;z-index:2147483646;pointer-events:none;border:2px solid rgba(45,212,191,.6);box-shadow:0 0 0 4px rgba(45,212,191,.1);border-radius:6px;display:none}',
    '.tk-ring.tk-sel{border-color:#2dd4bf;box-shadow:0 0 0 5px rgba(45,212,191,.16),0 4px 20px rgba(45,212,191,.1)}',
    '.tk-ring.tk-edit{border-color:#f9a8d4;box-shadow:0 0 0 5px rgba(244,114,182,.12)}',
    '.tk-ring:after{content:attr(data-label);position:absolute;right:0;top:-30px;max-width:220px;min-width:60px;border:1px solid rgba(20,184,166,.35);border-radius:6px;background:rgba(8,17,31,.97);color:#ecfeff;padding:4px 7px;font:700 10px/1.3 Inter,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
    '.tk-ring.tk-lb:after{top:auto;bottom:-30px}',
    '.tk-handle{position:absolute;width:10px;height:10px;border-radius:50%;border:2px solid #042f2e;background:#2dd4bf;box-shadow:0 2px 8px rgba(2,6,23,.3);pointer-events:auto;cursor:grab}',
    '.tk-handle:active{cursor:grabbing}',
    '.tk-h-nw{left:-6px;top:-6px}','.tk-h-ne{right:-6px;top:-6px}',
    '.tk-h-sw{left:-6px;bottom:-6px}','.tk-h-se{right:-6px;bottom:-6px}',
    '.tk-ghost{position:fixed!important;pointer-events:none!important;z-index:2147483647!important;opacity:.85;border-radius:6px;box-shadow:0 20px 60px rgba(2,6,23,.4),0 0 0 2px #2dd4bf;transform:rotate(.3deg) scale(1.01);transform-origin:top left;will-change:left,top;margin:0!important}',
    '[data-tk-drag-src]{opacity:.18!important;filter:blur(1.5px)!important}',
    '[data-tk-placed]{transform:translate(var(--tk-px,0px),var(--tk-py,0px));z-index:var(--tk-pz,auto)}'
  ].join('');
  document.head.appendChild(sty);

  // ── Build DOM ───────────────────────────────────────────────────────────
  var bar=document.getElementById('tk-topbar');
  if(!bar){bar=document.createElement('div');bar.id='tk-topbar';bar.setAttribute('data-tartanak-editor','1');document.body.appendChild(bar);}
  bar.setAttribute('data-tartanak-editor','1');
  bar.innerHTML=
    '<div class="tk-tb-logo" data-tartanak-editor>T</div>'+
    '<button id="tk-edit-toggle" data-tartanak-editor type="button" aria-pressed="false">'+
      '<span class="tk-tb-dot" data-tartanak-editor></span>Edit Mode'+
    '</button>'+
    '<button id="tk-hist-btn" class="tk-tb-btn" data-tartanak-editor type="button" data-q="0">📋 Queue <span id="tk-q-count" data-tartanak-editor>0</span></button>'+
    '<button id="tk-run-btn" data-tartanak-editor type="button">▶ Run All</button>'+
    '<span id="tk-tb-status" data-tartanak-editor></span>'+
    '<div id="tk-countdown" data-tartanak-editor><strong id="tk-cnt-n" data-tartanak-editor>30</strong>s</div>';

  var editToggle=document.getElementById('tk-edit-toggle');
  var histBtn=document.getElementById('tk-hist-btn');
  var runBtn=document.getElementById('tk-run-btn');
  var tbStatus=document.getElementById('tk-tb-status');
  var countdown=document.getElementById('tk-countdown');
  var cntNum=document.getElementById('tk-cnt-n');
  var qCount=document.getElementById('tk-q-count');

  var hist=document.getElementById('tk-hist-panel');
  if(!hist){hist=document.createElement('div');hist.id='tk-hist-panel';hist.setAttribute('data-tartanak-editor','1');document.body.appendChild(hist);}
  hist.setAttribute('data-tartanak-editor','1');
  hist.innerHTML=
    '<div id="tk-hist-list" data-tartanak-editor></div>'+
    '<div id="tk-hist-foot" data-tartanak-editor>'+
      '<button id="tk-hist-clear" data-tartanak-editor type="button">Clear all</button>'+
      '<button id="tk-hist-run" data-tartanak-editor type="button">▶ Run All Commands</button>'+
    '</div>';
  var hList=document.getElementById('tk-hist-list');
  var hClear=document.getElementById('tk-hist-clear');
  var hRun=document.getElementById('tk-hist-run');

  var pm=document.getElementById('tk-prompt');
  if(!pm){pm=document.createElement('div');pm.id='tk-prompt';pm.setAttribute('data-tartanak-editor','1');document.body.appendChild(pm);}
  pm.setAttribute('data-tartanak-editor','1');
  pm.innerHTML=
    '<div id="tk-prompt-head" data-tartanak-editor>'+
      '<div id="tk-prompt-info" data-tartanak-editor></div>'+
      '<div id="tk-prompt-name" data-tartanak-editor></div>'+
    '</div>'+
    '<div id="tk-prompt-body" data-tartanak-editor>'+
      '<textarea id="tk-prompt-ta" data-tartanak-editor placeholder="توضیح دهید چه تغییری می‌خواهید / Describe what to change…"></textarea>'+
    '</div>'+
    '<div id="tk-prompt-hint" data-tartanak-editor>Ctrl+Enter to add  •  Esc to cancel</div>'+
    '<div id="tk-prompt-foot" data-tartanak-editor>'+
      '<button id="tk-prompt-add" data-tartanak-editor type="button">+ Add to Queue</button>'+
      '<button id="tk-prompt-cancel" data-tartanak-editor type="button">Cancel</button>'+
    '</div>';
  var pmTa=document.getElementById('tk-prompt-ta');
  var pmAdd=document.getElementById('tk-prompt-add');
  var pmCancel=document.getElementById('tk-prompt-cancel');
  var pmInfo=document.getElementById('tk-prompt-info');
  var pmName=document.getElementById('tk-prompt-name');

  var ring=document.createElement('div');
  ring.className='tk-ring';ring.setAttribute('data-tartanak-editor','1');
  ring.innerHTML='<span class="tk-handle tk-h-nw" data-tartanak-editor data-handle="move"></span>'+
    '<span class="tk-handle tk-h-ne" data-tartanak-editor data-handle="move"></span>'+
    '<span class="tk-handle tk-h-sw" data-tartanak-editor data-handle="move"></span>'+
    '<span class="tk-handle tk-h-se" data-tartanak-editor data-handle="move"></span>';
  document.body.appendChild(ring);

  // ── Helpers ─────────────────────────────────────────────────────────────
  function isEC(el){return Boolean(el&&el.closest&&el.closest('[data-tartanak-editor]'));}
  function isAC(el){return Boolean(el&&el.closest&&el.closest('[data-ui-annotator]'));}
  function canDrag(el){if(!el||el.nodeType!==1||isEC(el)||isAC(el))return false;var t=el.tagName.toLowerCase();return t!=='html'&&t!=='body';}
  function resolveAt(cx,cy){
    var ov=Array.prototype.slice.call(document.querySelectorAll('[data-tartanak-editor],[data-ui-annotator]'));
    var sv=ov.map(function(n){return[n,n.style.pointerEvents];});
    ov.forEach(function(n){n.style.pointerEvents='none';});
    var el=document.elementFromPoint(cx,cy);
    sv.forEach(function(p){p[0].style.pointerEvents=p[1];});
    return(!el||isEC(el)||isAC(el))?null:el;
  }
  function evTarget(ev){if(isEC(ev.target))return null;if(isAC(ev.target))return resolveAt(ev.clientX,ev.clientY);return ev.target;}
  function clamp(v,lo,hi){return Math.max(lo,Math.min(hi,v));}
  function snapV(v){return S.snapGrid?Math.round(v/S.snapGrid)*S.snapGrid:Math.round(v);}
  function eh(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

  function selFor(el){
    if(el.id)return'#'+CSS.escape(el.id);
    var parts=[],node=el;
    while(node&&node.nodeType===1&&node!==document.body&&parts.length<4){
      var p=node.tagName.toLowerCase();
      if(node.className&&typeof node.className==='string'){
        var cl=node.className.trim().split(/\\s+/).filter(Boolean).slice(0,2);
        if(cl.length)p+='.'+cl.map(function(c){return CSS.escape(c);}).join('.');
      }
      var par=node.parentElement;
      if(par){var sm=Array.prototype.filter.call(par.children,function(c){return c.tagName===node.tagName;});if(sm.length>1)p+=':nth-of-type('+(sm.indexOf(node)+1)+')';}
      parts.unshift(p);node=par;
    }
    return parts.join(' > ');
  }
  function xpathFor(el){
    var ps=[],node=el;
    while(node&&node.nodeType===1){
      var tag=node.tagName.toLowerCase(),idx=1,sib=node.previousElementSibling;
      while(sib){if(sib.tagName===node.tagName)idx++;sib=sib.previousElementSibling;}
      ps.unshift(tag+'['+idx+']');node=node.parentElement;
    }
    return'/'+ps.join('/');
  }
  function domPathFor(el){
    var ps=[],node=el;
    while(node&&node.nodeType===1&&node!==document.documentElement&&ps.length<8){
      var p=node.tagName.toLowerCase();
      if(node.id)p+='#'+node.id;
      var c=node.getAttribute('data-component');if(c)p+='['+c+']';
      ps.unshift(p);node=node.parentElement;
    }
    return ps;
  }
  function compHint(el){var n=el.closest('[data-component]');return n?(n.getAttribute('data-component')||''):'';}
  function toKebab(s){return String(s||'').replace(/([a-z0-9])([A-Z])/g,'$1-$2').replace(/[\\s_]+/g,'-').toLowerCase();}
  function srcFile(el){var c=compHint(el);if(c)return'components/'+toKebab(c)+'.tsx';var s=el.closest('section[id]');if(s&&s.id)return'app/page.tsx#'+s.id;return'app/page.tsx';}
  function elType(el){
    var tag=el.tagName.toLowerCase(),role=(el.getAttribute('role')||'').toLowerCase();
    var txt=(el.textContent||'').trim();
    if(tag==='img'||tag==='picture'||el.querySelector('img'))return'image';
    if(tag==='svg'||role==='img')return'icon';
    if(/^h[1-6]$/.test(tag)||role==='heading')return'heading';
    if(tag==='button'||role==='button'||el.closest('button'))return'button';
    if(tag==='a'||role==='link'||el.closest('a'))return'link';
    if(['input','textarea','select'].indexOf(tag)>=0)return'input';
    if(tag==='nav'||role==='navigation')return'navigation';
    if(['section','article','main','aside','header','footer'].indexOf(tag)>=0)return'section';
    if(txt&&txt.length<220&&el.children.length<=2)return'text';
    return'container';
  }
  function labelFor(el){return(el.getAttribute('aria-label')||el.getAttribute('placeholder')||el.id||(el.textContent||'').trim().slice(0,60)||el.tagName.toLowerCase()).trim();}
  function classifyClasses(cn){
    var vals=String(cn||'').trim().split(/\\s+/).filter(Boolean);
    var pre='bg text font leading tracking p px py pt pr pb pl m mx my mt mr mb ml w h min-w min-h max-w max-h grid flex inline block hidden items justify content gap space rounded border shadow opacity overflow object absolute relative fixed sticky inset top right bottom left z transition duration ease from via to blur backdrop ring animate scale translate rotate order col row place self shrink grow basis aspect'.split(' ');
    function isTw(v){var base=String(v||'').split(':').pop().replace(/^-/,'').split('-')[0].split('[')[0];return pre.indexOf(base)>=0||v.indexOf('[')>=0;}
    return{tw:vals.filter(isTw),other:vals.filter(function(v){return!isTw(v);})};
  }
  function csSnap(el){var s=getComputedStyle(el);return{color:s.color,backgroundColor:s.backgroundColor,fontSize:s.fontSize,fontWeight:s.fontWeight,padding:s.padding,borderRadius:s.borderRadius,display:s.display,position:s.position,zIndex:s.zIndex};}
  function rp(r){return{x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height)};}
  function drp(r){return{x:Math.round(r.left+window.scrollX),y:Math.round(r.top+window.scrollY),w:Math.round(r.width),h:Math.round(r.height)};}
  function vfdr(r){return{left:r.x-window.scrollX,top:r.y-window.scrollY,width:r.w,height:r.h};}
  function inferIntent(t,type){
    var s=String(t||'').toLowerCase();
    if(/color|رنگ|background|پس.?زمینه/.test(s))return'color';
    if(/font|فونت|bold|italic/.test(s))return'typography';
    if(/spacing|padding|margin|فاصله/.test(s))return'spacing';
    if(/layout|grid|flex|move|جاب|position/.test(s))return'layout';
    if(type==='image'||/image|تصویر|عکس/.test(s))return'image';
    if(type==='text'||type==='heading')return'text';
    return'freeform';
  }

  // ── Placements ──────────────────────────────────────────────────────────
  function sk(){return'tk-p:v4:'+location.origin+location.pathname;}
  function pu(){return window.location.href.split('#')[0].replace(/\\/edit(?=\\/[^/]+:\\d+)/,'');}
  function readPl(){
    try{S.placements=JSON.parse(localStorage.getItem(sk())||'{}')||{};}catch(e){S.placements={};}
    Object.keys(S.placements).forEach(function(k){var z=Number(S.placements[k]&&S.placements[k].zIndex);if(Number.isFinite(z))S.nextLayer=Math.max(S.nextLayer,z+1);});
  }
  function writePl(){
    try{localStorage.setItem(sk(),JSON.stringify(S.placements));}catch(e){}
    try{fetch(location.origin+'/__tartanak/placements',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({pageUrl:pu(),placements:S.placements})}).catch(function(){});}catch(e){}
  }
  function applyPl(el,tx,ty,z){if(!el)return;el.setAttribute('data-tk-placed','1');el.style.setProperty('--tk-px',(tx||0)+'px');el.style.setProperty('--tk-py',(ty||0)+'px');if(z&&Number.isFinite(Number(z)))el.style.setProperty('--tk-pz',String(z));}
  function removePl(el){if(!el)return;el.removeAttribute('data-tk-placed');el.style.removeProperty('--tk-px');el.style.removeProperty('--tk-py');el.style.removeProperty('--tk-pz');}
  function natRect(el){var was=el.hasAttribute('data-tk-placed');if(was)el.removeAttribute('data-tk-placed');var r=el.getBoundingClientRect();var res={x:Math.round(r.left+window.scrollX),y:Math.round(r.top+window.scrollY),w:Math.round(r.width),h:Math.round(r.height)};if(was)el.setAttribute('data-tk-placed','1');return res;}
  function applyAllPl(){
    Object.keys(S.placements).forEach(function(sel){
      var p=S.placements[sel];if(!p||!sel)return;
      try{var el=document.querySelector(sel);if(el&&!isEC(el)&&!isAC(el)&&typeof p.translateX==='number')applyPl(el,p.translateX,p.translateY,p.zIndex);}catch(e){}
    });
  }
  function syncPl(){
    try{
      fetch(location.origin+'/__tartanak/placements?pageUrl='+encodeURIComponent(pu()),{headers:{accept:'application/json'}})
        .then(function(r){return r.ok?r.json():null;})
        .then(function(d){
          var pl=d&&d.store&&d.store.placements;if(!pl||typeof pl!=='object')return;
          S.placements=Object.assign({},S.placements,pl);
          try{localStorage.setItem(sk(),JSON.stringify(S.placements));}catch(e){}
          applyAllPl();
        }).catch(function(){});
    }catch(e){}
  }

  // ── Ring ────────────────────────────────────────────────────────────────
  function updateRing(rect,el,sel){
    ring.style.display='block';
    ring.style.left=(rect.left-4)+'px';ring.style.top=(rect.top-4)+'px';
    ring.style.width=(rect.width+8)+'px';ring.style.height=(rect.height+8)+'px';
    if(el)ring.style.borderRadius=getComputedStyle(el).borderRadius||'6px';
    ring.classList.toggle('tk-lb',rect.top<44);
    ring.classList.toggle('tk-sel',Boolean(sel));
    ring.classList.toggle('tk-edit',S.editMode);
  }
  function refreshRing(){
    if(!S.lastTarget||S.drag)return;
    var rect=S.selected&&S.selected.pl&&S.selected.pl.documentRect?vfdr(S.selected.pl.documentRect):S.lastTarget.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    updateRing(rect,S.lastTarget,true);
  }

  // ── Snapshot ─────────────────────────────────────────────────────────────
  function snapEl(el){
    var rect=el.getBoundingClientRect();
    var sel=selFor(el);
    var cls=classifyClasses(typeof el.className==='string'?el.className:'');
    var prev=(S.lastTarget===el&&S.selected?S.selected.pl:null)||S.placements[sel]||null;
    if(prev&&prev.documentRect)rect=vfdr(prev.documentRect);
    return{
      name:labelFor(el),selector:sel,xpath:xpathFor(el),domPath:domPathFor(el),
      componentHint:compHint(el),estimatedSourceFile:srcFile(el),
      tag:el.tagName.toLowerCase(),type:elType(el),role:el.getAttribute('role')||'',
      text:(el.textContent||'').trim().slice(0,500),html:(el.innerHTML||'').trim().slice(0,800),
      attributes:{id:el.id||'',className:typeof el.className==='string'?el.className:'',href:el.getAttribute('href')||'',src:el.getAttribute('src')||'',alt:el.getAttribute('alt')||''},
      computedStyles:csSnap(el),tailwindClasses:cls.tw,nonTailwindClasses:cls.other,
      rect:rp(rect),documentRect:prev&&prev.documentRect?prev.documentRect:drp(rect),
      pl:prev||null,zIndex:prev?prev.zIndex||null:null
    };
  }
  function selectEl(el){
    if(!el||isEC(el)||isAC(el))return;
    var sn=snapEl(el);S.selected=sn;S.lastTarget=el;
    var rect=el.getBoundingClientRect();
    if(sn.pl&&sn.pl.documentRect)rect=vfdr(sn.pl.documentRect);
    updateRing(rect,el,true);ring.setAttribute('data-label',sn.name||sn.tag);
  }

  // ── Command queue ────────────────────────────────────────────────────────
  function genId(){return'c_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,6);}
  function addCmd(target,prompt){
    S.queue.push({id:genId(),target:target,prompt:prompt.trim(),intent:{type:inferIntent(prompt,target.type)},timestamp:new Date().toISOString(),pageUrl:pu()});
    refreshQueueUI();
  }
  function delCmd(id){S.queue=S.queue.filter(function(c){return c.id!==id;});refreshQueueUI();}
  function clearCmds(){S.queue=[];refreshQueueUI();}
  function refreshQueueUI(){
    var n=S.queue.length;
    qCount.textContent=n;
    histBtn.setAttribute('data-q',n);
    histBtn.textContent='';histBtn.setAttribute('data-tartanak-editor','1');
    histBtn.appendChild(document.createTextNode('📋 Queue '));
    var sp=document.createElement('span');sp.id='tk-q-count';sp.setAttribute('data-tartanak-editor','1');sp.textContent=n;
    histBtn.appendChild(sp);qCount=sp;
    histBtn.style.display=(n>0||S.editMode)?'flex':'none';
    runBtn.style.display=n>0?'flex':'none';
    if(hRun)hRun.disabled=(n===0||S.agentRunning);
    renderHist();
  }
  function renderHist(){
    if(!hList)return;
    if(!S.queue.length){hList.innerHTML='<div id="tk-hist-empty" data-tartanak-editor>No commands yet. Enable edit mode and right-click any element to add a prompt.</div>';return;}
    hList.innerHTML=S.queue.map(function(c){
      var m='';
      if(c.target.tag)m+='<span class="tk-badge tk-b-tag" data-tartanak-editor>'+eh(c.target.tag)+'</span>';
      if(c.target.componentHint)m+='<span class="tk-badge tk-b-comp" data-tartanak-editor>'+eh(c.target.componentHint)+'</span>';
      if(c.target.estimatedSourceFile)m+='<span class="tk-badge tk-b-src" data-tartanak-editor>'+eh(c.target.estimatedSourceFile.replace(/^.*\\//,''))+'</span>';
      return'<div class="tk-cmd" data-tartanak-editor>'+
        '<div data-tartanak-editor>'+
          '<div class="tk-cmd-meta" data-tartanak-editor>'+m+'</div>'+
          '<div class="tk-cmd-text" data-tartanak-editor>'+eh(c.prompt)+'</div>'+
          (c.target.selector?'<div class="tk-cmd-path" data-tartanak-editor>'+eh(c.target.selector)+'</div>':'')+
        '</div>'+
        '<button class="tk-cmd-del" data-tartanak-editor data-del="'+c.id+'" type="button">×</button>'+
      '</div>';
    }).join('');
  }

  // ── Prompt modal ─────────────────────────────────────────────────────────
  var pmSnap=null;
  function showPM(el,ev){
    pmSnap=snapEl(el);
    var m='';
    if(pmSnap.tag)m+='<span class="tk-badge tk-b-tag" data-tartanak-editor>'+eh(pmSnap.tag)+'</span>';
    if(pmSnap.componentHint)m+='<span class="tk-badge tk-b-comp" data-tartanak-editor>'+eh(pmSnap.componentHint)+'</span>';
    if(pmSnap.estimatedSourceFile)m+='<span class="tk-badge tk-b-src" data-tartanak-editor>'+eh(pmSnap.estimatedSourceFile.replace(/^.*\\//,''))+'</span>';
    pmInfo.innerHTML=m;
    pmName.textContent=(pmSnap.name||pmSnap.selector||'').slice(0,80);
    pmTa.value='';
    var vw=window.innerWidth,vh=window.innerHeight,w=Math.min(380,vw-20),h=200;
    var x=ev?clamp(ev.clientX-20,10,vw-w-10):clamp((vw-w)/2,10,vw-w-10);
    var y=ev?clamp(ev.clientY+14,56,vh-h-10):clamp((vh-h)/2,56,vh-h-10);
    pm.style.left=x+'px';pm.style.top=y+'px';pm.style.display='block';
    setTimeout(function(){pmTa.focus();},40);
  }
  function hidePM(){pm.style.display='none';pmSnap=null;}

  // ── Edit mode toggle ─────────────────────────────────────────────────────
  function setEditMode(on){
    S.editMode=on;
    editToggle.setAttribute('aria-pressed',on?'true':'false');
    if(on){bar.setAttribute('data-edit-on','1');tbStatus.textContent='Edit on — right-click any element';}
    else{bar.removeAttribute('data-edit-on');tbStatus.textContent='';hidePM();}
    histBtn.style.display=(S.queue.length>0||on)?'flex':'none';
    ring.classList.toggle('tk-edit',on);
  }
  editToggle.addEventListener('click',function(){setEditMode(!S.editMode);});

  // ── History panel ────────────────────────────────────────────────────────
  histBtn.addEventListener('click',function(){
    S.historyOpen=!S.historyOpen;
    hist.style.display=S.historyOpen?'flex':'none';
    if(S.historyOpen)renderHist();
  });
  hList.addEventListener('click',function(ev){var b=ev.target.closest('[data-del]');if(b)delCmd(b.getAttribute('data-del'));});
  hClear.addEventListener('click',clearCmds);
  hRun.addEventListener('click',function(){S.historyOpen=false;hist.style.display='none';runAll();});
  runBtn.addEventListener('click',runAll);

  // ── Prompt actions ───────────────────────────────────────────────────────
  pmAdd.addEventListener('click',function(){
    var t=pmTa.value.trim();if(!t||!pmSnap)return;
    addCmd(pmSnap,t);hidePM();
    tbStatus.textContent='Added to queue ('+S.queue.length+' total)';
    setTimeout(function(){if(S.editMode)tbStatus.textContent='Edit on — right-click any element';},2500);
  });
  pmCancel.addEventListener('click',hidePM);
  pmTa.addEventListener('keydown',function(ev){
    if((ev.ctrlKey||ev.metaKey)&&ev.key==='Enter'){ev.preventDefault();pmAdd.click();}
    if(ev.key==='Escape'){ev.preventDefault();hidePM();}
  });

  // ── Right-click → prompt modal ───────────────────────────────────────────
  function handleCtx(ev){
    if(isEC(ev.target))return false;
    if(!S.editMode)return false;
    var tgt=evTarget(ev);if(!tgt||!canDrag(tgt))return false;
    ev.preventDefault();ev.stopPropagation();if(ev.stopImmediatePropagation)ev.stopImmediatePropagation();
    selectEl(tgt);showPM(tgt,ev);return true;
  }
  window.addEventListener('contextmenu',handleCtx,true);
  document.addEventListener('contextmenu',handleCtx,true);
  window.addEventListener('pointerdown',function(ev){if(ev.button===2&&S.editMode)handleCtx(ev);},true);

  // ── Hover ring ───────────────────────────────────────────────────────────
  document.addEventListener('mousemove',function(ev){
    if(S.drag||S.pendingDrag||isEC(ev.target))return;
    var el=isAC(ev.target)?resolveAt(ev.clientX,ev.clientY):document.elementFromPoint(ev.clientX,ev.clientY);
    if(!el||isEC(el)||isAC(el))return;
    var r=el.getBoundingClientRect();
    updateRing(r,el,S.lastTarget===el);
    if(S.lastTarget!==el)ring.removeAttribute('data-label');
  },true);

  // ── Click to select ──────────────────────────────────────────────────────
  document.addEventListener('click',function(ev){
    if(isEC(ev.target))return;
    if(S.suppressClick){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();S.suppressClick=false;return;}
    var tgt=evTarget(ev);if(!tgt)return;
    selectEl(tgt);
  },true);

  document.addEventListener('keydown',function(ev){
    if(ev.key==='Escape'){hidePM();S.historyOpen=false;hist.style.display='none';}
  });

  // ── Drag ─────────────────────────────────────────────────────────────────
  function shouldDrag(ev,el){
    if(!canDrag(el))return false;
    if(ev.altKey||S.moveMode)return true;
    return Boolean(ev.target&&ev.target.closest&&ev.target.closest("[data-handle='move']"));
  }
  document.addEventListener('pointerdown',function(ev){
    if(isEC(ev.target))return;
    if(ev.button===2){handleCtx(ev);return;}
    if(ev.button!==undefined&&ev.button!==0)return;
    var raw=evTarget(ev);if(!raw)return;
    var tgt=S.lastTarget&&S.lastTarget.contains(raw)?S.lastTarget:raw;
    if(!shouldDrag(ev,tgt))return;
    S.pendingDrag={el:tgt,pid:ev.pointerId,sx:ev.clientX,sy:ev.clientY};
  },true);
  document.addEventListener('pointermove',function(ev){
    if(S.drag){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();moveDrag(ev);return;}
    if(!S.pendingDrag||S.pendingDrag.pid!==ev.pointerId)return;
    var dx=ev.clientX-S.pendingDrag.sx,dy=ev.clientY-S.pendingDrag.sy;
    if(Math.sqrt(dx*dx+dy*dy)<5)return;
    ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();
    if(beginDrag(ev,S.pendingDrag.el))moveDrag(ev);
    S.pendingDrag=null;
  },true);
  document.addEventListener('pointerup',function(ev){
    if(S.drag){ev.preventDefault();ev.stopPropagation();ev.stopImmediatePropagation();endDrag(ev);return;}
    S.pendingDrag=null;
  },true);
  document.addEventListener('pointercancel',function(){S.pendingDrag=null;if(S.drag)endDrag({pointerId:S.drag.pid});},true);

  function beginDrag(ev,el){
    if(!canDrag(el))return false;
    var sel=selFor(el),ex=S.placements[sel]||null;
    var rect=ex&&ex.documentRect?vfdr(ex.documentRect):el.getBoundingClientRect();
    if(rect.width<1||rect.height<1)return false;
    selectEl(el);
    var z=Number((S.selected&&S.selected.zIndex)||S.nextLayer++);
    var sdr=ex&&ex.documentRect?ex.documentRect:drp(rect);
    try{ring.setPointerCapture(ev.pointerId);}catch(e){}
    S.drag={el:el,sel:selFor(el),pid:ev.pointerId,ox:ev.clientX-rect.left,oy:ev.clientY-rect.top,
      sdr:sdr,nat:natRect(el),tx:sdr.x,ty:sdr.y,fr:0,w:rect.width,h:rect.height,z:z};
    ring.setAttribute('data-label','Moving: '+(S.selected?S.selected.name||S.selected.tag:el.tagName.toLowerCase()));
    try{
      var gh=el.cloneNode(true);
      gh.setAttribute('data-tartanak-editor','1');
      gh.className=(gh.className||'')+' tk-ghost';
      gh.style.setProperty('left',rect.left+'px','important');gh.style.setProperty('top',rect.top+'px','important');
      gh.style.setProperty('width',rect.width+'px','important');gh.style.setProperty('height',rect.height+'px','important');
      gh.style.setProperty('overflow','hidden','important');
      var ks=gh.querySelectorAll('[data-tartanak-editor]');for(var i=0;i<ks.length;i++){try{ks[i].parentNode.removeChild(ks[i]);}catch(e){}}
      document.body.appendChild(gh);S.drag.ghost=gh;el.setAttribute('data-tk-drag-src','1');
    }catch(e){}
    return true;
  }
  function moveDrag(ev){
    if(!S.drag)return;
    var d=S.drag;
    d.tx=Math.round(ev.clientX+window.scrollX-d.ox);d.ty=Math.round(ev.clientY+window.scrollY-d.oy);
    if(d.fr)return;
    d.fr=requestAnimationFrame(function(){
      d.fr=0;var sx=snapV(d.tx),sy=snapV(d.ty);
      if(d.ghost){d.ghost.style.left=(sx-window.scrollX)+'px';d.ghost.style.top=(sy-window.scrollY)+'px';}
      updateRing({left:sx-window.scrollX,top:sy-window.scrollY,width:d.w,height:d.h},d.el,true);
    });
  }
  function endDrag(ev){
    if(!S.drag)return;
    var d=S.drag;if(d.fr){cancelAnimationFrame(d.fr);d.fr=0;}
    var fx=snapV(d.tx),fy=snapV(d.ty),nat=d.nat||d.sdr;
    var pl={mode:'drag-drop',selector:d.sel,originalDocumentRect:d.sdr,
      documentRect:{x:fx,y:fy,w:Math.round(d.w),h:Math.round(d.h)},
      delta:{x:Math.round(fx-d.sdr.x),y:Math.round(fy-d.sdr.y)},
      translateX:Math.round(fx-nat.x),translateY:Math.round(fy-nat.y),
      zIndex:d.z,cssPreview:{position:'absolute',left:fx,top:fy,width:Math.round(d.w),height:Math.round(d.h),zIndex:d.z}};
    S.placements[d.sel]=pl;writePl();
    applyPl(d.el,pl.translateX,pl.translateY,pl.zIndex);
    if(d.ghost){try{document.body.removeChild(d.ghost);}catch(e){}}
    d.el.removeAttribute('data-tk-drag-src');
    if(S.selected){S.selected.pl=pl;S.selected.zIndex=pl.zIndex;}
    S.drag=null;S.suppressClick=true;setTimeout(function(){S.suppressClick=false;},140);
    setTimeout(refreshRing,0);
  }

  // ── Agent / Run all ──────────────────────────────────────────────────────
  function batchPrompt(cmds){
    return'You are handling a batch of Tartanak UI edit requests from pc77.\\n\\n'+
      'Goal: implement ALL changes in ${process.env.WORKSPACE_DIR || process.cwd()}, verify each, keep the live preview working.\\n\\n'+
      'Batch commands ('+cmds.length+' total):\\n'+JSON.stringify(cmds,null,2)+'\\n\\n'+
      'Process each in order. For each: (1) find the target file via estimatedSourceFile/componentHint/selector, '+
      '(2) apply the smallest focused change satisfying the prompt, (3) prefer Tailwind class edits over inline styles.\\n'+
      'After all: run node --check, append a completion note to memory/2026-05-26.md.';
  }

  var sse=null;
  function watchAgent(id){
    if(sse){try{sse.close();}catch(e){}sse=null;}
    var done=false;
    var fb=setTimeout(function(){if(!done&&sse){done=true;try{sse.close();}catch(e){}sse=null;pollAgent(id,0);}},4000);
    try{
      var src=new EventSource(location.origin+'/__tartanak/events');sse=src;
      src.addEventListener('agent-done',function(ev){
        try{
          var d=JSON.parse(ev.data);if(d.requestId!==id)return;
          done=true;clearTimeout(fb);src.close();sse=null;
          if(d.status==='completed'){tbStatus.textContent='✓ Done! Auto-refreshing in 30s…';startCountdown(30);}
          else{tbStatus.textContent='✗ Agent failed (code '+d.exitCode+')';S.agentRunning=false;runBtn.disabled=false;if(hRun)hRun.disabled=false;}
        }catch(e){}
      });
      src.addEventListener('agent-running',function(ev){
        try{var d=JSON.parse(ev.data);if(d.requestId===id)tbStatus.textContent='⚙ Agent applying changes…';}catch(e){}
      });
      src.onerror=function(){if(done)return;done=true;clearTimeout(fb);src.close();sse=null;pollAgent(id,0);};
      src.onopen=function(){clearTimeout(fb);fb=setTimeout(function(){if(!done)pollAgent(id,0);},120000);};
    }catch(e){clearTimeout(fb);pollAgent(id,0);}
  }
  function pollAgent(id,n){
    if(!id||n>120)return;
    fetch(location.origin+'/__tartanak/agent-status?requestId='+encodeURIComponent(id),{headers:{accept:'application/json'}})
      .then(function(r){return r.json();})
      .then(function(d){
        if(!d||!d.ok)return;
        if(d.status==='running'||d.status==='started'){tbStatus.textContent='⚙ Agent running…';setTimeout(function(){pollAgent(id,n+1);},2500);return;}
        if(d.status==='completed'||d.status==='finished'){tbStatus.textContent='✓ Done! Auto-refreshing in 30s…';startCountdown(30);return;}
        if(/fail/.test(d.status)){tbStatus.textContent='✗ Failed: '+(d.error||'').slice(0,100);S.agentRunning=false;runBtn.disabled=false;if(hRun)hRun.disabled=false;}
      }).catch(function(){});
  }
  function startCountdown(secs){
    countdown.style.display='flex';var r=secs;cntNum.textContent=r;
    var iv=setInterval(function(){r--;cntNum.textContent=r;if(r<=0){clearInterval(iv);location.reload(true);}},1000);
  }
  function runAll(){
    if(!S.queue.length){tbStatus.textContent='Queue is empty. Enable edit mode and right-click elements.';return;}
    if(S.agentRunning)return;
    S.agentRunning=true;runBtn.disabled=true;if(hRun)hRun.disabled=true;
    var cmds=S.queue.slice();
    tbStatus.textContent='Sending '+cmds.length+' command'+(cmds.length>1?'s':'')+' to agent…';
    S.historyOpen=false;hist.style.display='none';
    var tgt=cmds.length===1?cmds[0].target:{name:'batch',selector:'body',type:'batch',tag:'body',
      xpath:'/html[1]/body[1]',domPath:['body'],componentHint:'',estimatedSourceFile:'app/page.tsx',
      text:'',html:'',attributes:{},computedStyles:{},tailwindClasses:[],nonTailwindClasses:[],
      rect:null,documentRect:null,pl:null,zIndex:null};
    fetch(location.origin+'/__tartanak/edit-request',{method:'POST',headers:{'content-type':'application/json'},
      body:JSON.stringify({pageUrl:pu(),sessionId:'pc77-batch-'+Date.now().toString(36),target:tgt,
        prompt:batchPrompt(cmds),intent:{type:'batch',count:cmds.length},priority:'high',batchCommands:cmds})
    }).then(function(r){return r.json();})
    .then(function(d){
      if(!d.ok)throw new Error(d.error||'request_failed');
      if(d.agentDispatched){tbStatus.textContent='⚙ Dispatched '+cmds.length+' command'+(cmds.length>1?'s':'')+' to agent…';clearCmds();watchAgent(d.id);}
      else{tbStatus.textContent='Saved, agent not started: '+(d.agentError||d.message||'');S.agentRunning=false;runBtn.disabled=false;if(hRun)hRun.disabled=false;}
    }).catch(function(err){tbStatus.textContent='✗ '+err.message;S.agentRunning=false;runBtn.disabled=false;if(hRun)hRun.disabled=false;});
  }

  // ── Init ─────────────────────────────────────────────────────────────────
  readPl();applyAllPl();syncPl();refreshQueueUI();
  window.addEventListener('resize',function(){if(S.lastTarget)refreshRing();});
  window.addEventListener('scroll',refreshRing,true);
  (function(){
    if(!window.MutationObserver)return;
    var t=null,root=document.querySelector('[data-nextjs-scroll-focus-boundary],#__next,main')||document.body;
    new MutationObserver(function(){if(!Object.keys(S.placements).length)return;clearTimeout(t);t=setTimeout(applyAllPl,350);}).observe(root,{childList:true,subtree:false});
  }());
})();
</script>`;
}

function getTartanakEditorShell() {
  return `<style data-tartanak-editor-shell>
#tk-topbar[data-tartanak-editor] {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2147483646;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 14px;
  background: rgba(8, 17, 31, .92);
  border: 1px solid rgba(20, 184, 166, .25);
  border-top: none;
  border-radius: 0 0 16px 16px;
  box-shadow: 0 8px 32px rgba(2, 6, 23, .35);
  color: #ecfeff;
  font: 500 13px/1 Inter, ui-sans-serif, system-ui, sans-serif;
}
</style>
<div id="tk-topbar" data-tartanak-editor>
  <div style="width:26px;height:26px;display:grid;place-items:center;border-radius:7px;border:1px solid rgba(20,184,166,.4);background:rgba(15,23,42,.8);color:#fff;font:950 13px/1 sans-serif;flex:0 0 auto">T</div>
  <span style="color:#5eead4;font:700 11px/1 sans-serif;white-space:nowrap">Tartanak Editor</span>
</div>`;
}


function injectBeforeBody(html, injection) {
  if (html.includes("</body>")) return html.replace("</body>", `${injection}</body>`);
  return html + injection;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function rewriteLeakedRootUrls(html, proxyBase) {
  if (!proxyBase) return html;
  const escapedBase = escapeRegExp(proxyBase.slice(1));

  let rewritten = html.replace(
    /((?:href|src|action|poster)\s*=\s*["'])\/(?!\/)/gi,
    (match, prefix, offset, fullText) => {
      const afterSlash = fullText.slice(offset + match.length, offset + match.length + proxyBase.length);
      return new RegExp(`^${escapedBase}(?:/|$)`).test(afterSlash) ? match : `${prefix}${proxyBase}/`;
    },
  );

  rewritten = rewritten.replace(
    /((?:srcset|srcSet)\s*=\s*["'])([^"']*)/g,
    (_match, prefix, value) => {
      const nextValue = value.replace(/(^|,\s*)\/(?!\/)/g, (segment, lead, offset, fullValue) => {
        const afterSlash = fullValue.slice(offset + lead.length + 1, offset + lead.length + 1 + proxyBase.length);
        return new RegExp(`^${escapedBase}(?:/|$)`).test(afterSlash) ? segment : `${lead}${proxyBase}/`;
      });
      return `${prefix}${nextValue}`;
    },
  );

  return rewritten;
}

// Server-Sent Events: broadcast real-time agent status to all connected editor panels.
const sseClients = new Set();

function broadcastSSE(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of [...sseClients]) {
    try {
      client.write(payload);
    } catch {
      sseClients.delete(client);
    }
  }
}

function handleSSE(req, res) {
  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    "connection": "keep-alive",
    "access-control-allow-origin": "*",
    "x-accel-buffering": "no",
  });
  res.write(":connected\n\n");
  sseClients.add(res);
  const cleanup = () => sseClients.delete(res);
  req.on("close", cleanup);
  req.on("error", cleanup);
  // Keep-alive ping every 25 s to prevent proxy timeouts.
  const ping = setInterval(() => {
    try { res.write(":ping\n\n"); } catch { cleanup(); clearInterval(ping); }
  }, 25000);
  req.on("close", () => clearInterval(ping));
}

// ── Login page ───────────────────────────────────────────────────────────────

function getLoginPage(error = "") {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Editor Login — Tartanak</title>
  <style>
    :root{color-scheme:dark}*{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;background:#08111f;color:#ecfeff;font-family:Inter,ui-sans-serif,sans-serif}
    .card{width:min(380px,calc(100vw - 32px));padding:32px;border:1px solid rgba(20,184,166,.3);border-radius:16px;background:rgba(15,23,42,.9);box-shadow:0 24px 70px rgba(2,6,23,.5)}
    .logo{width:52px;height:52px;display:grid;place-items:center;border-radius:14px;border:1px solid rgba(20,184,166,.4);background:rgba(15,23,42,.8);color:#fff;font:950 22px/1 sans-serif;margin:0 auto 20px}
    h1{margin:0 0 6px;font-size:22px;text-align:center}
    p{margin:0 0 24px;color:#64748b;font-size:14px;text-align:center}
    label{display:block;font-size:11px;font-weight:700;color:#94a3b8;margin-bottom:6px;text-transform:uppercase;letter-spacing:.5px}
    input[type=password]{width:100%;padding:10px 14px;border:1px solid rgba(148,163,184,.2);border-radius:8px;background:rgba(2,6,23,.8);color:#f8fafc;font-size:15px;outline:none}
    input[type=password]:focus{border-color:#2dd4bf;box-shadow:0 0 0 3px rgba(45,212,191,.1)}
    button{width:100%;margin-top:16px;padding:12px;border:none;border-radius:8px;background:#2dd4bf;color:#042f2e;font:800 14px/1 sans-serif;cursor:pointer}
    .err{margin-top:12px;padding:10px 14px;border-radius:8px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#f87171;font-size:13px;text-align:center}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">T</div>
    <h1>Tartanak Editor</h1>
    <p>This editor is password protected.</p>
    <form method="POST" action="/__tartanak/login">
      <input type="hidden" name="redirect" value="/edit/localhost:3000" />
      <label>Password</label>
      <input type="password" name="password" autofocus autocomplete="current-password" />
      <button type="submit">Unlock Editor</button>
      ${error ? `<div class="err">${error}</div>` : ""}
    </form>
  </div>
</body>
</html>`;
}

async function handleLogin(req, res) {
  if (req.method === "GET") {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
    res.end(getLoginPage());
    return;
  }
  if (req.method === "POST") {
    const rawBody = await readRequestBody(req);
    const params = new URLSearchParams(rawBody);
    const password = params.get("password") || "";
    const redirect = params.get("redirect") || "/edit/localhost:3000";
    if (checkPassword(password)) {
      const token = createSession();
      res.writeHead(302, {
        location: redirect,
        "set-cookie": `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`,
        "cache-control": "no-store",
      });
      res.end();
    } else {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      res.end(getLoginPage("Incorrect password. Try again."));
    }
    return;
  }
  sendJson(res, 405, { ok: false, error: "method_not_allowed" });
}

async function handleSetPassword(req, res) {
  addCors(res, req);
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  if (req.method !== "POST") { sendJson(res, 405, { ok: false, error: "method_not_allowed" }); return; }
  const rawBody = await readRequestBody(req);
  const payload = JSON.parse(rawBody || "{}");
  const password = String(payload.password ?? "").trim();
  if (!password) {
    writeConfig({ editorPasswordHash: null });
    activeSessions.clear();
    sendJson(res, 200, { ok: true, message: "Password removed." });
    return;
  }
  if (password.length < 4) { sendJson(res, 400, { ok: false, error: "Password must be at least 4 characters." }); return; }
  writeConfig({ editorPasswordHash: hashPassword(password) });
  sendJson(res, 200, { ok: true, message: "Password set." });
}

// One-time access tokens: allow a dashboard user to open the editor without the password.
const accessTokens = new Map(); // token → expiresAt (ms)
const ACCESS_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes

function pruneAccessTokens() {
  const now = Date.now();
  for (const [t, exp] of accessTokens) if (now > exp) accessTokens.delete(t);
}

function handleRequestEditorAccess(req, res) {
  addCors(res, req);
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  if (req.method !== "POST") { sendJson(res, 405, { ok: false, error: "method_not_allowed" }); return; }
  pruneAccessTokens();
  const token = crypto.randomBytes(24).toString("hex");
  accessTokens.set(token, Date.now() + ACCESS_TOKEN_TTL_MS);
  sendJson(res, 200, { ok: true, token, ttlSeconds: ACCESS_TOKEN_TTL_MS / 1000 });
}

function isValidAccessToken(tokenParam) {
  if (!tokenParam) return false;
  pruneAccessTokens();
  const exp = accessTokens.get(tokenParam);
  if (!exp || Date.now() > exp) return false;
  accessTokens.delete(tokenParam); // one-time use
  return true;
}

function handleGetEditorConfig(req, res) {
  addCors(res, req);
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  const cfg = readConfig();
  sendJson(res, 200, {
    ok: true,
    passwordSet: Boolean(cfg.editorPasswordHash),
    dashboardAuthEnabled: Boolean(cfg.dashboardAuthEnabled),
  });
}

// ── Service health & restart ──────────────────────────────────────────────────

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.request({ hostname: "127.0.0.1", port, path: "/", method: "GET" }, (upRes) => {
      resolve({ up: (upRes.statusCode || 0) < 500, code: upRes.statusCode });
      upRes.resume();
    });
    req.setTimeout(2000, () => { req.destroy(); resolve({ up: false, code: 0 }); });
    req.on("error", () => resolve({ up: false, code: 0 }));
    req.end();
  });
}

function addCors(res, req) {
  const origin = req.headers.origin || "*";
  res.setHeader("access-control-allow-origin", origin);
  res.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  res.setHeader("access-control-allow-headers", "content-type, authorization");
  res.setHeader("access-control-allow-credentials", "true");
}

async function handleServicesStatus(req, res) {
  addCors(res, req);
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  const [nextjs, annotator, editorProxy, publicProxy] = await Promise.all([
    checkPort(NEXT_PORT), checkPort(ANNOTATOR_PORT), checkPort(EDITOR_PORT), checkPort(PUBLIC_PORT_NUM),
  ]);
  sendJson(res, 200, { ok: true, services: [
    { name: "Next.js",      port: NEXT_PORT,       ...nextjs },
    { name: "UI Annotator", port: ANNOTATOR_PORT,  ...annotator },
    { name: "Editor Proxy", port: EDITOR_PORT,     ...editorProxy },
    { name: "Public Proxy", port: PUBLIC_PORT_NUM, ...publicProxy },
  ]});
}

function handleServicesRestart(req, res) {
  addCors(res, req);
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }
  if (req.method !== "POST") { sendJson(res, 405, { ok: false, error: "method_not_allowed" }); return; }
  const startScript = path.join(workDir, "start.sh");
  sendJson(res, 200, { ok: true, message: "Restart initiated. Reconnect in ~15 seconds." });
  setTimeout(() => {
    spawn("bash", [startScript], { cwd: workDir, detached: true, stdio: "ignore" }).unref();
  }, 600);
}

function startProxy({ listen, target, editor = false }) {
  const server = http.createServer((req, res) => {
    // ── Auth middleware & new routes (editor proxy only) ─────────────────────
    if (editor) {
      const urlPath = (req.url || "/").split("?")[0];

      if (urlPath === "/__tartanak/login" || urlPath.startsWith("/__tartanak/login/")) {
        handleLogin(req, res);
        return;
      }

      if (urlPath === "/__tartanak/services") { handleServicesStatus(req, res); return; }
      if (urlPath === "/__tartanak/services/restart") { handleServicesRestart(req, res); return; }
      if (urlPath === "/__tartanak/services/password") { handleSetPassword(req, res); return; }
      if (urlPath === "/__tartanak/request-editor-access") { handleRequestEditorAccess(req, res); return; }
      if (urlPath === "/__tartanak/editor-config") { handleGetEditorConfig(req, res); return; }

      // Auth: access token in URL param grants a session (one-time, 5 min TTL)
      const qs = new URL(req.url || "/", "http://127.0.0.1");
      const accessToken = qs.searchParams.get("access_token");
      if (accessToken && isValidAccessToken(accessToken)) {
        const token = createSession();
        const dest = urlPath + (qs.search.replace(/[?&]access_token=[^&]*/g, "").replace(/^&/, "?").replace(/^\?$/, "") || "");
        res.writeHead(302, {
          location: dest || "/edit/localhost:3000",
          "set-cookie": `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`,
          "cache-control": "no-store",
        });
        res.end();
        return;
      }

      if (isPasswordProtected() && !isAuthorizedRequest(req)) {
        const exempt = isStaticAssetPath(urlPath) || urlPath.startsWith("/_next/") || urlPath.startsWith("/__tartanak/");
        if (!exempt) {
          res.writeHead(302, { location: "/__tartanak/login", "cache-control": "no-store" });
          res.end();
          return;
        }
      }
    }

    if (editor && (req.url === "/__tartanak/edit-request" || req.url === "/edit/__tartanak/edit-request")) {
      handleEditRequest(req, res);
      return;
    }

    if (editor && (req.url?.startsWith("/__tartanak/placements") || req.url?.startsWith("/edit/__tartanak/placements"))) {
      handlePlacements(req, res);
      return;
    }

    if (editor && (req.url?.startsWith("/__tartanak/agent-status") || req.url?.startsWith("/edit/__tartanak/agent-status"))) {
      handleAgentStatus(req, res);
      return;
    }

    if (editor && (req.url?.startsWith("/__tartanak/events") || req.url?.startsWith("/edit/__tartanak/events"))) {
      handleSSE(req, res);
      return;
    }

    const route = editor ? resolveEditorRequest(req.url) : { kind: "passthrough", upstreamPath: req.url, proxyBase: "", injectEditor: false };

    if (editor && route.kind === "landing") {
      res.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      });
      res.end(getEditorLandingPage());
      return;
    }

    // Static assets (JS, CSS, fonts, images, Next.js internals): bypass the annotator
    // and proxy directly to the Next.js dev server so paths are correct.
    if (editor && route.kind === "static") {
      const staticHeaders = { ...req.headers };
      delete staticHeaders["accept-encoding"];
      const staticReq = http.request(
        { hostname: "127.0.0.1", port: route.directPort, method: req.method, path: route.upstreamPath, headers: staticHeaders },
        (upRes) => {
          res.writeHead(upRes.statusCode ?? 502, upRes.headers);
          upRes.pipe(res);
        },
      );
      staticReq.on("error", (err) => {
        res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
        res.end(`static proxy error: ${err.message}`);
      });
      req.pipe(staticReq);
      return;
    }

    const isEditPage = Boolean(editor && route.injectEditor);
    const upstreamPath = route.upstreamPath || req.url;
    const proxyBase = route.proxyBase || "";
    const headers = { ...req.headers, host: req.headers.host };
    delete headers["accept-encoding"];

    const upstream = http.request(
      {
        hostname: "127.0.0.1",
        port: target,
        method: req.method,
        path: upstreamPath,
        headers,
      },
      (upstreamRes) => {
        const contentType = upstreamRes.headers["content-type"] || "";
        if (!editor || !String(contentType).includes("text/html")) {
          res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
          upstreamRes.pipe(res);
          return;
        }

        let body = "";
        upstreamRes.setEncoding("utf8");
        upstreamRes.on("data", (chunk) => {
          body += chunk;
        });
        upstreamRes.on("end", () => {
          const responseHeaders = { ...upstreamRes.headers };
          delete responseHeaders["content-length"];
          delete responseHeaders["content-encoding"];
          delete responseHeaders["content-security-policy"];
          responseHeaders["content-type"] = "text/html; charset=utf-8";
          responseHeaders["cache-control"] = "no-store";

          const rewritten = rewriteLeakedRootUrls(body, proxyBase);
          const finalBody = isEditPage
            ? injectBeforeBody(rewritten, getTartanakEditorShell() + getTartanakEditorScript())
            : rewritten;

          res.writeHead(upstreamRes.statusCode ?? 502, responseHeaders);
          res.end(finalBody);
        });
      },
    );

    upstream.on("error", (error) => {
      res.writeHead(502, { "content-type": "text/plain; charset=utf-8" });
      res.end(`proxy error: ${error.message}`);
    });

    req.pipe(upstream);
  });

  server.on("upgrade", (req, socket, head) => {
    // Next.js HMR WebSocket paths contain the host:port prefix — strip it so HMR
    // connects to the real dev server, not the annotator.
    let wsUrl = req.url || "/";
    let wsTarget = target;
    if (editor) {
      const wsMatch = wsUrl.match(/^\/(?:edit\/)?([^/]+):(\d+)(\/.*)?$/);
      if (wsMatch) {
        wsTarget = Number(wsMatch[2]) || target;
        wsUrl = wsMatch[3] || "/";
      }
    }
    const upstream = net.connect(wsTarget, "127.0.0.1", () => {
      upstream.write(`${req.method} ${wsUrl} HTTP/${req.httpVersion}\r\n`);
      for (const [key, value] of Object.entries(req.headers)) {
        upstream.write(`${key}: ${value}\r\n`);
      }
      upstream.write("\r\n");
      if (head.length > 0) upstream.write(head);
      socket.pipe(upstream);
      upstream.pipe(socket);
    });

    upstream.on("error", () => socket.destroy());
  });

  server.listen(listen, "0.0.0.0", () => {
    console.log(`proxy ${listen} -> ${target}${editor ? " + editor" : ""}`);
  });
}

// ── Unified single-port proxy ─────────────────────────────────────────────────
//
//  PATH ROUTING  (BASE_PATH prefix stripped first, then matched):
//    /tartanak/edit/*  → Next.js (CMS editor, injects editor UI)
//    /__tartanak/*     → proxy API (editor tokens, services, password, login)
//    /tartanak/*       → Tartanak gateway dashboard (strips /tartanak, fwd to GATEWAY_PORT)
//    /*                → Next.js public website
//
//  WS ROUTING:
//    /tartanak/*       → gateway (strips prefix)
//    /*                → Next.js (HMR)
//
function startUnifiedProxy() {
  const EDIT_BASE    = BASE_PATH + "/tartanak/edit";
  const GATEWAY_BASE = BASE_PATH + "/tartanak";

  function pipeToPort(req, res, port, targetPath) {
    const headers = { ...req.headers, host: `127.0.0.1:${port}` };
    delete headers["accept-encoding"];
    const up = http.request({ hostname: "127.0.0.1", port, method: req.method, path: targetPath, headers }, (upRes) => {
      res.writeHead(upRes.statusCode ?? 502, upRes.headers);
      upRes.pipe(res);
    });
    up.on("error", () => { try { res.writeHead(502); res.end("proxy error"); } catch { /* already sent */ } });
    req.pipe(up);
  }

  function pipeEditorPage(req, res, nextPath) {
    const headers = { ...req.headers, host: `127.0.0.1:${NEXT_PORT}` };
    delete headers["accept-encoding"];
    const up = http.request({ hostname: "127.0.0.1", port: NEXT_PORT, method: req.method, path: nextPath, headers },
      (upRes) => {
        const ct = upRes.headers["content-type"] || "";
        if (!String(ct).includes("text/html")) { res.writeHead(upRes.statusCode ?? 502, upRes.headers); upRes.pipe(res); return; }
        let body = "";
        upRes.setEncoding("utf8");
        upRes.on("data", (c) => { body += c; });
        upRes.on("end", () => {
          const rh = { ...upRes.headers };
          delete rh["content-length"]; delete rh["content-encoding"]; delete rh["content-security-policy"];
          rh["content-type"] = "text/html; charset=utf-8"; rh["cache-control"] = "no-store";
          const proxyBase = EDIT_BASE; // prefix for URL rewriting in editor HTML
          const finalBody = injectBeforeBody(
            rewriteLeakedRootUrls(body, proxyBase),
            getTartanakEditorShell() + getTartanakEditorScript(),
          );
          res.writeHead(upRes.statusCode ?? 502, rh);
          res.end(finalBody);
        });
      });
    up.on("error", () => { try { res.writeHead(502); res.end("editor proxy error"); } catch { /* */ } });
    req.pipe(up);
  }

  const server = http.createServer((req, res) => {
    const rawUrl = req.url || "/";
    const urlPath = rawUrl.split("?")[0];
    const query   = rawUrl.includes("?") ? "?" + rawUrl.split("?")[1] : "";

    // ── Auth + API endpoints (no auth required to reach these) ──────────────
    if (urlPath === "/__tartanak/login" || urlPath.startsWith("/__tartanak/login/")) { handleLogin(req, res); return; }
    if (urlPath === "/__tartanak/services")             { handleServicesStatus(req, res); return; }
    if (urlPath === "/__tartanak/services/restart")     { handleServicesRestart(req, res); return; }
    if (urlPath === "/__tartanak/services/password")    { handleSetPassword(req, res); return; }
    if (urlPath === "/__tartanak/request-editor-access") { handleRequestEditorAccess(req, res); return; }
    if (urlPath === "/__tartanak/editor-config")        { handleGetEditorConfig(req, res); return; }

    // Access-token exchange: one-time token → session cookie → redirect
    const qs = new URL(rawUrl, "http://127.0.0.1");
    const accessToken = qs.searchParams.get("access_token");
    if (accessToken && isValidAccessToken(accessToken)) {
      const token = createSession();
      const dest = urlPath + query.replace(/[?&]access_token=[^&]*/g, "").replace(/^&/, "?").replace(/^\?$/, "");
      res.writeHead(302, { location: dest || (EDIT_BASE + "/localhost:3000"), "set-cookie": `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7*24*3600}`, "cache-control": "no-store" });
      res.end(); return;
    }

    // ── Other /__tartanak/* API (edit requests, placements, SSE) ────────────
    if (urlPath.startsWith("/__tartanak/")) {
      // these handlers check method internally
      if (urlPath === "/__tartanak/edit-request")                 { handleEditRequest(req, res); return; }
      if (urlPath.startsWith("/__tartanak/placements"))           { handlePlacements(req, res); return; }
      if (urlPath.startsWith("/__tartanak/agent-status"))         { handleAgentStatus(req, res); return; }
      if (urlPath.startsWith("/__tartanak/events"))               { handleSSE(req, res); return; }
      res.writeHead(404); res.end("not found"); return;
    }

    // ── Editor password gate ─────────────────────────────────────────────────
    if (isPasswordProtected() && !isAuthorizedRequest(req)) {
      const isEditor = urlPath.startsWith(EDIT_BASE + "/") || urlPath === EDIT_BASE;
      const exempt   = isStaticAssetPath(urlPath) || urlPath.startsWith("/_next/");
      if (isEditor && !exempt) {
        res.writeHead(302, { location: "/__tartanak/login", "cache-control": "no-store" }); res.end(); return;
      }
    }

    // ── Route by path ────────────────────────────────────────────────────────

    // 1. Editor: /tartanak/edit/*  (must come before gateway check)
    if (urlPath.startsWith(EDIT_BASE + "/") || urlPath === EDIT_BASE) {
      const stripped = urlPath.slice(EDIT_BASE.length) || "/";
      // static assets bypass injection
      if (isStaticAssetPath(stripped)) {
        pipeToPort(req, res, NEXT_PORT, stripped + query);
      } else {
        pipeEditorPage(req, res, stripped + query);
      }
      return;
    }

    // 2. Gateway dashboard: /tartanak/*  → strip prefix, forward to gateway
    // Redirect /tartanak → /tartanak/ so relative asset URLs resolve correctly
    if (urlPath === GATEWAY_BASE) {
      res.writeHead(301, { location: GATEWAY_BASE + "/" + query, "cache-control": "no-store" });
      res.end(); return;
    }
    if (urlPath.startsWith(GATEWAY_BASE + "/")) {
      const stripped = urlPath.slice(GATEWAY_BASE.length) || "/";
      pipeToPort(req, res, GATEWAY_PORT, stripped + query);
      return;
    }

    // 3. Gateway internal API + WebSocket path: /__tartanak/* and /ws → gateway (no prefix strip)
    if (urlPath.startsWith("/__tartanak/") || urlPath === "/__tartanak" ||
        urlPath === "/ws" || urlPath.startsWith("/ws?") ||
        urlPath === "/connect" || urlPath === "/webui" || urlPath.startsWith("/webui/")) {
      pipeToPort(req, res, GATEWAY_PORT, rawUrl);
      return;
    }

    // 4. Base-path stripping (if BASE_PATH is set)
    let websitePath = rawUrl;
    if (BASE_PATH && urlPath.startsWith(BASE_PATH + "/")) {
      websitePath = urlPath.slice(BASE_PATH.length) + query;
    }

    // 5. Public website
    pipeToPort(req, res, NEXT_PORT, websitePath);
  });

  // ── WebSocket upgrade ─────────────────────────────────────────────────────
  server.on("upgrade", (req, socket, head) => {
    const wsUrl  = req.url || "/";
    const wsPath = wsUrl.split("?")[0];
    const wsQuery = wsUrl.includes("?") ? "?" + wsUrl.split("?")[1] : "";

    let targetPort = NEXT_PORT;
    let targetPath = wsUrl;

    if (wsPath.startsWith(GATEWAY_BASE + "/") || wsPath === GATEWAY_BASE || wsPath === GATEWAY_BASE + "/") {
      // Gateway WebSocket — strip /tartanak prefix
      targetPort = GATEWAY_PORT;
      targetPath = (wsPath.slice(GATEWAY_BASE.length) || "/") + wsQuery;
    } else if (wsPath === "/ws" || wsPath.startsWith("/ws?") ||
               wsPath.startsWith("/__tartanak/") || wsPath === "/__tartanak") {
      // Gateway internal WebSocket / API endpoints — forward as-is
      targetPort = GATEWAY_PORT;
      targetPath = wsUrl;
    } else if (wsPath.startsWith(EDIT_BASE)) {
      // Next.js HMR inside editor frame
      const stripped = wsPath.slice(EDIT_BASE.length) || "/";
      targetPath = stripped + wsQuery;
    }

    const upstream = net.connect(targetPort, "127.0.0.1", () => {
      upstream.write(`${req.method} ${targetPath} HTTP/${req.httpVersion}\r\n`);
      for (const [k, v] of Object.entries(req.headers)) upstream.write(`${k}: ${v}\r\n`);
      upstream.write("\r\n");
      if (head.length > 0) upstream.write(head);
      socket.pipe(upstream); upstream.pipe(socket);
    });
    upstream.on("error", () => socket.destroy());
  });

  server.listen(UNIFIED_PORT, "0.0.0.0", () => {
    console.log(`[proxy] unified port ${UNIFIED_PORT} | website=:${NEXT_PORT} gateway=:${GATEWAY_PORT} BASE_PATH="${BASE_PATH}"`);
    console.log(`[proxy]   /               → website`);
    console.log(`[proxy]   /tartanak/      → gateway dashboard`);
    console.log(`[proxy]   /tartanak/edit/ → CMS editor`);
  });
}

// Dead code from removed getDevConsoleScript — kept as marker for git history
function _removed_getDevConsoleScript_DEAD() {
  return `<script data-tartanak-devcon>
(function(){
  if(window.__tkDevCon)return;
  window.__tkDevCon=true;
  var TE='data-tartanak-editor';
  function te(el){el.setAttribute(TE,'1');return el;}
  function mk(tag,cls,txt){var el=document.createElement(tag);te(el);if(cls)el.className=cls;if(txt!==undefined)el.textContent=txt;return el;}

  var sty=document.createElement('style');te(sty);
  sty.textContent=[
    '#tk-dc-btn{position:fixed;left:0;top:50%;transform:translateY(-50%);z-index:2147483635;width:26px;height:72px;background:rgba(8,17,31,.94);border:1px solid rgba(20,184,166,.22);border-left:none;border-radius:0 10px 10px 0;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#5eead4;font:800 9px/1 Inter,sans-serif;writing-mode:vertical-rl;letter-spacing:.6px;padding:0;transition:all .2s;box-shadow:2px 0 12px rgba(2,6,23,.25)}',
    '#tk-dc-btn:hover{background:rgba(20,184,166,.1);border-color:rgba(45,212,191,.4);color:#2dd4bf;width:30px}',
    '#tk-dc-btn.dco{left:280px;border-left:1px solid rgba(20,184,166,.18);border-right:none;border-radius:10px 0 0 10px;box-shadow:-2px 0 12px rgba(2,6,23,.25)}',
    '#tk-devcon{position:fixed;left:-290px;top:0;height:100vh;width:280px;z-index:2147483634;background:rgba(8,17,31,.97);border-right:1px solid rgba(20,184,166,.15);display:flex;flex-direction:column;transition:left .25s cubic-bezier(.4,0,.2,1);box-shadow:4px 0 28px rgba(2,6,23,.45);overflow:hidden}',
    '#tk-devcon.dco{left:0}',
    '.dkh{display:flex;align-items:center;justify-content:space-between;padding:14px 12px 10px;border-bottom:1px solid rgba(148,163,184,.07);flex-shrink:0;background:rgba(15,23,42,.4)}',
    '.dkht{color:#ecfeff;font:800 13px/1 Inter,sans-serif}',
    '.dkcl{width:22px;height:22px;border-radius:6px;border:1px solid rgba(148,163,184,.1);background:transparent;color:#475569;cursor:pointer;font-size:14px;display:grid;place-items:center;padding:0;flex-shrink:0}',
    '.dkcl:hover{color:#f87171;border-color:rgba(239,68,68,.22)}',
    '.dkb{flex:1;overflow-y:auto;padding:14px 12px;display:flex;flex-direction:column;gap:14px}',
    '.dks{display:flex;flex-direction:column;gap:6px}',
    '.dkst{font:700 10px/1 Inter,sans-serif;color:#475569;text-transform:uppercase;letter-spacing:.8px;margin-bottom:1px}',
    '.dksv{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;border-radius:8px;background:rgba(15,23,42,.6);border:1px solid rgba(148,163,184,.06)}',
    '.dksvi{display:flex;flex-direction:column;gap:2px}',
    '.dksvn{font:600 12px/1 Inter,sans-serif;color:#cbd5e1}',
    '.dksvp{font:500 10px/1 ui-monospace,monospace;color:#475569}',
    '.dkdot{width:9px;height:9px;border-radius:50%;flex-shrink:0;transition:all .3s}',
    '.dkdot.up{background:#22c55e;box-shadow:0 0 6px rgba(34,197,94,.5)}',
    '.dkdot.dn{background:#ef4444;box-shadow:0 0 5px rgba(239,68,68,.35)}',
    '.dkdot.chk{background:#f59e0b;animation:dkpl .7s ease-in-out infinite}',
    '@keyframes dkpl{0%,100%{opacity:.3}50%{opacity:1}}',
    '.dkbtn{width:100%;padding:8px 12px;border-radius:8px;border:1px solid rgba(148,163,184,.12);background:rgba(15,23,42,.6);color:#94a3b8;font:700 11px/1 Inter,sans-serif;cursor:pointer;transition:all .15s;text-align:center;display:block}',
    '.dkbtn:hover:not(:disabled){border-color:rgba(45,212,191,.35);color:#2dd4bf;background:rgba(45,212,191,.05)}',
    '.dkbtn:disabled{opacity:.35;cursor:not-allowed}',
    '.dkmsg{font:500 11px/1.4 Inter,sans-serif;color:#64748b;padding:7px 9px;border-radius:7px;background:rgba(15,23,42,.4);border:1px solid transparent;display:none}',
    '.dkmsg.sh{display:block}',
    '.dkmsg.ok{color:#22c55e;background:rgba(34,197,94,.05);border-color:rgba(34,197,94,.12)}',
    '.dkmsg.er{color:#f87171;background:rgba(239,68,68,.05);border-color:rgba(239,68,68,.12)}',
    '.dkmsg.in{color:#5eead4;background:rgba(45,212,191,.04);border-color:rgba(45,212,191,.1)}',
    '.dkir{display:flex;gap:6px;align-items:stretch}',
    '.dkin{flex:1;padding:7px 10px;border:1px solid rgba(148,163,184,.12);border-radius:7px;background:rgba(2,6,23,.8);color:#f8fafc;font:500 12px/1 Inter,sans-serif;outline:none}',
    '.dkin:focus{border-color:#2dd4bf;box-shadow:0 0 0 2px rgba(45,212,191,.07)}',
    '.dkib{padding:7px 12px;border-radius:7px;border:1px solid rgba(148,163,184,.12);background:rgba(15,23,42,.6);color:#94a3b8;font:700 11px/1 Inter,sans-serif;cursor:pointer;white-space:nowrap;flex-shrink:0}',
    '.dkib:hover{border-color:rgba(45,212,191,.35);color:#2dd4bf}',
    '.dkdsc{font:500 11px/1.45 Inter,sans-serif;color:#475569}',
  ].join('');
  document.head.appendChild(sty);

  function mkSvc(name,port){
    var d=mk('div','dksv');d.id='dksv-'+port;
    var inf=mk('div','dksvi');te(inf);
    var n=mk('div','dksvn',name);var p=mk('div','dksvp',':'+port);
    inf.appendChild(n);inf.appendChild(p);
    var dot=mk('span','dkdot chk');dot.id='dkdot-'+port;
    d.appendChild(inf);d.appendChild(dot);
    return d;
  }

  var panel=mk('div');panel.id='tk-devcon';

  var head=mk('div','dkh');
  var htitle=mk('div','dkht','⚙ Dev Console');
  var closeBtn=mk('button','dkcl','×');closeBtn.id='dk-close';closeBtn.type='button';
  head.appendChild(htitle);head.appendChild(closeBtn);

  var body=mk('div','dkb');

  // Services section
  var ss=mk('div','dks');
  ss.appendChild(mk('div','dkst','Services'));
  ss.appendChild(mkSvc('Next.js','3000'));
  ss.appendChild(mkSvc('UI Annotator','7077'));
  ss.appendChild(mkSvc('Editor Proxy','8077'));
  ss.appendChild(mkSvc('Public Proxy','8100'));
  var rfBtn=mk('button','dkbtn','↻ Check Status');rfBtn.id='dk-rf';rfBtn.type='button';te(rfBtn);
  var rsBtn=mk('button','dkbtn','↺ Restart All Services');rsBtn.id='dk-rs';rsBtn.type='button';te(rsBtn);
  var svcMsg=mk('div','dkmsg');svcMsg.id='dk-smsg';
  ss.appendChild(rfBtn);ss.appendChild(rsBtn);ss.appendChild(svcMsg);

  // Security section
  var sc=mk('div','dks');
  sc.appendChild(mk('div','dkst','Security'));
  sc.appendChild(mk('div','dkdsc','Password-protect the editor (pc77.skycode.win).'));
  var ir=mk('div','dkir');
  var pwinp=mk('input','dkin');pwinp.id='dk-pw';pwinp.type='password';pwinp.placeholder='New password…';te(pwinp);
  var pwset=mk('button','dkib','Set');pwset.id='dk-pwset';pwset.type='button';te(pwset);
  ir.appendChild(pwinp);ir.appendChild(pwset);
  var clrBtn=mk('button','dkbtn','✕ Remove Password');clrBtn.id='dk-pwclr';clrBtn.type='button';te(clrBtn);
  var pwMsg=mk('div','dkmsg');pwMsg.id='dk-pmsg';
  sc.appendChild(ir);sc.appendChild(clrBtn);sc.appendChild(pwMsg);

  body.appendChild(ss);body.appendChild(sc);
  panel.appendChild(head);panel.appendChild(body);
  document.body.appendChild(panel);

  var tog=mk('button');tog.id='tk-dc-btn';tog.type='button';tog.title='Dev Console';tog.textContent='DEV';te(tog);
  document.body.appendChild(tog);

  // ── Logic ────────────────────────────────────────────────────────────────────
  var open=false;
  function openPanel(){open=true;panel.classList.add('dco');tog.classList.add('dco');refreshStatus();}
  function closePanel(){open=false;panel.classList.remove('dco');tog.classList.remove('dco');}
  tog.addEventListener('click',function(){open?closePanel():openPanel();});
  closeBtn.addEventListener('click',closePanel);

  function setDot(port,st){
    var d=document.getElementById('dkdot-'+port);
    if(d)d.className='dkdot '+(st==='up'?'up':st==='dn'?'dn':'chk');
  }
  function msg(el,text,cls){
    el.textContent=text;el.className='dkmsg sh '+cls;
    setTimeout(function(){if(el.textContent===text)el.className='dkmsg';},6000);
  }

  function refreshStatus(){
    ['3000','7077','8077','8100'].forEach(function(p){setDot(p,'chk');});
    rfBtn.disabled=true;
    fetch(location.origin+'/__tartanak/services',{headers:{accept:'application/json'}})
      .then(function(r){return r.json();})
      .then(function(d){
        if(d.ok)d.services.forEach(function(s){setDot(String(s.port),s.up?'up':'dn');});
      })
      .catch(function(){['3000','7077','8077','8100'].forEach(function(p){setDot(p,'dn');});})
      .then(function(){rfBtn.disabled=false;});
  }

  rfBtn.addEventListener('click',refreshStatus);

  rsBtn.addEventListener('click',function(){
    rsBtn.disabled=true;
    msg(svcMsg,'Restarting… reconnect in ~15s','in');
    fetch(location.origin+'/__tartanak/services/restart',{method:'POST',headers:{'content-type':'application/json'},body:'{}'})
      .then(function(r){return r.json();})
      .then(function(d){msg(svcMsg,d.message||'Restart initiated','in');})
      .catch(function(){msg(svcMsg,'Restart sent — reconnect in ~15s','in');})
      .then(function(){rsBtn.disabled=false;});
  });

  pwset.addEventListener('click',function(){
    var pw=pwinp.value.trim();
    if(!pw){msg(pwMsg,'Enter a password first','er');return;}
    pwset.disabled=true;
    fetch(location.origin+'/__tartanak/services/password',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password:pw})})
      .then(function(r){return r.json();})
      .then(function(d){if(d.ok){pwinp.value='';msg(pwMsg,d.message,'ok');}else{msg(pwMsg,d.error||'Error','er');}})
      .catch(function(){msg(pwMsg,'Error setting password','er');})
      .then(function(){pwset.disabled=false;});
  });

  clrBtn.addEventListener('click',function(){
    clrBtn.disabled=true;
    fetch(location.origin+'/__tartanak/services/password',{method:'POST',headers:{'content-type':'application/json'},body:'{"password":""}' })
      .then(function(r){return r.json();})
      .then(function(d){msg(pwMsg,d.message||'Password removed','ok');})
      .catch(function(){msg(pwMsg,'Error removing password','er');})
      .then(function(){clrBtn.disabled=false;});
  });

  pwinp.addEventListener('keydown',function(ev){if(ev.key==='Enter')pwset.click();});
})();
</script>`;
}

for (const route of routes) startProxy(route);
if (UNIFIED_PORT) startUnifiedProxy();
