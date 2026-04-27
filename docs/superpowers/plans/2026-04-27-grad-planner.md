# Grad Planner Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `kdh044.github.io`에 대학원생용 weekly planner + 하이브리드 루틴 체커 배포 (Today/Week/Routines/Settings 4페이지, 별도 private repo를 데이터 백엔드로).

**Architecture:** Vanilla JS SPA + Vite. GitHub Pages가 사이트 코드(public)를 호스팅하고, 사용자 데이터는 별도 private repo `kdh044/grad-planner-data`에 GitHub API로 read/write. 인증은 fine-grained PAT (사용자가 입력, localStorage 저장).

**Tech Stack:**
- Vite 5 (dev server + build)
- Vanilla JS (ES modules), 순수 CSS + CSS variables
- Vitest (unit tests)
- dayjs (날짜 처리)
- GitHub Pages + GitHub Actions (배포)
- PWA: vanilla service worker + `manifest.json`

**참고**: design spec은 `docs/superpowers/specs/2026-04-27-grad-planner-design.md` 참조.

---

## File Structure

```
kdh044.github.io/  (이 repo)
├── .github/workflows/deploy.yml       # GitHub Actions 자동 배포
├── public/
│   ├── manifest.json                  # PWA manifest
│   ├── sw.js                          # service worker
│   └── icons/
│       ├── icon-192.png
│       └── icon-512.png
├── src/
│   ├── main.js                        # 엔트리: router + initial route
│   ├── style.css                      # 글로벌 + 디자인 토큰 (CSS variables)
│   ├── lib/
│   │   ├── storage.js                 # localStorage get/set/remove (PAT 등)
│   │   ├── github.js                  # GitHub Contents API (read/write/SHA)
│   │   ├── data.js                    # high-level CRUD (Settings/Routines/Completions/Notes/Schedule)
│   │   ├── date.js                    # dayjs wrapper (주차/요일 키 변환)
│   │   ├── store.js                   # 단순 pub-sub 상태 저장소
│   │   └── router.js                  # hash router
│   ├── pages/
│   │   ├── settings.js                # Settings 페이지 렌더 + 핸들러
│   │   ├── routines.js                # Routines 페이지 + 추가/편집 모달
│   │   ├── today.js                   # Today 페이지
│   │   └── week.js                    # Week 페이지 (디폴트)
│   └── components/
│       ├── sidebar.js                 # 사이드바 (모바일 햄버거 포함)
│       ├── checkbox.js                # 루틴 체크박스 (낙관적 업데이트)
│       └── modal.js                   # 모달 컴포넌트 (Routines에서 사용)
├── tests/
│   ├── storage.test.js
│   ├── github.test.js
│   ├── data.test.js
│   ├── date.test.js
│   ├── store.test.js
│   └── router.test.js
├── index.html
├── package.json
├── vite.config.js
├── .gitignore
└── README.md
```

데이터 repo (`kdh044/grad-planner-data`)는 별도. 코드는 이 repo에만 있음.

---

## Conventions

- 매 commit 메시지: `<type>: <subject>` (`feat`, `fix`, `chore`, `test`, `docs`)
- 매 task 끝에 commit
- TDD: logic 모듈은 test 먼저 → 실패 → 구현 → 통과 → commit
- UI 모듈은 코드 작성 후 브라우저에서 manual verify (`npm run dev` 띄우고 확인)
- 이모지 commit 메시지에 사용하지 않음

---

## Task 1: 프로젝트 초기화

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `.gitignore`, `README.md`, `src/main.js`, `src/style.css`

- [ ] **Step 1: Vite vanilla 프로젝트 초기화**

```bash
cd /home/danny/projects/grad_planner_site
npm create vite@latest . -- --template vanilla
# "Current directory not empty" 물으면 "Ignore files" 선택
npm install
npm install --save dayjs
npm install --save-dev vitest jsdom
```

- [ ] **Step 2: `.gitignore` 작성**

```
node_modules/
dist/
.DS_Store
*.log
.superpowers/
.vite/
```

- [ ] **Step 3: `package.json` 스크립트 정리**

`package.json`의 `"scripts"`를 다음으로 교체:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

- [ ] **Step 4: `vite.config.js` 작성**

```javascript
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
});
```

- [ ] **Step 5: `index.html` 작성**

```html
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#ffffff" />
    <link rel="manifest" href="/manifest.json" />
    <title>kdh044 / planner</title>
    <link rel="stylesheet" href="/src/style.css" />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 6: 최소 `src/main.js` + `src/style.css`**

`src/main.js`:
```javascript
const app = document.getElementById('app');
app.textContent = 'kdh044 planner — bootstrapping...';
```

`src/style.css`:
```css
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body { font-family: -apple-system, "Segoe UI", "Pretendard", system-ui, sans-serif; color: #37352f; background: #fff; }
```

- [ ] **Step 7: dev server 띄워서 확인**

Run: `npm run dev`
Expected: localhost:5173 에서 "kdh044 planner — bootstrapping..." 텍스트 보임.
Ctrl+C로 종료.

- [ ] **Step 8: Vitest sanity check**

`tests/sanity.test.js`:
```javascript
import { describe, it, expect } from 'vitest';

describe('sanity', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm test`
Expected: PASS, 1 test passed.

- [ ] **Step 9: Commit**

```bash
git init
git add -A
git commit -m "chore: initialize vite + vitest project"
```

---

## Task 2: 디자인 시스템 CSS (토큰 + 베이스)

**Files:**
- Modify: `src/style.css`

- [ ] **Step 1: CSS variables (노션 라이트 팔레트) 추가**

`src/style.css`를 다음으로 교체:

```css
:root {
  --bg: #ffffff;
  --bg-soft: #f7f6f3;
  --bg-card: #fafaf9;
  --border: #ebebea;
  --border-strong: #d3d2cf;
  --text: #37352f;
  --text-soft: #9b9a97;
  --accent: #2196f3;
  --accent-bg: #e3f2fd;
  --success: #4caf50;
  --warn: #ff6f00;
  --radius: 8px;
  --radius-sm: 5px;
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.04);
  --sidebar-w: 200px;
  --header-h: 48px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { height: 100%; }
body {
  font-family: -apple-system, "Segoe UI", "Pretendard", system-ui, sans-serif;
  font-size: 14px;
  color: var(--text);
  background: var(--bg);
  -webkit-font-smoothing: antialiased;
}
button { font: inherit; cursor: pointer; border: none; background: none; color: inherit; }
input, textarea { font: inherit; color: inherit; }
a { color: var(--accent); text-decoration: none; }

/* Layout shell */
.app-shell { display: flex; min-height: 100vh; }
.sidebar { width: var(--sidebar-w); background: var(--bg-soft); border-right: 1px solid var(--border); padding: 14px 8px; flex-shrink: 0; }
.main { flex: 1; padding: 36px 60px; overflow-x: hidden; }

/* Sidebar items */
.nav-section { font-size: 11px; color: var(--text-soft); padding: 8px 8px 4px; letter-spacing: 0.5px; text-transform: uppercase; }
.nav-item { display: flex; align-items: center; padding: 6px 8px; border-radius: var(--radius-sm); color: var(--text); cursor: pointer; }
.nav-item:hover { background: rgba(55, 53, 47, 0.06); }
.nav-item.active { background: rgba(55, 53, 47, 0.1); font-weight: 600; }
.nav-icon { margin-right: 8px; font-size: 14px; }

/* Card */
.card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius); padding: 14px 16px; }

