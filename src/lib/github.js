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
