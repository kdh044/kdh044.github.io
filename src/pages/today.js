import { storage } from '../lib/storage.js';
import { GitHubClient } from '../lib/github.js';
import { DataLayer } from '../lib/data.js';
import { dayKey, monthKey, dayOfWeekKey, dDay, formatDay } from '../lib/date.js';
import dayjs from 'dayjs';
import { makeCheckbox } from '../components/checkbox.js';

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

export async function renderToday(container) {
  const data = getDataLayer();
  if (!data) {
    container.innerHTML = '<h1 class="page-title">Today</h1><p class="page-subtitle">PAT 필요. <a href="#/settings">Settings</a></p>';
    return;
  }

  const today = dayKey(dayjs());
  const month = monthKey(today);
  const settings = await data.getSettings();
  const { routines } = await data.getRoutines();
  const completions = await data.getCompletions(month);
  const notes = await data.getNotes(month);
  const dayCompletions = completions.days[today] || {};
  const todayNote = notes.notes[today] || '';

  const dDayLine = settings.graduationDate
    ? `<span style="margin-left:10px">졸업까지 D-${dDay(settings.graduationDate)}</span>`
    : '';

  container.innerHTML = `
    <h1 class="page-title">📌 Today · ${formatDay(today)}</h1>
    <p class="page-subtitle">${dayjs(today).format('YYYY-MM-DD')} · ${dayjs(today).format('dddd')}${dDayLine}</p>

    <div class="card" style="margin-bottom:14px">
      <div style="font-weight:600;margin-bottom:8px">시간 박힘</div>
      <div id="today-scheduled"></div>
    </div>
    <div class="card" style="margin-bottom:14px">
      <div style="font-weight:600;margin-bottom:8px">체크리스트</div>
      <div id="today-checklist"></div>
    </div>
    <div class="card">
      <div style="font-weight:600;margin-bottom:8px">노트</div>
      <textarea id="today-note" rows="4" style="resize:vertical">${todayNote}</textarea>
    </div>
  `;

  const scheduledList = container.querySelector('#today-scheduled');
  const checklistList = container.querySelector('#today-checklist');

  const todayRoutines = routines.filter((r) => applies(r, today));
  const sched = todayRoutines.filter(r => r.kind === 'scheduled').sort((a,b) => (a.time || '').localeCompare(b.time || ''));
  const chk = todayRoutines.filter(r => r.kind === 'checklist');

  const renderRow = (r, parent) => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;padding:6px 0;border-top:1px solid var(--border)';
    const isDone = !!dayCompletions[r.id]?.done;
    const cb = makeCheckbox({
      checked: isDone,
      onToggle: async (next) => {
        const entry = next ? { done: true, doneAt: dayjs().format('HH:mm') } : { done: false };
        await data.setCompletion(today, r.id, entry);
      },
    });
    row.appendChild(cb);
    const label = document.createElement('span');
    if (r.kind === 'scheduled') {
      label.innerHTML = `<span style="color:var(--text-soft);font-size:12px;margin-right:8px">${r.time}</span>${r.emoji || ''} ${r.name}`;
    } else {
      label.innerHTML = `${r.emoji || ''} ${r.name}`;
    }
    if (isDone) label.style.cssText = 'color:var(--text-soft);text-decoration:line-through';
    row.appendChild(label);
    parent.appendChild(row);
  };

  if (sched.length === 0) scheduledList.innerHTML = '<div style="color:var(--text-soft);font-size:12px">없음</div>';
  else sched.forEach(r => renderRow(r, scheduledList));
  if (chk.length === 0) checklistList.innerHTML = '<div style="color:var(--text-soft);font-size:12px">없음</div>';
  else chk.forEach(r => renderRow(r, checklistList));

  const noteEl = container.querySelector('#today-note');
  noteEl.addEventListener('blur', async () => {
    const newText = noteEl.value;
    if (newText !== todayNote) {
      try { await data.setNote(today, newText); } catch (e) { alert('노트 저장 실패: ' + e.message); }
    }
  });
}