/* Headings */
h1.page-title { font-size: 30px; font-weight: 700; margin: 0 0 4px; }
.page-subtitle { color: var(--text-soft); font-size: 13px; margin-bottom: 28px; }

/* Inputs */
input[type="text"], input[type="password"], input[type="date"], input[type="time"], textarea {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  outline: none;
  transition: border-color 0.1s;
}
input:focus, textarea:focus { border-color: var(--accent); }

/* Buttons */
.btn { padding: 8px 14px; border-radius: var(--radius-sm); border: 1px solid var(--border-strong); background: var(--bg); transition: background 0.1s; }
.btn:hover { background: var(--bg-soft); }
.btn-primary { background: var(--accent); color: #fff; border-color: var(--accent); }
.btn-primary:hover { background: #1976d2; }

/* Mobile */
.mobile-header { display: none; height: var(--header-h); align-items: center; padding: 0 16px; border-bottom: 1px solid var(--border); }
.hamburger { font-size: 20px; margin-right: 12px; }

@media (max-width: 768px) {
  .app-shell { flex-direction: column; }
  .sidebar { position: fixed; top: 0; left: 0; height: 100vh; transform: translateX(-100%); transition: transform 0.2s; z-index: 100; box-shadow: 2px 0 8px rgba(0,0,0,0.1); }
  .sidebar.open { transform: translateX(0); }
  .mobile-header { display: flex; }
  .main { padding: 20px 16px; }
  h1.page-title { font-size: 24px; }
}
```

- [ ] **Step 2: dev server에서 시각 확인**

Run: `npm run dev`
브라우저에서 localhost:5173 열고 background와 typography 변경 확인 (텍스트는 아직 그대로지만 폰트/색이 변함).

- [ ] **Step 3: Commit**

```bash
git add src/style.css
git commit -m "feat: add design tokens and base styles"
```

---

## Task 3: localStorage 추상화

**Files:**
- Create: `src/lib/storage.js`, `tests/storage.test.js`

- [ ] **Step 1: 실패 테스트 작성**

`tests/storage.test.js`:
```javascript
import { describe, it, expect, beforeEach } from 'vitest';
import { storage } from '../src/lib/storage.js';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when key missing', () => {
    expect(storage.get('nope')).toBeNull();
  });

  it('round-trips a string', () => {
    storage.set('pat', 'ghp_xyz');
    expect(storage.get('pat')).toBe('ghp_xyz');
  });

  it('round-trips an object', () => {
    storage.set('settings', { displayName: 'danny', emoji: '📚' });
    expect(storage.get('settings')).toEqual({ displayName: 'danny', emoji: '📚' });
  });

  it('removes a key', () => {
    storage.set('temp', 'x');
    storage.remove('temp');
    expect(storage.get('temp')).toBeNull();
  });

  it('returns null on corrupt JSON', () => {
    localStorage.setItem('bad', '{not json');
    expect(storage.get('bad')).toBeNull();
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npm test`
Expected: FAIL — `Cannot find module '../src/lib/storage.js'`

- [ ] **Step 3: 구현**

`src/lib/storage.js`:
```javascript
const PREFIX = 'gp:';

export const storage = {
  get(key) {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },
  set(key, value) {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  },
  remove(key) {
    localStorage.removeItem(PREFIX + key);
  },
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test`
Expected: PASS — 5 tests passed.

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage.js tests/storage.test.js
git commit -m "feat: add localStorage wrapper with JSON serialization"
```

---

## Task 4: Date helpers

**Files:**
- Create: `src/lib/date.js`, `tests/date.test.js`

- [ ] **Step 1: 실패 테스트 작성**

`tests/date.test.js`:
```javascript
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
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: 구현**

`src/lib/date.js`:
```javascript
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek.js';

dayjs.extend(isoWeek);

const DOW_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const KOR_WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

export function weekStart(d) {
  return dayjs(d).isoWeekday(1).startOf('day');
}

export function weekEnd(d) {
  return dayjs(d).isoWeekday(7).startOf('day');
}

export function weekNumber(d) {
  return dayjs(d).isoWeek();
}

export function dayKey(d) {
  return dayjs(d).format('YYYY-MM-DD');
}

export function monthKey(d) {
  return dayjs(d).format('YYYY-MM');
}

export function dayOfWeekKey(d) {
  return DOW_KEYS[dayjs(d).isoWeekday() - 1];
}

export function formatDay(d) {
  const day = dayjs(d);
  return `${KOR_WEEKDAYS[day.isoWeekday() - 1]} ${day.month() + 1}/${day.date()}`;
}

export function dDay(targetDate, fromDate = dayjs()) {
  return dayjs(targetDate).startOf('day').diff(dayjs(fromDate).startOf('day'), 'day');
}

export function eachDayOfWeek(d) {
  const start = weekStart(d);
  return Array.from({ length: 7 }, (_, i) => start.add(i, 'day'));
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test`
Expected: PASS — 7 tests in date.test.js.

- [ ] **Step 5: Commit**

```bash
git add src/lib/date.js tests/date.test.js
git commit -m "feat: add date helpers (week boundaries, day keys, formatting)"
```

---

## Task 5: GitHub API client

**Files:**
- Create: `src/lib/github.js`, `tests/github.test.js`

- [ ] **Step 1: 실패 테스트 작성**

`tests/github.test.js`:
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitHubClient, NotFoundError, ConflictError, AuthError } from '../src/lib/github.js';

describe('GitHubClient', () => {
  let client;

  beforeEach(() => {
    client = new GitHubClient({ token: 'tok', owner: 'kdh044', repo: 'grad-planner-data' });
    global.fetch = vi.fn();
  });

  it('readFile returns parsed JSON content + sha on 200', async () => {
    const content = btoa(unescape(encodeURIComponent(JSON.stringify({ a: 1 }))));
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ sha: 'abc', content, encoding: 'base64' }),
    });
    const result = await client.readFile('settings.json');
    expect(result).toEqual({ data: { a: 1 }, sha: 'abc' });
  });

  it('readFile throws NotFoundError on 404', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) });
    await expect(client.readFile('missing.json')).rejects.toThrow(NotFoundError);
  });

  it('readFile throws AuthError on 401', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
    await expect(client.readFile('settings.json')).rejects.toThrow(AuthError);
  });

  it('writeFile sends PUT with base64 content + sha', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ content: { sha: 'new_sha' } }),
    });
    const newSha = await client.writeFile('settings.json', { a: 2 }, 'old_sha', 'feat: update settings');
    expect(newSha).toBe('new_sha');
    const call = fetch.mock.calls[0];
    expect(call[0]).toContain('/repos/kdh044/grad-planner-data/contents/settings.json');
    expect(call[1].method).toBe('PUT');
    const body = JSON.parse(call[1].body);
    expect(body.sha).toBe('old_sha');
    expect(body.message).toBe('feat: update settings');
    expect(JSON.parse(decodeURIComponent(escape(atob(body.content))))).toEqual({ a: 2 });
  });

  it('writeFile throws ConflictError on 409', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({}) });
    await expect(client.writeFile('x.json', {}, 'sha', 'msg')).rejects.toThrow(ConflictError);
  });

  it('writeFile creates new file when sha is null', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ content: { sha: 'first_sha' } }),
    });
    await client.writeFile('new.json', { x: 1 }, null, 'feat: create');
    const body = JSON.parse(fetch.mock.calls[0][1].body);
    expect(body.sha).toBeUndefined();
  });

  it('checkAccess returns true on 200', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
    expect(await client.checkAccess()).toBe(true);
  });

  it('checkAccess returns false on 401', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({}) });
    expect(await client.checkAccess()).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: 구현**

`src/lib/github.js`:
```javascript
export class NotFoundError extends Error {}
export class ConflictError extends Error {}
export class AuthError extends Error {}

const API_BASE = 'https://api.github.com';

function utf8ToBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

function base64ToUtf8(b64) {
  return decodeURIComponent(escape(atob(b64.replace(/\s/g, ''))));
}

export class GitHubClient {
  constructor({ token, owner, repo }) {
    this.token = token;
    this.owner = owner;
    this.repo = repo;
  }

  _headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    };
  }

  _path(filePath) {
    return `${API_BASE}/repos/${this.owner}/${this.repo}/contents/${filePath}`;
  }

  async readFile(path) {
    const res = await fetch(this._path(path), { headers: this._headers() });
    if (res.status === 404) throw new NotFoundError(path);
    if (res.status === 401 || res.status === 403) throw new AuthError(`auth failed (${res.status})`);
    if (!res.ok) throw new Error(`GitHub read failed: ${res.status}`);
    const body = await res.json();
    const data = JSON.parse(base64ToUtf8(body.content));
    return { data, sha: body.sha };
  }

  async writeFile(path, data, sha, message) {
    const body = {
      message,
      content: utf8ToBase64(JSON.stringify(data, null, 2)),
    };
    if (sha) body.sha = sha;
    const res = await fetch(this._path(path), {
      method: 'PUT',
      headers: { ...this._headers(), 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.status === 409 || res.status === 422) throw new ConflictError(path);
    if (res.status === 401 || res.status === 403) throw new AuthError(`auth failed (${res.status})`);
    if (!res.ok) throw new Error(`GitHub write failed: ${res.status}`);
    const result = await res.json();
    return result.content.sha;
  }

  async checkAccess() {
    const res = await fetch(`${API_BASE}/repos/${this.owner}/${this.repo}`, { headers: this._headers() });
    return res.ok;
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test`
Expected: PASS — github.test.js all green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/github.js tests/github.test.js
git commit -m "feat: add GitHub Contents API client (read/write/access check)"
```

---

## Task 6: Data layer (high-level CRUD with cache)

**Files:**
- Create: `src/lib/data.js`, `tests/data.test.js`

데이터 layer는 GitHubClient를 감싸서 entity별 read/write를 제공하고, localStorage에 SHA + content를 캐시한다. 캐시는 fast read + offline fallback용.

- [ ] **Step 1: 실패 테스트 작성**

`tests/data.test.js`:
```javascript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataLayer } from '../src/lib/data.js';

function makeMockClient() {
  return {
    readFile: vi.fn(),
    writeFile: vi.fn(),
  };
}

describe('DataLayer', () => {
  let client, data;

  beforeEach(() => {
    localStorage.clear();
    client = makeMockClient();
    data = new DataLayer(client);
  });

  it('getSettings reads from API and caches', async () => {
    client.readFile.mockResolvedValueOnce({
      data: { displayName: 'danny', graduationDate: '2027-08-31', emoji: '📚' },
      sha: 'sha1',
    });
    const result = await data.getSettings();
    expect(result.displayName).toBe('danny');
    expect(client.readFile).toHaveBeenCalledWith('settings.json');
    expect(localStorage.getItem('gp:cache:settings.json')).toBeTruthy();
  });

  it('getSettings returns cached on read failure (offline fallback)', async () => {
    localStorage.setItem('gp:cache:settings.json', JSON.stringify({
      data: { displayName: 'cached_user', graduationDate: '2027-08-31', emoji: '📚' },
      sha: 'cached_sha',
    }));
    client.readFile.mockRejectedValueOnce(new Error('network'));
    const result = await data.getSettings();
    expect(result.displayName).toBe('cached_user');
  });

  it('saveSettings writes to API with cached SHA', async () => {
    localStorage.setItem('gp:cache:settings.json', JSON.stringify({
      data: { displayName: 'old', graduationDate: '2027-08-31', emoji: '📚' },
      sha: 'old_sha',
    }));
    client.writeFile.mockResolvedValueOnce('new_sha');
    await data.saveSettings({ displayName: 'new', graduationDate: '2027-08-31', emoji: '📚' });
    expect(client.writeFile).toHaveBeenCalledWith(
      'settings.json',
      expect.objectContaining({ displayName: 'new' }),
      'old_sha',
      expect.any(String),
    );
  });

  it('getRoutines returns empty list on NotFound', async () => {
    const { NotFoundError } = await import('../src/lib/github.js');
    client.readFile.mockRejectedValueOnce(new NotFoundError('routines.json'));
    const result = await data.getRoutines();
    expect(result).toEqual({ routines: [] });
  });

  it('getCompletions reads month file', async () => {
    client.readFile.mockResolvedValueOnce({
      data: { month: '2026-04', days: { '2026-04-27': { ex_morning: { done: true } } } },
      sha: 'sha',
    });
    const result = await data.getCompletions('2026-04');
    expect(result.days['2026-04-27'].ex_morning.done).toBe(true);
  });

  it('setCompletion updates month file with new entry', async () => {
    client.readFile.mockResolvedValueOnce({
      data: { month: '2026-04', days: {} },
      sha: 'sha1',
    });
    client.writeFile.mockResolvedValueOnce('sha2');
    await data.setCompletion('2026-04-27', 'ex_morning', { done: true, doneAt: '07:35' });
    const writtenData = client.writeFile.mock.calls[0][1];
    expect(writtenData.days['2026-04-27'].ex_morning.done).toBe(true);
  });

  it('setCompletion creates new month file when NotFound', async () => {
    const { NotFoundError } = await import('../src/lib/github.js');
    client.readFile.mockRejectedValueOnce(new NotFoundError('completions/2026-04.json'));
    client.writeFile.mockResolvedValueOnce('sha1');
    await data.setCompletion('2026-04-27', 'english', { done: true });
    const [path, payload, sha] = client.writeFile.mock.calls[0];
    expect(path).toBe('completions/2026-04.json');
    expect(sha).toBeNull();
    expect(payload.month).toBe('2026-04');
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

Run: `npm test`
Expected: FAIL — module not found.

- [ ] **Step 3: 구현**

`src/lib/data.js`:
```javascript
import { NotFoundError } from './github.js';
import { storage } from './storage.js';
import { monthKey } from './date.js';

const CACHE_PREFIX = 'cache:';

function cacheKey(path) { return CACHE_PREFIX + path; }

export class DataLayer {
  constructor(client) {
    this.client = client;
  }

  async _readCached(path) {
    try {
      const result = await this.client.readFile(path);
      storage.set(cacheKey(path), result);
      return result;
    } catch (err) {
      if (err instanceof NotFoundError) throw err;
      const cached = storage.get(cacheKey(path));
      if (cached) return cached;
      throw err;
    }
  }

  async _writeCached(path, data, message) {
    const cached = storage.get(cacheKey(path));
    const sha = cached?.sha ?? null;
    const newSha = await this.client.writeFile(path, data, sha, message);
    storage.set(cacheKey(path), { data, sha: newSha });
    return newSha;
  }

  async getSettings() {
    try {
      const { data } = await this._readCached('settings.json');
      return data;
    } catch (err) {
      if (err instanceof NotFoundError) {
        return { displayName: '', graduationDate: '', emoji: '📚' };
      }
      throw err;
    }
  }

  async saveSettings(settings) {
    return this._writeCached('settings.json', settings, 'feat: update settings');
  }

  async getRoutines() {
    try {
      const { data } = await this._readCached('routines.json');
      return data;
    } catch (err) {
      if (err instanceof NotFoundError) return { routines: [] };
      throw err;
    }
  }

  async saveRoutines(routinesObj) {
    return this._writeCached('routines.json', routinesObj, 'feat: update routines');
  }

  async getCompletions(month) {
    const path = `completions/${month}.json`;
    try {
      const { data } = await this._readCached(path);
      return data;
    } catch (err) {
      if (err instanceof NotFoundError) return { month, days: {} };
      throw err;
    }
  }

  async setCompletion(date, routineId, entry) {
    const month = monthKey(date);
    const path = `completions/${month}.json`;
    let monthData;
    try {
      const { data } = await this._readCached(path);
      monthData = data;
    } catch (err) {
      if (err instanceof NotFoundError) {
        monthData = { month, days: {} };
        const newSha = await this.client.writeFile(path, monthData, null, `feat: init completions ${month}`);
        storage.set(cacheKey(path), { data: monthData, sha: newSha });
      } else throw err;
    }
    if (!monthData.days[date]) monthData.days[date] = {};
    monthData.days[date][routineId] = entry;
    return this._writeCached(path, monthData, `feat: completion ${date} ${routineId}`);
  }

  async getNotes(month) {
    const path = `notes/${month}.json`;
    try {
      const { data } = await this._readCached(path);
      return data;
    } catch (err) {
      if (err instanceof NotFoundError) return { month, notes: {} };
      throw err;
    }
  }

  async setNote(date, text) {
    const month = monthKey(date);
    const path = `notes/${month}.json`;
    let monthData;
    try {
      monthData = (await this._readCached(path)).data;
    } catch (err) {
      if (err instanceof NotFoundError) monthData = { month, notes: {} };
      else throw err;
    }
    monthData.notes[date] = text;
    return this._writeCached(path, monthData, `feat: note ${date}`);
  }

  async getSchedule(month) {
    const path = `schedule/${month}.json`;
    try {
      const { data } = await this._readCached(path);
      return data;
    } catch (err) {
      if (err instanceof NotFoundError) return { month, events: [] };
      throw err;
    }
  }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npm test`
Expected: PASS — all data.test.js green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data.js tests/data.test.js
git commit -m "feat: add data layer with cached read and entity-level CRUD"
```

---

## Task 7: State store + Hash router

**Files:**
- Create: `src/lib/store.js`, `src/lib/router.js`, `tests/store.test.js`, `tests/router.test.js`

- [ ] **Step 1: store 실패 테스트 작성**

`tests/store.test.js`:
```javascript
import { describe, it, expect, vi } from 'vitest';
import { createStore } from '../src/lib/store.js';

describe('createStore', () => {
  it('returns initial state', () => {
    const store = createStore({ count: 0 });
    expect(store.get()).toEqual({ count: 0 });
  });

  it('updates state via set (merge)', () => {
    const store = createStore({ a: 1, b: 2 });
    store.set({ a: 9 });
    expect(store.get()).toEqual({ a: 9, b: 2 });
  });

  it('notifies subscribers on change', () => {
    const store = createStore({ x: 1 });
    const fn = vi.fn();
    store.subscribe(fn);
    store.set({ x: 2 });
    expect(fn).toHaveBeenCalledWith({ x: 2 });
  });

  it('unsubscribe stops further notifications', () => {
    const store = createStore({ x: 1 });
    const fn = vi.fn();
    const off = store.subscribe(fn);
    off();
    store.set({ x: 2 });
    expect(fn).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: store 구현 후 통과 확인**

`src/lib/store.js`:
```javascript
export function createStore(initial) {
  let state = { ...initial };
  const subs = new Set();
  return {
    get() { return state; },
    set(patch) {
      state = { ...state, ...patch };
      subs.forEach((fn) => fn(state));
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
  };
}
```

Run: `npm test`
Expected: PASS — store.test.js green.

- [ ] **Step 3: router 실패 테스트 작성**

`tests/router.test.js`:
```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRouter } from '../src/lib/router.js';

describe('createRouter', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  it('parses current route from hash', () => {
    window.location.hash = '#/today';
    const router = createRouter({ '/': vi.fn(), '/today': vi.fn() });
    expect(router.current()).toBe('/today');
  });

  it('falls back to / when hash empty', () => {
    window.location.hash = '';
    const router = createRouter({ '/': vi.fn() });
    expect(router.current()).toBe('/');
  });

  it('navigate updates hash and triggers handler', () => {
    const handler = vi.fn();
    const router = createRouter({ '/': vi.fn(), '/today': handler });
    router.start();
    router.navigate('/today');
    expect(window.location.hash).toBe('#/today');
    expect(handler).toHaveBeenCalled();
  });

  it('start triggers handler for current route', () => {
    window.location.hash = '#/routines';
    const handler = vi.fn();
    const router = createRouter({ '/': vi.fn(), '/routines': handler });
    router.start();
    expect(handler).toHaveBeenCalled();
  });

  it('falls back to / for unknown route', () => {
    const homeHandler = vi.fn();
    window.location.hash = '#/unknown';
    const router = createRouter({ '/': homeHandler });
    router.start();
    expect(homeHandler).toHaveBeenCalled();
  });
});
```

- [ ] **Step 4: router 구현 후 통과 확인**

`src/lib/router.js`:
```javascript
export function createRouter(routes) {
  function current() {
    const hash = window.location.hash.slice(1) || '/';
    return hash in routes ? hash : '/';
  }
  function trigger() {
    const handler = routes[current()];
    if (handler) handler();
  }
  return {
    current,
    navigate(path) {
      window.location.hash = path;
      // hashchange will fire and call trigger; but if same as current, force:
      if (current() === path) trigger();
    },
    start() {
      window.addEventListener('hashchange', trigger);
      trigger();
    },
  };
}
```

Run: `npm test`
Expected: PASS — router.test.js green.

- [ ] **Step 5: Commit**

```bash
git add src/lib/store.js src/lib/router.js tests/store.test.js tests/router.test.js
git commit -m "feat: add state store and hash router"
```

---

## Task 8: App shell — Sidebar + main layout

**Files:**
- Create: `src/components/sidebar.js`
- Modify: `src/main.js`

- [ ] **Step 1: Sidebar 컴포넌트 작성**

`src/components/sidebar.js`:
```javascript
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
```

- [ ] **Step 2: `src/main.js`에 shell + 페이지 placeholder 통합**

`src/main.js`:
```javascript
import { createRouter } from './lib/router.js';
import { renderSidebar, renderMobileHeader, attachSidebarHandlers } from './components/sidebar.js';
import { storage } from './lib/storage.js';

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

function pageWeek() { renderShell('<h1 class="page-title">Week</h1><p class="page-subtitle">주간 grid (Task 12에서 구현)</p>', 'Week'); }
function pageToday() { renderShell('<h1 class="page-title">Today</h1><p class="page-subtitle">(Task 11에서 구현)</p>', 'Today'); }
function pageRoutines() { renderShell('<h1 class="page-title">Routines</h1><p class="page-subtitle">(Task 10에서 구현)</p>', 'Routines'); }
function pageSettings() { renderShell('<h1 class="page-title">Settings</h1><p class="page-subtitle">(Task 9에서 구현)</p>', 'Settings'); }

const router = createRouter({
  '/': pageWeek,
  '/today': pageToday,
  '/routines': pageRoutines,
  '/settings': pageSettings,
});

// PAT 없으면 settings로 redirect
if (!storage.get('pat') && window.location.hash !== '#/settings') {
  window.location.hash = '#/settings';
}

router.start();
```

- [ ] **Step 3: 브라우저에서 manual verify**

Run: `npm run dev`
- localhost:5173 진입 → PAT 없으니 자동 #/settings로 이동, 사이드바 + "Settings" 텍스트 표시
- 사이드바 항목 클릭 → 페이지 placeholder 변경
- 모바일 크기 (devtools)로 리사이즈 → 햄버거 메뉴 보이고 클릭 시 사이드바 열림/닫힘
- 활성 항목이 사이드바에서 강조됨

Ctrl+C로 종료.

- [ ] **Step 4: Commit**

```bash
git add src/main.js src/components/sidebar.js
git commit -m "feat: add app shell with sidebar and mobile hamburger"
```

---

## Task 9: Settings page

**Files:**
- Create: `src/pages/settings.js`
- Modify: `src/main.js`

- [ ] **Step 1: Settings 페이지 구현**

`src/pages/settings.js`:
```javascript
import { storage } from '../lib/storage.js';
import { GitHubClient } from '../lib/github.js';
import { DataLayer } from '../lib/data.js';

const PAT_GUIDE = `
  <details>
    <summary style="cursor:pointer;color:var(--text-soft);font-size:12px;padding:6px 0">PAT 만드는 법 ▾</summary>
    <ol style="font-size:12px;line-height:1.6;color:var(--text-soft);padding-left:20px;margin-top:6px">
      <li>github.com/settings/personal-access-tokens 진입 → "Generate new token (fine-grained)"</li>
      <li>Repository access: Only select repositories → <code>kdh044/grad-planner-data</code> 선택</li>
      <li>Permissions → Repository permissions → <b>Contents: Read and write</b></li>
      <li>Generate token → 한 번만 표시되니 즉시 아래 입력란에 복사</li>
    </ol>
  </details>
`;

export function renderSettings(container) {
  const settings = storage.get('settings:cached') || { displayName: '', graduationDate: '', emoji: '📚' };
  const pat = storage.get('pat') || '';

  container.innerHTML = `
    <h1 class="page-title">⚙ Settings</h1>
    <p class="page-subtitle">PAT, 졸업일, 표시명 설정. 변경 시 데이터 repo에 commit됩니다.</p>

    <div class="card" style="margin-bottom:14px">
      <div style="font-weight:600;margin-bottom:8px">GitHub Personal Access Token</div>
      <input type="password" id="pat-input" placeholder="ghp_... 또는 github_pat_..." value="${pat}" autocomplete="off" />
      <div style="margin-top:8px;display:flex;gap:8px">
        <button class="btn" id="show-pat">표시</button>
        <button class="btn btn-primary" id="test-pat">동기화 테스트</button>
      </div>
      <div id="pat-status" style="margin-top:8px;font-size:12px"></div>
      ${PAT_GUIDE}
    </div>

    <div class="card" style="margin-bottom:14px">
      <div style="font-weight:600;margin-bottom:8px">표시명</div>
      <input type="text" id="display-name" value="${settings.displayName}" placeholder="danny" />
    </div>

    <div class="card" style="margin-bottom:14px">
      <div style="font-weight:600;margin-bottom:8px">졸업 예정일</div>
      <input type="date" id="grad-date" value="${settings.graduationDate}" />
    </div>

    <div style="margin-top:14px">
      <button class="btn btn-primary" id="save-settings">저장</button>
      <span id="save-status" style="margin-left:10px;font-size:12px;color:var(--text-soft)"></span>
    </div>
  `;

  const $ = (id) => container.querySelector('#' + id);

  $('show-pat').addEventListener('click', () => {
    const inp = $('pat-input');
    inp.type = inp.type === 'password' ? 'text' : 'password';
  });

  $('test-pat').addEventListener('click', async () => {
    const status = $('pat-status');
    const token = $('pat-input').value.trim();
    if (!token) { status.textContent = 'PAT 비어있음'; status.style.color = 'var(--warn)'; return; }
    status.textContent = '확인 중...'; status.style.color = 'var(--text-soft)';
    const client = new GitHubClient({ token, owner: 'kdh044', repo: 'grad-planner-data' });
    const ok = await client.checkAccess();
    if (ok) { status.textContent = '✓ 접근 가능'; status.style.color = 'var(--success)'; }
    else { status.textContent = '✗ 인증 실패 또는 repo 없음'; status.style.color = 'var(--warn)'; }
  });

  $('save-settings').addEventListener('click', async () => {
    const status = $('save-status');
    const token = $('pat-input').value.trim();
    const displayName = $('display-name').value.trim();
    const graduationDate = $('grad-date').value;
    const settings = { displayName, graduationDate, emoji: '📚' };

    if (token) storage.set('pat', token);
    storage.set('settings:cached', settings);

    if (!token) { status.textContent = 'PAT 없이 로컬 저장만 됨'; return; }

    status.textContent = '저장 중...';
    try {
      const client = new GitHubClient({ token, owner: 'kdh044', repo: 'grad-planner-data' });
      const data = new DataLayer(client);
      await data.saveSettings(settings);
      status.textContent = '✓ 저장됨';
      status.style.color = 'var(--success)';
    } catch (e) {
      status.textContent = '✗ ' + e.message;
      status.style.color = 'var(--warn)';
    }
  });
}
```

- [ ] **Step 2: `src/main.js`에 wiring**

`src/main.js` 수정 — `pageSettings` 함수를 다음으로 교체:

```javascript
import { renderSettings } from './pages/settings.js';

function pageSettings() {
  renderShell('', 'Settings');
  const main = document.querySelector('.main');
  renderSettings(main);
}
```

(파일 상단 import에 `renderSettings` 추가, 기존 `pageSettings` 함수 본문만 교체)

- [ ] **Step 3: 브라우저 manual verify**

Run: `npm run dev`
- localhost:5173 → PAT 없으니 자동 #/settings로 이동
- 입력 폼 표시 확인 (PAT, 표시명, 졸업일)
- "표시" 버튼 → password ↔ text 토글
- "PAT 만드는 법" 토글 펼침/접힘
- (실제 PAT 있으면) "동기화 테스트" → ✓ 접근 가능 메시지
- "저장" → ✓ 저장됨 (또는 비어있으면 로컬 저장만)

- [ ] **Step 4: Commit**

```bash
git add src/pages/settings.js src/main.js
git commit -m "feat: add settings page with PAT input and validation"
```

---

## Task 10: Routines page (CRUD + 모달)

**Files:**
- Create: `src/components/modal.js`, `src/pages/routines.js`
- Modify: `src/main.js`

- [ ] **Step 1: Modal 컴포넌트**

`src/components/modal.js`:
```javascript
export function openModal(title, contentHtml, onSave) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:200;';
  overlay.innerHTML = `
    <div style="background:#fff;border-radius:8px;padding:20px 24px;width:min(440px, 90vw);max-height:80vh;overflow-y:auto">
      <h3 style="margin:0 0 14px;font-size:18px">${title}</h3>
      <div id="modal-content">${contentHtml}</div>
      <div style="margin-top:18px;display:flex;justify-content:flex-end;gap:8px">
        <button class="btn" id="modal-cancel">취소</button>
        <button class="btn btn-primary" id="modal-save">저장</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('#modal-cancel').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  overlay.querySelector('#modal-save').addEventListener('click', async () => {
    try {
      const result = onSave(overlay.querySelector('#modal-content'));
      if (result instanceof Promise) await result;
      close();
    } catch (e) {
      alert(e.message);
    }
  });

  return overlay;
}
```

- [ ] **Step 2: Routines 페이지 + 모달 form**

`src/pages/routines.js`:
```javascript
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
  const client = new GitHubClient({ token, owner: 'kdh044', repo: 'grad-planner-data' });
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
```

- [ ] **Step 2-2: 첫 진입 시 default 루틴 박기**

`src/lib/data.js`의 `getRoutines`를 수정 — NotFound일 때 default 루틴 3개 반환 후 저장:

`src/lib/data.js` 안의 `getRoutines` 메서드 교체:
```javascript
async getRoutines() {
  try {
    const { data } = await this._readCached('routines.json');
    return data;
  } catch (err) {
    if (err instanceof NotFoundError) {
      const defaults = {
        routines: [
          { id: 'r_exercise', name: '운동',  kind: 'scheduled', time: '07:00', days: ['mon','tue','wed','thu','fri'], emoji: '🏃', color: '#ff6f00', active: true },
          { id: 'r_english',  name: '영어 30min', kind: 'checklist', days: [], emoji: '📖', color: '#2196f3', active: true },
          { id: 'r_meditate', name: '명상',  kind: 'scheduled', time: '22:00', days: [], emoji: '🧘', color: '#4caf50', active: true },
        ],
      };
      try { await this._writeCached('routines.json', defaults, 'feat: init default routines'); } catch (_) {}
      return defaults;
    }
    throw err;
  }
}
```

기존 data.test.js의 `getRoutines returns empty list on NotFound` 테스트는 default 3개 반환으로 변경:
```javascript
it('getRoutines seeds defaults on NotFound', async () => {
  const { NotFoundError } = await import('../src/lib/github.js');
  client.readFile.mockRejectedValueOnce(new NotFoundError('routines.json'));
  client.writeFile.mockResolvedValueOnce('sha1');
  const result = await data.getRoutines();
  expect(result.routines.length).toBe(3);
  expect(result.routines.map(r => r.id)).toContain('r_exercise');
});
```

Run: `npm test`
Expected: PASS — data.test.js green.

- [ ] **Step 3: `src/main.js` wiring**

`src/main.js`의 `pageRoutines` 함수 교체:
```javascript
import { renderRoutines } from './pages/routines.js';

function pageRoutines() {
  renderShell('', 'Routines');
  const main = document.querySelector('.main');
  renderRoutines(main);
}
```

- [ ] **Step 4: 브라우저 manual verify**

Run: `npm run dev`
- Settings에서 PAT 입력 + 저장 (실제 PAT 필요)
- "#/routines" 진입 → default 루틴 3개 표시 (운동/영어/명상)
- "+ 추가" 클릭 → 모달 열림
- 종류 라디오 토글 → 시간 입력란 보임/숨김
- 요일 칩 클릭 → 색 변함
- "저장" → 모달 닫힘 + 목록에 추가
- 수정/삭제 동작 확인

- [ ] **Step 5: Commit**

```bash
git add src/components/modal.js src/pages/routines.js src/lib/data.js tests/data.test.js src/main.js
git commit -m "feat: add routines page with CRUD modal and default seed"
```

---

## Task 11: Today page

**Files:**
- Create: `src/components/checkbox.js`, `src/pages/today.js`
- Modify: `src/main.js`

- [ ] **Step 1: Checkbox 컴포넌트 (낙관적 업데이트)**

`src/components/checkbox.js`:
```javascript
export function makeCheckbox({ checked, onToggle }) {
  const el = document.createElement('span');
  el.style.cssText = 'display:inline-block;width:16px;height:16px;margin-right:8px;border:1.5px solid var(--border-strong);border-radius:3px;cursor:pointer;vertical-align:middle;text-align:center;line-height:14px;font-size:12px;transition:all 0.15s;';
  const render = (c) => {
    if (c) {
      el.style.background = 'var(--success)';
      el.style.borderColor = 'var(--success)';
      el.style.color = '#fff';
      el.textContent = '✓';
    } else {
      el.style.background = '#fff';
      el.style.borderColor = 'var(--border-strong)';
      el.textContent = '';
    }
  };
  render(checked);
  el.addEventListener('click', async () => {
    const next = !el.dataset.checked || el.dataset.checked === 'false';
    render(next);
    el.dataset.checked = next;
    try {
      await onToggle(next);
    } catch (err) {
      render(!next);
      el.dataset.checked = !next;
      alert('저장 실패: ' + err.message);
    }
  });
  el.dataset.checked = checked;
  return el;
}
```

- [ ] **Step 2: Today 페이지**

`src/pages/today.js`:
```javascript
import { storage } from '../lib/storage.js';
import { GitHubClient } from '../lib/github.js';
import { DataLayer } from '../lib/data.js';
import { dayKey, monthKey, dayOfWeekKey, dDay, formatDay } from '../lib/date.js';
import dayjs from 'dayjs';
import { makeCheckbox } from '../components/checkbox.js';

function getDataLayer() {
  const token = storage.get('pat');
  if (!token) return null;
  return new DataLayer(new GitHubClient({ token, owner: 'kdh044', repo: 'grad-planner-data' }));
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
```

- [ ] **Step 3: `src/main.js` wiring**

`src/main.js`의 `pageToday` 교체:
```javascript
import { renderToday } from './pages/today.js';

function pageToday() {
  renderShell('', 'Today');
  const main = document.querySelector('.main');
  renderToday(main);
}
```

- [ ] **Step 4: 브라우저 manual verify**

Run: `npm run dev`
- "#/today" 진입 → 오늘 날짜 + D-day + 시간/체크리스트 + 노트
- 시간 박힌 루틴이 시간순으로 보임
- 체크박스 클릭 → 즉시 ✓ 표시 + 백엔드 저장 (Network 탭에서 PUT 요청 확인)
- 노트 입력 후 다른 곳 클릭 (blur) → 저장됨

- [ ] **Step 5: Commit**

```bash
git add src/components/checkbox.js src/pages/today.js src/main.js
git commit -m "feat: add today page with routine checks and notes"
```

---

## Task 12: Week page (디폴트 진입)

**Files:**
- Create: `src/pages/week.js`
- Modify: `src/main.js`

- [ ] **Step 1: Week 페이지**

`src/pages/week.js`:
```javascript
import { storage } from '../lib/storage.js';
import { GitHubClient } from '../lib/github.js';
import { DataLayer } from '../lib/data.js';
import { weekStart, weekEnd, weekNumber, eachDayOfWeek, dayOfWeekKey, dayKey, monthKey, formatDay } from '../lib/date.js';
import dayjs from 'dayjs';

function getDataLayer() {
  const token = storage.get('pat');
  if (!token) return null;
  return new DataLayer(new GitHubClient({ token, owner: 'kdh044', repo: 'grad-planner-data' }));
}

function applies(routine, dateStr) {
  if (!routine.active) return false;
  if (!routine.days || routine.days.length === 0) return true;
  return routine.days.includes(dayOfWeekKey(dateStr));
}

let currentWeekRef = dayjs(); // 모듈 상태 (prev/next)

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
```

- [ ] **Step 2: 모바일에서 grid를 vertical stack으로**

`src/style.css` 끝에 추가:
```css
@media (max-width: 768px) {
  .week-grid { grid-template-columns: 1fr !important; }
}
```

- [ ] **Step 3: `src/main.js` wiring**

`src/main.js`의 `pageWeek` 교체:
```javascript
import { renderWeek } from './pages/week.js';

function pageWeek() {
  renderShell('', 'Week');
  const main = document.querySelector('.main');
  renderWeek(main);
}
```

- [ ] **Step 4: 브라우저 manual verify**

Run: `npm run dev`
- "#/" 또는 "#/week" 진입 → 7일 grid 표시
- 오늘 칸이 강조 (accent 배경)
- 각 칸에 "X/Y" 진척도 + 루틴 sample
- "이전 주" / "다음 주" / "오늘" 버튼 동작
- 칸 클릭 → #/today로 이동 (오늘 페이지)
- 모바일 크기에서 vertical stack으로 변환

- [ ] **Step 5: Commit**

```bash
git add src/pages/week.js src/style.css src/main.js
git commit -m "feat: add week page as default route with 7-day grid"
```

---

## Task 13: PWA (manifest + service worker)

**Files:**
- Create: `public/manifest.json`, `public/sw.js`, `public/icons/icon-192.png`, `public/icons/icon-512.png`
- Modify: `index.html`, `src/main.js`

- [ ] **Step 1: manifest.json**

`public/manifest.json`:
```json
{
  "name": "kdh044 planner",
  "short_name": "planner",
  "description": "weekly planner + routine checker",
  "start_url": "/#/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#ffffff",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 2: 아이콘 생성 (간단한 단색 PNG)**

다음 명령으로 ImageMagick으로 생성 (없으면 brew/apt로 설치):
```bash
mkdir -p public/icons
convert -size 192x192 xc:'#2196f3' -gravity center -pointsize 100 -fill white -annotate +0+0 'D' public/icons/icon-192.png
convert -size 512x512 xc:'#2196f3' -gravity center -pointsize 280 -fill white -annotate +0+0 'D' public/icons/icon-512.png
```

(ImageMagick 없으면 임시로 단색 PNG를 다운로드해서 placeholder로 두고, 나중에 디자인 교체)

- [ ] **Step 3: service worker (vanilla, 정적 파일 캐시)**

`public/sw.js`:
```javascript
const CACHE = 'gp-v1';
const STATIC_ASSETS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // GitHub API는 캐시하지 않음
  if (url.hostname === 'api.github.com') return;
  // navigation: cache fallback
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('/index.html'))
    );
    return;
  }
  // 정적 자산: cache-first
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request).then((res) => {
      if (res.ok && url.origin === location.origin) {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone));
      }
      return res;
    }))
  );
});
```

- [ ] **Step 4: `src/main.js`에서 service worker 등록**

`src/main.js` 끝에 추가:
```javascript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((err) => console.warn('SW register failed:', err));
  });
}
```

- [ ] **Step 5: 브라우저 manual verify**

Run: `npm run build && npm run preview`
- preview URL 접속 (예: localhost:4173)
- DevTools → Application → Manifest 표시 확인
- DevTools → Application → Service Workers → activated 확인
- "오프라인" 체크 → 새로고침 시 cached page 로드 (GitHub API는 fail이지만 UI는 뜸)
- 모바일에서 "홈 화면에 추가" 가능

- [ ] **Step 6: Commit**

```bash
git add public/manifest.json public/sw.js public/icons/ index.html src/main.js
git commit -m "feat: add PWA manifest and service worker"
```

---

## Task 14: GitHub Actions 자동 배포

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: workflow 작성**

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

- [ ] **Step 2: README 작성**

`README.md`:
```markdown
# kdh044.github.io

