import { createRouter } from './lib/router.js';
import { renderSidebar, renderMobileHeader, attachSidebarHandlers } from './components/sidebar.js';
import { storage } from './lib/storage.js';
import { renderSettings } from './pages/settings.js';
import { renderRoutines } from './pages/routines.js';

const app = document.getElementById('app');

function renderShell(pageHtml, pageTitle) {
  const hash = window.location.hash;
  app.innerHTML = `
    ${renderMobileHeader(pageTitle)}
    <div class="app-shell">
      ${renderSidebar(hash)}
      <main class="main">${pageHtml}</main>
    </div>
  `;
  attachSidebarHandlers();
}

function pageWeek() {
  renderShell('<h1 class="page-title">Week</h1><p class="page-subtitle">주간 grid (Task 12에서 구현)</p>', 'Week');
}
function pageToday() {
  renderShell('<h1 class="page-title">Today</h1><p class="page-subtitle">(Task 11에서 구현)</p>', 'Today');
}
function pageRoutines() {
  renderShell('', 'Routines');
  const main = document.querySelector('.main');
  renderRoutines(main);
}
function pageSettings() {
  renderShell('', 'Settings');
  const main = document.querySelector('.main');
  renderSettings(main);
}

const router = createRouter({
  '/': pageWeek,
  '/today': pageToday,
  '/routines': pageRoutines,
  '/settings': pageSettings,
});

if (!storage.get('pat') && window.location.hash !== '#/settings') {
  window.location.hash = '#/settings';
}

router.start();
