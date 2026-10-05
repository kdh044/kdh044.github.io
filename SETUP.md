# 연결 상태와 설정 안내

현재 사이트의 Supabase 연결은 완료됐습니다. 기존 프로젝트에서 아래 계정 생성·SQL 적용을 다시 할 필요는 없습니다.

- GitHub Pages에 프로젝트 URL, publishable 키, 본인 계정 이메일·UID를 반영했습니다. 이메일·UID 공개는 소유자가 허용했습니다. 비밀번호는 저장소에 저장하지 않습니다.
- 소유자 계정을 등록하고 플래너 RLS를 적용했으며 신규 회원가입을 비활성화했습니다.
- 배포 사이트에서 비밀번호 로그인, 현재 분류 저장, 새로고침 후 세션 복원과 DB 저장을 확인했습니다. 할 일·프로젝트·페이지는 모두 비어 있습니다.
- 비로그인 API 요청은 플래너 읽기가 거부됐고 공개 포트폴리오 조회는 정상입니다. 다른 사용자 UID를 사용한 DB 권한 검사에서도 플래너 행이 보이지 않았습니다.
- Google Calendar OAuth Client ID는 아직 연결하지 않았습니다.

아래 Supabase 절차는 새 프로젝트로 옮기거나 연결을 다시 구성할 때의 참고용입니다.

사이트 화면은 GitHub Pages에 배포됩니다. 플래너 데이터는 Supabase에만 저장되고, 로그인 전에는 읽지 않습니다. 예시 내용이나 기본 할 일은 만들지 않습니다.

## 1. Supabase 비밀번호 계정

1. [Supabase](https://supabase.com/dashboard)에서 프로젝트를 만듭니다.
2. Authentication → Users → Add user → Create new user에서 본인 이메일과 원하는 비밀번호로 계정을 만듭니다. 이 사이트에는 회원가입 버튼이 없습니다.
3. Authentication 설정에서 신규 가입을 비활성화합니다.
4. 생성된 사용자의 UID를 복사합니다.
5. [supabase/workspace-schema.sql](supabase/workspace-schema.sql)의 `00000000-0000-0000-0000-000000000000`를 그 UID로 바꿉니다. SQL Editor에서 전체 SQL을 실행합니다. 이 단계 전에는 로그인을 해도 저장할 수 없습니다.
6. 프로젝트 설정에서 Project URL과 **publishable 키** 또는 기존 **anon 키**를 복사합니다. `service_role`, `sb_secret_` 키를 사용하면 안 됩니다.
7. `public/config.json`의 빈 값을 채웁니다. `email`과 `owner`는 위에서 만든 계정의 이메일과 UID입니다. **비밀번호를 config.json이나 저장소에 넣지 마세요.**
8. main에 반영하면 GitHub Actions가 다시 배포합니다. 페이지의 비밀번호 입력란에서 로그인합니다.

`public/config.json`은 공개 설정입니다. 공개 키·계정 이메일·UID를 포함하며 데이터 접근 권한을 주는 비밀 키가 아닙니다. DB의 owner 제한과 RLS가 실제 접근을 통제합니다. 로그인 화면의 ‘연결 설정’에서도 값을 넣을 수 있지만 해당 브라우저에만 저장되므로, 다른 방문자의 공개 포트폴리오 읽기에는 public/config.json 설정이 필요합니다.

계정 연결 전에는 빈 포트폴리오 템플릿과 잠긴 플래너만 표시됩니다. 비밀번호를 HTML에서 비교하는 임시 잠금이나 로그인 우회는 없습니다.

## 2. Google Calendar

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트를 만들고 **Google Calendar API**를 활성화합니다.
2. Google Auth Platform에서 동의 화면을 설정합니다. 개인 테스트용이면 테스트 사용자에 본인 Google 이메일을 추가합니다.
3. OAuth 클라이언트를 **웹 애플리케이션** 유형으로 만듭니다.
4. 승인된 JavaScript 원본에 `https://kdh044.github.io`를 추가합니다. 로컬 개발 시 `http://localhost:5173`도 추가합니다. 원본에 경로나 `#/planner`를 붙이지 않습니다.
5. 로그인 후 **캘린더 → Google 연결**에서 Client ID를 입력하고 저장합니다. 설정은 이 브라우저에만 보관됩니다. 다른 기기에서도 같은 설정을 쓰려면 `public/config.json`의 `googleClientId`에 넣습니다. **Client secret은 필요 없고 입력할 곳도 없습니다.**
6. 로그인 후 캘린더 → Google 연결에서 본인 계정을 승인합니다.

연동 범위: 기본 캘린더에서 월·주 화면에 표시되는 날짜 범위의 일정을 읽고, ‘Google 캘린더에 추가’를 선택한 새 일정을 Google에 등록합니다. 수정·삭제는 일정 상세의 Google 캘린더 링크에서 처리합니다. 로컬 일정과 할 일은 자동으로 Google에 복사하지 않습니다. 기본 1시간 일정, 시간이 없으면 종일 일정입니다. Google 토큰은 메모리에만 보관하므로 새로고침하면 다시 연결합니다. 월·주 이동과 새로고침 버튼으로 최근 일정을 조회하며 백그라운드 양방향 실시간 동기화는 아닙니다.

## 3. 화면에서 편집

- 캘린더: 월·주 보기 전환, 날짜 선택, 선택한 날의 일정·할 일, Google 연결 설정.
- 오늘: 할 일, 날짜·상태·분류, 오늘의 메모.
- 프로젝트: 프로젝트 만들기, 작업 연결, 보드 드래그 또는 편집에서 상태 변경.
- 페이지: 텍스트·제목·체크리스트·구분선·링크·이미지 블록. 드래그 또는 ↑/↓로 순서 변경. 이미지는 공개 이미지 URL 방식입니다.
- 포트폴리오 편집: 이름·소개, 섹션 이름과 순서, 블록, 강조 색상·너비·커버. 초안은 비공개로 저장하고 **공개하기**를 눌러 게시합니다.
- 설정: 연구·취업·개인 분류 수정, JSON 백업 내보내기와 가져오기.

변경은 로그인 상태에서 자동 저장합니다. 다른 기기에서 동시에 수정하면 기존 내용을 덮어쓰지 않고 저장 실패를 표시합니다. 이때 JSON 백업을 내보낸 뒤 새로고침하고 필요한 내용을 다시 반영하세요. 저장되지 않은 변경이 있으면 창을 닫을 때 브라우저가 확인을 표시합니다. 로그인 세션은 현재 탭 sessionStorage에 저장하며 로그아웃할 때 제거합니다. 계획 내용은 브라우저 영구 저장소에 캐시하지 않습니다.

## 검증

SQL 적용 후 아래 상황을 실제 계정으로 확인하세요.

1. 로그아웃 상태에서 `/rest/v1/workspaces`를 요청하면 내용을 읽지 못하는지 확인.
2. 소유자 계정으로 로그인 후 할 일 작성 → 새로고침 → 재로그인 → 내용 유지 확인.
3. 다른 Supabase 사용자로 로그인하면 접근이 차단되는지 확인.
4. 공개 포트폴리오의 내용만 방문자에게 보이며 페이지·할 일·메모는 보이지 않는지 확인.
5. Google 승인 후 월 일정 조회와 새 일정 등록 확인.

참고: [Supabase 비밀번호 인증](https://supabase.com/docs/guides/auth/passwords), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Google OAuth 토큰 방식](https://developers.google.com/identity/oauth2/web/guides/use-token-model).
