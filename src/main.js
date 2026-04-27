import { createRouter } from './lib/router.js';
import { renderSidebar, renderMobileHeader, attachSidebarHandlers } from './components/sidebar.js';
import { storage } from './lib/storage.js';
import { renderSettings } from './pages/settings.js';
import { renderRoutines } from './pages/routines.js';
import { renderToday } from './pages/today.js';
import { renderWeek } from './pages/week.js';

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
  renderShell('', 'Week');
  const main = document.querySelector('.main');
  renderWeek(main);
}
function pageToday() {
  renderShell('', 'Today');
  const main = document.querySelector('.main');
  renderToday(main);
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
