// Runtime-neutral validation shared by the Node CLI and Cloudflare HTTP transport.
const TYPES = new Set(['brand', 'tv_show', 'movie', 'artist', 'place', 'restaurant', 'music_artist']);
export function validateEntitySearch(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError('Search must be an object');
  const query = typeof value.query === 'string' ? value.query.trim() : '';
  if (!query || query.length > 120 || /[\x00-\x1f]/.test(query)) throw new TypeError('query must contain 1-120 printable characters');
  const type = value.type == null ? null : value.type;
  if (type !== null && !TYPES.has(type)) throw new TypeError('Unsupported entity type filter');
  const take = value.take === undefined ? 5 : value.take;
  if (!Number.isInteger(take) || take < 1 || take > 10) throw new TypeError('take must be between 1 and 10');
  return { query, type, take };
}
