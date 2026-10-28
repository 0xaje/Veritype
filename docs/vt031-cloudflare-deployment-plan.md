# VT-031 — Cloudflare Workers deployment preparation (NOT DEPLOYED)

## Hard compatibility blockers confirmed in current source
- `src/server.js` uses `node:http`, binds `127.0.0.1`, and rejects non-loopback POST requests. Do **not** expose it as-is.
- `src/qloo.js` runs `spawn('qloo', ['exec', ...])`; `src/entity-search.js` runs `spawn('qloo', ['api','search', ...])`. Cloudflare Workers cannot run these local executable subprocesses.
- `src/verification-flow.js` stores verification and audit sessions in a process-local Map with a 15-minute TTL. Workers isolates are not durable; moving without persistent state breaks cross-request selection and repair.
- `src/plan-extraction.js` defaults to localhost Ollama. Its optional OpenAI path is not a drop-in implementation for Groq, Gemini, and OpenRouter.
- `src/agent-client.js` explicitly rejects non-local base URLs. External-agent support needs a separate, security-reviewed public client.
- `/api/qloo/execute` is a generic local development endpoint and must **not** be publicly exposed.

## Target: one Cloudflare Workers Free deployment
Serve static frontend assets and a Worker API from the same origin on a `*.workers.dev` HTTPS hostname. The Worker calls hosted Qloo and free-tier LLM providers over HTTPS. No second server is required. A Cloudflare D1 database or Durable Object binding may be used for short-lived session persistence **inside the same Cloudflare account/deployment**; it is not another independently hosted server. Choose based on documented free-tier limits.

## Gate 1 — Real Qloo HTTP compatibility (must pass before migrating)
1. Inspect the official Qloo hackathon kit and harness implementation/docs to identify the **documented**, authenticated HTTP equivalents for `qloo api search` and `qloo exec recommend/rank`. Do not guess endpoint paths or response shapes.
2. Implement a provider adapter with real HTTP calls and secret-bearing server-side credentials only.
3. On Ubuntu, compare real HTTP responses with real CLI results for the same entity search, recommendation, and ranking requests. Check entity IDs, source types, scores, provenance, and error behavior.
4. Preserve evidence-integrity and user-selected entity checks; no fallback to fabricated results. If equivalence is not established, **stop migration**.

## Gate 2 — Free LLM extraction
- Candidate order: Groq → Gemini → OpenRouter; configure **explicit, currently free model IDs** through Worker secrets/vars. Free status and quotas must be checked at setup; never assume any model is free indefinitely.
- Provider failures eligible for fallback: timeout, 429, 5xx, temporary unavailability, or malformed/non-grounded extraction. Never bypass `validateExtraction`.
- No paid fallback, no billing auto-upgrade, no hardcoded keys, no logging prompts/credentials. Apply bounded timeouts and maximum attempts.
- If all providers fail, return a truthful unavailable state and allow human-reviewed claim entry; Qloo still supplies all cultural evidence.
- Add deterministic tests with injected transports **for router logic only**; separately run genuine provider requests for acceptance. Test doubles must never be presented as live product data.

## Gate 3 — Public security and persistence
- Worker route handlers replace the local HTTP server; enforce same-origin browser requests and reject cross-site writes.
- Restrict request body size, add request/IP rate limiting and budget protection to prevent exhausting free Qloo/LLM quotas.
- Remove or strictly disable generic Qloo execution endpoint on public deployment.
- Persist short-lived search/selection/audit session state with expiry; validate that approved repair references the same audit, token, source and actual higher-ranked alternative.
- Keep Qloo and LLM API keys in encrypted Worker secrets. Never commit `.env` or keys.
- Keep health status honest: HTTP 200 from the Worker does not prove Qloo/LLM are functioning.

## Gate 4 — Deployment and judge acceptance
1. Confirm Cloudflare Free account and Workers & Pages dashboard.
2. Implement Worker entrypoint, static asset routing, binding configuration, and CI tests in repository.
3. Run `npm test` locally; inspect changes and ensure secrets are absent.
4. Deploy from GitHub or Wrangler to a `workers.dev` URL; do not claim success until the URL responds.
5. From a separate browser/device, run a **real** Stranger Things TV-show selection, Qloo discovery, a genuine brand comparison, optional evidence-backed approval, and fresh retest.
6. Verify expired sessions, rate limits, all LLMs unavailable, mobile UX, and no leaked keys.
7. Update README and Devpost with real live URL and reproducible judge instructions.

## Current state
Preparation only. No Worker adapter, Qloo HTTP equivalence, LLM router, persistent session storage, public security review, deployment, or live acceptance has been verified yet. Do not enter credentials into Cloudflare until the implementation is ready.