대학원생용 weekly planner + 하이브리드 루틴 체커.

## Setup

```bash
npm install
npm run dev      # localhost:5173
npm test
npm run build    # dist/ 생성
```

## Deploy

`main` 브랜치에 push하면 GitHub Actions가 자동 빌드 + GitHub Pages 배포.

## 데이터

데이터는 별도 private repo `kdh044/grad-planner-data`에 저장됨.
첫 진입 시 Settings에서 fine-grained PAT 입력 필요 (해당 repo `Contents: Read and write` 권한).

## Tech

Vanilla JS + Vite + Vitest. PWA (vanilla service worker).
```

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/deploy.yml README.md
git commit -m "ci: add github actions workflow for pages deployment"
```

---

## Task 15: Repo 셋업 + 첫 배포

이 task는 GitHub 웹 UI 작업이 섞여있다. 코드는 다 준비된 상태에서 실제 배포 검증.

- [ ] **Step 1: 데이터 repo 생성 (사용자 직접)**

GitHub 웹에서:
1. github.com/new → repo name: `grad-planner-data`, Owner: kdh044
2. **Private** 선택
3. "Initialize this repository with: README" 체크 (빈 repo로 생성하면 첫 commit 시 422 발생할 수 있음)
4. Create

- [ ] **Step 2: Fine-grained PAT 생성 (사용자 직접)**

