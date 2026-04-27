# Grad Planner Site — Design

**날짜**: 2026-04-27
**대상 사용자**: kdh044 (대학원생, 졸업 예정 2027-08)
**산출물**: `https://kdh044.github.io/` — 일주일 planner + 하이브리드 루틴 체커

---

## 1. Goal

대학원생용 **주 단위 planner + 하이브리드 루틴 체커**. 매일 폰에서 빠르게 체크, 데스크탑에서 주간 회고. 데이터는 본인 GitHub private repo에 저장 (소유권 본인).

**1차 범위 (이 plan에서 만들 것)**:
- **Today** (오늘 일정 + 루틴 체크 + 노트)
- **Week** (주간 7일 grid, 디폴트 진입 페이지)
- **Routines** (루틴 정의/편집)
- **Settings** (PAT, 졸업일, 표시명)

**2차 범위 (다음 plan)**: Stats, Portfolio, 다크모드 toggle, push notification

---

## 2. Architecture

### 2.1 Repo 구조

| Repo | 가시성 | 역할 |
|---|---|---|
| `kdh044/kdh044.github.io` | **public** | 사이트 코드 (HTML/CSS/JS), GitHub Pages 자동 배포 |
| `kdh044/grad-planner-data` | **private** | 사용자 데이터 (JSON 파일들), GitHub API로 read/write |

**왜 분리**: GitHub Pages 무료 플랜은 public repo만 호스팅. 루틴 체크 데이터를 public에 박을 수 없음.

### 2.2 인증

- 첫 진입 시 Settings 페이지에서 **Personal Access Token (PAT)** 입력
- PAT는 브라우저 `localStorage`에 저장 (디바이스별 별도)
- Scope: **fine-grained PAT** with read+write 권한 on `kdh044/grad-planner-data` only (전체 `repo` scope 주지 말 것)
- Settings 페이지에 PAT 만드는 단계별 가이드 inline 표시

**보안 주의**:
- PAT는 localStorage 평문 저장. 공용 PC 금지.
- 사이트가 public이라 PAT는 절대 코드에 hardcode 금지 (오직 사용자 입력으로만).
- 새 디바이스마다 PAT 재입력 (sync 안 됨, 의도된 설계).

### 2.3 데이터 동기화

```
[Browser]  <-- HTTPS GitHub API -->  [kdh044/grad-planner-data]
   ↓
localStorage (오프라인 캐시)
```

- **읽기**: 페이지 로드 시 GET `/repos/kdh044/grad-planner-data/contents/{path}` → SHA + base64 content
- **쓰기**: PUT 같은 endpoint, 이전 SHA 함께 보냄 → 새 commit 생성
- **Conflict** (다른 디바이스에서 수정 후 SHA mismatch): "외부 변경 감지" 알림 + 새로고침 버튼. 1차에서는 사용자 manual resolve (사용자 변경 사항 손실). 2차에서 변경 큐 + 3-way merge 검토.
- **오프라인**: localStorage 캐시로 read OK. Write는 실패 → "오프라인" 표시 + retry 버튼.

---

## 3. Page Structure

### 3.1 Routes (hash-based SPA)

| Hash | Page | 비고 |
|---|---|---|
| `#/` | **Week** | ⭐ 디폴트 진입 |
| `#/today` | Today | 사이드바 또는 Week에서 오늘 칸 클릭 |
| `#/routines` | Routines 편집 | |
| `#/settings` | Settings | PAT 없으면 자동 redirect |

Hash routing 이유: GitHub Pages는 server-side fallback 불가, hash는 클라이언트 단독 처리.

### 3.2 공통 Layout

```
데스크탑 (>= 768px):
+---------------------+--------------------------------+
| Sidebar (200px)     | Main content (flex:1)          |
| - kdh044 workspace  |                                |
| - Today             | (페이지별 콘텐츠)              |
| - Week ⭐           |                                |
| - Routines          |                                |
| ─────               |                                |
| - Settings          |                                |
+---------------------+--------------------------------+

모바일 (< 768px):
+--------------------------------+
| ☰ kdh044 / Week                | (햄버거 + breadcrumb)
+--------------------------------+
| (메인 콘텐츠 풀스크린)         |
+--------------------------------+
```

### 3.3 Page: Week (디폴트)

**상단**: 주차 표시 (`2026 · WEEK 17 · 4/27 ~ 5/3`) + prev/next 화살표 + 우측 평균 진척도.

