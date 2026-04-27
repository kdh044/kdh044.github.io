import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRouter } from '../src/lib/router.js';

describe('createRouter', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('parses current route from hash', () => {
    window.location.hash = '#/today';
    const router = createRouter({ '/': vi.fn(), '/today': vi.fn() });
    expect(router.current()).toBe('/today');
  });

  it('falls back to / when hash empty', () => {
    window.location.hash = '';
    const router = createRouter({ '/': vi.fn() });
    expect(router.current()).toBe('/');
  });

  it('navigate updates hash and triggers handler', () => {
    const handler = vi.fn();
    const router = createRouter({ '/': vi.fn(), '/today': handler });
    router.start();
    router.navigate('/today');
    expect(window.location.hash).toBe('#/today');
    expect(handler).toHaveBeenCalled();
  });

  it('start triggers handler for current route', () => {
    window.location.hash = '#/routines';
    const handler = vi.fn();
    const router = createRouter({ '/': vi.fn(), '/routines': handler });
    router.start();
    expect(handler).toHaveBeenCalled();
  });

  it('falls back to / for unknown route', () => {
    const homeHandler = vi.fn();
    window.location.hash = '#/unknown';
    const router = createRouter({ '/': homeHandler });
    router.start();
    expect(homeHandler).toHaveBeenCalled();
  });
});
