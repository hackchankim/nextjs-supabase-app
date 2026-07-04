# 교회 테마 마피아 게임 개발 로드맵

모바일 브라우저 하나로 10-20명이 즉시 참여하는 교회 버전 실시간 마피아 게임

## 개요

교회 마피아 게임은 교회 레크리에이션 행사에서 참가자들이 각자의 스마트폰으로 URL에 접속해 앱 설치 없이 즐기는 실시간 멀티플레이 웹 게임입니다.

- **닉네임 즉시 참가**: 회원가입 없이 닉네임만 입력하면 바로 참여
- **교회 테마 역할**: 성도·목사님·장로님·권사님·이단·이단 대장으로 구성된 선/악 대결 (제거 권한은 이단 대장 전용)
- **다중 채팅 채널**: 전체 채팅(낮 토론) + 이단 비밀 채팅 + 당회 비밀 채팅(목사님·장로님) + 1:1 귓속말(낮 한정) 운영
- **역할 무차별 UI**: 옆 사람이 화면을 봐도 역할이 드러나지 않도록 전원 동일 레이아웃·탭·테마 적용
- **진행자 대시보드**: 스크린용 공개 현황판과 진행자 전용 제어판 분리 운영, 페이즈 전환 카운트다운·투표 조기 종료 제어
- **참가자 접속 관리**: Realtime Presence로 온라인/오프라인 표시, 통신 장애·유령·중복 참가자를 진행자가 강퇴(대기실=제거, 게임 중=탈락 처리)

---

## 개발 워크플로우

1. **작업 계획**
   - 기존 코드베이스를 학습하고 현재 상태를 파악
   - 새로운 작업을 포함하도록 `ROADMAP.md` 업데이트
   - 우선순위 작업은 마지막 완료된 작업 다음에 삽입

2. **작업 생성**
   - 기존 코드베이스를 학습하고 현재 상태를 파악
   - 고수준 명세서, 관련 파일, 수락 기준, 구현 단계 포함
   - **API/비즈니스 로직 작업 시 "## 테스트 체크리스트" 섹션 필수 포함 (Playwright MCP 테스트 시나리오 작성)**
   - 새 작업의 경우 빈 박스와 변경 사항 요약이 없어야 함

3. **작업 구현**
   - 작업 명세서를 따라 기능 구현
   - **API 연동 및 비즈니스 로직 구현 시 Playwright MCP로 테스트 수행 필수**
   - 각 단계 후 작업 파일 내 진행 상황 업데이트
   - 구현 완료 후 E2E 테스트 실행 및 통과 확인 후 다음 단계 진행
   - 각 단계 완료 후 중단하고 추가 지시를 기다림

4. **로드맵 업데이트**
   - 로드맵에서 완료된 작업을 ✅로 표시

---

## 개발 단계

> **개발 순서:** **Phase 0(자율 개발 에이전트 팀)를 먼저 구축**한다. Phase 0 완료 후에는 Phase 1~4를 이 에이전트 팀이 Shrimp Task Manager(`plan_task → list_tasks → execute_task → verify_task`)와 본 로드맵을 기준으로 (반)자율 개발한다. Phase 0 자체는 아직 팀이 없으므로 사람 + Claude Code가 대화형으로 부트스트랩한다. (스펙: `docs/PRD.md` Part 0 · 구성요소 D001~D010)

### Phase 0: 자율 개발 에이전트 팀 구축 (선행) ✅

> 스스로 개발하고, 산출물을 코드리뷰·QA하며, 중요 의사결정 시 카카오톡으로 알리는 개발 시스템을 구축한다. **안전 게이트:** 에이전트는 브랜치+PR만 생성하고 `main` 병합은 사람이 승인. 시크릿은 절대 커밋 금지.
>
> **📊 진행 상황 (2026-07-03):** ✅ **Phase 0 완료 — D001~D007 (7/7).** 카카오 채널(실발송·401 자동 갱신 검증)·이벤트 훅·시크릿 가드·개발 게이트(lint+typecheck 녹색)·동적 QA 에이전트·오케스트레이터 `/dev:auto-dev`(의사결정 게이트)·무인 루프 `autodev.sh`(재개 보장)·GitHub Actions(@claude·리뷰·CI)·사용설명서(`docs/autonomous-dev.md`) 모두 구축. **이제 Phase 1(게임) 자율 개발 착수 가능** — `/dev:auto-dev` 또는 `scripts/autodev.sh`. (단, "나에게 보내기"는 푸시 미지원 → 기록용 로그. 실시간 푸시는 추후 Telegram 등. shrimp 자율루프는 로컬 트랙 전용.)

- **Task D001: 카카오 알림 채널 구축** ✅ - 완료 (PRD: D001)
  - ✅ `scripts/kakao/send.mjs` — "나에게 보내기" memo REST API 발송 (Node 내장 `fetch`, 무의존성), 401 → refresh → 1회 재시도, PR/이슈 링크 첨부 지원
  - ✅ `scripts/kakao/refresh.mjs` — `KAKAO_REST_API_KEY` + `KAKAO_REFRESH_TOKEN`으로 액세스 토큰 재발급 후 `.env.autodev.local`에 기록 (토큰 수명 ~12h)
  - ✅ `.env.autodev.example` (커밋) / `.env.autodev.local` (gitignore) — `KAKAO_REST_API_KEY`, `KAKAO_REFRESH_TOKEN`, `KAKAO_ACCESS_TOKEN`
  - ✅ `.gitignore`에 `.env.autodev.local` 방어선 추가 (기존 `.env*.local` 패턴 보강)

  ### 테스트 체크리스트
  - [x] `node scripts/kakao/send.mjs "테스트"` 실행 시 카카오톡 "나에게 보내기"로 메시지가 도착하는가 _(2026-07-03 실발송 확인)_
  - [x] 만료 토큰(401) 상황에서 refresh 후 재시도가 성공하는가 _(access_token 손상 주입 → 자동 갱신·재발송 실환경 확인)_
  - [x] `git check-ignore .env.autodev.local`로 파일이 무시됨을 확인하는가

