// Integration test against the real service. Skipped unless LIVE=1.
//   LIVE=1 npm test
import { test } from "node:test"
import assert from "node:assert/strict"

const LIVE = process.env.LIVE === "1"
const skip = LIVE ? false : "set LIVE=1 to run the integration test"

import { doctor, normalizeServer } from "../src/index.js"

test("probes a real MCP server over stdio", { skip }, async () => {
  const server = normalizeServer("free-web-mcp", {
    command: ["node", "/Users/admin/workspace/free-web-mcp/bin/free-web-mcp.js"],
  })
  const report = await doctor([server], { timeoutMs: 30000 })
  assert.equal(report.total, 1)
  assert.equal(report.healthy, 1, "the live server should be healthy: " + JSON.stringify(report.results))
  assert.ok(report.results[0].tools >= 5, "it should expose the five tools")
})
