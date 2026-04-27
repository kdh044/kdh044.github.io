import { storage } from '../lib/storage.js';
import { GitHubClient } from '../lib/github.js';
import { DataLayer } from '../lib/data.js';
import { openModal } from '../components/modal.js';

const DOWS = [
  { key: 'mon', label: '월' }, { key: 'tue', label: '화' }, { key: 'wed', label: '수' },
  { key: 'thu', label: '목' }, { key: 'fri', label: '금' }, { key: 'sat', label: '토' }, { key: 'sun', label: '일' },
];

function makeId() {
  return 'r_' + Math.random().toString(36).slice(2, 9);
}

function getDataLayer() {
  const token = storage.get('pat');
  if (!token) return null;
  const client = new GitHubClient({ token, owner: 'kdh044', repo: 'private' });
  return new DataLayer(client);
}

function routineRow(r, onEdit, onDelete) {
  const dowText = r.days.length === 0 || r.days.length === 7 ? '매일' : r.days.map(d => DOWS.find(x => x.key === d).label).join('');
  const meta = r.kind === 'scheduled' ? `${r.time} · ${dowText}` : `체크 · ${dowText}`;
  const div = document.createElement('div');
  div.style.cssText = 'display:flex;align-items:center;padding:10px 12px;border-bottom:1px solid var(--border);gap:10px';
  div.innerHTML = `
    <span style="font-size:18px">${r.emoji || '•'}</span>
    <div style="flex:1">
      <div style="font-weight:500">${r.name}</div>
      <div style="font-size:11px;color:var(--text-soft)">${meta}</div>
    </div>
    <button class="btn" data-act="edit" style="padding:4px 8px;font-size:11px">수정</button>
    <button class="btn" data-act="del" style="padding:4px 8px;font-size:11px">삭제</button>
  `;
  div.querySelector('[data-act=edit]').addEventListener('click', () => onEdit(r));
  div.querySelector('[data-act=del]').addEventListener('click', () => onDelete(r));
  return div;
}

function modalForm(r = {}) {
  const isScheduled = r.kind === 'scheduled';
  const days = r.days || [];
  return `
    <label style="display:block;margin-bottom:10px">
      <div style="font-size:12px;color:var(--text-soft);margin-bottom:4px">이름</div>
      <input type="text" id="rf-name" value="${r.name || ''}" />
    </label>
    <div style="margin-bottom:10px">
      <div style="font-size:12px;color:var(--text-soft);margin-bottom:4px">종류</div>
      <label style="margin-right:10px"><input type="radio" name="rf-kind" value="scheduled" ${isScheduled ? 'checked' : ''} /> 시간 박힘</label>
      <label><input type="radio" name="rf-kind" value="checklist" ${!isScheduled ? 'checked' : ''} /> 자유 체크</label>
    </div>
    <label style="display:block;margin-bottom:10px" id="rf-time-wrap" style="${isScheduled ? '' : 'display:none'}">
      <div style="font-size:12px;color:var(--text-soft);margin-bottom:4px">시간</div>
      <input type="time" id="rf-time" value="${r.time || '07:00'}" />
    </label>
    <div style="margin-bottom:10px">
      <div style="font-size:12px;color:var(--text-soft);margin-bottom:4px">요일 (전부 비우면 매일)</div>
      <div id="rf-days" style="display:flex;gap:4px">
        ${DOWS.map(d => `<label style="cursor:pointer"><input type="checkbox" value="${d.key}" ${days.includes(d.key) ? 'checked' : ''} style="display:none" /><span style="display:inline-block;padding:6px 10px;border:1px solid var(--border);border-radius:4px;background:${days.includes(d.key) ? 'var(--accent-bg)' : '#fff'}">${d.label}</span></label>`).join('')}
      </div>
    </div>
    <label style="display:block;margin-bottom:10px">
      <div style="font-size:12px;color:var(--text-soft);margin-bottom:4px">이모지</div>
      <input type="text" id="rf-emoji" value="${r.emoji || ''}" maxlength="4" style="width:60px" />
    </label>
    <label style="display:block">
      <div style="font-size:12px;color:var(--text-soft);margin-bottom:4px">색상</div>
      <input type="color" id="rf-color" value="${r.color || '#2196f3'}" />
    </label>
  `;
}

