import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitHubClient, NotFoundError, ConflictError, AuthError } from '../src/lib/github.js';

describe('GitHubClient', () => {
  let client;

  beforeEach(() => {
    client = new GitHubClient({ token: 'tok', owner: 'kdh044', repo: 'grad-planner-data' });
    global.fetch = vi.fn();
  });

  it('readFile returns parsed JSON content + sha on 200', async () => {
    const content = btoa(unescape(encodeURIComponent(JSON.stringify({ a: 1 }))));
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ sha: 'abc', content, encoding: 'base64' }),
    });
    const result = await client.readFile('settings.json');
    expect(result).toEqual({ data: { a: 1 }, sha: 'abc' });
  });

  it('readFile throws NotFoundError on 404', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) });
    await expect(client.readFile('missing.json')).rejects.toThrow(NotFoundError);
  });

  it('readFile throws AuthError on 401', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
    await expect(client.readFile('settings.json')).rejects.toThrow(AuthError);
  });

  it('writeFile sends PUT with base64 content + sha', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ content: { sha: 'new_sha' } }),
    });
    const newSha = await client.writeFile('settings.json', { a: 2 }, 'old_sha', 'feat: update settings');
    expect(newSha).toBe('new_sha');
    const call = fetch.mock.calls[0];
    expect(call[0]).toContain('/repos/kdh044/grad-planner-data/contents/settings.json');
    expect(call[1].method).toBe('PUT');
    const body = JSON.parse(call[1].body);
    expect(body.sha).toBe('old_sha');
    expect(body.message).toBe('feat: update settings');
    expect(JSON.parse(decodeURIComponent(escape(atob(body.content))))).toEqual({ a: 2 });
  });

  it('writeFile throws ConflictError on 409', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({}) });
    await expect(client.writeFile('x.json', {}, 'sha', 'msg')).rejects.toThrow(ConflictError);
  });

  it('writeFile creates new file when sha is null', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ content: { sha: 'first_sha' } }),
    });
    await client.writeFile('new.json', { x: 1 }, null, 'feat: create');
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.sha).toBeUndefined();
  });

  it('checkAccess returns true on 200', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
    expect(await client.checkAccess()).toBe(true);
  });

  it('checkAccess returns false on 401', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
    expect(await client.checkAccess()).toBe(false);
  });
});