- **Task D002: Claude Code 이벤트 훅 연결** ✅ - 완료 (PRD: D002)
  - ✅ `.claude/settings.json` 신규 생성 — `Stop`(작업 완료, `CLAUDE_AUTODEV=1` 게이팅), `Notification`(권한/유휴 = 의사결정 필요) 훅을 `notify.sh`에 연결
  - ✅ `.claude/hooks/notify.sh` — hook JSON을 stdin으로 받아(node 파싱) 이벤트/메시지를 뽑아 `send.mjs`로 전달, 항상 exit 0(비블로킹)
  - `permissions.allow`에 자동화용 명령 추가 (`node scripts/kakao/*`, `npm run lint`, `npm run typecheck`, `gh pr *`) _(D005 오케스트레이터에서 처리로 이월)_

  ### 테스트 체크리스트
  - [x] 세션이 Stop될 때 카카오 완료 알림이 발송되는가 _(발송 경로 실카카오 검증 · 실제 Stop 훅 발화는 CLAUDE_AUTODEV=1 무인 루프에서 활성)_
  - [x] 권한 대기(Notification) 발생 시 "의사결정 필요" 알림이 발송되는가 _(2026-07-03 notify.sh→send.mjs→실카카오 도착 확인)_

- **Task D003: 시크릿 위생 & 팀 온보딩 구성** ✅ - 완료 (PRD: D008, D009)
  - ✅ `.claude/hooks/pre-commit-guard.sh` — 스테이징 diff/파일명을 스캔해 카카오/GitHub/Supabase service_role 토큰·JWT·`.env*.local` 감지 시 **커밋 차단(exit 2) + stderr 경고**. Claude Code `PreToolUse`(에이전트) + 네이티브 git 훅(사람) 양쪽 적용. `git add .` 금지 규칙
  - ✅ `.env.example` — Supabase 자리표시자 (온보딩용, 커밋)
  - ✅ `scripts/setup.sh` — `*.example` → 실제 파일 복사(기존 미덮어씀), 네이티브 git 훅 설치, `gh auth status` 점검, 빠진 항목 체크리스트 출력
  - ✅ `scripts/check-env.mjs` — 루프 시작 전 필수 env 검증(누락 시 즉시 중단 + 발급처 안내)

  ### 테스트 체크리스트
  - [x] 시크릿을 일부러 스테이징하면 `pre-commit-guard.sh`가 커밋을 차단하는가
  - [x] 클린 클론에서 `setup.sh` → `check-env.mjs`가 빠진 값을 정확히 짚는가
  - [x] 필수 env 누락 시 `check-env.mjs`가 즉시 중단하고 무엇을/어디서 받는지 안내하는가

- **Task D004: QA 에이전트 및 개발 게이트 구축** ✅ - 완료 (PRD: D004)
  - ✅ `.claude/agents/dev/qa-tester.md` 신규 서브에이전트 — 개발 서버(`npm run dev`) 기동 후 **Playwright MCP**로 실제 브라우저를 몰아 각 태스크의 "테스트 체크리스트"를 실행, 콘솔/네트워크/런타임 에러 수집, pass/fail + 재현 리포트(한국어) 반환. 다중 클라이언트 시나리오는 여러 탭/컨텍스트로 시뮬레이션
  - ✅ `package.json`에 `"typecheck": "tsc --noEmit"` 스크립트 추가 → `lint` + `typecheck`를 로컬·CI 공통 게이트로 확립 (tailwind.config.ts require→ESM 수정으로 게이트 녹색화)
  - ✅ 정적 리뷰(`code-reviewer`)와 동적 QA(`qa-tester`)를 분리해 "리뷰는 통과했으나 실행 시 깨지는" 사각지대 제거

  ### 테스트 체크리스트
  - [ ] `qa-tester`가 앱을 띄우고 핵심 플로우를 실제로 구동해 pass/fail을 판정하는가 _(메서드·환경 스모크 실증: 스타터 `/`·`/auth/login` Playwright 구동 · 실게임 플로우 판정은 Phase 1)_
  - [ ] 런타임 결함 주입 시 재현 절차가 포함된 fail 리포트를 반환하는가 _(게임 코드가 생기는 Phase 1에서 확인)_
  - [x] `npm run typecheck && npm run lint`가 게이트로 동작하는가 _(둘 다 exit 0 · build까지 통과 확인)_