**본문**: 7일 grid (월~일 컬럼).
- 각 칸 헤더: 요일 + 일자 + 진척도 (예: `월 4/27 · 3/5`)
- 시간 박힌 루틴 (scheduled): 시간순 `07:00 ✓ 운동`
- 자유 체크 루틴 (checklist): 시간 루틴 아래 묶음
- 비루틴 일정 (events): 시간 박힌 거 옆에
- 오늘 칸은 배경 강조

**모바일**: grid를 세로 stack — 요일별 카드 7개를 위에서 아래로.

### 3.4 Page: Today

- 헤더: `오늘 · 4/27 · Monday` + D-day (`졸업까지 D-460`)
- **시간 박힌 루틴** (시간순): `07:00 ✓ 운동`, `22:00 ☐ 명상`
- **자유 체크리스트**: `☐ 영어 30min`, `☐ 독서 20p`
- **노트** (오늘 메모, multi-line, blur 시 자동 저장)
- **비루틴 일정** (있으면): 미팅, 발표 등

### 3.5 Page: Routines (편집)

- 두 섹션: **시간 박힘 (Scheduled)** / **자유 체크 (Checklist)**
- 각 루틴 행: 이모지 · 이름 · [시간 또는 "체크"] · [요일 칩들] · 수정/삭제 버튼
- `+ 루틴 추가` 버튼 → 모달:
  - 이름 (text)
  - 종류 (라디오: scheduled / checklist)
  - 시간 (종류=scheduled일 때만, time picker)
  - 요일 (월~일 토글, 빈 선택 = every day)
  - 이모지 (선택)
  - 색상 (palette에서 선택)

### 3.6 Page: Settings

- **GitHub PAT** 입력 (password input + show/hide)
- **PAT 만들기 가이드** (토글로 펼침, fine-grained PAT 단계별 스크린샷)
- **졸업 예정일** (date picker)
- **표시명** (text)
- **데이터 repo 동기화 테스트** 버튼 (PAT 유효성 + repo 접근 가능 여부)
- (2차) 다크모드 toggle

---

## 4. Data Model

### 4.1 파일 구조 (`kdh044/grad-planner-data` repo)

```
/
├── settings.json              # 졸업일, 표시명 등
├── routines.json              # 루틴 정의 (모든 루틴)
├── completions/
│   ├── 2026-04.json           # 4월 일별 체크 기록
│   ├── 2026-05.json
│   └── ...
├── notes/
│   └── 2026-04.json           # 4월 노트
└── schedule/
    └── 2026-04.json           # 4월 비루틴 일정 (미팅, 발표)
```

월별 분할 이유: 일별 파일은 commit 너무 잦음, 통합 파일은 시간 지나며 너무 큼. 월별이 적정.

### 4.2 Schemas

**settings.json**:
```json
{
  "displayName": "danny",
  "graduationDate": "2027-08-31",
  "emoji": "📚"
}
```

**routines.json**:
```json
{
  "routines": [
    {
      "id": "ex_morning",
      "name": "운동",
      "kind": "scheduled",
      "time": "07:00",
      "days": ["mon", "tue", "wed", "thu", "fri"],
      "emoji": "🏃",
      "color": "#ff6f00",
      "active": true
    },
    {
      "id": "english",
      "name": "영어 30min",
      "kind": "checklist",
      "days": [],
      "emoji": "📖",
      "color": "#2196f3",
      "active": true
    }
  ]
}
```

`kind`: `"scheduled"` (시간 박힘) | `"checklist"` (자유 체크). `days`: 빈 배열 = 매일.

**completions/YYYY-MM.json**:
```json
{
  "month": "2026-04",
  "days": {
    "2026-04-27": {
      "ex_morning": { "done": true, "doneAt": "07:35" },
      "english": { "done": false }
    }
  }
}
```

**notes/YYYY-MM.json**:
```json
{
  "month": "2026-04",
  "notes": {
    "2026-04-27": "StreamPETR 학습 데이터 부족 → ds29 라벨링 추가"
  }
}
```

**schedule/YYYY-MM.json** (비루틴 일정):
```json
{
  "month": "2026-04",
  "events": [
    {
      "id": "lab_meeting_0427_0900",
      "date": "2026-04-27",
      "time": "09:00",
      "title": "Lab Meeting",
      "duration": 60
    }
  ]
}
```

---

## 5. UX Flows

### 5.1 첫 진입
1. 사용자 `https://kdh044.github.io/` 접속
2. localStorage에 PAT 없음 → Settings로 자동 redirect
3. PAT + 졸업일 + 표시명 입력 → Save
4. Data repo가 비어있으면 default `routines.json` (예시 루틴 3개), `settings.json` 생성 (commit)
5. Week 페이지로 이동

