# 개발 가이드라인 (AI 에이전트 전용)

> 이 문서는 이 저장소에서 작업하는 **코딩 에이전트의 운영 규칙**이다. 일반 개발 지식은 담지 않는다. 이 프로젝트 고유의 "무엇을 어디에, 어떻게 수정/추가하는가"와 **금지 사항**만 명령형으로 기술한다. 모든 응답과 문서는 **한국어**로 작성한다.

## 프로젝트 개요

- 스택: **Next.js 15 App Router · React 19 · TypeScript 5 · @supabase/ssr · shadcn/ui(new-york, base=neutral) · Tailwind CSS v3.4 · lucide-react**
- 두 갈래 작업이 공존한다: **제품**(교회 마피아 게임, `docs/PRD.md` Part 1 / `docs/ROADMAP.md` Phase 1~4)과 **자율 개발 인프라**(`docs/PRD.md` Part 0 / `docs/ROADMAP.md` Phase 0).
- 테스트 프레임워크는 없다. 런타임 검증은 **Playwright MCP**로 수행한다.

## 디렉터리 구조 규칙

- 라우트/페이지/레이아웃/Route Handler는 **`app/`** 아래에만 둔다.
- 공유 기능 컴포넌트는 **`components/`** 루트에 둔다 (예: `login-form.tsx`).
- shadcn/ui 프리미티브는 **`components/ui/`** 에만 둔다. 이 폴더에 수기 컴포넌트를 직접 만들지 않는다.
- Supabase 클라이언트 팩토리는 **`lib/supabase/`** 3파일로 고정한다: `client.ts`, `server.ts`, `proxy.ts`.
- 공용 유틸은 **`lib/`** (`lib/utils.ts`의 `cn`), 생성 타입은 **`lib/types/database.types.ts`**.
- 게임 신규 코드는 다음 위치에만 생성한다(아직 미존재): 페이지 `app/game/**`, 로직/훅/타입 `lib/game/**`, 컴포넌트 `components/game/**`, 마이그레이션 `supabase/migrations/**`.
- 자율 개발 인프라 신규 코드는 다음 위치에 생성한다: `scripts/kakao/**`, `scripts/*.mjs|*.sh`, `.claude/hooks/**`, `.claude/commands/**`, `.claude/agents/**`, `.github/workflows/**`, `docs/decisions/**`.
- ✅ 새 페이지 → `app/<route>/page.tsx`. ❌ `pages/` 디렉터리(Pages Router) 생성 금지.

## Supabase 클라이언트 사용 규칙 (최우선)

상황에 따라 팩토리를 **반드시** 구분한다.

| 실행 위치 | 사용할 것 | 파일 |
|---|---|---|
| `"use client"` 컴포넌트 (브라우저) | `createClient()` (동기) | `lib/supabase/client.ts` |
| 서버 컴포넌트 · Route Handler · 서버 액션 | `await createClient()` (비동기, `cookies()` 사용) | `lib/supabase/server.ts` |
| 세션 갱신(proxy) | `updateSession(request)` | `lib/supabase/proxy.ts` |

- ✅ 서버에서 데이터 접근 시 매 함수 호출마다 `await createClient()`로 **새 인스턴스**를 만든다.
- ❌ **서버 클라이언트를 모듈 레벨 변수/전역에 저장 금지** (Fluid compute 요구사항). 캐싱하지 않는다.
- 환경변수는 항상 `process.env.NEXT_PUBLIC_SUPABASE_URL`, `process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`를 사용한다. ❌ 키 하드코딩 금지.
- 클라이언트/서버 모두 제네릭 `createXxxClient<Database>`로 타입을 지정한다.

## 인증 / proxy 규칙

- 루트 진입점은 **`proxy.ts`** (Next.js proxy 파일)이며 `export async function proxy(...)` + `export const config.matcher`를 사용한다.
- ❌ `proxy.ts`를 `middleware.ts`로 바꾸거나 `proxy` 함수명·`config` 구조를 임의 변경 금지.
- `lib/supabase/proxy.ts`의 `updateSession`에서 **`createServerClient(...)` 호출과 `supabase.auth.getClaims()` 호출 사이에 다른 코드를 절대 삽입하지 않는다** (세션 무작위 로그아웃 유발).
- `updateSession`은 반드시 **`supabaseResponse`를 원형 그대로 반환**한다. 새 응답 객체를 만들면 쿠키를 그대로 복사한다.
- 미인증 리다이렉트 규칙: 경로가 `/`, `/login*`, `/auth*` 가 아니고 사용자가 없으면 `/auth/login`으로 리다이렉트. 새 공개 경로를 추가하려면 이 예외 목록도 함께 수정한다.