function readForm(rootEl, existingId = null) {
  const name = rootEl.querySelector('#rf-name').value.trim();
  if (!name) throw new Error('이름을 입력해줘');
  const kind = rootEl.querySelector('input[name="rf-kind"]:checked').value;
  const time = kind === 'scheduled' ? rootEl.querySelector('#rf-time').value : undefined;
  const days = Array.from(rootEl.querySelectorAll('#rf-days input:checked')).map(i => i.value);
  const emoji = rootEl.querySelector('#rf-emoji').value;
  const color = rootEl.querySelector('#rf-color').value;
  return { id: existingId || makeId(), name, kind, time, days, emoji, color, active: true };
}

function attachFormBehaviors(rootEl) {
  rootEl.querySelectorAll('input[name="rf-kind"]').forEach((r) => {
    r.addEventListener('change', (e) => {
      const wrap = rootEl.querySelector('#rf-time-wrap');
      wrap.style.display = e.target.value === 'scheduled' ? '' : 'none';
    });
  });
  rootEl.querySelectorAll('#rf-days input').forEach((cb) => {
    cb.addEventListener('change', () => {
      cb.nextElementSibling.style.background = cb.checked ? 'var(--accent-bg)' : '#fff';
    });
  });
}

export async function renderRoutines(container) {
  const data = getDataLayer();
  if (!data) {
    container.innerHTML = '<h1 class="page-title">Routines</h1><p class="page-subtitle">PAT가 필요해. <a href="#/settings">Settings</a>에서 입력해줘.</p>';
    return;
  }

  container.innerHTML = `
    <h1 class="page-title">✓ Routines</h1>
    <p class="page-subtitle">루틴 정의. 시간 박힘 / 자유 체크.</p>
    <div style="margin-bottom:14px"><button class="btn btn-primary" id="add-routine">+ 추가</button></div>
    <div class="card" id="list-scheduled" style="margin-bottom:14px">
      <div style="font-weight:600;margin-bottom:6px">시간 박힘</div>
      <div id="list-scheduled-items"></div>
    </div>
    <div class="card">
      <div style="font-weight:600;margin-bottom:6px">자유 체크</div>
      <div id="list-checklist-items"></div>
    </div>
  `;

  let cache = await data.getRoutines();

  const refresh = () => {
    const sched = container.querySelector('#list-scheduled-items');
    const cl = container.querySelector('#list-checklist-items');
    sched.innerHTML = '';
    cl.innerHTML = '';
    const onEdit = (r) => openEditModal(r);
    const onDelete = async (r) => {
      if (!confirm(`"${r.name}" 삭제?`)) return;
      cache.routines = cache.routines.filter(x => x.id !== r.id);
      await data.saveRoutines(cache);
      refresh();
    };
    cache.routines.forEach((r) => {
      const target = r.kind === 'scheduled' ? sched : cl;
      target.appendChild(routineRow(r, onEdit, onDelete));
    });
    if (sched.children.length === 0) sched.innerHTML = '<div style="color:var(--text-soft);font-size:12px;padding:6px">없음</div>';
    if (cl.children.length === 0) cl.innerHTML = '<div style="color:var(--text-soft);font-size:12px;padding:6px">없음</div>';
  };

  const openEditModal = (existing) => {
    const overlay = openModal(existing ? '루틴 수정' : '루틴 추가', modalForm(existing || {}), async (rootEl) => {
      const r = readForm(rootEl, existing?.id);
      if (existing) {
        cache.routines = cache.routines.map(x => x.id === r.id ? r : x);
      } else {
        cache.routines.push(r);
      }
      await data.saveRoutines(cache);
      refresh();
    });
    attachFormBehaviors(overlay);
  };

  container.querySelector('#add-routine').addEventListener('click', () => openEditModal(null));
  refresh();
}
