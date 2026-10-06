export interface ApprovalDigest {
  action_hash: string;
  policy_version: string;
  target: string;
  expiry: string;
  digest: string;
}

export interface ToolCall {
  tool: string;
  args: Record<string, unknown>;
  args_hash: string;
  side_effect: boolean;
  approval?: ApprovalDigest | null;
}

export interface SideEffectDiff {
  entity: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
}

export interface OpsReplayTrace {
  schema: "opsreplay.trace.v1";
  run_id: string;
  job_id: string;
  policy_version: string;
  recorded_at: string;
  tools: ToolCall[];
  side_effects: SideEffectDiff[];
  expected?: "pass" | "fail";
}

export interface GateFinding {
  code:
    | "approval_missing"
    | "digest_mismatch"
    | "digest_expired"
    | "duplicate_side_effect"
    | "policy_version_drift";
  message: string;
  tool?: string;
}

export interface GateReport {
  run_id: string;
  passed: boolean;
  findings: GateFinding[];
}
