const NAV = [
  { section: 'PLANNER', items: [
    { hash: '#/today',    icon: '📌', label: 'Today' },
    { hash: '#/',         icon: '📅', label: 'Week' },
    { hash: '#/routines', icon: '✓',  label: 'Routines' },
  ]},
  { section: '', items: [
    { hash: '#/settings', icon: '⚙',  label: 'Settings' },
  ]},
];

export function renderSidebar(currentHash, displayName = 'kdh044') {
  const itemsHtml = NAV.map((sec) => {
    const sectionHeader = sec.section
      ? `<div class="nav-section">${sec.section}</div>`
      : `<div style="margin-top:14px;border-top:1px solid var(--border);padding-top:6px"></div>`;
    const items = sec.items.map((it) => {
      const active = it.hash === currentHash || (currentHash === '' && it.hash === '#/') ? ' active' : '';
      return `<a href="${it.hash}" class="nav-item${active}"><span class="nav-icon">${it.icon}</span>${it.label}</a>`;
    }).join('');
    return sectionHeader + items;
  }).join('');

  return `
    <aside class="sidebar" id="sidebar">
      <div style="display:flex;align-items:center;padding:6px 8px;margin-bottom:14px">
        <div style="width:22px;height:22px;background:var(--accent);border-radius:4px;margin-right:8px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:11px">D</div>
        <div style="font-weight:600">${displayName}'s workspace</div>
      </div>
      ${itemsHtml}
    </aside>
  `;
}

export function renderMobileHeader(title) {
  return `
    <div class="mobile-header">
      <button class="hamburger" id="hamburger" aria-label="menu">☰</button>
      <div style="font-weight:600">${title}</div>
    </div>
  `;
}

export function attachSidebarHandlers() {
  const ham = document.getElementById('hamburger');
  const sb = document.getElementById('sidebar');
  if (ham && sb) {
    ham.addEventListener('click', () => sb.classList.toggle('open'));
  }
  document.querySelectorAll('.sidebar .nav-item').forEach((el) => {
    el.addEventListener('click', () => sb && sb.classList.remove('open'));
  });
}
