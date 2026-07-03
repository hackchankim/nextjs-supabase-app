# Task 003 DB 마이그레이션 적용 + RLS 모델 결정

- **상태**: PENDING
- **작성**: 2026-07-04 · auto-dev
- **관련 태스크**: Phase 1 Task 003 (Supabase DB 스키마 마이그레이션)

## 맥락

Task 002(타입·상수·유틸)까지 자동 완료 후 Task 003에 도달. Task 003은 실제 Supabase 프로젝트(`fzlvqsblguescmdmtzdc`)에 5개 테이블을 만드는 **비가역·외부 서비스 변경**이라 auto-dev 안전 게이트(비가역 작업)에서 정지했다.

- 테이블 DDL 초안은 `supabase/migrations/0001_game_schema.sql`에 **작성만** 해뒀다(아직 미적용).
- 초안은 5개 테이블 + 제약(UNIQUE·FK·CHECK) + 인덱스를 포함한다.

## 막힌 지점 / 질문

두 가지 결정이 필요하다.

**Q1. 마이그레이션을 실제 프로젝트에 적용해도 되는가?** (되돌리기 어려움)

**Q2. RLS(행 보안) 모델을 어떻게 할 것인가?**
이 게임은 Supabase 인증이 아니라 **익명 `session_token`** 기반이라, `auth.uid()`로 요청자를 식별할 수 없다. 그런데 비밀 채널(이단/당회/1:1)은 **서버 단에서 열람 제어**가 필요하다(UI 숨김만으로는 DB 직접 조회를 못 막음 — PRD 테스트 체크리스트가 "DB 직접 조회 차단"을 요구). 요청자의 역할/신원을 어떻게 정책에 전달할지 결정이 필요하다.

## 선택지

**Q1(적용 방식)**
- **A. 프로덕션에 직접 적용** — Supabase MCP `apply_migration`으로 바로 적용. 빠름, 개인/개발 프로젝트면 무난.
- **B. Supabase 브랜치에 먼저** — `create_branch` → 적용·검증 → `merge`. 안전하지만 단계 증가.
- **C. 사람이 수동 적용** — 초안 SQL을 대시보드에서 직접 실행.

**Q2(RLS 모델)**
- **A. 서버 계층 제어(권장)** — 클라이언트는 비밀 채널을 직접 SELECT하지 않고, `session_token`을 받는 **Server Action/RPC**를 통해서만 조회. 테이블 RLS는 익명 SELECT를 차단하고 서버(service_role)만 접근. → 정책이 단순하고 세션토큰 인증과 잘 맞음.
- **B. SECURITY DEFINER RPC + 정책** — session_token을 인자로 받는 RPC가 역할을 확인해 필터링. 정교하나 구현 복잡.
- **C. 개발 단계에선 RLS 개방** — 지금은 열어두고 Phase 3(채팅) 구현 때 확정. 빠르나 보안 검증이 뒤로 밀림.

## 기본 추천

- **Q1 = A(직접 적용)** — 개인 개발 프로젝트로 보이며, 되돌리려면 테이블 DROP 마이그레이션으로 충분.
- **Q2 = A(서버 계층 제어)** — 익명 세션토큰 모델과 가장 자연스럽고, "DB 직접 조회 차단" 요구를 RLS 기본 차단 + 서버 경유로 만족. Phase 3 채팅 구현이 이 전제를 따르게 된다.

→ 승인 시: 초안 SQL에 **RLS enable + 익명 SELECT 차단 정책**을 추가해 완성한 뒤 적용하고, `npx supabase gen types`로 `lib/types/database.types.ts`를 재생성한다.

## 결정

<!-- 사람이 여기에 답을 적는다. 예: "Q1=A, Q2=A로 진행" 또는 다른 선택/지시. 채우면 상태를 RESOLVED로. -->
