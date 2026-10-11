export const HISTORY_KEY = 'veritype-investigations-v1';
export const HISTORY_LIMIT = 10;

export function readHistory(storage) {
  try {
    const value = JSON.parse(storage.getItem(HISTORY_KEY) || '[]');
    if (!Array.isArray(value)) return [];
    return value.filter(item =>
      item && typeof item.id === 'string' && item.id.length > 0 &&
      typeof item.saved_at === 'string' && Number.isFinite(Date.parse(item.saved_at)) &&
      item.audit && typeof item.audit === 'object' && !Array.isArray(item.audit)
    ).slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

export function saveHistory(storage, entry) {
  if (!entry || typeof entry.id !== 'string' || !entry.audit || !Number.isFinite(Date.parse(entry.saved_at))) {
    throw new TypeError('A valid completed investigation is required');
  }
  const history = [entry, ...readHistory(storage).filter(item => item.id !== entry.id)].slice(0, HISTORY_LIMIT);
  storage.setItem(HISTORY_KEY, JSON.stringify(history));
  return history;
}

export function deleteHistory(storage, id) {
  const history = readHistory(storage).filter(item => item.id !== id);
  storage.setItem(HISTORY_KEY, JSON.stringify(history));
  return history;
}
