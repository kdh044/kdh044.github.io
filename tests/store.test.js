import { describe, it, expect, vi } from 'vitest';
import { createStore } from '../src/lib/store.js';

describe('createStore', () => {
  it('returns initial state', () => {
    const store = createStore({ count: 0 });
    expect(store.get()).toEqual({ count: 0 });
  });

  it('updates state via set (merge)', () => {
    const store = createStore({ a: 1, b: 2 });
    store.set({ a: 9 });
    expect(store.get()).toEqual({ a: 9, b: 2 });
  });

  it('notifies subscribers on change', () => {
    const store = createStore({ x: 1 });
    const fn = vi.fn();
    store.subscribe(fn);
    store.set({ x: 2 });
    expect(fn).toHaveBeenCalledWith({ x: 2 });
  });

  it('unsubscribe stops further notifications', () => {
    const store = createStore({ x: 1 });
    const fn = vi.fn();
    const off = store.subscribe(fn);
    off();
    store.set({ x: 2 });
    expect(fn).not.toHaveBeenCalled();
  });
});
