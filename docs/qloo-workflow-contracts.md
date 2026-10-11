# VT-002 — Qloo workflow input contracts

Verified against the user's installed @qloo/qloo-harness v0.1.26 TypeScript definitions on 2026-10-11.

## Recommend

```json
{
  "target_type": "brand",
  "signals": ["07F1170E-BB69-4982-82C6-255F477EBBAD"],
  "limit": 10,
  "explain": true
}
```

The entity ID above was resolved through a live Qloo entity search for the TV show Stranger Things. **The recommendation payload is schema-informed but has not yet been validated by a successful live recommend call.** Never present it as a successful affinity finding until the API confirms it.

Required: `target_type` (string). Optional: `signals` (string array), `signal_tags` (string array), `signal_tags_operator`, `signal_location`, `demographic`, `filter_location`, `include_tags`, `include_tags_operator`, `exclude_tags`, `exclude_tags_operator`, `explain` (boolean), `limit` (integer).

Other observed schemas:
- `rank`: required `options` (string array), `option_type` (string); optional `signals`, `signal_location`, `demographic`, `include_tags`, `exclude_tags`.
- `describe`: required `entity` (string); optional `type`.
- `where_popular`: required `entity`, `within`; optional `entity_type`, `limit`.
- `compare_audiences`: required `group_a`, `group_b` (string arrays); optional `target_type`, `limit`.
- `entity_tags`: required `entities` (string array); optional `entity_type`, `limit`.
- `audience_demographics`: required `entity`; optional `entity_type`, `limit`.

## Evidence rules

A recommendation result is aggregate affinity evidence, not proof of sponsorship, commercial performance, or causal compatibility. Missing candidates in top-N results are not negative evidence. Preserve raw provenance, request metadata, and explicit uncertainty.

Never hardcode a compatibility verdict from popularity or a tag match.
