#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { makeDigest, hashArgs, stableStringify } from "./crypto.js";
import { diffTraces, gateTrace, validateTrace } from "./gate.js";
import type { OpsReplayTrace } from "./types.js";

function usage(): never {
  console.log(`Usage:
  side-effect-replay validate --trace <file>
  side-effect-replay gate --trace <file> [--out report.json]
  side-effect-replay diff --a <file> --b <file>
  side-effect-replay demo`);
  process.exit(1);
}

function argValue(args: string[], flag: string): string | undefined {
  const i = args.indexOf(flag);
  return i === -1 ? undefined : args[i + 1];
}

async function load(p: string): Promise<OpsReplayTrace> {
  return JSON.parse(await readFile(path.resolve(p), "utf8")) as OpsReplayTrace;
}

async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0];
  if (!cmd) usage();

  if (cmd === "demo") {
    const bad = await load("fixtures/bad-sms.json");
    const good = await load("fixtures/good-sms.json");
    const badGate = gateTrace(bad, new Date("2026-10-06T12:00:00Z"));
    const goodGate = gateTrace(good, new Date("2026-10-06T12:00:00Z"));
    console.log(`BAD\t${badGate.passed ? "PASS" : "FAIL"}\tfindings=${badGate.findings.length}`);
    for (const f of badGate.findings) console.log(`  - ${f.code}: ${f.message}`);
    console.log(`GOOD\t${goodGate.passed ? "PASS" : "FAIL"}\tfindings=${goodGate.findings.length}`);
    if (badGate.passed || !goodGate.passed) process.exit(1);
    return;
  }

  if (cmd === "validate") {
    const t = await load(argValue(args, "--trace") ?? usage());
    const errs = validateTrace(t);
    if (errs.length) {
      for (const e of errs) console.error(e);
      process.exit(1);
    }
    console.log(`OK\t${t.run_id}`);
    return;
  }

  if (cmd === "gate") {
    const t = await load(argValue(args, "--trace") ?? usage());
    const out = argValue(args, "--out") ?? "reports/gate-latest.json";
    const report = gateTrace(t, new Date("2026-10-06T12:00:00Z"));
    await mkdir(path.dirname(path.resolve(out)), { recursive: true });
    await writeFile(path.resolve(out), JSON.stringify(report, null, 2) + "\n");
    console.log(`${report.passed ? "PASS" : "FAIL"}\t${report.run_id}\tfindings=${report.findings.length}`);
    for (const f of report.findings) console.log(`  - ${f.code}: ${f.message}`);
    if (!report.passed) process.exit(1);
    return;
  }

  if (cmd === "diff") {
    const a = await load(argValue(args, "--a") ?? usage());
    const b = await load(argValue(args, "--b") ?? usage());
    console.log(JSON.stringify(diffTraces(a, b), null, 2));
    return;
  }

  usage();
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
