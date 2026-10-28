# Cloudflare setup (not deployed)

Prerequisites: Node 22+, Cloudflare Free account, a working Qloo key. No payment card or paid service is required by this configuration, subject to current account quotas.

1. Run `npx wrangler --version` to confirm Wrangler is available. If not, use `npm install --save-dev wrangler` (no paid subscription required).
2. Run `npx wrangler login` and authorize the browser.
3. Run `npx wrangler d1 create veritype-sessions`. Record the **database_id** only.
4. Run `npx wrangler kv namespace create RATE_LIMIT`. Record the **id** only. These identifiers are not API secrets.
5. Copy `wrangler.example.toml` to `wrangler.toml` and replace the two placeholder IDs with the actual IDs. Do not commit secrets.
6. Apply the migration to local D1 first: `npx wrangler d1 migrations apply veritype-sessions --local`.
7. Create a local-only `.dev.vars` containing `QLOO_API_KEY=...` by copying your existing key privately. **Never paste the value into chat or Git.** Check that `.dev.vars` is gitignored before creating it.
8. Run `npx wrangler dev` and test in the browser. A local Worker request may not have Cloudflare's `cf-connecting-ip` header, so the current implementation fails closed on API requests outside Cloudflare's edge. This requires a safe local-only development mechanism before a complete local flow test.
9. **Do not deploy yet.** The current KV rate limit is not atomic. Replace it with a strict rate limiter and verify the Worker + D1 + live Qloo journey before public deployment.
10. After security hardening, apply migrations to remote D1: `npx wrangler d1 migrations apply veritype-sessions --remote`, then set secret using `npx wrangler secret put QLOO_API_KEY` (interactive prompt, never a CLI argument), and only then deploy.

The public Worker UI is `public/worker.html` + `public/worker-app.js`. The local Node app remains in `public/index.html` + `public/app.js`; do not expose Node-only API endpoints through the Worker.

## Security update (October 28)

Worker now uses D1 atomic request quotas, not KV. Remove the `[[kv_namespaces]]` block from your local `wrangler.toml` if present. Apply `0002_request_quotas.sql` using Wrangler migrations locally and remotely. Set `RATE_LIMIT_SALT` to a random private value in `.dev.vars` and later as a remote Worker secret. Never commit or share the salt. The quota is 10 requests per minute per client-IP hash. Old KV namespace may remain unused; no need to delete it during deployment preparation. Verify tests and local Qloo flow after migration. Scheduled cleanup of expired quota rows remains future maintenance.