## DB 스키마 변경 규칙 (다중 파일 동시 수정)

스키마를 바꿀 때는 **아래를 한 작업에서 모두** 수행한다.

1. `supabase/migrations/<타임스탬프>_<이름>.sql` 마이그레이션 작성·적용 (Supabase MCP `apply_migration` 사용, `project_ref=fzlvqsblguescmdmtzdc`).
2. 타입 재생성: `npx supabase gen types typescript --project-id fzlvqsblguescmdmtzdc > lib/types/database.types.ts` (또는 Supabase MCP `generate_typescript_types`).
3. 필요한 편의 타입(`Profile`/`ProfileInsert`/`ProfileUpdate` 형태)을 `lib/types/database.types.ts` 하단에 추가.

- ❌ **`lib/types/database.types.ts`를 손으로 편집 금지** — 반드시 재생성한다. (편의 타입 export 블록만 예외적으로 유지·추가)
- RLS가 필요한 테이블은 마이그레이션에서 RLS 활성화 + 정책을 함께 작성한다(예: 비밀 채널 채팅은 해당 역할만 SELECT).

## UI 컴포넌트 규칙

- 새 shadcn 컴포넌트는 **`npx shadcn@latest add <component>`** 로 추가한다. ❌ `components/ui/`에 수기로 프리미티브 작성 금지.
- Tailwind 클래스 병합은 항상 **`cn()`**(`@/lib/utils`)을 사용한다. ❌ 문자열 직접 결합 금지.
- 경로 별칭을 사용한다: `@/components`, `@/components/ui`, `@/lib`, `@/lib/utils`, `@/hooks`.
- 아이콘은 **lucide-react** 만 사용한다.
- 파일명 규칙:
  - 기존/공유 컴포넌트: **kebab-case** (`login-form.tsx`, `auth-button.tsx`).
  - `components/game/**` 게임 컴포넌트: `docs/ROADMAP.md` 명세의 **PascalCase**(`PlayerCard.tsx` 등)를 따른다.
- **역할 무차별 UI 원칙**(게임): `components/game/**`에서 역할별 색상/배지/아이콘/탭 유무로 역할이 드러나면 안 된다. 전원 동일 레이아웃·중립 테마를 컴포넌트 레벨에서 보장한다.

## 문서 정합성 규칙 (다중 파일 동시 수정)

- 제품 기능을 추가/변경하면 **`docs/PRD.md`(기능 ID Fxxx / 구성요소 Dxxx)** 와 **`docs/ROADMAP.md`(Task)** 를 함께 갱신한다. 한쪽에만 존재하는 기능/페이지를 두지 않는다.
- PRD 내부 정합성: **기능 명세 ↔ 메뉴 구조 ↔ 페이지별 상세 기능**이 서로 참조되어야 한다(누락·고아 항목 금지).
- ROADMAP 태스크를 완료하면 **`docs:update-roadmap`** 커맨드로 해당 Task에 `✅` 표시하고 진행률을 갱신한다.
- ROADMAP 편집은 `.claude/agents/dev/development-planner.md`의 포맷을 따른다: `Task XXX: [동사]+[대상]`, 상태 표시(`- 우선순위` / `✅ - 완료`), API·비즈니스 로직 태스크는 `### 테스트 체크리스트`(Playwright 시나리오) 필수.

## Git / 커밋 규칙

- 커밋은 **`git:commit`** 커맨드 규약을 따른다: 이모지 + 컨벤셔널 커밋. ❌ **커밋 메시지에 Claude/AI 서명(Co-Authored-By 등) 추가 절대 금지**.
- ❌ `git add .`(전체 스테이징) 금지 — 의도한 파일만 스테이징한다.
- 푸시는 **`git:push`** 규약을 따른다: ❌ force push 금지, `main` 직접 push는 확인 후에만.
- 자율 에이전트는 **새 브랜치에 커밋 + PR 생성**만 한다. `main` 병합은 사람 승인.

