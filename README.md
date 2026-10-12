# Veritype

**Cultural QA for AI agents.** Before an AI agent acts on an entertainment activation plan, Veritype challenges its cultural assumptions with real Qloo evidence.

## Product contract

Veritype is intended to be a publicly usable product, not a scripted hackathon demo. A user submits an AI-generated entertainment/IP activation plan; Veritype extracts testable claims about brand partners, artists, venues, and dining experiences; resolves entities; queries Qloo; reports supported, revise, or insufficient-evidence findings; proposes evidence-backed alternatives; and re-audits accepted changes.

**Core loop:** Plan → Claims → Qloo tests → Evidence → Challenge → Repair → Re-test.

No fabricated Qloo results, hardcoded successful verdicts, mock API responses presented as real, or invented affinity scores. Unresolved entities and unavailable evidence must remain explicit. Qloo's aggregate cultural signals do not establish individual behavior or commercial viability.

## Current implementation status

**VT-023 — live browser acceptance pending.** The local frontend connects claim extraction, real Qloo entity search and selection, discovery, evidence-backed brand comparison, challenge, user approval, fresh re-test, and opt-in browser-local history.

**Automated verification:** 58/58 tests passed in the developer's Ubuntu environment on October 12, 2026 (reported terminal output). This includes local HTTP smoke tests and an optional live Ollama extraction test. It **does not** prove that a complete browser investigation with fresh Qloo responses has passed.

**Next acceptance gate:** Follow [VT-023 live Qloo acceptance](docs/vt023-live-acceptance.md), record genuine observed evidence and any blockers. No historical rankings should be substituted for new Qloo results.

**Deployment boundary:** Development server listens on loopback only. It is not publicly hosted or production hardened. Music, venue and dining workflows remain unimplemented.

## Qloo hackathon environment

- Official kit: https://github.com/qloo/qloo-hackathon-kit
- Node.js **22.19 or newer** for the official harness
- Hackathon API base URL: `https://hackathon.api.qloo.com`
- Supported event tooling: `qloo exec` and `qloo mcp` (not harness chat/plan/build modes)
- Never commit API keys, `.env` files, raw secrets, or personal identifiers

### Ubuntu / Antigravity setup

```bash
node --version
npm --version
git --version
npm install --global @qloo/qloo-harness
export QLOO_BASE_URL=https://hackathon.api.qloo.com
export QLOO_TRUSTED_BASE_URL=https://hackathon.api.qloo.com
qloo setup --qloo
qloo setup --status
```

Look for `Qloo data: ready`. Configure the key through the secure prompt, not through a command-line argument or source file. The `export` values apply to the current shell; configure persistent environment settings securely for deployment.

Run the organizer's unchanged first real-data workflow:

```bash
git clone https://github.com/qloo/qloo-hackathon-kit.git
cd qloo-hackathon-kit/starter/cli-workflow
qloo exec find_tags --input-file request.json
```

Inspect `qloo exec --help` and the official kit before implementing any additional workflows. Actual response fields, available filters, and comparison rules must be validated from live results rather than assumed.

### Local Ollama Extraction (VT-006)

Veritype uses local Ollama for structured plan extraction with strict JSON schema enforcement and verbatim grounding:

```bash
# Check installed models
ollama list

# Configure local model in environment (e.g. qwen2.5:1.5b)
export OLLAMA_MODEL="qwen2.5:1.5b"
export OLLAMA_BASE_URL="http://127.0.0.1:11434"
```

Extraction requests (`POST /api/plans/extract`) query the local Ollama instance with `stream: false` and strict JSON schema validation, returning a reviewable draft without requiring external model API keys.

## Run the local workspace

```bash
git pull --ff-only origin main
npm test
export OLLAMA_MODEL="qwen2.5:1.5b"
npm run dev
```

Open **http://127.0.0.1:3100/** in your browser on the machine running Veritype. Paste a plan, extract and review claims, select the source returned by Qloo, compare brand candidates, inspect evidence and explicitly approve a re-test. This is a localhost-only development workflow.

**Important:** This interface currently evaluates one reviewed brand claim at a time. The local model is a drafting assistant; Qloo supplies the cultural evidence. Entity selection sessions expire after 15 minutes and reset when the server restarts. Never expose the development server directly to the public internet.

## VT-001 acceptance criteria

1. The hackathon API connection is authenticated.
2. A real entertainment/IP entity and proposed partner are resolved.
3. A genuine cross-domain Qloo query is executed.
4. The actual request and response are recorded securely with timestamps and redacted credentials.
5. Candidate comparisons use a documented, defensible rule; absence from top results is **not** proof of incompatibility.
6. The audit returns `SUPPORTED`, `REVISE`, or `INSUFFICIENT_EVIDENCE`, with provenance and explicit limitations.
7. Automated tests verify the deterministic interpretation logic, and an end-to-end run uses real Qloo data.

## Product delivery requirements

Publicly accessible application, secure server-side integration, user-supplied plans, persisted audits, evidence inspection, repair/re-audit, usable errors and loading states, rate limiting, documentation, and an external-agent API. Features are not complete until independently tested.

## License

MIT (ensure the repository includes the actual LICENSE file before submission).