- **Task D005: shrimp 기반 오케스트레이터 개발 루프 구축** ✅ - 완료 (PRD: D003)
  - ✅ `.claude/commands/dev/auto-dev.md` 신규 슬래시 커맨드 — 태스크 1건 처리 계약: ① `docs/ROADMAP.md` 확인해 현재 Phase 식별 → ② shrimp `plan_task("Phase N: <제목>", @docs/ROADMAP.md)`(멱등) → ③ `list_tasks`로 다음 pending 1건 선택 → ④ `execute_task`로 서브에이전트(nextjs-app-developer / ui-markup-specialist / nextjs-supabase-expert)에 위임. 최상단에 `main 직접 커밋/병합·force push 금지 · git add . 금지` 안전 전제
  - ✅ 파이프라인: 게이트(lint·typecheck·Playwright 스모크) → `code-reviewer`(정적) → `qa-tester`(동적, fail 시 최대 2회 재시도) → `verify_task` → 새 브랜치 커밋·PR(gh 있으면 `gh pr create`, 없으면 compare URL) → `docs:update-roadmap`로 shrimp 상태 ↔ ROADMAP 체크마크 동기화 → 카카오 완료 알림
  - ✅ `docs/decisions/` (+ `README.md`) — QA 반복 실패 또는 의사결정 필요 시 `PENDING-<slug>.md`에 질문/결함 리포트를 남기고 루프 정지(→ 카카오 알림). 사람이 `## 결정`을 적으면 다음 루프가 읽어 재개
  - ✅ `.claude/settings.json`에 자동화 `permissions.allow` 추가 (D002에서 이월, 기존 hooks 보존)

  ### 테스트 체크리스트
  - [ ] `/dev:auto-dev` 1회 실행 시 `plan_task → list_tasks → execute_task` 순서로 태스크 1건이 착수되는가 _(커맨드 구조·부분 dry(다음 태스크 식별) 검증 완료 · 실제 완주는 Phase 1 첫 착수 시 사용자 승인 하에)_
  - [ ] 게이트·정적 리뷰·동적 QA를 거쳐 새 브랜치 PR이 생성되고 `main`에는 커밋이 없는가 _(Phase 1 첫 실행에서 확인)_
  - [ ] QA 반복 실패/의사결정 필요 시 `docs/decisions/`에 로그를 남기고 카카오 알림 후 정지하는가 _(프로토콜·정지 트리거 정의 완료 · 실동작은 Phase 1에서 확인)_

- **Task D006: 로컬 무인 루프 & 토큰 한도 재개 보장** ✅ - 완료 (PRD: D005, D006)
  - ✅ `scripts/autodev.sh` — headless `claude -p "/dev:auto-dev" --output-format stream-json` 드라이버 겸 **감독(supervisor)**. `/loop` 또는 cron/launchd로 반복 (`--bare` 미사용, `CLAUDE_AUTODEV=1`로 Stop 훅 알림)
  - ✅ **재개 보장**: 진행 상태를 shrimp 태스크 DB·ROADMAP 체크마크·git 브랜치/PR에 외부화 → 프로세스가 죽어도 다음 실행이 상태를 읽어 무손실·멱등 재개. 종료 코드/출력에서 rate-limit(429·"usage limit"·리셋 시각)을 감지해 **리셋 창까지 대기 후 재호출**, `session_id` 캡처로 `--resume`
  - ✅ (권장) 무인 배치는 구독 주간 상한 회피를 위해 **API 종량제 + 월 지출 상한** 사용

  ### 테스트 체크리스트
  - [x] rate-limit 신호(모의)를 주입하면 래퍼가 리셋 창까지 대기 후 재호출하는가 _(CLAUDE_CMD 스텁으로 1회차 rate_limit→대기→재호출→2회차 성공 확인)_
  - [x] 루프 중 프로세스를 강제 종료한 뒤 재실행 시 ROADMAP/브랜치 상태로부터 **다음 태스크를 이어서** 착수하는가(무손실) _(인메모리 상태 없음·매 iteration 독립 구조로 보장 · 실 완주는 Phase 1)_

- **Task D007: GitHub Actions 무인 트랙 & 사용설명서** ✅ - 완료 (PRD: D007, D010)
  - ✅ `.github/workflows/claude.yml` — `anthropics/claude-code-action@v1`, 이슈/PR `@claude` 멘션 시 브랜치 커밋·PR
  - ✅ `.github/workflows/claude-review.yml` — PR `opened`/`synchronize` 시 자동 코드리뷰 코멘트(한국어, 실동작 중심)
  - ✅ `.github/workflows/ci.yml` — PR·main push·수동·스케줄(cron)에서 `lint` + `typecheck` + `build` 게이트. 무상태라 재실행이 레포 상태로부터 자연 재개 _(CI Playwright 잡은 제외 — `@playwright/test` 미도입, 동적 QA는 `qa-tester` 소관)_
  - ✅ GitHub Secrets: `ANTHROPIC_API_KEY`(secrets 참조만) + GitHub App 설치 _(수동 선행)_
  - ✅ `docs/autonomous-dev.md` — 전체 아키텍처·역할 분담·"처음 세팅(5분)"·두 트랙 실행법·의사결정 게이트·안전 원칙·과금 + 한계 정직 명시
  - ⚠️ **한계**: shrimp MCP 로컬 전용 → 클라우드에서 shrimp 자율 루프 불가(완전 자율은 로컬 `autodev.sh` 트랙, 클라우드는 `@claude`·리뷰·CI 반자율)

  ### 테스트 체크리스트
  - [x] 워크플로우 3종 YAML 유효(ruby -ryaml) + `claude-code-action@v1`·트리거·permissions·`@claude` 가드 확인
  - [x] `ci.yml` 게이트 동등(`npm run lint && typecheck && build`) 로컬 exit 0(build 포함) · 시크릿 하드코딩 없음
  - [ ] 테스트 이슈에 `@claude` 멘션 시 Action이 브랜치+PR 생성 / PR에 `claude-review`·`ci` 코멘트·게이트 · 스케줄 하트비트 재기동 _(사용자 push + GitHub App 설치 + ANTHROPIC_API_KEY 등록 후 실환경 확인)_

---

