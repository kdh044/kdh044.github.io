import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataLayer } from '../src/lib/data.js';

function makeMockClient() {
  return {
    readFile: vi.fn(),
    writeFile: vi.fn(),
  };
}

describe('DataLayer', () => {
  let client, data;

  beforeEach(() => {
    localStorage.clear();
    client = makeMockClient();
    data = new DataLayer(client);
  });

  it('getSettings reads from API and caches', async () => {
    client.readFile.mockResolvedValueOnce({
      data: { displayName: 'danny', graduationDate: '2027-08-31', emoji: '📚' },
      sha: 'sha1',
    });
    const result = await data.getSettings();
    expect(result.displayName).toBe('danny');
    expect(client.readFile).toHaveBeenCalledWith('settings.json');
    expect(localStorage.getItem('gp:cache:settings.json')).toBeTruthy();
  });

  it('getSettings returns cached on read failure (offline fallback)', async () => {
    localStorage.setItem('gp:cache:settings.json', JSON.stringify({
      data: { displayName: 'cached_user', graduationDate: '2027-08-31', emoji: '📚' },
      sha: 'cached_sha',
    }));
    client.readFile.mockRejectedValueOnce(new Error('network'));
    const result = await data.getSettings();
    expect(result.displayName).toBe('cached_user');
  });

  it('saveSettings writes to API with cached SHA', async () => {
    localStorage.setItem('gp:cache:settings.json', JSON.stringify({
      data: { displayName: 'old', graduationDate: '2027-08-31', emoji: '📚' },
      sha: 'old_sha',
    }));
    client.writeFile.mockResolvedValueOnce('new_sha');
    await data.saveSettings({ displayName: 'new', graduationDate: '2027-08-31', emoji: '📚' });
    expect(client.writeFile).toHaveBeenCalledWith(
      'settings.json',
      expect.objectContaining({ displayName: 'new' }),
      'old_sha',
      expect.any(String),
    );
  });

  it('getRoutines seeds defaults on NotFound', async () => {
    const { NotFoundError } = await import('../src/lib/github.js');
    client.readFile.mockRejectedValueOnce(new NotFoundError('routines.json'));
    client.writeFile.mockResolvedValueOnce('sha1');
    const result = await data.getRoutines();
    expect(result.routines.length).toBe(3);
    expect(result.routines.map(r => r.id)).toContain('r_exercise');
  });

  it('getCompletions reads month file', async () => {
    client.readFile.mockResolvedValueOnce({
      data: { month: '2026-04', days: { '2026-04-27': { ex_morning: { done: true } } } },
      sha: 'sha',
    });
    const result = await data.getCompletions('2026-04');
    expect(result.days['2026-04-27'].ex_morning.done).toBe(true);
  });

  it('setCompletion updates month file with new entry', async () => {
    client.readFile.mockResolvedValueOnce({
      data: { month: '2026-04', days: {} },
      sha: 'sha1',
    });
    client.writeFile.mockResolvedValueOnce('sha2');
    await data.setCompletion('2026-04-27', 'ex_morning', { done: true, doneAt: '07:35' });
    const writtenData = client.writeFile.mock.calls[0][1];
    expect(writtenData.days['2026-04-27'].ex_morning.done).toBe(true);
  });

  it('setCompletion creates new month file when NotFound', async () => {
    const { NotFoundError } = await import('../src/lib/github.js');
    client.readFile.mockRejectedValueOnce(new NotFoundError('completions/2026-04.json'));
    client.writeFile.mockResolvedValueOnce('sha1');
    await data.setCompletion('2026-04-27', 'english', { done: true });
    const [path, payload, sha] = client.writeFile.mock.calls[0];
    expect(path).toBe('completions/2026-04.json');
    expect(sha).toBeNull();
    expect(payload.month).toBe('2026-04');
  });
});
