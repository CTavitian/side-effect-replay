import { hashArgs, makeDigest, stableStringify } from "./crypto.js";
import type { GateFinding, GateReport, OpsReplayTrace } from "./types.js";

export function validateTrace(trace: OpsReplayTrace): string[] {
  const errors: string[] = [];
  if (trace.schema !== "opsreplay.trace.v1") errors.push("schema must be opsreplay.trace.v1");
  if (!trace.run_id) errors.push("run_id required");
  if (!trace.tools?.length) errors.push("tools required");
  for (const t of trace.tools ?? []) {
    if (!t.tool) errors.push("tool name required");
    if (t.args_hash !== hashArgs(t.args ?? {})) {
      errors.push(`args_hash mismatch for ${t.tool}`);
    }
  }
  return errors;
}

export function gateTrace(trace: OpsReplayTrace, now = new Date()): GateReport {
  const findings: GateFinding[] = [];

  for (const t of trace.tools) {
    if (!t.side_effect) continue;

    if (!t.approval) {
      findings.push({
        code: "approval_missing",
        message: `Side-effect tool "${t.tool}" has no approval digest`,
        tool: t.tool,
      });
      continue;
    }

    if (t.approval.policy_version !== trace.policy_version) {
      findings.push({
        code: "policy_version_drift",
        message: `Approval policy ${t.approval.policy_version} != trace ${trace.policy_version}`,
        tool: t.tool,
      });
    }

    const expected = makeDigest({
      actionCanonical: stableStringify({ tool: t.tool, args: t.args }),
      policyVersion: t.approval.policy_version,
      target: t.approval.target,
      expiry: t.approval.expiry,
    });
    if (expected !== t.approval.digest) {
      findings.push({
        code: "digest_mismatch",
        message: `Digest mismatch for "${t.tool}" (tamper or wrong binding)`,
        tool: t.tool,
      });
    }

    if (Date.parse(t.approval.expiry) < now.getTime()) {
      findings.push({
        code: "digest_expired",
        message: `Approval expired at ${t.approval.expiry}`,
        tool: t.tool,
      });
    }
  }

  const seen = new Map<string, number>();
  for (const se of trace.side_effects) {
    const key = `${se.entity}:${stableStringify(se.after)}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  for (const [key, n] of seen) {
    if (n > 1) {
      findings.push({
        code: "duplicate_side_effect",
        message: `Duplicate side effect detected (${n}x): ${key.slice(0, 80)}`,
      });
    }
  }

  return {
    run_id: trace.run_id,
    passed: findings.length === 0,
    findings,
  };
}

export function diffTraces(a: OpsReplayTrace, b: OpsReplayTrace) {
  const aTools = a.tools.map((t) => t.tool).sort();
  const bTools = b.tools.map((t) => t.tool).sort();
  return {
    tools_only_in_a: aTools.filter((t) => !bTools.includes(t)),
    tools_only_in_b: bTools.filter((t) => !aTools.includes(t)),
    side_effect_count: { a: a.side_effects.length, b: b.side_effects.length },
  };
}
