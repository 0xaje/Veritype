/**
 * Reject cross-origin browser writes to the local-only API.
 * CLI clients without Origin are allowed only after the socket loopback check.
 */
export function isAllowedLocalOrigin(origin, port) {
  if (origin == null) return true;
  if (typeof origin !== 'string') return false;
  try {
    const parsed = new URL(origin);
    if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) return false;
    return parsed.origin === 'http://127.0.0.1:' + port ||
      parsed.origin === 'http://localhost:' + port;
  } catch { return false; }
}
