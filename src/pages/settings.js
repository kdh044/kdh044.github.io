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
    const newSettings = { displayName, graduationDate, emoji: '📚' };

    if (token) storage.set('pat', token);
    storage.set('settings:cached', newSettings);

    if (!token) { status.textContent = 'PAT 없이 로컬 저장만 됨'; return; }

    status.textContent = '저장 중...';
    try {
      const client = new GitHubClient({ token, owner: 'kdh044', repo: 'grad-planner-data' });
      const data = new DataLayer(client);
      await data.saveSettings(newSettings);
      status.textContent = '✓ 저장됨';
      status.style.color = 'var(--success)';
    } catch (e) {
      status.textContent = '✗ ' + e.message;
      status.style.color = 'var(--warn)';
    }
  });
}
