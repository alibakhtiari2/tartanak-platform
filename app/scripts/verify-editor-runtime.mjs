import fs from "node:fs";

const source = fs.readFileSync(new URL("./public-port-proxies.mjs", import.meta.url), "utf8");

const checks = [
  ["server placement API", "handlePlacements"],
  ["placement storage v5", "version: 5"],
  ["server placement sync", "/__tartanak/placements"],
  ["intent inference", "function inferIntent"],
  ["computed style snapshot", "function computedStyleSnapshot"],
  ["tailwind class extraction", "tailwindClasses"],
  ["source file hint", "estimatedSourceFile"],
  ["component hint", "componentHint"],
  ["xpath snapshot", "xpathFor"],
  ["document rect snapshot", "documentRect"],
  ["editor injection marker", "data-tartanak-editor"],
  ["ui annotator exclusion", "data-ui-annotator"],
  ["direct host:port edit route", "resolveEditorRequest"],
  ["right-click opens prompt panel", "openPromptForTarget(target, { selectPrompt: true })"],
  ["stable preview box drag", "tk-editor-preview-box"],
  ["agent status polling", "/__tartanak/agent-status"],
  ["node 22 launcher", "resolveTartanakNode"],
];

const missing = checks.filter(([, marker]) => !source.includes(marker));

if (missing.length > 0) {
  console.error("Editor runtime contract failed:");
  for (const [name, marker] of missing) {
    console.error(`- ${name}: missing ${marker}`);
  }
  process.exit(1);
}

console.log(`Editor runtime contract OK (${checks.length} checks).`);
