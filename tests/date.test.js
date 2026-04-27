import { describe, it, expect } from 'vitest';
import { weekStart, weekEnd, weekNumber, dayKey, monthKey, dayOfWeekKey, formatDay } from '../src/lib/date.js';

describe('date helpers', () => {
  it('weekStart returns Monday of the week containing date (월요일 기준)', () => {
    expect(weekStart('2026-04-27').format('YYYY-MM-DD')).toBe('2026-04-27'); // Mon
    expect(weekStart('2026-04-30').format('YYYY-MM-DD')).toBe('2026-04-27'); // Thu
    expect(weekStart('2026-05-03').format('YYYY-MM-DD')).toBe('2026-04-27'); // Sun
  });

  it('weekEnd returns Sunday of the week', () => {
    expect(weekEnd('2026-04-27').format('YYYY-MM-DD')).toBe('2026-05-03');
  });

  it('weekNumber returns ISO week number', () => {
    expect(weekNumber('2026-04-27')).toBe(18); // ISO week 18 of 2026
  });

  it('dayKey returns YYYY-MM-DD', () => {
    expect(dayKey('2026-04-27T15:00:00')).toBe('2026-04-27');
  });

  it('monthKey returns YYYY-MM', () => {
    expect(monthKey('2026-04-27')).toBe('2026-04');
  });

  it('dayOfWeekKey returns mon/tue/.../sun', () => {
    expect(dayOfWeekKey('2026-04-27')).toBe('mon');
    expect(dayOfWeekKey('2026-05-03')).toBe('sun');
  });

  it('formatDay formats Korean weekday + date', () => {
    expect(formatDay('2026-04-27')).toBe('월 4/27');
  });
});