### Phase 1: 애플리케이션 골격 구축 ✅

- **Task 001: 게임 라우트 구조 및 빈 페이지 생성** ✅ - 완료 (auto-dev · PR `auto/game-routes-scaffold`)
  - ✅ `app/game/layout.tsx` — 게임 영역 공통 레이아웃 생성
  - ✅ `app/game/page.tsx` — 입장 허브 빈 페이지 (F001, F002)
  - ✅ `app/game/waiting/page.tsx` — 대기실 빈 페이지 (F003, F004, F019, F020)
  - ✅ `app/game/play/page.tsx` — 게임 플레이 빈 페이지 (F005~F011, F014~F017)
  - ✅ `app/game/admin/page.tsx` — 진행자 대시보드 빈 페이지 (F004, F006, F009, F011~F014, F017~F020)
  - ✅ 각 페이지에 제목과 라우트 확인용 최소 마크업 삽입
  - ✅ `lib/supabase/proxy.ts` — `/game` 하위를 인증 예외(공개)로 추가 _(QA가 로그인 리다이렉트 결함을 잡아 수정 · 게임은 로그인 없이 닉네임 입장 F001)_

- **Task 002: 게임 타입 정의 및 상수 설계** ✅ - 완료 (auto-dev)
  - ✅ `lib/game/types.ts` — 핵심 TypeScript 타입 정의
    - `GameRoom`, `GamePlayer`, `GameMessage`, `GameVote`, `GameNightAction`
    - `PlayerRole`: `'saint' | 'heretic' | 'heretic_leader' | 'pastor' | 'elder' | 'deaconess'`
    - `GameStatus`: `'waiting' | 'day' | 'night' | 'ended'`
    - `ChatChannel`: `'public' | 'heretic' | 'council' | 'dm' | 'system'`
    - `ActionType`: `'kill' | 'investigate' | 'protect'`
    - `GameRoom`에 `transitionTo`(전환 예정 상태), `transitionAt`(전환 예정 시각) 필드 포함
    - `GameMessage`에 `recipientId`(1:1 수신자, channel='dm'일 때만) 필드 포함
    - `GamePlayer`에 `lastSeenAt`(접속 하트비트) 필드 포함
    - `PresenceState`: 참가자별 온라인/오프라인 상태 타입 (Realtime Presence 페이로드)
  - `lib/game/constants.ts` — 역할 한글 표시명(목사님·장로님·권사님·이단·이단 대장·성도), 팀 분류, 당회 그룹(목사님+장로님) 정의, 인원별 역할 배분표
  - `lib/game/utils.ts` — 역할 배분 계산 함수, 당회/이단 그룹 판별 함수, 승리 조건 체크 함수 시그니처

- **Task 003: Supabase DB 스키마 마이그레이션** ✅ - 완료 (auto-dev · 프로덕션 적용)
  - ✅ `supabase/migrations/0001_game_schema.sql` 작성 및 적용 (5테이블 + RLS 서버계층 모델 · `database.types.ts` 재생성)
  - 5개 테이블 생성: `game_rooms`, `game_players`, `game_messages`, `game_votes`, `game_night_actions`
    - `game_rooms`: `transition_to`(null/day/night), `transition_at`(timestamptz, nullable) 컬럼 포함
    - `game_messages`: `recipient_id`(→ game_players.id, nullable), `channel`(public/heretic/council/dm/system) 포함
    - `game_players`: `last_seen_at`(timestamptz, nullable) 컬럼 포함 (접속 상태 판정용)
    - 강퇴 처리 방식: 대기실=`game_players` 레코드 DELETE / 게임 중=`is_alive=false` UPDATE (별도 컬럼 없음)
  - UNIQUE 제약 추가: `game_votes(room_id, phase_number, voter_id)`, `game_night_actions(room_id, phase_number, actor_id)`
  - RLS 활성화 및 기본 정책 설정
    - `game_messages`: `channel = 'heretic'`인 행은 이단·이단 대장만 SELECT 가능
    - `game_messages`: `channel = 'council'`인 행은 목사님·장로님(당회)만 SELECT 가능
    - `game_messages`: `channel = 'dm'`인 행은 `player_id`(발신자) 또는 `recipient_id`(수신자) 본인만 SELECT 가능
    - `game_players`: `role` 컬럼은 본인 session_token 또는 진행자 PIN 확인 후 조회
  - `npx supabase gen types typescript` 로 `lib/types/database.types.ts` 재생성

---

### Phase 2: UI/UX 완성 (더미 데이터 활용) ✅

- **Task 004: 게임 전용 공통 컴포넌트 구축** ✅ - 완료 (auto-dev)
  - ✅ shadcn/ui 추가 컴포넌트 설치 (dialog tabs avatar scroll-area sonner separator)
  - ✅ 게임 공통 컴포넌트 구현 (`components/game/`)
    - ✅ `PlayerCard.tsx` — 닉네임 + 생존/탈락 배지 카드
    - ✅ `RoleCard.tsx` — 역할 공개 카드 (이름, 설명) — 모든 역할 동일 구조, 역할별 색상 차등 금지(무차별 UI)
    - ✅ `PhaseBanner.tsx` — 낮/밤 페이즈 + 라운드 번호 배너 + 전환 카운트다운 표시 영역
    - ✅ `ChatBubble.tsx` — 메시지 말풍선 (본인/타인/시스템 구분)
    - ✅ `ChatPanel.tsx` — 전체/비밀/1:1 공용 채팅 패널 (ScrollArea + ChatBubble + 입력창, 신규 메시지 자동 하단 스크롤)
    - ✅ `SecretChannelTab.tsx` — 전원 동일 노출 "비밀 채널" 탭, 멤버십(이단/당회/개인)에 따라 내용만 분기
    - ✅ `DirectMessageTab.tsx` — 상대 지정 1:1 귓속말 탭 (대상 선택 버튼 그룹 + ChatPanel)
    - ✅ `VoteButton.tsx` — 투표 대상 선택 버튼
    - ✅ `ActionPanel.tsx` — 밤 행동 패널 래퍼 — 전원 동일 형태의 대상 선택 UI(권한 없는 역할은 no-op)
  - ✅ 무차별 UI 원칙: 중립 테마(역할별 색상/배지 금지), 동일 탭 구성을 컴포넌트 레벨에서 보장 (code-reviewer 정적 검증 + qa-tester 렌더 검증 통과)
  - ✅ `lib/game/dummy.ts` — 더미 데이터 (참가자 10명, 채팅 메시지[public/heretic/council/dm/system], 투표 현황)

