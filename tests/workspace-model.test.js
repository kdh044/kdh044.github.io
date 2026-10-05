import {it,expect} from 'vitest';
import {eventOnDay,monthCells,weekCells,safeURL,dateKey,emptyWorkspace} from '../src/workspace/model.js';
it('handles month rollover and exclusive all-day ends',()=>{const cells=monthCells(new Date(2026,11,15));expect(cells).toHaveLength(42);expect(dateKey(cells[0])).toBe('2026-11-29');expect(dateKey(cells[41])).toBe('2027-01-09');const e={start:{date:'2026-10-05'},end:{date:'2026-10-07'}};expect(eventOnDay(e,'2026-10-06')).toBe(true);expect(eventOnDay(e,'2026-10-07')).toBe(false);});
it('starts without content and rejects script URLs',()=>{const w=emptyWorkspace();expect(w.tasks).toEqual([]);expect(w.pages).toEqual([]);expect(w.portfolio.intro).toBe('');expect(safeURL('javascript:alert(1)')).toBe('');expect(safeURL('data:text/html,hi')).toBe('');});

it('keeps a week contiguous across a year boundary without changing its anchor',()=>{const d=new Date(2027,0,1),days=weekCells(d);expect(days.map(dateKey)).toEqual(['2026-12-27','2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02']);expect(dateKey(d)).toBe('2027-01-01');});