1. github.com/settings/personal-access-tokens → "Generate new token (fine-grained)"
2. Token name: `grad-planner-data`
3. Expiration: 1 year (또는 원하는 기간)
4. Repository access: Only select repositories → `grad-planner-data` 선택
5. Repository permissions → Contents: **Read and write**
6. Generate → 토큰 즉시 복사 (한 번만 표시)

- [ ] **Step 3: 사이트 repo 연결**

```bash
cd /home/danny/projects/grad_planner_site
git remote add origin https://github.com/kdh044/kdh044.github.io.git
git branch -M main
git push -u origin main
```

(remote가 이미 있으면 `git remote set-url origin ...`)

- [ ] **Step 4: GitHub Pages 활성화 (사용자 직접)**

1. github.com/kdh044/kdh044.github.io → Settings → Pages
2. Source: **GitHub Actions** 선택 (branch가 아니라 Actions)
3. Save

- [ ] **Step 5: Actions 빌드 확인**

1. github.com/kdh044/kdh044.github.io/actions
2. 최신 workflow run 확인 (Deploy to GitHub Pages)
3. Build + Deploy 모두 ✓ 되면 배포 완료
4. URL: `https://kdh044.github.io/`

- [ ] **Step 6: 실제 진입 테스트**

브라우저에서 `https://kdh044.github.io/`:
1. 자동 #/settings 이동 → PAT 입력란
2. 위에서 만든 PAT 붙여넣기 + 졸업일 입력 → "동기화 테스트" → ✓
3. "저장" → ✓
4. github.com/kdh044/grad-planner-data 가서 `settings.json` 생성 확인
5. #/routines → default 루틴 3개 표시 확인
6. github.com/kdh044/grad-planner-data 에 `routines.json` 자동 생성 확인
7. "+ 추가" → 새 루틴 추가 + 저장 → repo에 commit 들어옴 확인
8. #/today → 체크박스 클릭 → repo의 `completions/2026-04.json` 생성/업데이트 확인
9. 노트 입력 → repo의 `notes/2026-04.json` 확인
10. #/ → 7일 grid 표시, 오늘 칸 강조 + 진척도 반영