- **Task 005: 입장 허브 & 대기실 페이지 UI 구현** ✅ - 완료 (auto-dev)
  - ✅ 입장 허브 페이지 (`app/game/page.tsx`)
    - ✅ 교회 테마 게임 로고 및 제목
    - ✅ 닉네임 입력 폼 (Input + Button)
    - ✅ "진행자로 입장" 링크 → PIN 입력 Dialog 모달
  - ✅ 대기실 페이지 (`app/game/waiting/page.tsx`)
    - ✅ 더미 참가자 목록 (PlayerCard 컴포넌트 사용) + 온라인/오프라인 접속 상태 배지
    - ✅ 진행자용 [강퇴] 버튼 (참가자별, 더미 데이터로 조건부 노출, IS_ADMIN_DEMO 플래그)
    - ✅ 현재 인원 / 최소 인원 표시
    - ✅ [게임 시작] 버튼 (더미 데이터로 조건부 노출)
    - ✅ 대기 중 안내 메시지 (code-reviewer 정적 검증 + qa-tester 렌더/인터랙션 검증 통과)

- **Task 006: 게임 플레이 페이지 UI 구현 (역할 무차별 UI)** ✅ - 완료 (auto-dev)
  - ✅ 역할 카드 모달 (Dialog) — "내 역할 보기" 버튼(고정 텍스트) + RoleCard, 모든 역할 동일 레이아웃
  - ✅ 상단: PhaseBanner (낮/밤 + 라운드 표시, 카운트다운 표시 영역은 컴포넌트에 마련됨)
  - ✅ 좌측/하단: 생존 현황 플레이어 목록 (PlayerCard)
  - ✅ 중앙: 채팅 탭 UI — **전원 동일한 탭 구성**(전체 / 비밀 채널 / 1:1)
    - ✅ [전체 채팅] 탭 — ChatPanel(ScrollArea + ChatBubble + 입력창)
    - ✅ [비밀 채널] 탭 — SecretChannelTab, 전원 동일 노출·멤버십(이단/당회/개인)에 따라 내용만 분기
    - ✅ [1:1 채팅] 탭 — DirectMessageTab, 낮 페이즈·생존자만 입력 활성
  - ✅ 하단: 행동 패널 — **페이즈만으로 분기, 역할로 외형 분기 금지**
    - ✅ 낮 투표: VoteButton 목록 (생존자·자신 제외)
    - ✅ 밤: ActionPanel — actionLabel을 역할과 무관하게 "밤 행동"으로 고정, canAct(boolean)만으로 활성화 결정(code-reviewer가 탈락자 밤 행동 가능 버그 발견 → `canPerformNightAction(role, isAlive)` 유틸 추가로 수정)
  - ✅ 게임 종료 결과 오버레이 (승리 팀 발표 + 전원 역할 공개)
  - ✅ 무차별 UI 검증: qa-tester가 서로 다른 역할(이단 대장/성도) 시점 전환 후 밤 행동 패널 스크린샷 비교로 외형 동일함 확인, 탈락자 행동 불가도 실브라우저 검증

- **Task 007: 진행자 대시보드 UI 구현** ✅ - 완료 (auto-dev)
  - ✅ Tabs 컴포넌트로 2개 탭 분리 (스크린/제어)
  - ✅ [스크린 탭] — 빔프로젝터 공개 화면
    - ✅ 닉네임 + 생존/탈락만 표시 (역할 비공개 — PlayerCard 재사용으로 구조적 보장, qa-tester가 텍스트 스캔으로 실증)
    - ✅ 현재 페이즈 + 라운드 배너 (PhaseBanner, 전환 표시 영역 포함)
    - ✅ 투표 집계 Progress 바 + "n/생존자수" 텍스트 (shadcn Progress 신규 설치)
  - ✅ [제어 탭] — 진행자 개인 폰용
    - ✅ 닉네임 + 역할 + 생존 여부 + 접속 상태(온라인/오프라인 배지) 전체 표 (더미 데이터)
    - ✅ 탈락/부활 처리 토글 버튼
    - ✅ 참가자 [강퇴] 버튼 (탈락 처리 + 접속 상태 오프라인)
    - ✅ 페이즈 전환 버튼(낮⇄밤 예약) + 전환 대기 표시 + [전환 취소] 버튼 (초단위 카운트다운은 Phase 3 Task 013에서 구현)
    - ✅ [투표 조기 종료] 버튼 (투표수==생존자수일 때만 활성화, 진행률 "n/생존자수" 표시)
    - ✅ 밤 행동 완료 체크리스트 (이단 대장·목사님·권사님만 나열)
    - ✅ 시스템 메시지 입력창
    - ✅ 게임 종료 / 리셋 버튼 (게임종료·투표마감·전송은 Phase 3 구현 예정이라 disabled+안내 title로 명시, 리셋은 데모 상태 전체 초기화로 동작)
  - ✅ code-reviewer 정적 검증(스크린 탭 역할 노출 없음·0분모 가드) + qa-tester 11개 체크리스트 실브라우저 검증 통과

