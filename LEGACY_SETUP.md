# 이전 PIN 서버 방식 초안의 안내 (현재 진입점에서 사용하지 않음)

# Portfolio · Private Workspace

공개 포트폴리오 템플릿과 비밀번호로 여는 개인 플래너입니다. 기본 소개·프로젝트·할 일·페이지·입력란은 비어 있습니다. 문구와 프로젝트는 설정 → 공개 페이지 편집에서 입력합니다.

## 사용 가능한 편집

- 오늘: 할 일, 완료 상태, 메모, 위젯 순서
- 프로젝트: 이름, 설명, 마감일, 색상, 분류, 칸반 상태; 드래그 또는 상태 선택
- 페이지: 본문·제목·체크리스트·목록·인용·강조·구분선 블록; 추가·삭제·순서 변경
- 설정: 포인트 색, 여백, 분류, 공개 페이지 레이아웃, JSON 백업/복원
- Google 캘린더: 계정 연결 후 캘린더 선택과 일정 읽기, 월 이동, 날짜별 일정

미리보기의 입력은 메모리에만 존재하며 새로고침하면 사라집니다. 실제 데이터는 소유자 로그인 후 Supabase에 저장합니다. Google 일정은 서버나 GitHub에 복사하지 않으며, 연결 토큰도 메모리에만 둡니다. 새로고침하거나 토큰이 만료되면 다시 Google 연결을 누릅니다. Google 일정 쓰기·양방향 동기화·백그라운드 동기화는 포함하지 않습니다.

## GitHub Pages

`kdh044/kdh044.github.io`의 `main` 브랜치를 사용합니다. Settings → Pages → Source를 **GitHub Actions**로 선택합니다. `.github/workflows/deploy.yml`이 공개 파일만 업로드합니다.

앱은 빌드 과정이 없는 HTML/CSS/JS로 동작합니다. 로컬 실행은 `python3 -m http.server 8000`으로 할 수 있습니다. 별도의 웹 편집 도구 설치는 필요하지 않습니다.

## 최초 연결: Supabase