### 5.2 매일 루틴 체크 (모바일)
1. 홈스크린 아이콘 (PWA 설치) → 즉시 Week 페이지
2. 오늘 칸 클릭 → Today 페이지
3. 체크박스 ✓ → 즉시 UI 반영 + GitHub API 비동기 commit (낙관적 업데이트)
4. 노트 한 줄 입력 → blur 시 commit

### 5.3 루틴 추가/편집
1. Routines 페이지 → `+ 추가`
2. 모달에서 종류/이름/시간/요일/이모지/색상 입력 → Save
3. `routines.json` 업데이트 commit
4. 다른 디바이스에서 새로고침 시 자동 동기화

### 5.4 Conflict (1차 단순화)
- API write 시 SHA mismatch → "외부에서 변경됨" 알림
- "새로고침" 버튼 → GET으로 latest 받아와 표시 (사용자 변경 손실)
- 2차에서 변경 큐 + 3-way merge 검토

---

## 6. Design System

### 6.1 색상 (노션 라이트)

| 토큰 | Hex | 용도 |
|---|---|---|
| `--bg` | `#ffffff` | 메인 배경 |
| `--bg-soft` | `#f7f6f3` | 사이드바, hover |
| `--bg-card` | `#fafaf9` | 카드 배경 |
| `--border` | `#ebebea` | 경계선 |
| `--border-strong` | `#d3d2cf` | 강조 경계 |
| `--text` | `#37352f` | 본문 |
| `--text-soft` | `#9b9a97` | 보조 텍스트 |
| `--accent` | `#2196f3` | 강조 (active, link, 강조) |
| `--success` | `#4caf50` | 완료 ✓ |
| `--warn` | `#ff6f00` | streak, 경고 |

CSS variables로 박아두면 다크모드 toggle (2차)는 variable만 swap.

### 6.2 타이포

- System font: `-apple-system, "Segoe UI", "Pretendard", sans-serif`
- 본문 13~14px, 페이지 헤더 24~30px

### 6.3 간격

- 8px grid (8, 12, 16, 24, 36, 60)

### 6.4 컴포넌트

- **카드**: `border: 1px solid var(--border); border-radius: 8px; padding: 14px 16px;`
- **사이드바 항목**: hover 시 `--bg-soft`, active 시 강조 배경
- **체크박스**: 클릭 시 즉시 fill + 0.15s transition

---

## 7. Tech Stack

### 7.1 Frontend

- **Vanilla JS + Vite** (dev server + build)
- 이유: 페이지 4개 단순 SPA. Framework 학습/빌드 오버헤드 큼. Vite는 HMR + 빠른 빌드.
- ES modules
- CSS: 순수 CSS + CSS variables
- Routing: hash-based, `window.addEventListener('hashchange', ...)` (~30줄)
- State: 단순 store (vanilla object + 구독자 listeners)

### 7.2 외부 라이브러리

- `dayjs` (날짜 처리, ~2KB)

### 7.3 PWA

- `manifest.json` + service worker (Workbox 또는 vanilla SW)
- iOS/Android 홈스크린 추가, 오프라인 캐시

### 7.4 빌드 / 배포

- `vite build` → `dist/` 생성
- GitHub Actions: push to `main` → build → `gh-pages` branch 또는 Pages "Build with Actions" 옵션
- 또는 단순화: `dist/` 자체 main에 commit (수동 빌드 → push)

---

## 8. Out of Scope (1차)

- Stats / 통계 / 히트맵
- Portfolio / CV / 논문 페이지
- 다크모드 toggle (CSS 변수는 미리 박아두지만 toggle UI는 2차)
- Push notification / 이메일 reminder
- 협업/공유
- Calendar 외부 동기화 (Google Calendar import 등)
- AI 기능 (자동 일정 추천 등)

---

## 9. Open Questions (plan 단계에서 결정)

1. **첫 진입 시 default 루틴**: 빈 화면 vs 예시 루틴 3개 (운동/영어/명상) 미리 박아주기?
2. **Notes 형식**: plain text vs Markdown 지원?
3. **시간 박힌 루틴 미달성 처리**: 그날 끝나면 자동 ☐ vs 다음 날까지 grace?
4. **PWA service worker**: vanilla SW vs Workbox?
5. **빌드 자동화**: GitHub Actions vs 수동 push?

---

**Status**: 디자인 합의 완료 시점에 implementation plan 작성 (`writing-plans` skill).