---

### Phase 3: 핵심 기능 구현

- **Task 008: 닉네임 입장 및 세션 관리 구현** - 우선순위
  - `lib/game/hooks/useGameSession.ts` — 세션 토큰 관리 훅
    - localStorage에 `session_token` (UUID) 저장/복원
    - `player_id` 조회 (session_token → game_players)
    - 세션 만료/없을 때 입장 허브로 리다이렉트
  - 입장 허브 Server Action: 닉네임 중복 체크 + game_players INSERT + 토큰 발급
  - 진행자 PIN 검증: game_rooms admin_pin 대조
  - 게임 상태 기반 라우팅 (waiting → play 자동 이동)

  ### 테스트 체크리스트
  - [ ] 닉네임 입력 후 localStorage에 session_token이 저장되는가
  - [ ] 동일 닉네임 중복 입장 시 에러 메시지가 표시되는가
  - [ ] 올바른 PIN 입력 시 진행자 대시보드로 이동하는가
  - [ ] 잘못된 PIN 입력 시 에러 메시지가 표시되는가
  - [ ] 브라우저 새로고침 후 세션이 복원되어 기존 상태로 돌아가는가

- **Task 009: 대기실 실시간 참가자 목록 구현**
  - game_rooms 초기화 (없으면 자동 생성, 있으면 재사용)
  - `app/game/waiting/page.tsx`에 Supabase Realtime 구독
    - `game_players` INSERT 이벤트 → 참가자 목록 실시간 갱신
  - 게임 시작 Server Action (`lib/game/actions.ts`)
    - 현재 참가자 수 기반 역할 배분 테이블 적용
    - 10명: 이단2 + 이단 대장1 + 목사님1 + 장로님1 + 권사님1 + 성도4
    - 15명: 이단3 + 이단 대장1 + 목사님1 + 장로님2 + 권사님1 + 성도7
    - 20명: 이단4 + 이단 대장1 + 목사님1 + 장로님2 + 권사님1 + 성도11
    - game_players 역할 일괄 UPDATE (무작위 셔플 후 배분)
    - game_rooms status → `'day'`, phase_number → `1`
  - game_rooms status 변경 이벤트 구독 → 전원 game/play로 자동 이동

  ### 테스트 체크리스트
  - [ ] 새 참가자 입장 시 대기실 목록에 실시간 추가되는가
  - [ ] 10명 참가 후 게임 시작 시 역할이 올바른 비율로 배분되는가 (이단 대장 1명, 장로님 포함)
  - [ ] 게임 시작 후 모든 참가자 화면이 게임 플레이 페이지로 이동하는가
  - [ ] 진행자만 [게임 시작] 버튼이 보이는가

- **Task 010: 채팅 시스템 구현**
  - `lib/game/hooks/useGameChat.ts` — 채팅 상태 + Realtime 구독 훅 (채널별 구독)
  - 메시지 전송 Server Action: game_messages INSERT (channel 구분, dm은 recipient_id 포함)
  - Supabase Realtime 구독
    - `channel = 'public'` 메시지: 전원 수신
    - `channel = 'heretic'` 메시지: RLS로 이단·이단 대장만 수신
    - `channel = 'council'` 메시지: RLS로 목사님·장로님(당회)만 수신
    - `channel = 'dm'` 메시지: RLS로 발신자·수신자 본인만 수신
    - `channel = 'system'` 메시지: 전원 수신 (다른 스타일)
  - 낮 페이즈: 전체 채팅·1:1 채팅 입력 활성 / 밤 페이즈: 전체·1:1 비활성, 비밀 채널 활성
  - **비밀 채널 탭은 전원 동일 노출(무차별 UI)**, 멤버십에 따라 내용만 분기(이단/당회/개인 플레이스홀더), 밤에 입력 활성
  - 1:1 채팅: 낮 페이즈·생존자만 상대 지정 가능, 본인 제외 생존자 대상 선택
  - Sonner 토스트로 새 메시지 알림 (채팅 탭이 숨겨진 경우)

  ### 테스트 체크리스트
  - [ ] 낮 페이즈에 전체 채팅 메시지가 모든 참가자에게 실시간 수신되는가
  - [ ] 비밀 채널 탭이 모든 역할에게 동일하게 노출되는가 (탭 유무로 역할이 드러나지 않는가)
  - [ ] 이단 채팅 메시지가 성도·목사님·장로님·권사님의 DB 직접 조회에서도 차단되는가
  - [ ] 당회 채팅 메시지가 목사님·장로님에게만 수신되고 그 외 역할에는 차단되는가
  - [ ] 1:1 메시지가 발신자·수신자 외 제3자에게 차단되는가 (DB 직접 조회 포함)
  - [ ] 1:1 채팅이 밤 페이즈·탈락자에게는 비활성화되는가
  - [ ] 밤 페이즈에 전체 채팅 입력창이 비활성화되는가
  - [ ] 시스템 메시지가 일반 채팅과 다른 스타일로 표시되는가

