import { spawn } from 'node:child_process';

export { validateEntitySearch } from './entity-search-validation.js';
import { validateEntitySearch } from './entity-search-validation.js';
/**
 * Uses Qloo's native entity search, not LLM name matching.
 * Returns raw search matches for explicit user selection; never auto-approves.
 */
export async function searchQlooEntities(value, { spawnImpl = spawn, timeoutMs = 30000 } = {}) {
  const { query, type, take } = validateEntitySearch(value);
  const args = ['api', 'search', '--query', query, '--take', String(take), '--json'];
  if (type) args.push('--type', type);
  return await new Promise((resolve, reject) => {
    const child = spawnImpl('qloo', args, {
      env: { ...process.env, QLOO_BASE_URL: 'https://hackathon.api.qloo.com', QLOO_TRUSTED_BASE_URL: 'https://hackathon.api.qloo.com' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '', stderr = '', settled = false;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      error ? reject(error) : resolve(result);
    };
    const timer = setTimeout(() => { child.kill('SIGKILL'); finish(new Error('Qloo search timed out')); }, timeoutMs);
    child.stdout.on('data', chunk => {
      stdout += chunk;
      if (stdout.length > 2_000_000) { child.kill('SIGKILL'); finish(new Error('Qloo search output too large')); }
    });
    child.stderr.on('data', chunk => {
      stderr += chunk;
      if (stderr.length > 100_000) { child.kill('SIGKILL'); finish(new Error('Qloo search error output too large')); }
    });
    child.on('error', error => finish(error));
    child.on('close', code => {
      if (settled) return;
      if (code !== 0) return finish(new Error('Qloo entity search failed'));
      try {
        const parsed = JSON.parse(stdout);
        if (!Array.isArray(parsed)) throw new Error('Unexpected Qloo entity search response');
        finish(null, {
          status: 'requires_selection', provider: 'qloo_api_search',
          query, requested_type: type, matches: parsed,
          selection: { automated: false, verified_entity_id: null },
          note: 'Inspect entity type and name, then select the correct Qloo ID. Search results alone are not evidence of affinity.'
        });
      } catch { finish(new Error('Unexpected Qloo entity search response')); }
    });
  });
}
