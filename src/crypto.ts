import { createHash } from "node:crypto";

export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(",")}}`;
}

export function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

export function hashArgs(args: Record<string, unknown>): string {
  return sha256(stableStringify(args));
}

export function makeDigest(parts: {
  actionCanonical: string;
  policyVersion: string;
  target: string;
  expiry: string;
}): string {
  return sha256(
    [parts.actionCanonical, parts.policyVersion, parts.target, parts.expiry].join("|"),
  );
}