1. [Supabase Dashboard](https://supabase.com/dashboard)에서 본인 프로젝트를 만듭니다.
2. SQL Editor에서 `supabase/schema.sql`을 **한 번** 실행합니다.
3. Authentication → Users에서 본인 이메일로 사용자를 생성하고 확인 완료 처리합니다. Supabase 사용자 계정 자체의 암호는 충분히 긴 별도 암호를 사용하세요. 플래너 PIN과는 별개입니다. 일반 방문자의 신규 가입은 꺼 둡니다.
4. 생성된 사용자의 UUID를 복사하고 SQL Editor에서 다음 구문에 **본인 UUID**를 넣어 실행합니다.

```sql
insert into public.app_owner(id, owner_id)
values (true, '<본인 사용자 UUID>')
on conflict(id) do update set owner_id=excluded.owner_id;
```

5. SQL Editor에서 다음 구문에 **본인이 정한 플래너 비밀번호**를 넣어 실행합니다. 실제 비밀번호가 들어간 SQL 파일은 저장소에 올리지 마세요.

```sql
select public.set_private_pin('<본인이 정한 플래너 비밀번호>');
```

6. Edge Functions에 `pin-login` 함수를 배포합니다. 소스는 `supabase/functions/pin-login/index.ts`입니다. 이 함수의 JWT 검증은 끕니다. 함수는 비밀번호를 직접 검증하는 공개 로그인 입구입니다. `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`는 Supabase 함수 환경의 기본 서버 변수로 사용됩니다.
7. Edge Functions → Secrets에 `SITE_ORIGIN`을 `https://kdh044.github.io`로 설정합니다. 경로와 마지막 `/`는 넣지 않습니다. 이 값은 CORS 허용 원본입니다.
8. Project Settings의 프로젝트 URL과 공개 publishable 키 또는 legacy anon 키를 사이트의 **연결 설정**에 입력합니다. `service_role`, `sb_secret_` 키는 사이트 설정에 넣지 마세요.
9. 연결 설정 → **설정 파일 내려받기**로 생성한 `config.js`를 저장소의 같은 파일과 교체합니다. 그러면 다른 기기에서도 연결된 사이트를 사용할 수 있습니다. 비밀번호는 config.js에 들어가지 않습니다.

CLI를 사용한다면 프로젝트 폴더에서:

```bash
supabase login
supabase link --project-ref <본인 프로젝트 ref>
supabase secrets set SITE_ORIGIN=https://kdh044.github.io
supabase functions deploy pin-login --no-verify-jwt
```

연속 5회 비밀번호 실패 시 서버에서 잠깁니다. 소유자가 SQL Editor에서 다음 구문을 실행하면 해제됩니다.

```sql
update private.pin_guard set failures=0,locked=false where id=true;
```

`set_private_pin`을 다시 호출하면 비밀번호 변경과 잠금 해제를 함께 처리합니다. 이 함수와 PIN 확인 함수는 일반 방문자나 로그인 사용자가 호출할 수 없으며 서버의 service-role에서만 호출할 수 있습니다. SQL Editor의 관리자로는 실행할 수 있습니다.

## Google 캘린더

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트를 생성하고 **Google Calendar API**를 켭니다.
2. Google Auth Platform에서 OAuth 동의 화면을 구성합니다. 개인 사용은 Testing 상태에서 본인 Google 계정을 테스트 사용자로 등록할 수 있습니다.
3. OAuth client를 **Web application** 유형으로 만들고 **Authorized JavaScript origins**에 `https://kdh044.github.io`를 등록합니다. 이 구현은 Google Identity Services의 팝업 토큰 방식이며 리디렉션 주소는 사용하지 않습니다.
4. Client ID를 사이트의 연결 설정에 넣고 `config.js`를 갱신합니다. Google client secret은 쓰지 않습니다.
5. 플래너 로그인 → 캘린더 → **Google 연결**에서 본인 계정으로 캘린더 읽기를 허용합니다.

## 저장과 접근

- 공개 템플릿 코드는 GitHub Pages가 호스팅합니다. 비밀번호와 개인 계획은 공개 파일에 포함되지 않습니다.
- `private_workspace`는 등록된 소유자의 인증 토큰과 RLS 정책으로 접근합니다. 화면 메뉴를 숨기는 방식에 의존하지 않습니다.
- 공개 내용은 `public_profile`로 명시적으로 저장한 항목만 공개됩니다. 개인 프로젝트를 자동 공개하지 않습니다.
- 수정은 650ms 후 저장하며 저장 상태를 화면 오른쪽 위에 표시합니다. 충돌은 덮어쓰지 않고 알려 줍니다. 다중 창 충돌이나 네트워크 장애 시 백업을 내려받은 뒤 다시 불러오세요.
- 한 기기에서 편집하고 다른 기기로 옮기면 새로고침해서 최신 상태를 불러옵니다. 실시간 공동 편집은 지원하지 않습니다.
- 브라우저 sessionStorage에 Supabase 로그인 세션이 있으며, 로그아웃 시 개인 데이터를 화면·메모리에서 지웁니다.
- 네 자리 PIN은 긴 비밀번호보다 약합니다. 다섯 번 실패 시 관리자가 해제할 때까지 잠그도록 구현했습니다. 잠금 때문에 본인도 들어갈 수 없으면 위 SQL로 해제하세요.

## 검증 범위

`node tests-template/app.test.cjs`는 빈 초기 상태, 로그인 전 데이터 노출 방지, 입력 escaping, 날짜별 일정, 저장 실패·충돌·수정 직렬화와 로그인 함수 응답 경로를 검증합니다. 실제 Supabase 프로젝트의 정책 적용, 로그인 함수 배포, Google OAuth는 계정 연결 후 별도 확인이 필요합니다. 브라우저 시각 검증은 이 실행 환경에서 하지 못했습니다.

기존 `src/`, 기존 테스트, 기존 문서 및 개인 GitHub 데이터는 배포 패키지에 포함하지 않습니다. 이전 소스와 개인 데이터 저장소는 유지됩니다. 새로운 Supabase 플래너로 과거 데이터가 자동 이전되지는 않습니다.
