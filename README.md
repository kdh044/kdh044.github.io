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

데이터는 별도 private repo `kdh044/private`에 저장됨.
첫 진입 시 Settings에서 fine-grained PAT 입력 필요 (해당 repo `Contents: Read and write` 권한).

## Tech

Vanilla JS + Vite + Vitest. PWA (vanilla service worker).
