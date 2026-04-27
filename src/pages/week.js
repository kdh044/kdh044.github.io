import { storage } from '../lib/storage.js';
import { GitHubClient } from '../lib/github.js';
import { DataLayer } from '../lib/data.js';
import { weekStart, weekEnd, weekNumber, eachDayOfWeek, dayOfWeekKey, dayKey, monthKey, formatDay } from '../lib/date.js';
import dayjs from 'dayjs';

function getDataLayer() {
  const token = storage.get('pat');
  if (!token) return null;
  return new DataLayer(new GitHubClient({ token, owner: 'kdh044', repo: 'private' }));
}

function applies(routine, dateStr) {
  if (!routine.active) return false;
  if (!routine.days || routine.days.length === 0) return true;
  return routine.days.includes(dayOfWeekKey(dateStr));
}

let currentWeekRef = dayjs();

export async function renderWeek(container) {
  const data = getDataLayer();
  if (!data) {
    container.innerHTML = '<h1 class="page-title">Week</h1><p class="page-subtitle">PAT 필요. <a href="#/settings">Settings</a></p>';
    return;
  }

  const ws = weekStart(currentWeekRef);
  const we = weekEnd(currentWeekRef);
  const wn = weekNumber(currentWeekRef);
  const days = eachDayOfWeek(currentWeekRef);
  const today = dayKey(dayjs());

  const months = [...new Set(days.map(d => monthKey(d)))];
  const completionsByMonth = {};
  for (const m of months) completionsByMonth[m] = await data.getCompletions(m);
  const { routines } = await data.getRoutines();

  const totals = days.map((d) => {
    const dStr = dayKey(d);
    const today_routines = routines.filter(r => applies(r, dStr));
    const done = today_routines.filter(r => completionsByMonth[monthKey(d)].days[dStr]?.[r.id]?.done).length;
    return { total: today_routines.length, done };
  });

  const avgPct = (() => {
    const past = totals.filter((t, i) => dayKey(days[i]) <= today && t.total > 0);
    if (past.length === 0) return 0;
    return Math.round(past.reduce((s, t) => s + (t.done / t.total), 0) / past.length * 100);
  })();

  container.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:24px">
      <div>
        <div style="font-size:11px;color:var(--text-soft);letter-spacing:0.5px;text-transform:uppercase">${ws.year()} · WEEK ${wn}</div>
        <h1 class="page-title">📅 ${ws.format('M/D')} ~ ${we.format('M/D')}</h1>
      </div>
      <div style="text-align:right">
        <div style="font-size:11px;color:var(--text-soft)">평균 진척도</div>
        <div style="font-size:28px;font-weight:700;color:var(--accent);line-height:1">${avgPct}%</div>
      </div>
    </div>
    <div style="margin-bottom:14px">
      <button class="btn" id="week-prev">← 이전 주</button>
      <button class="btn" id="week-next" style="margin-left:8px">다음 주 →</button>
      <button class="btn" id="week-today" style="margin-left:8px">오늘</button>
    </div>
    <div id="week-grid" class="week-grid"></div>
  `;

  const grid = container.querySelector('#week-grid');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(7, 1fr);gap:10px';

  days.forEach((d, idx) => {
    const dStr = dayKey(d);
    const isToday = dStr === today;
    const t = totals[idx];
    const dayRoutines = routines.filter(r => applies(r, dStr));
    const sched = dayRoutines.filter(r => r.kind === 'scheduled').sort((a,b) => (a.time || '').localeCompare(b.time || ''));
    const chk = dayRoutines.filter(r => r.kind === 'checklist');
    const dc = completionsByMonth[monthKey(d)].days[dStr] || {};

    const renderItem = (r) => {
      const done = !!dc[r.id]?.done;
      const mark = done ? '<span style="color:var(--success)">✓</span>' : '<span style="color:var(--border-strong)">☐</span>';
      const text = r.kind === 'scheduled'
        ? `<span style="color:var(--text-soft);font-size:10px">${r.time}</span> ${r.emoji || ''} ${r.name}`
        : `${r.emoji || ''} ${r.name}`;
      const style = done ? 'color:var(--text-soft);text-decoration:line-through' : '';
      return `<div style="font-size:11px;padding:1px 0;${style}">${mark} ${text}</div>`;
    };

    const cell = document.createElement('a');
    cell.href = '#/today';
    cell.style.cssText = `display:block;background:${isToday ? 'var(--accent-bg)' : 'var(--bg-card)'};border:1px solid ${isToday ? 'var(--accent)' : 'var(--border)'};border-radius:8px;padding:10px;color:inherit;min-height:160px`;
    cell.innerHTML = `
      <div style="font-size:11px;color:var(--text-soft);margin-bottom:2px">${formatDay(d)}</div>
      <div style="font-size:12px;color:${t.total ? 'var(--text)' : 'var(--text-soft)'};margin-bottom:6px">${t.done}/${t.total}</div>
      <div style="border-top:1px solid var(--border);padding-top:6px">
        ${[...sched, ...chk].map(renderItem).join('') || '<div style="color:var(--text-soft);font-size:11px">없음</div>'}
      </div>
    `;
    grid.appendChild(cell);
  });

  container.querySelector('#week-prev').addEventListener('click', () => {
    currentWeekRef = currentWeekRef.subtract(1, 'week');
    renderWeek(container);
  });
  container.querySelector('#week-next').addEventListener('click', () => {
    currentWeekRef = currentWeekRef.add(1, 'week');
    renderWeek(container);
  });
  container.querySelector('#week-today').addEventListener('click', () => {
    currentWeekRef = dayjs();
    renderWeek(container);
  });
}
