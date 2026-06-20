# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## 명령어

```bash
npm run dev      # 개발 서버 실행 (localhost:3000)
npm run build    # 프로덕션 빌드
npm run lint     # ESLint 검사
```

테스트 환경은 구성되어 있지 않습니다. 타입 검사는 `npx tsc --noEmit`으로 실행합니다.

## 환경 변수

`.env.local` 파일을 생성하고 아래 값을 입력합니다:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

두 값 모두 Supabase 프로젝트의 API 설정에서 확인할 수 있습니다. 기존 anon 키와 새로운 publishable 키 형식 모두 사용 가능합니다.

## 아키텍처

**스택:** Next.js 15 App Router · Supabase (`@supabase/ssr`) · shadcn/ui · Tailwind CSS · TypeScript

### Supabase 클라이언트 패턴

두 가지 클라이언트 팩토리를 상황에 맞게 구분하여 사용해야 합니다:

- `lib/supabase/client.ts` — `createBrowserClient` 기반 브라우저 클라이언트. `"use client"` 컴포넌트에서만 사용합니다.
- `lib/supabase/server.ts` — `createServerClient` + Next.js `cookies()` 기반 서버 클라이언트. 서버 컴포넌트, Route Handler, 서버 액션에서 사용합니다. **Fluid compute 요구사항으로 인해 모듈 레벨 변수에 저장하면 안 됩니다.**

### 세션 관리

루트의 `proxy.ts`가 Next.js 프록시 파일입니다. 이 파일은 `lib/supabase/proxy.ts → updateSession()`을 호출하며, 매 요청마다 `supabase.auth.getClaims()`로 세션을 갱신합니다. 인증되지 않은 요청은 `/`, `/login`, `/auth/*` 경로를 제외하고 `/auth/login`으로 리다이렉트됩니다. **`createServerClient`와 `getClaims()` 호출 사이에 다른 코드를 추가하지 마세요.**

### 라우트 구조

```
app/
  page.tsx                    # 공개 랜딩 페이지
  layout.tsx                  # 루트 레이아웃
  auth/
    login/                    # 로그인 페이지 (LoginForm 클라이언트 컴포넌트 사용)
    sign-up/                  # 회원가입
    sign-up-success/          # 가입 완료 안내
    forgot-password/          # 비밀번호 재설정 요청
    update-password/          # 비밀번호 재설정 폼
    confirm/route.ts          # 이메일 OTP 인증 핸들러
    error/                    # 인증 오류 표시
  protected/
    layout.tsx                # 인증된 사용자용 레이아웃 (내비게이션 포함)
    page.tsx                  # 보호된 콘텐츠 (세션 필요)
```

### 데이터베이스 타입

`lib/types/database.types.ts`는 Supabase에서 생성된 타입 파일입니다. `Profile`, `ProfileInsert`, `ProfileUpdate` 편의 타입을 export합니다. 스키마 변경 후에는 아래 명령어로 재생성합니다:

```bash
npx supabase gen types typescript --project-id <id> > lib/types/database.types.ts
```

현재 정의된 테이블은 `profiles` (`id`, `email`, `full_name`, `username`, `avatar_url`, `bio`, `website`) 하나입니다.

### UI 컴포넌트

shadcn/ui 컴포넌트는 `components/ui/`에 위치합니다. 새 컴포넌트 추가 시 `npx shadcn@latest add <component>`를 사용합니다. `cn()` 유틸리티(`lib/utils.ts`)는 `clsx` + `tailwind-merge`로 Tailwind 클래스를 병합합니다.