- **Task 011: 낮 투표 시스템 구현**
  - 투표 Server Action: game_votes UPSERT (1인 1표, 변경 가능)
  - `lib/game/hooks/useGameVotes.ts` — 투표 현황 실시간 구독
  - 살아있는 플레이어 목록 기반 VoteButton 렌더링
  - 자신에게 투표 불가 처리
  - 진행자 투표 마감 Server Action
    - 최다 득표자 산출 (동률 시 진행자 수동 선택 모달)
    - game_players is_alive → false
    - 시스템 메시지 발송 ("○○님이 공동체를 떠났습니다")
    - 승리 조건 체크 실행
  - 투표 조기 종료 (F018): 생존자 수 == 고유 투표자 수이면 진행자 대시보드에 "전원 투표 완료" 표시 + [조기 종료] 버튼 활성화 (즉시 마감 Server Action 호출)
  - 진행자 대시보드 실시간 투표 집계 + 투표 진행률("n/생존자수") 표시

  ### 테스트 체크리스트
  - [ ] 투표 후 다른 참가자로 변경 투표가 가능한가 (1인 1표 유지)
  - [ ] 진행자 화면에 실시간 투표 집계와 진행률이 표시되는가
  - [ ] 생존자 전원이 투표하면 [조기 종료] 버튼이 활성화되는가
  - [ ] 투표 마감 후 최다 득표자가 탈락 처리되는가
  - [ ] 탈락 처리 후 해당 플레이어의 투표 버튼이 비활성화되는가
  - [ ] 동률 시 진행자 수동 선택 모달이 표시되는가

- **Task 012: 밤 행동 시스템 구현**
  - 밤 행동 Server Action: game_night_actions UPSERT (권한 검증 — 권한 없는 역할 요청은 거부/no-op)
  - 역할별 행동 처리 (UI 외형은 전원 동일, 실제 동작만 권한자 한정)
    - 이단 대장(heretic_leader)만: 제거 대상 선택 → `action_type: 'kill'` (일반 이단은 비밀 채팅으로 작전만, 제거 선택 불가)
    - 목사님(pastor): 조사 대상 선택 → `action_type: 'investigate'`
    - 권사님(deaconess): 보호 대상 선택 → `action_type: 'protect'`
    - 장로님(elder)·성도·일반 이단: 밤 행동 없음 — 외형 동일한 no-op 대기 패널
  - 목사님 조사 결과 처리
    - 대상이 이단 팀(`heretic` 또는 `heretic_leader`)이면 "이단입니다", 그 외는 "성도입니다" 반환 (위장 없음 — 이단 대장도 "이단"으로 식별)
    - 결과를 Sonner 토스트로 해당 플레이어에게만 표시
  - 진행자 밤 행동 완료 현황 표시 (누가 완료했는지 체크 — 실제 권한자 기준)
  - 밤 결과 처리 Server Action (진행자 "아침으로" 버튼)
    - 보호 대상과 제거 대상이 겹치면 제거 무효
    - 제거 대상 is_alive → false
    - 시스템 메시지 발송 ("밤 사이 ○○님이 이단 세력에 의해 제거되었습니다")
    - 승리 조건 체크 실행

  ### 테스트 체크리스트
  - [ ] 이단 대장의 제거 행동만 game_night_actions에 저장되고, 일반 이단의 제거 시도는 거부되는가
  - [ ] 일반 이단·장로님·성도의 밤 행동 패널 외형이 권한자와 동일하게 보이는가 (무차별 UI)
  - [ ] 권사님 보호 대상과 이단 대장 제거 대상이 같을 때 제거가 무효화되는가
  - [ ] 목사님이 이단·이단 대장을 조사할 때 모두 "이단입니다"로 반환되는가 (위장 없음)
  - [ ] 목사님이 선 팀(성도·장로님·권사님)을 조사할 때 "성도입니다"로 반환되는가
  - [ ] 조사 결과가 목사님에게만 표시되는가
  - [ ] 밤 행동 완료 후 진행자 대시보드에 완료 현황이 표시되는가

- **Task 013: 페이즈 전환 및 승리 조건 구현**
  - 페이즈 전환 카운트다운 Server Action (F017)
    - 전환 시작: game_rooms `transition_to`(다음 status) + `transition_at`(now + 10초) 설정
    - 전 클라이언트는 `transition_at` 기준으로 동기화된 10초 카운트다운 표시
    - 전환 취소: 진행자가 카운트다운 중 [전환 취소] → `transition_to`/`transition_at` null로 초기화
  - 페이즈 전환 확정 Server Action (`lib/game/actions.ts`)
    - 카운트다운 완료 시 game_rooms status 업데이트 (`day ↔ night`), `transition_*` 초기화
    - phase_number 증가 (밤 → 낮 전환 시)
    - 전환 시 시스템 메시지 자동 발송
  - 승리 조건 체크 함수
    - 선 팀 승리: 이단 역할 플레이어 전원 is_alive = false
    - 악 팀 승리: 생존 이단 수 ≥ 생존 성도 수
    - 조건 충족 시 game_rooms status → `'ended'`, winner 기록
    - 전원 게임 종료 결과 화면 표시 (역할 전체 공개 포함)
  - game_rooms Realtime 구독 → 모든 클라이언트에 상태 변경 반영
  - 진행자 수동 탈락 처리 Server Action (이견 처리용)
  - 게임 리셋 Server Action: 모든 테이블 데이터 초기화 + waiting 상태로 복귀

  ### 테스트 체크리스트
  - [ ] 진행자가 페이즈 전환 시작 시 모든 참가자 화면에 10초 카운트다운이 동기화 표시되는가
  - [ ] 카운트다운 중 진행자가 [전환 취소] 시 전원 화면에서 전환이 중단되는가
  - [ ] 카운트다운 완료 후 모든 참가자 화면이 동시에 갱신되는가
  - [ ] 이단(이단 대장 포함) 전원 탈락 시 선 팀 승리 화면이 표시되는가
  - [ ] 생존 이단 수 ≥ 생존 성도 수 조건 충족 시 악 팀 승리 화면이 표시되는가
  - [ ] 게임 종료 화면에서 모든 역할이 공개되는가
  - [ ] 게임 리셋 후 대기실에서 새 게임을 시작할 수 있는가

