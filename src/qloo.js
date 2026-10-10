import { spawn } from 'node:child_process';
export const OPERATIONS = new Set(['recommend','rank','describe','where_popular','compare_audiences','entity_tags','audience_demographics','trends','find_tags']);
export function executeQloo(operation, input, timeoutMs = 30000) {
  if (!OPERATIONS.has(operation)) throw new Error('Unsupported Qloo operation');
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Qloo input must be an object');
  return new Promise((resolve, reject) => {
    const child = spawn('qloo', ['exec', operation], {
      env: { ...process.env, QLOO_BASE_URL: 'https://hackathon.api.qloo.com', QLOO_TRUSTED_BASE_URL: 'https://hackathon.api.qloo.com' },
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let stdout = '', stderr = '', settled = false;
    const finish = (err, value) => { if (settled) return; settled = true; clearTimeout(timer); err ? reject(err) : resolve(value); };
    const timer = setTimeout(() => { child.kill('SIGKILL'); finish(new Error('Qloo timeout')); }, timeoutMs);
    child.stdout.on('data', c => { stdout += c; if (stdout.length > 2_000_000) { child.kill('SIGKILL'); finish(new Error('Qloo response too large')); } });
    child.stderr.on('data', c => { stderr += c; if (stderr.length > 2_000_000) { child.kill('SIGKILL'); finish(new Error('Qloo error output too large')); } });
    child.on('error', err => finish(err));
    child.on('close', code => {
      if (settled) return;
      if (code !== 0) {
        const detail = (stderr || stdout).trim();
        return finish(new Error(`Qloo process exited with code ${code}${detail ? ': ' + detail : ''}`));
      }
      try {
        const result = JSON.parse(stdout);
        if (result.status !== 'ok') {
          const msg = result.error?.message || result.error || 'Qloo returned non-ok status';
          return finish(new Error(msg));
        }
        finish(null, result);
      } catch { finish(new Error('Invalid Qloo response')); }
    });
    child.stdin.on('error', () => {});
    child.stdin.end(JSON.stringify(input));
  });
}
