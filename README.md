# Veritype — Cultural QA for AI Agents

**Verify cultural assumptions before an AI agent acts.** Veritype is an evidence-first cultural verification workflow powered by live [Qloo](https://www.qloo.com/) data. It helps a human reviewer check whether a proposed brand appears in cultural recommendations associated with a selected entertainment entity, without mistaking affinity for a prediction of business success.

**[Try the live app](https://veritype.ajepleasant.workers.dev/) · [Qloo Agentic Hackathon](https://qloo.devpost.com/) · [MIT License](LICENSE)**

> **Publicly deployed and usable without an account.** The hosted application supports real Qloo entity search, explicit source selection, and brand discovery with ranked affinity evidence. No mock Qloo results, fabricated affinity values, or pre-recorded success responses are served as live data.

## The problem

AI agents can confidently recommend partnerships, activations, and brand associations without showing the cultural evidence behind their claims. A fluent recommendation is not the same thing as a defensible recommendation. Teams need to inspect the source identity, underlying signals, and limits of the evidence **before** committing to an action.

Veritype inserts a human-verifiable evidence checkpoint between an AI-generated idea and a decision.

## Try it in under a minute

1. Open **https://veritype.ajepleasant.workers.dev/**.
2. Search for **Stranger Things** and explicitly select a returned Qloo entity. Search candidates can share names but have different IDs; verify the intended entity.
3. Enter **Vans** as the optional proposed brand and choose **Retrieve live Qloo recommendations**.
4. Inspect the observed/not-observed assessment, the ranked top-ten brand recommendations, Qloo affinity values, and expandable explainability/provenance.

**What to expect:** The result is computed from a fresh Qloo API response. A candidate may appear at a particular rank or may not appear in the returned top ten; rankings are not fixed and should not be treated as promised results.

**Important interpretation:** An observed brand is present in the limited Qloo response; it is **not** proof of sponsorship suitability, licensing rights, sales lift, or commercial viability. Absence from the top ten is not evidence of incompatibility.

## What is implemented

### Public, judge-accessible workflow

| Capability | Status | Evidence source |
| --- | --- | --- |
| Public Cloudflare-hosted website | Live | Cloudflare Workers static assets |
| Search cultural entities | Live | Qloo HTTP entity search |
| Explicit human selection of source | Live | D1-backed short-lived verification session |
| Retrieve brand recommendations | Live | Qloo `/v2/insights` |
| Inspect rank, affinity and explainability | Live | Actual Qloo response, with provenance |
| Check whether a proposed brand appears in the returned list | Live | Deterministic interpretation of live results |
| Request throttling | Implemented | D1 atomic request quota with keyed IP hashing |
| AI plan extraction, claim challenge, approved repair/retest | **Local development workspace only** | Node/Ollama/Qloo workflow; **not available in public Worker** |

The hosted application **does not** autonomously negotiate, approve partnerships, execute commercial transactions, or assert business outcomes. Human review remains essential.

### Why Qloo matters

Qloo supplies the cross-domain cultural recommendation signal. Veritype does not substitute LLM guesses for cultural data: it resolves a real entity, queries Qloo Insights for brand recommendations, and displays the returned affinity and explainability alongside explicit evidence limitations. The source entity must be chosen from actual Qloo search results before Insights can be queried.

## Architecture

```text
Browser (Cloudflare-hosted UI)
  │
  ├─ POST /api/search    → Qloo HTTP entity search
  │                       ↳ D1 short-lived search session
  ├─ POST /api/select    → validate selected Qloo result
  │                       ↳ D1 verification token
  └─ POST /api/discover  → Qloo /v2/insights
                          ↳ deterministic candidate assessment
                          ↳ ranked affinity + provenance

Cloudflare Worker
  ├─ server-side QLOO_API_KEY (never sent to browser)
  ├─ D1 sessions and atomic request quotas
  └─ static site assets
```

The public Worker implementation is in `src/cloudflare-worker.js`. The direct Qloo adapter and evidence interpretation are in `src/qloo-http.js`, `src/qloo-http-executor.js`, and `src/evidence.js`. The public UI is `public/worker.html` and `public/worker-app.js`.

The separate local Node workspace in `src/server.js` includes experimental workflows beyond the deployed feature set. It is **not** the public deployment backend.

## Run and verify locally

**Requirements:** Node.js 22.19+, npm, Cloudflare Wrangler, a Qloo API key, and your own Cloudflare D1 database. Use the free Cloudflare tier where eligible.

```bash
git clone https://github.com/0xaje/Veritype.git
cd Veritype
npm test
npx wrangler login
npx wrangler d1 create veritype-sessions
```

Copy `wrangler.example.toml` to `wrangler.toml`, and replace the example D1 database ID with the ID created in your account. The local `wrangler.toml` is intentionally gitignored.

Create a private `.dev.vars` file (also gitignored) containing:

```dotenv
QLOO_API_KEY=your-own-qloo-api-key
RATE_LIMIT_SALT=your-own-random-secret
```

Generate the salt with `openssl rand -hex 32`. Do not commit or share these values.

```bash
npx wrangler d1 migrations apply veritype-sessions --local
npx wrangler dev --local
```

Open **http://localhost:8787/** and complete the same real-data workflow. For production, apply migrations with `--remote`, configure both secrets using `wrangler secret put`, and run `wrangler deploy`. See [Cloudflare setup](docs/cloudflare-setup.md) for deployment notes.

**Note:** Wrangler may require a platform-provided client IP header for the rate limiter. A CLI request that forges `CF-Connecting-IP` is only a local development convenience and is not a production authentication mechanism.

## Test and inspect

```bash
npm test
```

Automated tests cover Qloo data interpretation, request validation, verified selection, rate limiting, and frontend contracts. The public search → select → discover journey has also been exercised against genuine Qloo responses on the Cloudflare deployment. Tests use isolated fixtures; live application results are always retrieved from Qloo.

## Security and evidence boundaries

- Qloo credentials are stored server-side as Cloudflare secrets.
- Cross-origin and non-JSON API requests are rejected.
- Search and selection sessions expire; a source cannot be invented by submitting an arbitrary ID.
- Request quotas are enforced through D1; avoid exposing private IP addresses in stored identifiers.
- Qloo's affinity and explainability are presented as evidence, not calibrated probabilities of commercial outcomes.
- The recommendation list is limited; a missing brand is **not** negative evidence.
- Entity identity, market context, licensing, and commercial feasibility require independent verification.
- The live demo depends on Qloo API availability and any applicable hackathon-key limits.

## Known limitations and roadmap

The public deployment currently supports one verified source and a top-ten brand discovery check. It does not yet expose the richer local plan-extraction, multi-claim audit, human-approved repair, or re-test workflows. Similar entity names can be difficult to disambiguate when Qloo search metadata is incomplete. Future work includes stronger entity disambiguation, a durable investigation history, and a public end-to-end agent review workflow.

## Hackathon

Built for the **[Qloo Agentic Hackathon — Agents, but with taste](https://qloo.devpost.com/)**. The product's contribution is an inspectable cultural-evidence checkpoint for AI-assisted decisions: real entity identity, real cross-domain Qloo signals, explicit uncertainty, and human control.

**License:** [MIT](LICENSE).
