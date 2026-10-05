# kdh044.github.io

공개 포트폴리오 + 비밀번호로 여는 개인 플래너. GitHub Pages + Supabase Auth/DB + Google Calendar OAuth. ChatGPT 구독이나 Sites 호스팅 없이 실행됩니다.

포트폴리오는 빈 템플릿으로 시작합니다. 실제 데이터는 화면에서 작성하고, 포트폴리오 초안은 공개 버튼을 눌렀을 때만 게시합니다. 플래너는 오늘·프로젝트·캘린더·페이지·설정으로 구성합니다. 비밀번호와 계획 내용을 공개 저장소에 넣지 않습니다.

**계정 연결 전에는 플래너가 잠겨 있습니다.** [SETUP.md](SETUP.md)에서 Supabase 계정·RLS와 Google OAuth 연결 순서를 확인하세요.

```bash
npm ci
npm run dev
npm test
npm run build
```

main에 반영하면 기존 GitHub Actions가 빌드·배포합니다. Settings → Pages의 Source는 GitHub Actions여야 합니다. 기존 private GitHub 데이터 저장소는 변경하거나 지우지 않습니다. 새 플래너에는 기존 자료를 자동으로 가져오지 않습니다.

이미지 첨부는 URL 방식이며 PPT 파일 업로드·임의 CSS 편집·페이지 간 DB 관계 같은 Notion 전체 기능을 제공하지는 않습니다. 기존 routines 코드와 관련 테스트는 과거 데이터 구조 참고용으로 보존하고 새 진입점에서는 사용하지 않습니다.

이전 중단 작업의 buildless 초안(app.js/styles.css/config.js)과 PIN 서버 함수는 참고용으로 보존합니다. 현재 배포는 Vite 진입점(src/main.js)만 사용하고, 이전 PIN용 SQL 대신 SETUP.md의 workspace-schema.sql을 사용합니다. 이전 설정 안내는 LEGACY_SETUP.md로 보존합니다.
