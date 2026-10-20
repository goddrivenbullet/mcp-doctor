#!/usr/bin/env node
/**
 * mcp-doctor — check that your MCP servers actually work.
 *
 *   mcp-doctor                      read ~/.config/opencode/opencode.jsonc
 *   mcp-doctor --url https://...    probe one remote server
 *   mcp-doctor --cmd "npx -y server" probe one stdio server
 *   mcp-doctor --json               machine-readable output
 */
import { readFileSync, existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { doctor, normalizeServer } from "../src/index.js"

const argv = process.argv.slice(2)
const arg = (name) => {
  const i = argv.indexOf(name)
  return i >= 0 ? argv[i + 1] : undefined
}

const cfgPath = arg("--config") || join(homedir(), ".config", "opencode", "opencode.jsonc")
let servers = []
if (arg("--url")) {
  servers = [normalizeServer("remote", { url: arg("--url") })]
} else if (arg("--cmd")) {
  servers = [normalizeServer("stdio", { command: arg("--cmd").split(/\s+/) })]
} else if (existsSync(cfgPath)) {
  const raw = readFileSync(cfgPath, "utf8").replace(/^\s*\/\/.*$/gm, "")
  const cfg = JSON.parse(raw)
  const mcp = cfg.mcp || {}
  servers = Object.entries(mcp)
    .filter(([, v]) => v && v.enabled !== false)
    .map(([name, v]) => normalizeServer(name, v))
}

if (!servers.length) {
  console.error("no MCP servers found — pass --url or --cmd, or point --config at your config")
  process.exit(2)
}

const report = await doctor(servers, { timeoutMs: Number(arg("--timeout") || 15000) })

if (argv.includes("--json")) {
  console.log(JSON.stringify(report, null, 2))
} else {
  console.log(`\nchecked ${report.total} server(s): ${report.healthy} healthy, ${report.broken} broken\n`)
  for (const r of report.results) {
    if (r.ok) {
      console.log(`  ✓ ${r.name}  ${r.tools} tools  ${r.latencyMs}ms`)
      if (r.toolNames.length) console.log(`      ${r.toolNames.slice(0, 8).join(", ")}${r.toolNames.length > 8 ? " …" : ""}`)
    } else {
      console.log(`  ✗ ${r.name}  ${r.problem}${r.error ? " — " + r.error : ""}`)
    }
  }
  if (report.broken) {
    console.log(`\n${report.broken} server(s) need attention`)
    process.exitCode = 1
  }
}
