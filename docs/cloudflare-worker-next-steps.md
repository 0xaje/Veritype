# Cloudflare Worker implementation checkpoint

The Worker in src/cloudflare-worker.js is **not deployed**. It supports only POST /api/search, /api/select, /api/discover, with explicit user selection stored in D1. It intentionally does not implement ranking, repair, plan extraction, or the existing frontend's local API contract. Do not present it as the finished public app.

Before deployment:
1. Install Wrangler as a dev dependency and configure an actual D1 database binding named DB; apply migrations/0001_verification_sessions.sql to the target database.
2. Configure Workers static assets binding named ASSETS, KV binding named RATE_LIMIT, and QLOO_API_KEY as a Worker secret (never put the key in wrangler config or Git).
3. Implement Worker route contract integration with public/app.js. Existing frontend is not yet wired to these new endpoints.
4. Run Worker tests. The current KV minute bucket is best-effort only because KV updates are non-atomic; add a strict Cloudflare rate limiting binding or Durable Object guard before unrestricted public access. Browser same-origin checks are not a substitute for rate limiting or authentication.
5. Test actual deployed search → select → discover with real Qloo responses; no simulated evidence in the product.

The source validation and evidence adapter are runtime-neutral; do not import src/server.js, src/qloo.js, or src/verification-flow.js into the Worker.
