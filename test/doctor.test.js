import { test } from "node:test"
import assert from "node:assert/strict"
import { classify, normalizeServer, serversFromConfig, FAILURE } from "../src/index.js"

test("classifies the common failures", () => {
  assert.equal(classify(new Error("spawn npx ENOENT")), FAILURE.SPAWN)
  assert.equal(classify(new Error("401 Unauthorized")), FAILURE.AUTH)
  assert.equal(classify(new Error("request timed out")), FAILURE.TIMEOUT)
  assert.equal(classify(new Error("handshake failed")), FAILURE.HANDSHAKE)
})

test("normalises every config shape", () => {
  assert.equal(normalizeServer("a", "https://x/mcp").type, "remote")
  assert.equal(normalizeServer("b", { url: "https://x/mcp" }).type, "remote")
  assert.equal(normalizeServer("c", { command: ["npx", "-y", "s"] }).type, "local")
  assert.equal(normalizeServer("d", {}).type, "unknown")
})

test("reads enabled servers from a config", () => {
  const cfg = {
    mcp: {
      a: { type: "local", command: ["x"], enabled: true },
      b: { type: "local", command: ["y"], enabled: false },
      c: { type: "remote", url: "https://z/mcp" },
    },
  }
  const list = serversFromConfig(cfg)
  assert.equal(list.length, 2)
  assert.deepEqual(list.map((s) => s.name).sort(), ["a", "c"])
})
