<div align="center">

# VERI<span style="color:#63C08C">TYPE</span>

### Cultural QA for AI Agents

**Verify before acting.**

[![Live application](https://img.shields.io/badge/LIVE_APP-OPEN_VERITYPE-1A2A20?style=for-the-badge&labelColor=142018&color=63C08C)](https://veritype.ajepleasant.workers.dev/)
[![Watch demo](https://img.shields.io/badge/VIDEO-WATCH_DEMO-1A2A20?style=for-the-badge&labelColor=142018&color=63C08C)](https://youtu.be/1CtHiWQKtH0)
[![Qloo Hackathon](https://img.shields.io/badge/QLOO-AGENTIC_HACKATHON-1A2A20?style=for-the-badge&labelColor=142018&color=B9B7AF)](https://qloo.devpost.com/)
[![License: MIT](https://img.shields.io/badge/LICENSE-MIT-1A2A20?style=for-the-badge&labelColor=142018&color=63C08C)](LICENSE)

**Real Qloo intelligence · Explicit entity verification · Inspectable cultural evidence**

An evidence-first workflow for examining proposed brand associations before relying on AI-generated cultural recommendations.

### Watch the 2-minute project demonstration

[![Watch the Veritype demo on YouTube](https://img.youtube.com/vi/1CtHiWQKtH0/hqdefault.jpg)](https://youtu.be/1CtHiWQKtH0)

[**Watch on YouTube**](https://youtu.be/1CtHiWQKtH0) · [**Try the live app**](https://veritype.ajepleasant.workers.dev/) · [**Browse the source**](https://github.com/0xaje/Veritype)

</div>

---

## Why Veritype exists

AI agents can confidently propose brand partnerships and cultural activations without exposing the signals behind their recommendations. A polished explanation is not proof of cultural alignment.

**Veritype provides a human-verifiable evidence checkpoint.** Users select a real cultural entity from Qloo search results, retrieve genuine Qloo brand recommendations, and inspect whether a proposed brand appears in the returned evidence.

It does **not** automatically approve partnerships, block agent execution, or predict commercial success.

## Try the live workflow

**No sign-in required:** [veritype.ajepleasant.workers.dev](https://veritype.ajepleasant.workers.dev/)

| Step | What to do | What it demonstrates |
| :-- | :-- | :-- |
| **01 · Discover** | Search for **Stranger Things** | Live Qloo entity search |
| **02 · Verify** | Explicitly select the intended result | Identity is selected from a genuine Qloo response |
| **03 · Investigate** | Enter **Vans** and choose **Retrieve live Qloo recommendations** | Server-side Qloo Insights request |
| **04 · Inspect** | Open the candidate assessment, rankings and evidence details | Observed status, affinity, explainability and provenance |

> **Live data, not a scripted result.** During development, one Qloo response placed Vans at #2 of 10 with affinity around 0.9348. That is an example from a specific request, **not a guaranteed result**. Rankings and values can change.

> **Evidence boundary:** Qloo affinity is not a probability of sponsorship success, licensing eligibility, sales lift or commercial viability. A brand absent from a limited top-ten result is **not** necessarily culturally incompatible.

## What is available today

| Capability | Public deployment | Data / implementation |
| :-- | :--: | :-- |
| Hosted, account-free web interface | **Live** | Cloudflare Workers static assets |
| Cultural entity search | **Live** | Qloo HTTP search |
| Explicit source selection | **Live** | Qloo result validation + D1 session |
| Brand discovery | **Live** | Qloo `/v2/insights` |
| Candidate observed/not-observed assessment | **Live** | Deterministic interpretation of returned recommendations |
| Rankings, affinity and explainability | **Live** | Actual Qloo response and provenance |
| Per-client request quotas | **Implemented** | D1 atomic quotas + HMAC-hashed client identifier |
| AI plan extraction, claim challenge, repair and retest | **Local development only** | Node/Ollama/Qloo workspace; **not deployed publicly** |

**Why Qloo is essential:** Qloo provides the source entities and cross-domain recommendation signals. Veritype does not ask a language model to invent brand affinity. It exposes what the Qloo response actually supports, with explicit limitations.

## System architecture

```text
                 BROWSER · VERITYPE UI
                          │
             ┌────────────┼─────────────┐
             │            │             │
       /api/search   /api/select   /api/discover
             │            │             │
             ▼            ▼             ▼
       Qloo Search    Validate ID    Qloo Insights
             │            │             │
             └───────┬────┘             │
                     │                  │
             D1 verification           │
             sessions / tokens         │
                     │                  │
                     └─────────┬────────┘
                               ▼
                      Evidence assessment
                       · Observed status
                       · Ranked results
                       · Qloo affinity
                       · Explainability
                       · Evidence limits
                               │
                               ▼
                         HUMAN REVIEW
```

**Cloudflare Worker:** `src/cloudflare-worker.js` handles the public API and static assets. The Qloo adapters are `src/qloo-http.js` and `src/qloo-http-executor.js`; evidence interpretation is in `src/evidence.js`. The public interface is `public/worker.html`, `public/worker-app.js` and `public/app.css`.

The Qloo key remains server-side. D1 stores short-lived verification sessions and request quotas. Requests to the public API require JSON and a same-origin browser request; the Worker checks Cloudflare client identity before applying its quota.

**Separate local workspace:** `src/server.js` and related Node tooling support additional development workflows. They are not the deployed Cloudflare backend.

## Technology

![Qloo](https://img.shields.io/badge/Qloo-Search_%26_Insights-63C08C?style=flat-square&labelColor=1A2A20)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-63C08C?style=flat-square&labelColor=1A2A20)
![Cloudflare D1](https://img.shields.io/badge/Cloudflare-D1-63C08C?style=flat-square&labelColor=1A2A20)
![JavaScript](https://img.shields.io/badge/JavaScript-ES_Modules-63C08C?style=flat-square&labelColor=1A2A20)
![Node.js](https://img.shields.io/badge/Node.js-22.19%2B-63C08C?style=flat-square&labelColor=1A2A20)

## Run locally

**Prerequisites:** Node.js **22.19+**, npm, Wrangler, your own Qloo API key, and a Cloudflare D1 database.

```bash
git clone https://github.com/0xaje/Veritype.git
cd Veritype
npm test
npx wrangler login
npx wrangler d1 create veritype-sessions
```

Copy `wrangler.example.toml` to `wrangler.toml` and replace the example D1 database ID with your own. The account-specific configuration is intentionally gitignored.

Create a private `.dev.vars` file (also gitignored):

```dotenv
QLOO_API_KEY=your-own-qloo-api-key
RATE_LIMIT_SALT=your-own-random-secret
```

Generate a strong salt using `openssl rand -hex 32`. **Never commit API keys or secrets.**

```bash
npx wrangler d1 migrations apply veritype-sessions --local
npx wrangler dev --local
```

Open **http://localhost:8787/** and use the real Qloo workflow. Production deployment requires remote D1 migrations, secrets configured with `wrangler secret put`, and `wrangler deploy`. See [Cloudflare deployment notes](docs/cloudflare-setup.md).

**Local-development caveat:** The Worker relies on Cloudflare's `CF-Connecting-IP` header for quotas. A local CLI request may need a development-only header; that is not a production authentication mechanism.

## Testing and reproducibility

```bash
npm test
```

Automated tests cover Qloo data interpretation, input validation, verified source selection, quota behavior and frontend contracts. Isolated test fixtures do **not** represent live API results. The hosted application retrieves genuine Qloo data for its discovery workflow.

For a hands-on evaluation, follow the four-step [live walkthrough](#try-the-live-workflow) and inspect the expanded evidence panel. The live service depends on Qloo availability and applicable API limits.

## Security and interpretation

- **Secrets:** Qloo credentials are held on the Worker, not sent to the browser.
- **Source integrity:** Selection is validated against a short-lived session containing actual Qloo search matches; arbitrary entity IDs cannot be submitted as verified selections.
- **Request controls:** The Worker enforces D1-backed quotas using a keyed hash of the client IP.
- **Origin checks:** Public API requests require JSON and a matching browser origin.
- **Evidence honesty:** Affinity and explainability are Qloo outputs, not calibrated probabilities of business outcomes.
- **Scope:** A limited recommendation list does not establish that an omitted brand is incompatible.
- **Human responsibility:** Rights, licensing, commercial feasibility and final partnership decisions require independent review.

## Limitations and roadmap

The public experience currently supports one explicitly verified cultural source and top-ten brand recommendation discovery. It does not yet offer publicly accessible AI plan extraction, multi-claim auditing, human-approved repair, or retesting. Similar source names may be difficult to disambiguate when Qloo metadata is sparse.

Future directions include improved disambiguation, durable investigation history and an end-to-end agent review workflow. **These are roadmap items, not deployed features.**

## Hackathon and links

Created for the [**Qloo Agentic Hackathon — Agents, but with taste**](https://qloo.devpost.com/).

| Resource | Link |
| :-- | :-- |
| **Live app** | https://veritype.ajepleasant.workers.dev/ |
| **Video walkthrough** | https://youtu.be/1CtHiWQKtH0 |
| **Repository** | https://github.com/0xaje/Veritype |
| **License** | [MIT](LICENSE) |

---

<div align="center">

**VERITYPE · VERIFY BEFORE ACTING**

*AI can recommend. Evidence should help us decide.*

</div>
