# VT-023 — Live Qloo browser acceptance

This is a **manual, real-system acceptance protocol**, not a fixture-driven test. Record the actual response observed; do not substitute the historical Stranger Things/Vans/Nike results.

## Preconditions

- Ubuntu with Node.js >=22.19.0
- Qloo CLI configured: `qloo setup --status` shows `Qloo data: ready`
- Local Ollama available and `OLLAMA_MODEL` configured
- `npm test` passes
- Start `npm run dev`; open http://127.0.0.1:3100/
- Never include credentials, authorization headers, or sensitive campaign briefs in shared screenshots

## Acceptance sequence

1. **Extract:** Paste `Launch a Stranger Things campaign with Nike.` and select **Extract**. Verify the extracted source is Stranger Things and proposed brand is Nike; correct the fields if necessary. Record whether Ollama extracted only literal claims.
2. **Search:** Search the source using the Qloo UI. Inspect the entity names, types and IDs. Select the *actual* Stranger Things TV-show match returned by this fresh search. If it is missing, record that and stop; do not inject a known ID.
3. **Discover:** Allow Qloo brand discovery to complete. Record the actual returned brand names, ranks, affinity values if provided, and any errors. Discovery is **not** a comparative audit of Nike.
4. **Choose:** Add relevant returned brands as alternatives. Vans and Converse may be selected **only if returned in this run**. If they are not returned, select other relevant real Qloo results and document the difference.
5. **Suitability:** Review category, rights and budget as *human assessments*, not Qloo conclusions. These checks do not prove licensing or partnership eligibility.
6. **Audit:** Run the verified Qloo audit. Inspect each finding's request, response, provenance and integrity. Record the proposed brand's observed rank or the explicit insufficient-evidence result. Do not claim that absence from top-N proves poor fit.
7. **Challenge:** Confirm a higher-ranked alternative is suggested only when the verified audit supports it. If no challenge is justified, record that legitimate outcome; do not force a repair.
8. **Approve and re-test:** If a supported challenge exists, explicitly approve a replacement. Verify the result came from a fresh request and inspect the returned evidence. Do not describe a successful re-test as a guaranteed commercial outcome.
9. **Save:** Save the investigation in the browser, refresh, inspect the historical JSON, then optionally delete it. Saved snapshots must be labeled historical rather than current Qloo results.
10. **Invalidation:** Edit the source or comparison after an audit. Confirm prior findings and save action are invalidated. Repeat while a request is in flight if practical.

## Record outcomes

| Check | PASS / FAIL / BLOCKED | Evidence / observed behavior |
| --- | --- | --- |
| Extract literal claim | | |
| Real source search and selection | | |
| Live brand discovery | | |
| Human suitability separation | | |
| Verified comparative audit | | |
| Evidence integrity and provenance | | |
| Supported challenge or legitimate no-challenge | | |
| Approved fresh re-test (if applicable) | | |
| Saved snapshot after refresh | | |
| Edit invalidation | | |

## Stop conditions

Stop and record **BLOCKED** if Qloo authentication fails, the entity cannot be verified, the provider returns malformed evidence, the audit fails integrity checks, or the session expires. Do not relabel a blocked step as PASS. Re-run source search if the 15-minute verification token expires.

## Evidence package

Keep a redacted copy of the actual audit JSON, a screenshot of the visible comparison, and a screenshot of any approved re-test. Record the commit SHA (`git rev-parse HEAD`), local date/time and whether each outcome was live or historical. Do not commit raw sensitive material or Qloo credentials.
