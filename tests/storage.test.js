import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../src/lib/storage.js';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when key missing', () => {
    expect(storage.get('nope')).toBeNull();
  });

  it('round-trips a string', () => {
    storage.set('pat', 'ghp_xyz');
    expect(storage.get('pat')).toBe('ghp_xyz');
  });

  it('round-trips an object', () => {
    storage.set('settings', { displayName: 'danny', emoji: '📚' });
    expect(storage.get('settings')).toEqual({ displayName: 'danny', emoji: '📚' });
  });

  it('removes a key', () => {
    storage.set('temp', 'x');
    storage.remove('temp');
    expect(storage.get('temp')).toBeNull();
  });

  it('returns null on corrupt JSON', () => {
    localStorage.setItem('bad', '{not json');
    expect(storage.get('bad')).toBeNull();
  });
});