## 시크릿 / 환경변수 규칙

- 비밀값은 **`.env.local`**(Supabase), **`.env.autodev.local`**(카카오 토큰)에만 둔다. 둘 다 `.gitignore`의 `.env*.local` 패턴으로 무시된다.
- ❌ 토큰·키를 코드/문서/커밋에 하드코딩 금지. GitHub 토큰은 `gh auth`(키체인)·GitHub Secrets 사용.
- 새 시크릿 파일을 도입하면 `.gitignore`에 명시적으로 추가하고, 커밋 전 스테이징에 시크릿이 없는지 확인한다.

## 자율 개발 워크플로우 규칙 (Phase 0 / shrimp)

- 개발 태스크 실행은 **Shrimp Task Manager** 흐름을 따른다: `docs/ROADMAP.md`에서 현재 Phase 확인 → `plan_task("Phase N: <제목>", @docs/ROADMAP.md)` → `list_tasks` → `execute_task` → (게이트·리뷰·QA 후) `verify_task`.
- 파이프라인 순서: 개발 → `lint`+`typecheck`(+Playwright 스모크) → `code-reviewer`(정적) → `qa-tester`(동적 실행) → 브랜치 커밋·PR → ROADMAP `✅` 동기화.
- 의사결정이 필요하거나 QA가 반복 실패하면 **`docs/decisions/`** 에 기록하고 루프를 정지한다(→ 카카오 알림). 임의 판단으로 비가역 작업을 진행하지 않는다.

## 명령어 / 검증 규칙

- 개발 서버 `npm run dev`, 빌드 `npm run build`, 린트 `npm run lint`.
- 타입 검사는 **`npx tsc --noEmit`** (`typecheck` npm 스크립트는 Phase 0 Task D004에서 추가 예정).
- 코드 변경 후에는 **lint + 타입 검사**를 통과시킨다. 런타임 동작 확인이 필요하면 Playwright MCP로 실제 앱을 구동해 검증한다.
- MCP 서버는 `.mcp.json`에 정의된 4종만 사용: `supabase`, `playwright`, `context7`, `shrimp-task-manager`.

## AI 의사결정 기준

- 서버/클라이언트 어디서 Supabase를 쓸지 모호 → 파일 상단에 `"use client"`가 있으면 `lib/supabase/client.ts`, 없으면(서버 컴포넌트/액션/route) `lib/supabase/server.ts`.
- 새 UI 요소 필요 → 먼저 `components/ui/`에 해당 shadcn 컴포넌트가 있는지 확인 → 없으면 `npx shadcn@latest add` → 그래도 없으면 `components/`에 조합 컴포넌트 작성.
- 라이브러리 API·버전 사용법이 불확실 → 추측하지 말고 **context7 MCP**로 최신 문서를 조회한다.
- DB 구조 확인 필요 → 추측하지 말고 **supabase MCP `list_tables`** 로 확인한다.
- 요구가 모호하면 먼저 코드/문서를 확인해 자체 판단하고, 비가역·정책 결정만 사람에게 확인한다.

## 금지 행동 (요약)

- ❌ 서버 Supabase 클라이언트를 모듈 전역에 저장.
- ❌ `updateSession`에서 `createServerClient`와 `getClaims()` 사이 코드 삽입.
- ❌ `proxy.ts`를 `middleware.ts`로 개명 / `proxy`·`config` 구조 임의 변경.
- ❌ `lib/types/database.types.ts` 수기 편집(재생성만).
- ❌ `components/ui/`에 수기 프리미티브 작성 / shadcn 없이 자체 primitive 남발.
- ❌ 커밋에 AI 서명 추가, `git add .`, force push, 무단 `main` 직접 push/병합.
- ❌ 시크릿 하드코딩 / `.env*.local` 커밋.
- ❌ 라이브러리·DB 상태를 추측으로 단정(context7/supabase MCP로 확인).
- ❌ PRD·ROADMAP 갱신 없이 제품 기능만 코드로 추가.
