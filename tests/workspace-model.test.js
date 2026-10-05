import {it,expect} from 'vitest';
import {eventOnDay,monthCells,safeURL,dateKey,emptyWorkspace} from '../src/workspace/model.js';
it('handles month rollover and exclusive all-day ends',()=>{const cells=monthCells(new Date(2026,11,15));expect(cells).toHaveLength(42);expect(dateKey(cells[0])).toBe('2026-11-29');expect(dateKey(cells[41])).toBe('2027-01-09');const e={start:{date:'2026-10-05'},end:{date:'2026-10-07'}};expect(eventOnDay(e,'2026-10-06')).toBe(true);expect(eventOnDay(e,'2026-10-07')).toBe(false);});
it('starts without content and rejects script URLs',()=>{const w=emptyWorkspace();expect(w.tasks).toEqual([]);expect(w.pages).toEqual([]);expect(w.portfolio.intro).toBe('');expect(safeURL('javascript:alert(1)')).toBe('');expect(safeURL('data:text/html,hi')).toBe('');});
