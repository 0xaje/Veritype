# VT-030 — Live demo acceptance and presentation

## The claim we can defend

Veritype is a human-in-the-loop cultural QA workflow for AI-generated campaign proposals. A local model extracts a proposed brand, an operator confirms the exact Qloo source entity, Qloo provides a live comparison, Veritype checks the comparison's evidence integrity and challenges a lower-ranked proposal, and **only explicit human approval** initiates a fresh Qloo retest.

Affinity is relative to the chosen source and candidate set. It is **not** proof of campaign success, licensing, partnership feasibility, or causation. A successful retest does **not** rewrite the original plan.

## Live prerequisites

- Local Node.js version meeting package.json's engine requirement.
- Configured live Qloo integration and valid credentials. Do not publish keys.
- A working local Ollama model for plan extraction, if using the agent CLI.
- Server running at http://127.0.0.1:3100 using `npm run dev`.
- Run `npm test` and record the actual pass/fail totals; never assume a pass.
- No screenshots of synthetic results presented as live Qloo output.

## Suggested demo sequence (live, not pre-scripted outcomes)

1. Open the browser at http://127.0.0.1:3100. Show the empty investigation desk.
2. Enter: `Launch a Stranger Things campaign with Nike.` Extract the draft claim and confirm the source and proposed brand.
3. Search Qloo for the source. Explicitly select **Stranger Things [urn:entity:tv_show]** — **not** the place or album results.
4. Discover Qloo brands. If **Vans** is returned, select it as a footwear comparison. If it is not returned, stop and explain that live discovery differs; do not invent it.
5. Run the verified Qloo audit. Read the returned integrity status and actual scores. Do not promise a particular rank in advance.
6. If the audit produces an evidence-backed challenge, review the alternative and explicitly approve a fresh retest. If no challenge appears, explain that no repair is warranted on current evidence.
7. Show the before/after candidate names, ranks, and affinities and expand the raw evidence. Explain that a new Qloo call was made and the original text was not silently modified.
8. Optionally save the audit to the browser. Clarify that history is a local snapshot, not a current Qloo reading.

CLI alternative: `npm run agent -- "Launch a Stranger Things campaign with Nike."`. Select the TV show, choose an appropriate brand, and type `APPROVE` only if the evidence-backed repair is suitable. Inspect the generated `out/agent-reviews/*.json` file.

## Presentation outline (90–120 seconds)

**0–15s — Problem:** AI agents can propose plausible cultural partnerships without checking cultural fit. Introduce Veritype as a verification layer, not a replacement for business due diligence.

**15–35s — Source integrity:** Show extraction and the ambiguous Qloo search results. Deliberately explain why the TV-show entity must be chosen.

**35–65s — Real evidence:** Show the live brand comparison, affinity, integrity result, and challenge. State that the rankings are conditional on the selected comparison set.

**65–95s — Human agency:** Approve a supported alternative and display the fresh Qloo retest. Show before/after evidence.

**95–120s — Close:** Emphasize inspectable evidence, source identity, explicit approval, and honest limitations. Show the repository and documentation.

## Release gate

- [ ] `npm test` passes on the final commit.
- [ ] Real source selection works; wrong entity types remain visible.
- [ ] Qloo discovery, audit, integrity, and challenge all come from live requests.
- [ ] Human rejection performs no repair request.
- [ ] Human approval produces a separate Qloo retest and preserves original evidence.
- [ ] Browser handles no challenge, expired token, network failure, and input changes without misleading success.
- [ ] Screen recording captures genuine application behavior and masks API credentials.
- [ ] README links to the final demo video and explains setup, limitations, and reproducible test steps.
- [ ] Hackathon eligibility, deadline, submission fields, and mandatory integrations are rechecked against the organizer's current official rules.

## Evidence and privacy

Do not commit `.env`, credentials, private campaign briefs, or raw output containing secrets. The CLI writes full JSON evidence locally; inspect it before sharing. Record exact timestamps and statuses from the actual run. Do not label locally saved browser snapshots as live evidence.
