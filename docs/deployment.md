# 배포 가이드 (Vercel)

이 문서는 저장소/Vercel 계정 소유자가 이 프로젝트를 Vercel에 배포할 때 따라 할 절차를 정리한 것입니다. **AI 에이전트를 포함해 계정 접근 권한이 없는 주체는 실제 배포를 대신 수행할 수 없으므로**, 이 문서는 사람이 직접 따라 하는 수동 절차 안내입니다.

## 사전 준비물

- 이 저장소에 대한 GitHub 접근 권한 (배포할 브랜치를 push할 수 있어야 합니다)
- Vercel 계정 (GitHub 계정으로 로그인 가능)
- Supabase 프로젝트의 API 설정 값 3가지 (`.env.example` 참고)
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (기존 anon 키도 동일하게 사용 가능)
  - `SUPABASE_SERVICE_ROLE_KEY` — 마피아 게임 로직(닉네임 입장·역할 배분·채팅 등)이 RLS를 우회하는 관리자 클라이언트(`lib/supabase/admin.ts`)를 사용하므로 **필수**입니다. 절대 `NEXT_PUBLIC_` 접두사를 붙이지 말고, 절대 저장소에 커밋하지 마세요.
- (선택) `BROADCAST_INBOX_SECRET` — 게임 채팅의 개인 인박스(비밀 채널/1:1 귓속말) 채널명을 서명하는 시크릿입니다. 설정하지 않으면 `SUPABASE_SERVICE_ROLE_KEY`로 자동 폴백하므로 필수는 아니지만, 별도 시크릿으로 분리하고 싶다면 설정합니다.
- `ADMIN_SECRET` — 관리자 패널(`/game/manage`) 인증용 운영자 전용 시크릿(운영자만 아는 긴 문자열)입니다. 진행자 4자리 PIN과는 완전히 별개이며, 진행자 PIN 재설정·전체 데이터 초기화 등 상위 관리 기능에 사용됩니다. `.env.local` 및 Vercel 환경변수에 설정하세요. **미설정 시 관리자 기능이 전부 잠깁니다(fail-safe)** — 값을 깜빡 설정하지 않아도 "누구나 통과"가 아니라 "아무도 통과 못 함"으로 안전하게 실패합니다. 전체 데이터 삭제까지 가능한 최상위 시크릿이므로 **최소 20자 이상의 무작위 문자열**(예: `openssl rand -base64 24`로 생성)을 사용하세요.

`.env.local`에 이미 설정해 로컬에서 사용 중인 값과 **동일한 값**을 그대로 사용하면 됩니다.

## 절차

### 1. Vercel 대시보드에서 저장소 연결

1. [vercel.com](https://vercel.com)에 로그인합니다.
2. 대시보드에서 **Add New... → Project**를 선택합니다.
3. **Import Git Repository** 목록에서 이 GitHub 저장소(`nextjs-supabase-app` 또는 실제 저장소 이름)를 찾아 **Import**를 클릭합니다.
   - 저장소가 목록에 보이지 않으면 **Adjust GitHub App Permissions**를 눌러 Vercel에 해당 저장소 접근 권한을 추가로 부여해야 합니다.

### 2. 프로젝트 설정 확인

- **Framework Preset**: Next.js가 자동으로 감지됩니다. 별도로 변경할 필요는 없습니다.
- **Root Directory**: 저장소 루트에 `package.json`이 있다면 기본값(`.`) 그대로 둡니다.
- **Build Command / Output Directory**: 기본값(Next.js 자동 설정)을 그대로 사용합니다.

### 3. Environment Variables 설정

Import 화면(또는 이후 **Project Settings → Environment Variables**)에서 아래 값을 추가합니다.

| Key | Value | 비고 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local`의 값과 동일 | Supabase 프로젝트 API 설정에서 확인 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local`의 값과 동일 | anon 키 또는 새 publishable 키 모두 가능 |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local`의 값과 동일 | 필수 — 누락 시 게임 입장/역할 배분 등 서버 액션이 모두 실패합니다 |
| `BROADCAST_INBOX_SECRET` | (선택) `.env.local`의 값과 동일 | 미설정 시 `SUPABASE_SERVICE_ROLE_KEY`로 자동 폴백 |
| `ADMIN_SECRET` | `.env.local`의 값과 동일 | 관리자 패널 전용 시크릿 — 미설정 시 관리자 기능이 전부 잠깁니다(fail-safe) |

- **Environment**는 최소 `Production`에는 반드시 체크하고, 필요하면 `Preview`/`Development`에도 동일하게 체크합니다(PR 미리보기 배포에서도 게임이 정상 동작하려면 필요).
- 값에 따옴표나 공백이 들어가지 않도록 주의합니다.

### 4. Deploy 클릭

1. 모든 설정을 확인했으면 **Deploy** 버튼을 클릭합니다.
2. 빌드 로그가 표시되며, `npm run build`(Next.js 빌드)가 원격에서 실행됩니다.
3. 빌드가 성공하면 `https://<project-name>.vercel.app` 형태의 배포 URL이 발급됩니다.

### 5. 배포 후 확인

- 발급된 URL로 접속해 `/game` 페이지에서 닉네임 입력 → 대기실 입장이 정상 동작하는지 확인합니다.
- `/game/admin`에서 진행자 PIN 입력 후 대시보드가 정상적으로 열리는지 확인합니다.
- `/game`에서 "관리자로 입장" → `ADMIN_SECRET` 입력 후 `/game/manage` 관리자 패널이 정상적으로 열리는지 확인합니다.
- 문제가 있다면 Vercel 대시보드의 **Deployments → 해당 배포 → Runtime Logs**에서 서버 에러를 확인하거나, Supabase 대시보드의 **Logs** 메뉴에서 API/Postgres 로그를 확인합니다.
- **관리자 패널 운영 주의**: 전체 데이터 완전 삭제·종료된 방 정리는 되돌릴 수 없으며, **진행 중인 게임이 있으면 접속자가 즉시 정리(입장 화면으로)된다** — 실행 전 데이터 현황에서 진행 중 방 여부를 확인할 것.

### 6. 환경 변수 변경 시

- Supabase 프로젝트를 교체하거나 키를 재발급한 경우, **Project Settings → Environment Variables**에서 값을 수정한 뒤 반드시 **Redeploy**를 실행해야 새 값이 반영됩니다(환경 변수 변경만으로는 기존 배포에 자동 반영되지 않습니다).

## 참고

- 커스텀 도메인을 연결하려면 **Project Settings → Domains**에서 별도로 설정합니다(이 문서의 범위 밖).