- **Task 013-1: 참가자 접속 관리 및 강퇴 기능 구현**
  - `lib/game/hooks/useGamePresence.ts` — Supabase Realtime Presence 구독 훅
    - 참가자 입장 시 Presence 채널 track, 주기적 하트비트로 `game_players.last_seen_at` 갱신
    - 참가자별 온라인/오프라인 상태 파생 (Presence leave 또는 last_seen_at 임계 초과 시 오프라인)
  - 대기실·진행자 대시보드에 접속 상태 배지 연동 (F020)
  - 대기실 강퇴 Server Action: 대상 `game_players` 레코드 DELETE → Realtime로 전원 목록 갱신
  - 게임 중 강퇴 Server Action: 대상 `is_alive=false` 처리 + 시스템 메시지 발송 + 승리 조건 체크 실행 (수동 탈락 처리와 동일 메커니즘, 사유만 구분)
  - 진행자 권한 검증 (PIN 보유자만 강퇴 가능)

  ### 테스트 체크리스트
  - [ ] 참가자 접속 시 진행자 화면에 온라인 배지가 표시되는가
  - [ ] 참가자 연결 종료(탭 닫기) 시 오프라인 배지로 전환되는가
  - [ ] 대기실에서 강퇴 시 대상이 목록에서 즉시 제거되는가
  - [ ] 게임 중 강퇴 시 대상이 탈락 처리되고 승리 조건이 재검사되는가
  - [ ] 진행자가 아닌 참가자는 강퇴를 실행할 수 없는가 (권한 거부)

- **Task 014: 전체 플로우 통합 테스트**
  - Playwright MCP를 사용한 E2E 테스트 시나리오 실행
  - 전체 게임 플로우 검증 (입장 → 대기 → 역할 확인 → 낮[전체·1:1 채팅·투표] → 밤[비밀 채널·밤 행동] → 승리)
  - 동시 접속 10명 시나리오 실시간 동기화 검증 (모든 역할 1명 이상 포함)
  - 엣지 케이스 처리 확인

  ### 테스트 체크리스트
  - [ ] 참가자 10명 + 진행자 1명 전체 플로우 실행 가능한가
  - [ ] 채팅 메시지가 모든 클라이언트에 500ms 이내 전달되는가 (public/heretic/council/dm 전 채널)
  - [ ] 페이즈 전환 카운트다운·취소, 투표 조기 종료가 다중 클라이언트에서 정상 동작하는가
  - [ ] 진행자 강퇴 시 대상이 목록/게임에서 제거(대기실) 또는 탈락 처리(게임 중)되는가
  - [ ] 오프라인 참가자가 진행자 화면에 오프라인 배지로 표시되는가
  - [ ] 브라우저 탭 전환 후 돌아왔을 때 Realtime 재연결이 되는가
  - [ ] 탈락자가 투표/행동 패널/1:1 채팅을 사용할 수 없는가
  - [ ] 모바일 Safari, Chrome에서 정상 동작하는가

---

### Phase 4: 고급 기능 및 최적화

- **Task 015: 모바일 UX 최적화**
  - 터치 영역 최적화 (최소 버튼 크기 48px 이상)
  - 채팅 입력 시 모바일 키보드 올라올 때 레이아웃 깨짐 방지
  - `manifest.json` + 아이콘 추가 (PWA — 홈 화면에 추가 가능)
  - Supabase Realtime 재연결 로직 (앱 백그라운드 전환 후 복귀 시)
  - 오프라인 상태 감지 + 재연결 안내 토스트

- **Task 016: 배포 및 운영 준비**
  - Vercel 배포 설정 및 환경 변수 구성
  - 게임 세션 만료 처리 (24시간 후 자동 리셋)
  - 진행자 화면에서 QR코드 생성 기능 (참가자 초대용)
  - 게임 시작 전 역할 배분 미리보기 (진행자만 확인)
  - README에 행사 진행 가이드 추가

- **Task 017: 역할 무차별 UI 정합성 검증**
  - 게임 플레이 페이지에서 서로 다른 역할(이단 대장·이단·목사님·장로님·권사님·성도)로 동시 접속
  - Playwright MCP로 각 역할 화면 스크린샷 캡처 후 외형 비교
  - 탭 구성·색상 테마·밤 행동 패널 외형이 역할과 무관하게 동일한지 확인
  - 차이가 발견되면 컴포넌트 수정 후 재검증

  ### 테스트 체크리스트
  - [ ] 비밀 채널 탭이 모든 역할에게 동일한 위치·라벨로 노출되는가 (내용만 분기)
  - [ ] 밤 행동 패널이 권한 유무와 무관하게 동일한 외형인가
  - [ ] 역할별 색상/배지/아이콘이 메인 화면에 노출되지 않는가
  - [ ] 역할 카드 모달이 모든 역할에서 동일한 구조인가
  - [ ] 옆 사람 화면을 봤을 때 역할을 식별할 단서가 없는가
