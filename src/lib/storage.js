const PREFIX = 'gp:';

export const storage = {
  get(key) {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  set(key, value) {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  },
  remove(key) {
    localStorage.removeItem(PREFIX + key);
  },
};
