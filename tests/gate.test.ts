import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { hashArgs, makeDigest, stableStringify } from "../src/crypto.js";
import { gateTrace, validateTrace } from "../src/gate.js";
import type { OpsReplayTrace } from "../src/types.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const now = new Date("2026-10-06T12:00:00Z");

async function load(name: string): Promise<OpsReplayTrace> {
  return JSON.parse(await readFile(path.join(root, "fixtures", name), "utf8")) as OpsReplayTrace;
}

describe("side-effect-replay", () => {
  it("validates fixture hashes", async () => {
    for (const name of ["bad-sms.json", "good-sms.json", "dup-sms.json"]) {
      expect(validateTrace(await load(name))).toEqual([]);
    }
  });

  it("fails gate on SMS without approval", async () => {
    const r = gateTrace(await load("bad-sms.json"), now);
    expect(r.passed).toBe(false);
    expect(r.findings.some((f) => f.code === "approval_missing")).toBe(true);
  });

  it("passes gate on approved SMS", async () => {
    const r = gateTrace(await load("good-sms.json"), now);
    expect(r.passed).toBe(true);
  });

  it("detects duplicate side effects", async () => {
    const r = gateTrace(await load("dup-sms.json"), now);
    expect(r.passed).toBe(false);
    expect(r.findings.some((f) => f.code === "duplicate_side_effect")).toBe(true);
  });

  it("detects digest tamper", async () => {
    const t = await load("good-sms.json");
    t.tools[0]!.args = { ...t.tools[0]!.args, body: "TAMPERED" };
    t.tools[0]!.args_hash = hashArgs(t.tools[0]!.args);
    // keep old digest → mismatch
    const r = gateTrace(t, now);
    expect(r.findings.some((f) => f.code === "digest_mismatch")).toBe(true);
  });

  it("makeDigest is stable", () => {
    const a = makeDigest({
      actionCanonical: stableStringify({ tool: "x", args: { b: 1, a: 2 } }),
      policyVersion: "p1",
      target: "t",
      expiry: "2026-10-07T00:00:00Z",
    });
    const b = makeDigest({
      actionCanonical: stableStringify({ tool: "x", args: { a: 2, b: 1 } }),
      policyVersion: "p1",
      target: "t",
      expiry: "2026-10-07T00:00:00Z",
    });
    expect(a).toBe(b);
  });
});