모바일 (홈스크린 추가):
1. 폰에서 `https://kdh044.github.io/` 접속
2. 메뉴 → "홈 화면에 추가"
3. 아이콘에서 진입 → 풀스크린 PWA로 동작 확인
4. PAT 다시 입력 (디바이스별)
5. 동일한 데이터 보임 확인

- [ ] **Step 7: 첫 사용 commit (없으면)**

만약 task 1~14 commit 누락된 게 있으면 정리. 보통 모든 task에서 commit했으면 추가 작업 없음.

```bash
git status   # clean이어야 함
git log --oneline | head -20
```

---

## Self-Review Checklist (plan 작성자 self-check)

- ✓ Spec 1차 범위 (Today/Week/Routines/Settings) 모두 task 있음
- ✓ Spec §3 routes (#/, #/today, #/routines, #/settings) 모두 main.js에서 와이어링
- ✓ Spec §4 데이터 schema (settings/routines/completions/notes/schedule) 모두 data.js에서 처리
- ✓ Spec §6 디자인 토큰 모두 style.css 변수로 박힘
- ✓ Spec §7 tech stack (Vite/Vanilla/Vitest/dayjs/PWA/Actions) 모두 task에 포함
- ✓ Spec §9 Open Questions 5개 default 결정 반영:
  - 1. 예시 루틴 박음 — Task 10 Step 2-2
  - 2. Notes plain text — Task 11 (textarea)
  - 3. 시간 박힌 루틴 자동 ☐ — 별도 처리 없음, default false
  - 4. PWA = vanilla SW — Task 13
  - 5. Actions 자동 빌드 — Task 14
- ✓ Type consistency: `routines.json` schema (id/name/kind/time/days/emoji/color/active)는 Task 6, 10, 11, 12에서 동일
- ✓ Schedule (비루틴 일정) — 1차 디자인엔 있으나 UI는 미구현. spec §3.3/§3.4에 "있으면" 표기. **2차로 명시 필요** → Out of Scope에 추가 권장 (이 plan에서는 schedule UI 생략, getSchedule만 구현. Today/Week 페이지에서 schedule 표시는 안 함). 명시적 미구현으로 간주.

---

**Status**: 1차 MVP 구현 plan 완료. 실행 방법은 아래 Execution Handoff 참조.
