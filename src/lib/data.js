import { NotFoundError } from './github.js';
import { storage } from './storage.js';
import { monthKey } from './date.js';

const CACHE_PREFIX = 'cache:';

function cacheKey(path) { return CACHE_PREFIX + path; }

export class DataLayer {
  constructor(client) {
    this.client = client;
  }

  async _readCached(path) {
    try {
      const result = await this.client.readFile(path);
      storage.set(cacheKey(path), result);
      return result;
    } catch (err) {
      if (err instanceof NotFoundError) throw err;
      const cached = storage.get(cacheKey(path));
      if (cached) return cached;
      throw err;
    }
  }

  async _writeCached(path, data, message) {
    const cached = storage.get(cacheKey(path));
    const sha = cached?.sha ?? null;
    const newSha = await this.client.writeFile(path, data, sha, message);
    storage.set(cacheKey(path), { data, sha: newSha });
    return newSha;
  }

  async getSettings() {
    try {
      const { data } = await this._readCached('settings.json');
      return data;
    } catch (err) {
      if (err instanceof NotFoundError) {
        return { displayName: '', graduationDate: '', emoji: '📚' };
      }
      throw err;
    }
  }

  async saveSettings(settings) {
    return this._writeCached('settings.json', settings, 'feat: update settings');
  }

  async getRoutines() {
    try {
      const { data } = await this._readCached('routines.json');
      return data;
    } catch (err) {
      if (err instanceof NotFoundError) {
        const defaults = {
          routines: [
            { id: 'r_exercise', name: '운동',  kind: 'scheduled', time: '07:00', days: ['mon','tue','wed','thu','fri'], emoji: '🏃', color: '#ff6f00', active: true },
            { id: 'r_english',  name: '영어 30min', kind: 'checklist', days: [], emoji: '📖', color: '#2196f3', active: true },
            { id: 'r_meditate', name: '명상',  kind: 'scheduled', time: '22:00', days: [], emoji: '🧘', color: '#4caf50', active: true },
          ],
        };
        try { await this._writeCached('routines.json', defaults, 'feat: init default routines'); } catch (_) {}
        return defaults;
      }
      throw err;
    }
  }

  async saveRoutines(routinesObj) {
    return this._writeCached('routines.json', routinesObj, 'feat: update routines');
  }

  async getCompletions(month) {
    const path = `completions/${month}.json`;
    try {
      const { data } = await this._readCached(path);
      return data;
    } catch (err) {
      if (err instanceof NotFoundError) return { month, days: {} };
      throw err;
    }
  }

  async setCompletion(date, routineId, entry) {
    const month = monthKey(date);
    const path = `completions/${month}.json`;
    let monthData;
    try {
      const { data } = await this._readCached(path);
      monthData = data;
    } catch (err) {
      if (err instanceof NotFoundError) {
        monthData = { month, days: {} };
        const newSha = await this.client.writeFile(path, monthData, null, `feat: init completions ${month}`);
        storage.set(cacheKey(path), { data: monthData, sha: newSha });
      } else throw err;
    }
    if (!monthData.days[date]) monthData.days[date] = {};
    monthData.days[date][routineId] = entry;
    return this._writeCached(path, monthData, `feat: completion ${date} ${routineId}`);
  }

  async getNotes(month) {
    const path = `notes/${month}.json`;
    try {
      const { data } = await this._readCached(path);
      return data;
    } catch (err) {
      if (err instanceof NotFoundError) return { month, notes: {} };
      throw err;
    }
  }

  async setNote(date, text) {
    const month = monthKey(date);
    const path = `notes/${month}.json`;
    let monthData;
    try {
      monthData = (await this._readCached(path)).data;
    } catch (err) {
      if (err instanceof NotFoundError) monthData = { month, notes: {} };
      else throw err;
    }
    monthData.notes[date] = text;
    return this._writeCached(path, monthData, `feat: note ${date}`);
  }

  async getSchedule(month) {
    const path = `schedule/${month}.json`;
    try {
      const { data } = await this._readCached(path);
      return data;
    } catch (err) {
      if (err instanceof NotFoundError) return { month, events: [] };
      throw err;
    }
  }
}
