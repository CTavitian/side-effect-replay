# side-effect-replay

Freeze a failed (or fixed) agent run into an `opsreplay.trace.v1` artifact and gate CI on approval digests and side-effect integrity.

## Why

Observability shows what happened. Replay turns a production-shaped failure into a permanent regression test: SMS without approval stays red forever; the fixed trace must stay green.

## Digests

Approvals bind to `hash(actionCanonicalJSON + policyVersion + target + expiry)`. Any argument mutation, policy bump, or expiry miss fails the check.

## Setup

```bash
npm install
npm test
npm run demo
```

`demo` prints BAD (fail) then GOOD (pass).

## Commands

```bash
npm run validate -- --trace fixtures/good-sms.json
npm run gate -- --trace fixtures/bad-sms.json   # exits 1
npm run diff -- --a fixtures/bad-sms.json --b fixtures/good-sms.json
```

## Non-goals

- Not a full durable-execution platform
- Does not send real SMS or write external systems

## Status

A learning project. The example data is made up.

## Licence

MIT
