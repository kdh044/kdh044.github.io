import {it,expect} from 'vitest';
import {eventOnDay,monthCells,weekCells,safeURL,dateKey,emptyWorkspace} from '../src/workspace/model.js';
it('handles month rollover and exclusive all-day ends',()=>{const cells=monthCells(new Date(2026,11,15));expect(cells).toHaveLength(42);expect(dateKey(cells[0])).toBe('2026-11-29');expect(dateKey(cells[41])).toBe('2027-01-09');const e={start:{date:'2026-10-05'},end:{date:'2026-10-07'}};expect(eventOnDay(e,'2026-10-06')).toBe(true);expect(eventOnDay(e,'2026-10-07')).toBe(false);});
it('starts without content and rejects script URLs',()=>{const w=emptyWorkspace();expect(w.tasks).toEqual([]);expect(w.pages).toEqual([]);expect(w.portfolio.intro).toBe('');expect(safeURL('javascript:alert(1)')).toBe('');expect(safeURL('data:text/html,hi')).toBe('');});

it('keeps a week contiguous across a year boundary without changing its anchor',()=>{const d=new Date(2027,0,1),days=weekCells(d);expect(days.map(dateKey)).toEqual(['2026-12-27','2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02']);expect(dateKey(d)).toBe('2027-01-01');});

import {normalizeWorkspace,plannerWeek,weekKey,daysUntil,deadlineLabel,monthDates,importantItems} from '../src/workspace/model.js';
it('uses Monday weeks and handles deadlines as calendar days across leap years',()=>{
  expect(plannerWeek(new Date(2027,0,3)).map(dateKey)).toEqual(['2026-12-28','2026-12-29','2026-12-30','2026-12-31','2027-01-01','2027-01-02','2027-01-03']);
  expect(weekKey(new Date(2027,0,3))).toBe('2026-12-28');
  expect(daysUntil('2028-03-01','2028-02-28')).toBe(2);
  expect(deadlineLabel('2026-10-09','2026-10-06')).toBe('D-3');
  expect(deadlineLabel('2026-10-06','2026-10-06')).toBe('D-day');
  expect(deadlineLabel('2026-10-05','2026-10-06')).toBe('D+1');
  expect(daysUntil('2026-02-30','2026-02-28')).toBeNull();
});
it('uses exact month lengths and retains only valid habit checks',()=>{
  expect(monthDates(new Date(2028,1,10))).toHaveLength(29);expect(monthDates(new Date(2027,1,10))).toHaveLength(28);
  const w=normalizeWorkspace({habits:[{id:'h',title:'Habit',checks:{'2028-02-29':true,'2027-02-29':true,'2028-03-01':false}}]});expect(w.habits[0].checks).toEqual({'2028-02-29':true});expect(normalizeWorkspace(JSON.parse(JSON.stringify(w)))).toEqual(w);
});
it('derives D-days from important dates and updates Google pins from current events',()=>{
  const w=emptyWorkspace();w.tasks=[{id:'t',title:'Task',date:'2026-10-09',important:true,status:'todo'},{id:'done',title:'Done',date:'2026-10-08',important:true,status:'done'}];w.events=[{id:'e',title:'Meeting',date:'2026-10-10',important:true}];w.googleImportant={'key':{title:'Old title',date:'2026-10-11'}};
  expect(importantItems(w).map(x=>x.title)).toEqual(['Task','Meeting','Old title']);w.tasks[0].date='2026-10-12';expect(importantItems(w).find(x=>x.id==='t').date).toBe('2026-10-12');
  const live=[{googleKey:'key',summary:'Moved meeting',start:{date:'2026-10-13'}}];expect(importantItems(w,live).find(x=>x.kind==='google')).toMatchObject({title:'Moved meeting',date:'2026-10-13'});expect(importantItems(w,[{...live[0],status:'cancelled'}]).some(x=>x.kind==='google')).toBe(false);
});
it('loads old workspaces without losing tasks and keeps new private plans across reloads',()=>{
  const old={tasks:[{id:'existing',title:'Keep',date:'2026-10-06'}],notes:{'2026-10-06':'Keep memo'}};
  const upgraded=normalizeWorkspace(old);expect(upgraded.tasks).toEqual(old.tasks);expect(upgraded.notes).toEqual(old.notes);expect(upgraded.dailyPlans).toEqual({});expect(upgraded.deadlines).toEqual([]);
  upgraded.dailyPlans['2026-10-06']='Daily';upgraded.weeklyPlans['2026-10-05']='Weekly';upgraded.deadlines.push({id:'deadline',title:'Important',date:'2026-10-09'});
  expect(normalizeWorkspace(JSON.parse(JSON.stringify(upgraded)))).toEqual(upgraded);
  const malformed=normalizeWorkspace({dailyPlans:{'2026-02-30':'Bad','2026-10-06':false},deadlines:[{id:'bad',title:'Bad',date:'no'}]});expect(malformed.dailyPlans).toEqual({});expect(malformed.deadlines).toEqual([]);
});

it('assigns distinct defaults to old habits and safely retains custom colors across reloads',()=>{const w=normalizeWorkspace({habits:[{id:'a',title:'A',checks:{}},{id:'b',title:'B',checks:{}},{id:'c',title:'C',color:'#8855aa',checks:{}},{id:'d',title:'D',color:'red;display:none',checks:{}}]});expect(w.habits[0].color).not.toBe(w.habits[1].color);expect(w.habits[2].color).toBe('#8855aa');expect(w.habits[3].color).toMatch(/^#[0-9a-f]{6}$/);expect(normalizeWorkspace(JSON.parse(JSON.stringify(w))).habits).toEqual(w.habits);});
