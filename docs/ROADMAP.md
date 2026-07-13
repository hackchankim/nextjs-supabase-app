# 교회 테마 마피아 게임 개발 로드맵

모바일 브라우저 하나로 5-20명이 즉시 참여하는 교회 버전 실시간 마피아 게임

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
    - ✅ 더미 참가자 목록 (PlayerCard 컴포넌트 사용, 대기실은 게임 시작 전이라 생존/탈락 배지 숨김 `showAliveStatus={false}`) + 온라인/오프라인 접속 상태 배지
    - ✅ 진행자용 [강퇴]·[게임 시작] 버튼은 진행자 시점에서만 노출 (개발용 진행자/참가자 시점 토글은 `NODE_ENV` 가드로 프로덕션 빌드에서 자동 제거, 실제 판정은 Phase 3 PIN 세션)
    - ✅ 현재 인원 / 최소 인원 표시
    - ✅ [게임 시작] 버튼 (더미 데이터로 조건부 노출)
    - ✅ 대기 중 안내 메시지 (code-reviewer 정적 검증 + qa-tester 렌더/인터랙션 검증 통과)

- **Task 006: 게임 플레이 페이지 UI 구현 (역할 무차별 UI)** ✅ - 완료 (auto-dev)
  - ✅ 역할 카드 모달 (Dialog) — "내 역할 보기" 버튼(고정 텍스트) + RoleCard, 모든 역할 동일 레이아웃
  - ✅ 상단: PhaseBanner (낮/밤 + 라운드 표시, 카운트다운 표시 영역은 컴포넌트에 마련됨)
  - ✅ 생존 현황: 팀별 인원 집계("공동체 N명 · 이단 M명 생존", 개별 역할 비노출) + 콤팩트 참가자 칩 (사용자 리뷰 반영: 공간 절약·팀 집계 표기)
  - ✅ 데모 컨트롤(역할 표시)은 `process.env.NODE_ENV === "development"` 가드로 프로덕션 빌드에서 자동 제거 (참가자에게 역할 노출 방지)
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

### Phase 3: 핵심 기능 구현 ✅

> **🧭 실시간·재접속 설계 원칙 (Task 009에서 확립, 전 태스크 공통):**
> 1. **서버 상태 = 단일 진실.** 모든 실시간 화면은 마운트 시 **서버 스냅샷을 조회**(Server Action, service_role, 정제된 필드만)하고 **이후 델타는 Broadcast로 구독**한다. Broadcast는 재전송이 안 되므로(휘발성) 놓친 이벤트는 스냅샷 재조회로 복원한다.
> 2. **비밀 컬럼(role·session_token·admin_pin) 있는 테이블은 anon에 절대 노출 금지** — Postgres Changes(전체 행 전송) 대신 Broadcast로만. 본인 역할 등 "내 것"은 토큰으로 본인 1건만 조회하는 Server Action으로.
> 3. **현재 status 기반 라우팅** — 각 화면은 `game_rooms.status`를 확인해 어긋나면 알맞은 화면으로 이동(재접속·이어하기의 기반). Task 010·011·012·013이 play 화면을 실데이터화하면서 이 원칙을 지키면 재접속이 자연히 따라온다.

- **Task 008: 닉네임 입장 및 세션 관리 구현** ✅ - 완료 (auto-dev · 첫 실제 Supabase 쓰기)
  - ✅ `lib/game/hooks/useGameSession.ts` — 세션 토큰 관리 훅
    - ✅ localStorage `game_session_token`에 UUID 저장/복원
    - ✅ `getPlayerBySession`(Server Action)로 player 조회 (role 미반환 — 무차별 UI)
  - ✅ `lib/supabase/admin.ts` — service_role 서버 전용 클라이언트 (`import "server-only"` 가드, Fluid compute 대응)
  - ✅ 입장 허브 Server Action(`lib/game/actions.ts`, `"use server"`): `joinGame`(닉네임 유효성·중복 체크·game_players INSERT·토큰 발급, 동시입장 23505 처리) + `verifyAdminPin`(admin_pin 대조) — 판별 유니온 반환
  - ✅ 게임 상태 기반 라우팅 (닉네임→`/game/waiting`, PIN 정답→`/game/admin`)
  - ✅ **지각 입장 차단**(Task 009 후 보강): `joinGame`이 `status!=='waiting'`이면 거부("이미 시작됨, 다음 게임 대기") — role=null 유령 참가자로 인한 승리 판정 왜곡 방지. **재접속 게이트**: 유효 세션이 있으면 입장 허브가 닉네임을 다시 묻지 않고 현재 status에 맞는 화면(대기실/게임)으로 자동 이동, 대기실은 이미 시작된 게임이면 게임 화면으로 이어붙임. `getPlayerBySession`이 `roomStatus`를 함께 반환(role은 여전히 미반환). _(qa-tester 실브라우저 검증)_
  - ✅ **보안 수정**: `game_rooms.admin_pin`이 anon(브라우저)에 노출되던 결함(Task 003 RLS 갭)을 마이그레이션 `0002_restrict_admin_pin.sql`(테이블 SELECT 회수 + admin_pin 제외 컬럼 재부여)로 프로덕션 차단. code-reviewer 발견 → 사용자 승인(컬럼 권한 회수) 후 적용·검증
  - ⚠️ **후속 백로그**(이번 범위 밖): `verifyAdminPin` rate-limit(4자리 PIN 무차별 대입 방어), `/game/admin` 진입 시 서버 세션/쿠키 검증, `getOrCreateActiveRoom` select→insert 레이스(이벤트 규모상 저위험)

  ### 테스트 체크리스트
  - [x] 닉네임 입력 후 localStorage에 session_token이 저장되는가 _(qa-tester: 실 DB INSERT + UUID 저장 확인)_
  - [x] 동일 닉네임 중복 입장 시 에러 메시지가 표시되는가
  - [x] 올바른 PIN 입력 시 진행자 대시보드로 이동하는가 _(시드 room PIN '1234')_
  - [x] 잘못된 PIN 입력 시 에러 메시지가 표시되는가
  - [x] 브라우저 새로고침 후 세션이 복원되어 기존 상태로 돌아가는가

- **Task 009: 대기실 실시간 참가자 목록 구현** ✅ - 완료 (auto-dev · Realtime 첫 도입)
  - ✅ **⚠️ 아키텍처 결정 — 실시간은 Broadcast 방식(Postgres Changes 폐기)**: Postgres Changes는 컬럼 권한(GRANT)을 무시하고 **전체 행(role·session_token·admin_pin)을 anon에게 전송**함이 실측으로 확인됨(컬럼 제한 시엔 아예 미전달). 따라서 game_players/game_rooms는 anon 완전 차단 유지, `game_players`/`game_rooms`를 realtime publication에 넣지 않고, **서버가 정제된 페이로드만 `room:<roomId>` 채널로 Broadcast**한다. 이 원칙은 후속 Task 010(채팅)·013(페이즈)에도 그대로 적용 — 비밀 컬럼 있는 테이블은 Broadcast로.
  - ✅ `lib/game/realtime.ts` — 채널 규약(`room:<roomId>`)·이벤트(`player_joined`, `game_started`)·페이로드 타입(role 미포함). 후속 태스크 재사용용 공유 모듈
  - ✅ `lib/game/broadcast.ts` — `import "server-only"`, service_role로 Broadcast REST(`/realtime/v1/api/broadcast`) 송출 (서버→클라 전달 실측 검증)
  - ✅ 게임 시작 Server Action (`lib/game/actions.ts` `startGame`): PIN 재검증 → **상태 가드(status='waiting'만 시작 가능, 재시작 재셔플 방지)** → 인원 기반 역할 배분(10/15/20 배분표, Fisher-Yates 셔플) → game_players role 일괄 UPDATE → game_rooms status='day', phase_number=1 → GAME_STARTED broadcast
  - ✅ `getRoomPlayers`(role/token 제외 정제 목록) + `joinGame` **정원(MAX_PLAYERS=20) 가드** + PLAYER_JOINED broadcast
  - ✅ 대기실/진행자 대시보드: 더미 제거, 실시간 목록(초기 스냅샷+broadcast 델타, 레이스 병합) + 게임 시작 연동 + game_started 시 `/game/play` 자동 이동
  - ⚠️ **후속 백로그**: Broadcast 공개 채널 위조 방지(private channel + `realtime.messages` RLS), 역할 배분 트랜잭션(RPC)화, PIN rate-limit

  ### 테스트 체크리스트
  - [x] 새 참가자 입장 시 대기실/진행자 목록에 실시간 추가되는가 _(qa-tester: 양방향 실측)_
  - [x] 10명 참가 후 게임 시작 시 역할이 올바른 비율로 배분되는가 (이단 대장 1명, 장로님 포함) _(SQL로 배분표 일치 확인)_
  - [x] 게임 시작 후 모든 참가자 화면이 게임 플레이 페이지로 이동하는가
  - [x] 진행자만 [게임 시작] 버튼이 보이는가 _(진행자 대시보드에서만, 시작 후 버튼 잠금)_
  - [x] role/session_token이 클라이언트로 노출되지 않는가 _(getRoomPlayers 응답·broadcast 프레임 실측)_

- **Task 009-1: 최소 참가 인원 5명으로 하향** ✅ - 완료 (auto-dev · 브랜치 auto/min-players-5)
  - ✅ 배경: 기존 `MIN_PLAYERS=10`이라 10명 미만이면 게임 시작이 불가능했음. 소규모 모임(5~9명) 지원을 위해 5로 하향.
  - ✅ `lib/game/constants.ts`: `MIN_PLAYERS = 10` → `MIN_PLAYERS = 5`로 변경(주석 "지원 인원 범위 (10~20명)"도 "(5~20명)"으로 갱신). 문서용(코드에서 미사용) `ROLE_DISTRIBUTION_TABLE` 상수에 `5: { heretic: 1, heretic_leader: 1, pastor: 1, elder: 1, deaconess: 1, saint: 0 }` 대표 항목 추가.
  - ✅ `lib/game/actions.ts`의 `startGame`: 하드코딩된 에러 메시지 `"게임 시작에는 최소 10명이 필요합니다"`를 `` `게임 시작에는 최소 ${MIN_PLAYERS}명이 필요합니다` `` 템플릿 리터럴로 교체(`joinGame`의 `MAX_PLAYERS` 에러 메시지 패턴과 동일하게 상수와 동기화).
  - ✅ `lib/game/utils.ts`의 `getRoleDistribution` 공식(`heretic=floor(n/5)`, 이단대장·목사님·권사님 각 1, 장로님 n<13?1:2, 나머지 성도)은 **수정하지 않음** — `MIN_PLAYERS`/`MAX_PLAYERS` 상수를 그대로 참조해 클램프하므로, 상수만 바뀌어 5~9명에 자동으로 올바르게 일반화됨(qa-tester가 5·10명 SQL 배분 결과로 실증). JSDoc 주석("10~20명"·"대표점 10/15/20")도 실제 지원 범위와 동기화(code-reviewer 지적 반영).
  - ✅ `app/game/admin/page.tsx`(`canStartGame` 조건, 인원 표시 문구)와 `app/game/waiting/page.tsx`(인원 표시 문구)는 이미 `MIN_PLAYERS` 상수를 참조해 코드 수정 없이 자동 반영됨.
  - ✅ `docs/PRD.md`의 "10-20명" 표기는 "5-20명"으로 반영됨(선행 완료).
  - ✅ DB 스키마 변경 없음(`MIN_PLAYERS`는 앱 상수일 뿐 DB에 저장되지 않음).
  - 📝 **참고(설계 특성, 결함 아님)**: 5명 구성(이단 팀 2명 vs 선 팀 3명)은 선 팀이 1명만 잘못 처형돼도 즉시 이단 팀 승리 조건(`aliveHeretics >= aliveSaints`)이 충족될 만큼 타이트함 — 소규모 게임의 자연스러운 산술적 귀결이며 실제 플레이로 밸런스 체감 확인 권장.
  - 📝 **범위 밖 발견(회귀 아님, 백로그)**: 진행자 대시보드 [제어] 탭의 참가자 표에서 "역할" 컬럼이 게임 시작 후에도 항상 "-"로 표시됨(`getRoomPlayers`가 role을 반환하지 않음) — 코드 주석은 "제어 탭은 역할 공개가 스펙상 정상"이라 명시하나 실제로는 F013(진행자 전용 제어판) 스펙과 어긋남. 이번 브랜치에서 발생한 회귀 아님(qa-tester 확인), 별도 이슈로 다룰 것.

  ### 테스트 체크리스트 (qa-tester 7/7 PASS)
  - [x] 참가자 5명으로 진행자 대시보드에 [게임 시작] 버튼이 노출되고 정상 시작되는가 _(실브라우저: 5번째 참가자 입장 → 시작 → day 전환 실증)_
  - [x] 참가자 4명으로는 여전히 게임 시작이 거부되고 에러 메시지에 "최소 5명"이 표시되는가 _(버튼 미노출 + `startGame` 직접 호출로 에러 메시지 확인)_
  - [x] 5~9명 각각 역할 배분 시 총원이 실제 인원수와 정확히 일치하고, 이단 대장·목사님·권사님이 각 1명씩 존재하는가 _(5명 SQL 배분 결과 기대값과 정확히 일치)_
  - [x] 5명 구성(성도 0명)에서도 낮 투표·밤 행동·승리 판정이 정상 동작하는가 _(낮 투표→밤 전환→목사님 조사(이단 정확 판정)→밤 결과 처리→낮 전환까지 에러 없이 완주)_
  - [x] 대기실·진행자 대시보드의 "최소 N명" 안내 문구가 5로 올바르게 표시되는가
  - [x] 기존 10명 이상 시나리오에 회귀가 없는가 _(더미 10명 SQL 배분 결과 이단2·이단대장1·목사님1·장로님1·권사님1·성도4로 기존과 동일)_
  - [x] 콘솔 에러 0건

- **Task 010: 채팅 시스템 구현** ✅ - 완료 (auto-dev · Broadcast fan-out)
  - ✅ **⚠️ 아키텍처 — 채널 격리는 RLS+Postgres Changes가 아니라 Broadcast 개인 인박스 fan-out**: Task 009에서 확립된 원칙(Postgres Changes는 비밀 컬럼 전체 행 누출) 적용. `game_messages`는 anon 완전 차단(RLS: public/system SELECT만, 쓰기 정책 없음), 모든 읽기/쓰기는 service_role Server Action 경유. 비밀 채널은 서버가 **자격자 개인 인박스 토픽으로만** broadcast해 격리
  - ✅ `lib/game/inbox.ts` — `computeInboxToken(playerId)=HMAC-SHA256(BROADCAST_INBOX_SECRET, playerId)`(server-only). playerId는 공개지만 토픽은 역산 불가 → 타인 인박스 구독 차단. 인박스 채널: `room:{roomId}:inbox:{token}`
  - ✅ `lib/game/broadcast.ts` — `broadcastToTopic(topic,event,payload)` 일반화(인박스 fan-out), `broadcastToRoom`은 이를 위임
  - ✅ `lib/game/realtime.ts` — `CHAT_MESSAGE` 이벤트·`inboxChannel`·`ChatMessagePayload`(role 미포함)
  - ✅ 메시지 전송 Server Action `sendMessage(token,channel,text,recipientId?)` — game_messages INSERT + fan-out. **서버가 페이즈·역할·생존을 최종 검증**(무차별 UI는 클라 표현일 뿐)
    - `public` 메시지: 공개 `room:{roomId}` 채널로 전원 수신
    - `heretic` 메시지: 서버가 이단팀(이단·이단 대장) 인박스로만 fan-out
    - `council` 메시지: 서버가 당회(목사님·장로님) 인박스로만 fan-out
    - `dm` 메시지: 발신자·수신자 두 사람 인박스로만. **recipientId UUID 검증으로 `.or()` 필터 인젝션 차단**(제3자 열람 방지 — code-reviewer 발견 치명적 결함 수정)
    - `system` 메시지: 공개 채널 전원 수신, 전체 탭에 다른 스타일(중앙 pill)로 표시. (서버 내부 발송은 Task 011~013에서)
  - ✅ `getMessages(token,channel,recipientId?)` — 서버가 자격 검증 후 열람 가능 메시지만 반환(자격 없으면 빈 배열), role 미포함. `getMyRole(token)`(본인 role만, 채팅 멤버십·역할 카드용 — Task 013-2에서 당겨옴), `getMyInboxTopic(token)`
  - ✅ `lib/game/hooks/useGameChat.ts` — 채널별 스냅샷(getMessages) + 공개 room·개인 인박스 채널 Broadcast 구독, id 기준 dedupe·병합(레이스·echo 대비), 비활성 탭 새 메시지 Sonner 토스트
  - ✅ `app/game/play/page.tsx` — 더미 완전 제거, 세션(`useGameSession`)·본인 역할(`getMyRole`)·참가자 목록·채팅 실데이터 전환. 세션 가드(무세션→`/game`, waiting→대기실). 낮=전체·1:1 활성/밤=비밀 활성, **탈락자 전 채널 입력 비활성**. 비밀 채널 탭 전원 동일 노출. (투표/밤 행동 패널은 placeholder 유지 — 실동작은 Task 011/012)
  - ✅ `app/layout.tsx` — `<Toaster />` 마운트
  - ✅ code-reviewer 정적 리뷰(DM 인젝션 치명적 결함 발견·수정, 탈락자 입력 UX 보강) + qa-tester 실브라우저/DB anon 직접조회/Server Action 직접호출(인젝션 회귀 포함) 3중 검증 — 체크리스트 10/10 PASS
  - ⚠️ **후속 백로그**: 탈락자 비밀채팅 수신 정책(관전자=구 팀 채팅 열람 허용 여부 미정 — fan-out에 is_alive 미필터), system 메시지 실시간 발송 경로(현재 스냅샷 로드만·발송은 Task 011~013 서버 내부), Broadcast 공개/인박스 채널 위조 방지(private channel + realtime.messages RLS), HMAC 시크릿 전용화(현재 SERVICE_ROLE_KEY 폴백)

  ### 테스트 체크리스트
  - [x] 낮 페이즈에 전체 채팅 메시지가 모든 참가자에게 실시간 수신되는가 _(qa-tester: 두 세션 실시간 수신)_
  - [x] 비밀 채널 탭이 모든 역할에게 동일하게 노출되는가 (탭 유무로 역할이 드러나지 않는가)
  - [x] 이단 채팅 메시지가 성도·목사님·장로님·권사님의 DB 직접 조회에서도 차단되는가 _(anon REST 직접조회 [] 확인)_
  - [x] 당회 채팅 메시지가 목사님·장로님에게만 수신되고 그 외 역할에는 차단되는가
  - [x] 1:1 메시지가 발신자·수신자 외 제3자에게 차단되는가 (DB 직접 조회 포함) _(인젝션 회귀 포함 검증)_
  - [x] 1:1 채팅이 밤 페이즈·탈락자에게는 비활성화되는가 _(UI 비활성 + 서버 최종 거부)_
  - [x] 밤 페이즈에 전체 채팅 입력창이 비활성화되는가
  - [x] 시스템 메시지가 일반 채팅과 다른 스타일로 표시되는가 _(중앙 pill, role="status")_

- **Task 011: 낮 투표 시스템 구현** ✅ - 완료 (auto-dev · Broadcast 집계)
  - ✅ 투표 Server Action `castVote(token, targetId)` — game_votes UPSERT(1인 1표, onConflict room_id,phase_number,voter_id로 변경 가능). 낮·생존 투표자·대상 생존/같은방/자기자신 불가를 **서버가 최종 검증**
  - ✅ `lib/game/hooks/useGameVotes.ts` — `getVoteState` 스냅샷 + 공개 room 채널 `VOTE_UPDATE` Broadcast 구독(집계 델타). Postgres Changes 미사용
  - ✅ 살아있는 플레이어 기반 VoteButton 렌더링(자신 제외) + 내 투표 하이라이트 + 대상별 득표수 표시
  - ✅ 진행자 투표 마감 Server Action `closeVoting(roomId, pin)` — **PIN 재검증 + 낮 상태 가드**
    - 최다 득표자 산출, 동률(≥2) 시 후보 반환 → 진행자 수동 선택 모달 → `resolveVoteElimination(roomId, pin, targetId)`(후보 재검증)
    - ✅ 공유 헬퍼 `resolveElimination`(is_alive→false, **is_alive=true 가드로 중복 마감 멱등화**, 시스템 메시지 발송+`PLAYER_ELIMINATED` broadcast) / `evaluateWinner`(`checkWinner`→ended+winner+`GAME_ENDED` broadcast) — **Task 012/013이 재사용**
  - ✅ 투표 조기 종료 (F018): `voterCount==aliveCount`일 때만 진행자 [조기 종료] 활성
  - ✅ 진행자 대시보드 실시간 집계 + 진행률("n/생존자수") + 종료 후 버튼 비활성. play 화면 본인 탈락 즉시 반영(selfAlive) + 종료 상태 고정(winner/resultOpen 분리)으로 종료 후 투표 패널 은닉
  - ✅ **보안 수정**: `game_votes.anon SELECT using(true)` 정책이 개별 투표(voter→target)를 anon에 직접 노출하던 결함(admin_pin과 동일 유형)을 마이그레이션 `0003_restrict_game_votes.sql`(정책 제거 + anon SELECT revoke)로 프로덕션 차단. code-reviewer 발견 → **사용자 승인(비밀 투표)** 후 적용·검증
  - ✅ **정합성**: Broadcast(VOTE_UPDATE/PLAYER_ELIMINATED/GAME_ENDED)·Server Action 응답에 개별 voter→target 매핑·role·session_token 미포함(집계 count만)
  - ⚠️ **후속 백로그**: play 페이지 3중 room 채널 구독 통합(useGameChat/useGameVotes/탈락구독), phase 전환 실시간 동기화(Task 013)

  ### 테스트 체크리스트
  - [x] 투표 후 다른 참가자로 변경 투표가 가능한가 (1인 1표 유지) _(SQL: voter 행 1건 유지)_
  - [x] 진행자 화면에 실시간 투표 집계와 진행률이 표시되는가
  - [x] 생존자 전원이 투표하면 [조기 종료] 버튼이 활성화되는가
  - [x] 투표 마감 후 최다 득표자가 탈락 처리되는가 _(is_alive=false + 시스템 메시지)_
  - [x] 탈락 처리 후 해당 플레이어의 투표 버튼이 비활성화되는가 _(본인 탈락 즉시 반영)_
  - [x] 동률 시 진행자 수동 선택 모달이 표시되는가
  - [x] 개별 투표가 anon 직접조회/broadcast 프레임에 노출되지 않는가 _(REST 401 + 원시 WebSocket 프레임 실증)_

- **Task 012: 밤 행동 시스템 구현** ✅ - 완료 (auto-dev · 무차별 UI + 조사 격리)
  - ✅ 밤 행동 Server Action `submitNightAction(token, targetId)` — 밤·생존·권한(canPerformNightAction) **서버 최종 검증**, 역할→action_type 매핑, game_night_actions UPSERT(onConflict room_id,phase_number,actor_id). game_night_actions는 anon 완전 차단(RLS 정책 0개)
  - ✅ 역할별 행동 처리 (**UI 외형 전원 동일 — actionLabel "밤 행동" 고정·canAct(boolean)만**, 실제 동작만 권한자)
    - 이단 대장→`kill`, 목사님→`investigate`, 권사님→`protect`. 그 외(장로님·성도·일반 이단)는 canAct=false no-op(외형 동일)
    - 권한 없는 역할의 밤 행동 시도는 서버가 거부("밤에 할 수 있는 행동이 없습니다")
  - ✅ 목사님 조사 결과 — 대상 `isHeretic`이면 "이단"(위장 없음: 이단 대장도 "이단"), 그 외 "성도". **`submitNightAction` 동기 응답으로 목사님 본인에게만**(Sonner 토스트) — DB·broadcast·타인에게 절대 미기록/미노출
  - ✅ 진행자 밤 행동 완료 현황 `getNightActionStatus(roomId, pin)` (PIN 게이트, 실제 권한자 기준) + NIGHT_ACTION_UPDATE 구독 재조회
  - ✅ 밤 결과 처리 Server Action `resolveNight(roomId, pin)` (진행자 [밤 결과 처리])
    - **보호 대상 == 제거 대상이면 제거 무효**(상쇄) → "밤 사이 아무도 제거되지 않았습니다"
    - 제거 대상 `is_alive→false` + 시스템 메시지("밤 사이 ○○님이 이단 세력에 의해 제거되었습니다") + 승리 조건 체크 (Task 011 `resolveElimination`/`evaluateWinner` 재사용, reason='night'로 문구 분기)
    - PIN 재검증·밤 상태 가드. status는 night 유지(밤→낮 전환은 Task 013 소관). 중복 처리는 멱등 가드(resolveElimination is_alive) + admin nightResolved 클라 가드
  - ✅ NIGHT_ACTION_UPDATE broadcast는 집계(completedCount/total)만 — role/대상/조사결과 미포함
  - ⚠️ **후속 백로그**: resolveNight 서버측 phase 처리 마커로 완전 멱등화(현재 admin 클라 가드·Task 013 전환 시 자연 해결), resolveNight no-op 재호출 응답 eliminatedId 정확도, useGameNight 미사용 집계 상태 정리

  ### 테스트 체크리스트
  - [x] 이단 대장의 제거 행동만 game_night_actions에 저장되고, 일반 이단의 제거 시도는 거부되는가 _(raw fetch 우회 시도도 서버 거부·DB 미기록)_
  - [x] 일반 이단·장로님·성도의 밤 행동 패널 외형이 권한자와 동일하게 보이는가 (무차별 UI) _(6역할 스크린샷 비교)_
  - [x] 권사님 보호 대상과 이단 대장 제거 대상이 같을 때 제거가 무효화되는가
  - [x] 목사님이 이단·이단 대장을 조사할 때 모두 "이단입니다"로 반환되는가 (위장 없음)
  - [x] 목사님이 선 팀(성도·장로님·권사님)을 조사할 때 "성도입니다"로 반환되는가
  - [x] 조사 결과가 목사님에게만 표시되는가 _(DB/broadcast/anon 직접조회 3중 격리 실증)_
  - [x] 밤 행동 완료 후 진행자 대시보드에 완료 현황이 표시되는가

- **Task 012-1: 밤 행동 확정 UX 개선 (1회 제한 하드 락 + 선택→확정 2단계)** ✅ - 완료 (auto-dev · 브랜치 auto/night-action-confirm)
  > F010 스펙 보강 반영. 밤 행동(이단 대장 제거·목사님 조사·권사님 보호)을 "클릭 즉시 실행"에서 "대상 선택(하이라이트) → 별도 확정 버튼"의 2단계 UX로 전환하고, 페이즈당 1회 확정 후 다음 밤까지 하드 락을 건다(3개 역할 동일 적용).
  - ✅ 문제: 기존 `submitNightAction`이 `game_night_actions`에 `.upsert(onConflict: room_id,phase_number,actor_id)`로 저장해, 같은 밤 안에서 몇 번이든 대상을 바꿔 재호출 가능했음. 목사님 조사 결과가 매번 토스트로 노출되어 사실상 한 밤에 여러 명 조사 가능(밸런스 문제, qa 중 발견)
  - ✅ `lib/game/actions.ts`의 `submitNightAction`: 사전 `SELECT`(빠른 실패) + `.insert(...)`로 교체해 기존 `unique(room_id, phase_number, actor_id)` 제약(스키마 변경 없이 재사용)을 실제 하드 락으로 활용. Postgres `23505`(unique_violation, 사전조회 이후 동시요청의 최종 방어선) 시 "이미 이번 밤 행동을 확정했습니다. 다음 밤까지 변경할 수 없습니다" 반환 — **DB 레벨에서 실제로 우회 불가함을 qa-tester가 UNIQUE 제약으로 실증**
  - ✅ 신규 `getMyNightActionStatus(token)` Server Action — 본인이 이번 phase에 이미 확정했는지 + (목사님 조사였다면) 그 결과를 재조회. `getVoteState`(낮 투표, 동일 패턴 선례)와 동일하게 "세션 무효 시 null" 컨벤션. investigate 판정은 `isHeretic(target?.role ?? null)`로 명시적 정규화
  - ✅ `components/game/ActionPanel.tsx`: 대상 클릭이 로컬 `selectedId` state로 하이라이트만 하도록 변경, 하단에 별도 확정 버튼(`min-h-11`) 추가. `locked`/`lockedTargetId`/`lockedTargetNickname`/`investigationResult` prop으로 확정 후 상태와 조사 결과를 패널 안에 지속 표시(토스트는 1회성이라 놓치면 재확인 불가하던 문제 해결). role은 여전히 이 컴포넌트에서 참조하지 않는다(무차별 UI 유지)
  - ✅ `lib/game/hooks/useGameNight.ts`: `phaseNumber`(로딩 중엔 `null`)를 받아 마운트/phase 변경/네트워크 복구(recoveryKey) 시 `getMyNightActionStatus`로 잠금 상태를 복원(`useGameVotes`의 `myVote` 복원과 동일 패턴). `phaseNumberRef`로 확정 응답의 stale closure(확정 직후 phase가 바뀌는 경합)를 가드 — 응답 시점 phase가 현재와 다르면 로컬 상태 반영을 스킵
  - ✅ `app/game/play/page.tsx`: 기존 `nightActionTargetId` 로컬 state 제거(단일 소스는 `useGameNight`), `ActionPanel` 연결부를 `onConfirm`/`locked`/`lockedTargetId`/`lockedTargetNickname`/`investigationResult`로 교체. 닉네임은 생존자만 담긴 `aliveOthers`가 아닌 전체 `players`에서 조회해 **밤 사이 대상이 탈락해도 "확정됨" 문구가 빈칸이 되지 않도록** 처리(code-reviewer 중간 지적 반영)
  - ✅ `useGamePhase`의 `phaseNumber`가 `0`(초기값)→실값으로 바뀌는 전환에서 `useGameNight`가 잠금 상태를 순간 리셋했다가 재조회하는 깜빡임을 `loading` 플래그로 가드(로딩 완료 전엔 `phaseNumber: null`을 넘겨 effect 자체를 skip)
  - ✅ 이 규칙(선택→확정, 페이즈당 1회 잠금)은 이단 대장(제거)·목사님(조사)·권사님(보호) **3개 역할 모두에 동일 적용** — 서버·클라이언트가 역할을 구분하지 않아 무차별 UI 원칙과 충돌하지 않음
  - ✅ 마이그레이션 불필요 — 기존 `unique(room_id, phase_number, actor_id)` 제약을 그대로 활용
  - ✅ `resolveNight`/`getNightActionStatus`(진행자 대시보드)는 저장된 행을 읽기만 하므로 무영향(회귀 없음, qa-tester가 diff 없음으로 재확인)
  - 📝 **범위 밖 발견(회귀 아님, 백로그)**: 진행자 대시보드의 밤 행동 완료 체크리스트가 낮→밤 전환 직후 잠시 이전 밤 상태를 보여주다 첫 확정 시에야 갱신됨 — `app/game/admin/page.tsx`의 `loadNightStatus` 재조회 effect가 `phaseNumber`를 deps에 포함하지 않는 기존(이번 브랜치 미수정) 이슈

  ### 테스트 체크리스트
  - [x] 대상 선택 후 확정 버튼을 눌러야만 서버에 제출되는가 (클릭만으로 즉시 제출되지 않는가) _(네트워크 요청·game_night_actions 행 생성 시점으로 실증)_
  - [x] 확정 후 같은 밤에 다른 대상을 선택/재확정할 수 없는가 (버튼 비활성 + 서버 직접 호출도 거부) _(UNIQUE 제약으로 DB 레벨 실증)_
  - [x] 새로고침 후에도 확정 상태와 조사 결과가 그대로 복원되는가
  - [x] 다음 밤(phase_number 증가)에 잠금이 해제되고 선택이 초기화되는가 _(phase_number별 별도 행 생성 SQL 확인)_
  - [x] 이단 대장 제거·권사님 보호도 목사님과 동일한 잠금 규칙·동일 UI 문구를 쓰는가 (조사 결과 문구만 값 유무로 자연 분기, 무차별 UI) _(3역할 실측 비교)_
  - [x] 진행자 대시보드의 밤 행동 완료 현황(`getNightActionStatus`)과 `resolveNight` 처리가 기존과 동일하게 동작하는가 (회귀 없음)

- **Task 013: 페이즈 전환 및 승리 조건 구현** ✅ - 완료 (auto-dev · end-to-end 완성)
  - ✅ 페이즈 전환 카운트다운 (F017): `startPhaseTransition(roomId, pin, nextStatus)` (PIN 재검증) → `transition_to`+`transition_at`(now+10초) → SCHEDULED broadcast. 전 클라 `transition_at` 기준 동기 10초 카운트다운(PhaseBanner). `cancelPhaseTransition`(PIN) → transition_* null → CANCELLED broadcast
  - ✅ 페이즈 전환 확정 `commitPhaseTransition(roomId)` — **PIN 없이** transition_at 경과+transition_to 설정 시에만, **조건부 UPDATE(`.not(transition_to,is,null)`)로 멱등**(여러 클라 동시 호출에도 첫 호출만 부작용) → status day↔night, 밤→낮에 phase_number 증가, transition_* 초기화, 시스템 메시지 자동 발송, PHASE_CHANGED broadcast. **진행자 이탈에도 전환 보장**(어느 클라든 경과 시 호출)
  - ✅ 승리 조건 — `evaluateWinner`(Task 011 재사용): 선 팀=이단 전멸, 악 팀=생존 이단≥성도. 충족 시 status='ended'+winner+GAME_ENDED broadcast. **이미 ended면 재판정·재브로드캐스트 안 함**(조건부 update `.neq(ended)`로 GAME_ENDED 1회만 — 종료 후 오버레이 강제 재오픈 방지) + transition_* 정리
  - ✅ 전원 게임 종료 결과 화면 — `getGameResult(roomId)`는 **status='ended'에서만** 전원 닉네임+역할 공개(진행 중 호출 시 null — 역할 유출 차단). play 종료 오버레이에 전원 역할 그리드, winner/resultOpen 분리(닫아도 종료 상태 고정)
  - ✅ 실시간 status 반영 — `getRoomState`(공개 스냅샷·role 없음) + PHASE_* Broadcast 구독(`useGamePhase`). play/admin이 마운트 스냅샷+델타로 실시간 페이즈 전환(낮=투표·전체채팅 / 밤=비밀채널·밤행동 자동 전환)
  - ✅ 진행자 수동 탈락 `manualEliminate(roomId, pin, targetId)` (PIN·**day/night 가드**·resolveElimination reason='manual')
  - ✅ 게임 리셋 `resetGame(roomId, pin)` — votes/night_actions/messages 삭제 + players(role=null, is_alive=true) + room(waiting/phase0/winner null) → GAME_RESET broadcast → play는 /game/waiting 이동. **참가자 레코드 유지**(행사 재시작 시 닉네임 재입력 불필요)
  - ✅ **보안/정합 수정**: `verifyAdminPin`이 `getOrCreateActiveRoom`(ended 제외)으로 방을 재조회해 **게임 종료 후 리셋/진행자 액션이 PIN 불일치로 영구 실패**하던 치명 결함(qa-tester 발견)을 `verifyAdminPin(pin, roomId?)`로 해당 방 직접 검증하도록 수정(9개 PIN 액션 일괄)
  - ⚠️ **후속 백로그**: resetGame RPC 원자화, RoomState.transitionTo 타입 좁히기, PhaseBanner lazy init 초기 플리커
  - ⚠️ **선행 완료로 해소된 백로그**: play 페이지 phase 전환 실시간 동기화(Task 011 백로그) · Task 012 nightResolved/투표집계 phase별 초기화 — 이번 useGamePhase 도입으로 해결

  ### 테스트 체크리스트
  - [x] 진행자가 페이즈 전환 시작 시 모든 참가자 화면에 10초 카운트다운이 동기화 표시되는가 _(다중 클라 실측)_
  - [x] 카운트다운 중 진행자가 [전환 취소] 시 전원 화면에서 전환이 중단되는가
  - [x] 카운트다운 완료 후 모든 참가자 화면이 동시에 갱신되는가 _(커밋 멱등 — 시스템 메시지 1건)_
  - [x] 이단(이단 대장 포함) 전원 탈락 시 선 팀 승리 화면이 표시되는가
  - [x] 생존 이단 수 ≥ 생존 성도 수 조건 충족 시 악 팀 승리 화면이 표시되는가
  - [x] 게임 종료 화면에서 모든 역할이 공개되는가 _(진행 중 getGameResult는 null — 미공개 실증)_
  - [x] 게임 리셋 후 대기실에서 새 게임을 시작할 수 있는가 _(리셋→waiting→시작→역할 재배분)_

- **Task 013-1: 참가자 접속 관리 및 강퇴 기능 구현** ✅ - 완료 (auto-dev · F019/F020 · 브랜치 auto/game-presence-kick)
  - ✅ `lib/game/hooks/useGamePresence.ts` — Supabase Realtime Presence 구독 훅
    - ✅ 참가자가 자기 화면(대기실·게임)에서 본인을 Presence에 track(key=playerId, 페이로드는 playerId만 — role/token 미포함). 진행자는 참가자 레코드가 없어 track 없이 읽기만 함
    - ✅ 참가자별 온라인/오프라인 상태 파생 (Presence sync/leave 기반). **접속은 "연결이 살아있는가"라는 실시간 신호이므로 DB 폴링(last_seen_at 하트비트)보다 Realtime Presence를 단일 소스로 채택** — 끊김 즉시 leave, 무(無) DB write. `game_players.last_seen_at` 컬럼은 미사용(향후 서버측 폴백 필요 시 활용)
  - ✅ 대기실(PlayerCard `isOnline`)·진행자 대시보드(접속 컬럼)에 접속 상태 배지 연동 (F020). play 화면도 track만 수행해 게임 중에도 진행자 화면에 온라인 반영
  - ✅ 강퇴 Server Action `kickPlayer(roomId, pin, targetId)` — PIN 게이트 + 대상 UUID/방 일치 검증 + 방 상태 분기:
    - 대기실(waiting): **Task 013-3의 `removePlayerFromRoom` 재사용**(game_players DELETE + `PLAYER_LEFT` broadcast → 전원 목록 실시간 제거). 본인이 강퇴되면 대기실 화면이 self-check로 세션 정리 후 입장 화면으로
    - 진행 중(day/night): `resolveElimination(reason='kick')`로 `is_alive=false` + 시스템 메시지("○○님이 진행자에 의해 퇴장되었습니다") + `PLAYER_ELIMINATED` broadcast + 승리 조건 재검사 (수동 탈락과 동일 메커니즘, 사유만 구분 — 진행 중 DELETE는 FK·승리판정 붕괴라 금지)
    - 종료(ended): 거부
  - ✅ 진행자 권한 검증 — `verifyAdminPin(pin, roomId)` 통과자만 강퇴(참가자는 남을 강퇴 불가). admin 더미 `handleKick` 제거 → 실연결(확인 문구 상태별 구분·탈락자 버튼 비활성)
  - ✅ 멱등: 이미 없는/탈락한 대상 강퇴는 `resolveElimination` is_alive 가드로 중복 부작용 없음. 방어적으로 `resolveElimination` UPDATE에 `room_id` 필터 추가
  - ⚠️ **QA 환경 제약**: 이 세션 Playwright MCP 부재 → qa-tester가 dev 서버 Server Action raw 호출 + 실제 Realtime WebSocket 구독으로 **서버/보안 로직 5항목 PASS**(대기실 DELETE+PLAYER_LEFT / 잘못된 PIN 거부 / 진행 중 is_alive+시스템메시지+PLAYER_ELIMINATED / 멱등 / 대상 검증). **Presence 배지 UI(온라인/오프라인 실시간 표시)는 브라우저 필요 → Task 014로 이관 검증**

  ### 테스트 체크리스트
  - [x] 참가자 접속 시 진행자 화면에 온라인 배지가 표시되는가 _(Task 014 실브라우저 검증: 실접속=온라인, 미접속 더미=오프라인 구분)_
  - [x] 참가자 연결 종료(탭 닫기) 시 오프라인 배지로 전환되는가 _(Task 014 실브라우저 검증)_
  - [x] 대기실에서 강퇴 시 대상이 목록에서 즉시 제거되는가 _(DELETE + player_left 프레임 실측)_
  - [x] 게임 중 강퇴 시 대상이 탈락 처리되고 승리 조건이 재검사되는가 _(is_alive=false + 시스템 메시지 + player_eliminated + winner 재판정 실측)_
  - [x] 진행자가 아닌 참가자는 강퇴를 실행할 수 없는가 (권한 거부) _(잘못된 PIN {ok:false} + DB 미변경 실측)_

- **Task 013-3: 참가자 대기실 자발적 퇴장 구현** ✅ - 완료 (auto-dev · F021)
  > 대기 중(`status='waiting'`) 참가자가 **본인 세션으로 스스로 퇴장**하는 기능(F021). 게임 시작(day/night) 후 이탈은 범위 밖(진행 중 DELETE는 FK·승리 판정을 깨뜨림 — 서버가 차단). **강퇴(Task 013-1)와 DELETE+`PLAYER_LEFT` 메커니즘 공유**.
  - ✅ `lib/game/realtime.ts` — `GAME_EVENTS.PLAYER_LEFT`(`"player_left"`) + `PlayerLeftPayload{ playerId }`(role/token 미포함)
  - ✅ `lib/game/actions.ts`:
    - (내부·공유) `removePlayerFromRoom(supabase, roomId, playerId)` — `game_players` DELETE + `PLAYER_LEFT` broadcast. **Task 013-1 대기실 강퇴가 재사용**
    - (export) `leaveGame(token)` — `getSenderContext` 본인 확인(없으면 멱등 `{ok:true}`) → **`status='waiting'` 가드**(진행 중 거부) → 본인 레코드만 삭제. **본인 session_token 인증**(타인 제거 불가)
    - `startGame` 보강 — 역할 배정 UPDATE 행수 검증: 스냅샷(getRoomPlayers) 이후 참가자가 이탈(자발적 퇴장·강퇴)해 배분표 총원과 어긋나면 day 전환을 중단("참가자 구성이 변경되었습니다. 다시 시작해주세요"). **TOCTOU 레이스로 인한 승리 판정 왜곡 방지**(재시작으로 복구)
  - ✅ `app/game/waiting/page.tsx` — [나가기] 버튼(`variant="outline"`·confirm·pending). 성공 시 `clearSession()`→`/game`, 게임 시작됨(에러 "시작") 시 `/game/play`, 그 외 에러는 대기실에 머무르며 문구 표시. `PLAYER_LEFT` 구독으로 목록 filter 제거
  - ✅ `app/game/admin/page.tsx` — `PLAYER_LEFT` 구독으로 `players` filter 제거 + `onlineIds` 정리(진행자 화면 실시간 반영)
  - ✅ 재사용: `useGameSession.clearSession`, `getSenderContext`, `getPlayerBySession` null 자동복원(재접속 시 입장 폼 복귀), `broadcastToRoom`+`roomChannel`. 스키마 변경 없음
  - ✅ **정합성/보안**: `status='waiting'`에서만 DELETE · 본인만 삭제 · 멱등 · PLAYER_LEFT 페이로드에 secret 없음. code-reviewer 지적(TOCTOU·클라 에러 미구분) 반영
  - ⚠️ **QA 환경 제약**: 이 세션에 Playwright MCP 부재 → qa-tester가 **실제 dev 서버 Server Action raw 호출 + 실제 Realtime WebSocket 구독**으로 서버·보안 로직을 실증 검증(아래 핵심 7항목 PASS). **브라우저 화면전환·콘솔에러·startGame 레이스 재현은 미확인** → Task 014(통합 테스트)에서 Playwright로 마저 확인 권장

  ### 테스트 체크리스트
  - [x] 대기실 [나가기] 시 본인 세션이 정리되고 입장 화면으로 복귀하는가 (localStorage 토큰 제거) _(서버 로직·세션 정리 로직 확인 · 화면전환은 Playwright 부재로 미관측)_
  - [x] 나간 참가자가 다른 참가자·진행자 목록에서 실시간으로 제거되는가 (PLAYER_LEFT) _(실제 WebSocket으로 player_left {playerId} 도달 실증)_
  - [x] 퇴장 후 같은 닉네임으로 재입장이 가능한가 (정원·닉네임 회복)
  - [x] 게임 시작(day) 상태에서 `leaveGame` 직접 호출 시 거부되고 DB가 변경되지 않는가 _(raw 호출 실증)_
  - [x] 남의 session_token으로 타인을 제거할 수 없는가 (본인만 삭제) _(raw 호출 실증)_

- **Task 013-2: 세션 재접속·이어하기 완성** ✅ - 완료 (auto-dev · 브랜치 auto/game-resume)
  > 이탈(화면 잠금·백그라운드·네트워크 끊김·탭 종료·새로고침) 후 복귀한 참가자가 **닉네임 재입력 없이 게임에 매끄럽게 이어붙는** 경험을 완성한다. Task 008에서 기본 라우팅 게이트(지각 입장 차단·상태 기반 이동)는 이미 확립됐고, 이 태스크는 play 화면이 실데이터가 된 뒤(Task 010~013) **내 실제 역할·현재 페이즈·채팅 이력까지 복원**하는 부분을 마무리한다. (설계 원칙: Phase 3 상단 "실시간·재접속 설계 원칙" 참조)
  - ✅ **재접속의 실시간 델타 복원은 이미 emergent하게 동작**: 채팅/투표/밤/페이즈 이력은 각 화면의 스냅샷+구독 훅(useGameChat·useGameVotes·useGameNight·useGamePhase)이 마운트 시 서버 스냅샷을 재조회하므로 별도 작업 불필요(설계 원칙의 결실). 라우팅 게이트도 Task 008에서 확립됨. 이번 태스크는 **흩어져 있던 "내 역할·내 생존" 1회성 복원 조회를 통합**하고 **관전 모드를 명시화**하는 것이 핵심
  - ✅ `getResumeState(token)` Server Action — 재접속 스냅샷 `{status, phaseNumber, isAlive, (내)role}`을 한 번에 반환. getSenderContext(session_token으로 본인 1건 조회) 재사용 → **role은 본인 것만**(남의 역할 미노출 구조적 보장). 기존 별도 조회 `getMyRole`을 이 함수로 통합하고 getMyRole은 제거
  - ✅ 공용 `useGameResume(sessionToken)` 훅 — getResumeState를 감싸 마운트 시 1회 조회. play 화면이 이를 채택해 role·isAlive를 단일 소스에서 복원. status/phaseNumber도 계약에 포함해 향후 라우팅 게이트 소비자가 재사용 가능(현 play 화면은 실시간 status를 useGamePhase로 관리하므로 직접 사용 안 함). **라우팅은 Task 008의 per-page 게이트를 유지**(회귀 방지 — 기존 동작 정상)
  - ✅ `status='ended'` 복귀 → 게임 종료 결과 화면: **기존 safety net으로 이미 동작**(useGamePhase 초기 스냅샷이 ended면 getGameResult로 전원 역할 공개 오버레이 표시). Task 006 오버레이 재사용
  - ✅ 탈락자 복귀 → 관전 모드: resume.isAlive(이탈 중 탈락했어도 정확)로 selfAlive 판정 → 전 입력 비활성. **명시적 "관전 모드" 배너 추가**(왜 입력이 막혔는지 안내, 역할 미노출 — 무차별 UI 유지)
  - ✅ 저수준 소켓 재연결(백그라운드 복귀 시 Realtime 재구독)은 Task 015와 연계(범위 밖 유지)
  - ⚠️ **QA 환경 제약**: 이 세션 Playwright MCP 부재 → qa-tester가 getResumeState를 실행 검증(**4/4 PASS**: 정상 복원·**역할 격리(본인 것만)**·무효 토큰 null·탈락자 isAlive:false). **새로고침 화면 복원·관전 배너 노출·페이즈 동기화 등 브라우저 UI 재접속 시나리오는 Task 014(통합 테스트)로 이관 검증**

  ### 테스트 체크리스트
  - [x] 게임 중 새로고침/재접속 시 닉네임 재입력 없이 현재 화면(낮/밤·내 역할·페이즈)으로 복원되는가 _(Task 014 실브라우저 검증: 새로고침 후 /game/play·현재 페이즈 복원)_
  - [x] 이탈 중 페이즈가 바뀌었어도 복귀 시 최신 상태로 동기화되는가 (스냅샷 재조회) _(Task 014 실브라우저 검증)_
  - [x] 게임 종료 후 재접속 시 결과 화면이 보이는가 _(Task 014 실브라우저 검증: 종료 오버레이·전원 역할 공개)_
  - [x] 탈락자가 재접속 시 관전 모드(입력 불가)로 들어가는가 _(getResumeState isAlive:false 실증 + 관전 배너·selfAlive 게이팅 구현)_
  - [x] 재접속 시에도 내 역할 외 다른 참가자 역할이 절대 노출되지 않는가 _(getResumeState 역할 격리 실행 검증 — 서로 다른 토큰이 각자 role만 반환)_

- **Task 014: 전체 플로우 통합 테스트** ✅ - 완료 (auto-dev · Playwright E2E · 브랜치 auto/game-e2e-test)
  - ✅ Playwright MCP를 사용한 E2E 테스트 시나리오 실행 (실브라우저 2~3 컨텍스트 + 더미 시드로 10명 구성)
  - ✅ 전체 게임 플로우 검증 (입장 → 대기 → 역할 확인 → 낮[전체·1:1 채팅·투표] → 밤[비밀 채널·밤 행동] → 승리)
  - ✅ 동시 접속 10명 시나리오 실시간 동기화 검증 (역할 배분 SQL 확인)
  - ✅ 엣지 케이스 처리 확인 (채널 격리·탈락자 제약·강퇴·재접속·관전 모드)
  - ✅ **결과: 8/8 체크리스트 PASS · 콘솔 에러 0 · 무차별 UI 위반/역할·토큰 유출 없음.** 013-1(접속 배지·강퇴)·013-2(재접속·관전 배너)·013-3(대기실 퇴장)에서 이관한 브라우저 UI 검증도 여기서 모두 통과
  - 📝 테스트 하네스 노트: Playwright 다중 탭은 동일 브라우저 프로필의 localStorage를 공유하므로, 참가자별 세션은 탭 선택 → 토큰 고정(localStorage.setItem) → 리로드로 격리해야 함(실사용자는 서로 다른 기기라 프로덕션 무관)

  ### 테스트 체크리스트
  - [x] 참가자 10명 + 진행자 1명 전체 플로우 실행 가능한가 _(더미8+실2 · 낮·밤·승리 종료 오버레이까지)_
  - [x] 채팅 메시지가 모든 클라이언트에 500ms 이내 전달되는가 (public/heretic/council/dm 전 채널) _(전달+격리: heretic/council/dm 제3자 미수신 확인)_
  - [x] 페이즈 전환 카운트다운·취소, 투표 조기 종료가 다중 클라이언트에서 정상 동작하는가 _(진행자 조작→참가자 동기)_
  - [x] 진행자 강퇴 시 대상이 목록/게임에서 제거(대기실) 또는 탈락 처리(게임 중)되는가 _(대기실=alert+입장화면 복귀, 게임 중=관전 전환)_
  - [x] 오프라인 참가자가 진행자 화면에 오프라인 배지로 표시되는가 _(실접속=온라인, 미접속 더미=오프라인)_
  - [x] 브라우저 탭 전환 후 돌아왔을 때 Realtime 재연결이 되는가 _(새로고침 후 상태 복원·페이즈 유지)_
  - [x] 탈락자가 투표/행동 패널/1:1 채팅을 사용할 수 없는가 _(탈락 즉시 전 입력 disabled·무차별 UI 유지)_
  - [x] 모바일 Safari, Chrome에서 정상 동작하는가 _(390×844 뷰포트 레이아웃 정상)_

---

### Phase 4: 고급 기능 및 최적화 ✅

- **Task 015: 모바일 UX 최적화** ✅ - 완료 (auto-dev · 브랜치 auto/mobile-ux)
  - ✅ 터치 영역 최적화 — 게임 화면 주요 버튼·탭 트리거·투표/행동 대상에 `min-h-11`(44px) 적용, shadcn 전역 파일(components/ui/*)은 미수정. 390×844 실측 전 항목 ≥44px
  - ✅ 채팅 입력 시 모바일 키보드 레이아웃 대응 — ChatPanel 목록을 실동작하는 내부 스크롤(`h-[38dvh] min-h-48`)로 교체(기존 `h-72 flex-1`은 부모 높이 부재로 죽은 코드였음), 입력바 `shrink-0`, viewport `interactiveWidget: "resizes-content"`. 390×844 초기 화면에서 입력창+전송 버튼 완전 노출(실측 bottom 794.7≤844)
  - ✅ PWA — `app/manifest.ts`(standalone·start_url /game·lang ko) + 아이콘 192/512(any+maskable, `scripts/generate-pwa-icons.mjs`가 의존성 없이 순수 Node zlib로 PNG 직접 인코딩, `npm run generate:icons`) + apple-touch-icon(iOS) + `html lang="ko"` + 스타터킷 잔재 title/description 교체. **`proxy.ts` matcher에 `manifest.webmanifest` 예외 추가** — 비로그인 참가자(주 사용자)가 307 리다이렉트로 manifest를 못 받던 문제 해결(QA에서 발견)
  - ✅ Realtime 재연결 — 신규 `useNetworkRecovery` 훅(online/offline/visibilitychange→visible 시 recoveryKey 증가)을 데이터 훅 6종(chat/votes/night/phase/presence/resume)의 effect deps에 주입해 백그라운드/오프라인 복귀 시 스냅샷 재조회+채널 재구독. waiting/admin 참가자 목록은 "최초=병합, 복구=전체 교체" 분기로 놓친 PLAYER_LEFT 반영. **stale 스냅샷 race 가드**(fetch 중 broadcast 선반영 시 stale 적용 대신 1회 재조회 — code-reviewer 높음 지적 반영) + **대기실 복구 시 자기 강퇴 감지**(목록에 본인 부재 → alert+세션 정리+/game 복귀)
  - ✅ 오프라인 상태 감지 + 재연결 안내 — sonner 토스트(오프라인 에러/재연결 성공, 루트 Toaster 재사용). visible 복귀는 토스트 없이 조용히 재조회
  - 📝 백로그: 동일 room topic에 페이지당 6~8개 독립 채널이 recoveryKey마다 일괄 재구독됨(소규모 인원에선 무해, 채널 공유 리팩토링은 추후) · admin 투표 tally는 세션 토큰이 없어 복구 재조회 수단 부재(기존 아키텍처 한계)

  ### 테스트 체크리스트 (qa-tester 최종 4/4 PASS · 초회 5/8→manifest 307·채팅 잘림 수정 후 재검증)
  - [x] 390×844에서 주요 터치 대상이 44px 이상인가 _(입장·나가기·전송·탭 3종·투표 버튼 9종 실측)_
  - [x] /manifest.webmanifest이 비로그인 200 + 아이콘 로드 + 콘솔 Manifest 에러 0인가
  - [x] 채팅 입력창이 초기 화면에 완전 노출되고 목록은 내부 스크롤인가 (가로 스크롤 없음)
  - [x] 오프라인 전환 시 토스트, 복귀 시 재연결 토스트가 뜨는가
  - [x] 오프라인 중 놓친 변경(SQL 직접 INSERT·본인 강퇴)이 online 복귀 시 스냅샷 재조회로 복원되는가
  - [x] 무차별 UI 회귀 없음 (이단 대장 vs 목사님 화면 구조 동일 — 정식 검증은 Task 017)

- **Task 016: 배포 및 운영 준비** ✅ - 완료 (auto-dev · 브랜치 auto/deploy-ops-prep)
  - ✅ **세션 만료 처리(24시간)** — `getOrCreateActiveRoom`(`lib/game/actions.ts`)이 `status==='waiting'`이고 `created_at`이 `SESSION_EXPIRY_MS`(24h) 넘게 지난 방을 발견하면 참가자 목록을 정리한다. **재실행(무한 루프) 방지**: `created_at`을 지금 시각으로 먼저 UPDATE해 만료 조건을 해제한 뒤에만 `game_players`를 DELETE — created_at 갱신이 실패하면 아무 것도 지우지 않고 기존 방을 그대로 반환(다음 요청에서 재시도), 삭제만 실패해도 재실행 루프는 이미 막혀 있어 무해. **day/night 진행 중인 방은 절대 건드리지 않음**(`game_votes`/`game_night_actions`/`game_messages`는 waiting 상태엔 구조적으로 존재할 수 없어 지울 것이 없다는 점에 착안해 범위를 좁힘). **PIN은 재발급하지 않고 유지**(같은 진행자가 다음 행사에도 같은 PIN 사용 가능, 재발급 시 새 PIN을 알릴 방법이 없어 진행자가 스스로 잠기는 위험 제거).
  - ✅ **진행자 대시보드 QR코드** — `qrcode` 패키지(순수 로컬 렌더링, 네트워크 호출 없음) 도입. `status==='waiting'`일 때 [제어] 탭 최상단에 참가 URL(`{origin}/game`)을 인코딩한 QR + URL 텍스트 표시.
  - ✅ **역할 배분 미리보기** — 신규 Server Action 없이 기존 `getRoleDistribution`(`lib/game/utils.ts`, 순수 함수) 재사용. `canStartGame`일 때 [게임 시작] 버튼 위에 "예상 배분 — 이단 N명 · 이단 대장 1명 · ..." 문구 표시, 인원 미달 시 미노출.
  - ✅ **README 행사 진행 가이드** — URL/QR 공유, 인원 범위(5~20명), PIN 안내, 24시간 세션 정리 동작(대기 상태 전용·PIN 불변·진행 중 게임 무영향) 명시.
  - ✅ **`docs/deployment.md` 신규** — Vercel 대시보드 리포지토리 연결 → 환경변수(`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`/`SUPABASE_SERVICE_ROLE_KEY`) 설정 → Deploy 단계별 절차. **실제 배포(계정 연결·대시보드 조작)는 수행하지 않음** — Vercel 계정 접근이 필요해 자율 에이전트가 대신할 수 없는 영역이라 절차 문서화로 대체, 실제 배포는 사람이 수행.
  - ⚠️ **code-reviewer 1차 리뷰에서 설계 축소**: 최초 구현은 votes/night_actions/messages까지 삭제 + room 전체 UPDATE + PIN 재발급까지 하는 5단계 비원자적 처리였으나, ①부분 실패 시 반환값-DB 불일치로 신규 참가가 영구 차단될 수 있는 치명적 결함 ②day/night 진행 중 게임까지 만료 판정되어 삭제될 위험 ③PIN 재발급으로 정당한 진행자가 스스로 잠길 위험 ④동시 요청 시 PIN 경쟁 상태, 4건이 지적되어 위 최종 설계(대기 상태 전용·PIN 불변·participants만 삭제·created_at 선-갱신)로 전면 재작업.

  ### 테스트 체크리스트 (qa-tester 8개 중 7 PASS, 1 FAIL→README 정정 후 해결)
  - [x] 24h 초과 대기실에 재접속 시 기존 참가자가 정리되고, `created_at` 갱신으로 재실행 루프가 발생하지 않는가 _(연속 2회 입장 실증 — 첫 참가자가 두 번째 입장으로 지워지지 않음)_
  - [x] day/night 진행 중인 방은 24h 초과해도 참가자·투표·메시지가 삭제되지 않는가
  - [x] 만료 리셋 후에도 기존 PIN으로 진행자 대시보드 진입이 되는가(PIN 불변)
  - [x] 대기실 상태에서 QR코드·URL이 정상 렌더(실제 이미지 로드)되는가
  - [x] 최소 인원 충족 시 예상 역할 배분 문구가 표시되고 미달 시 숨겨지는가
  - [x] README/docs/deployment.md 문서가 실제 동작과 정확히 일치하는가 _(초기 README가 "PIN 재발급"으로 잘못 서술 → 정정 완료)_
  - [x] 콘솔 에러 0건
  - [x] 기존 입장·게임 시작·강퇴·리셋 시나리오 회귀 없음

- **Task 017: 역할 무차별 UI 정합성 검증** ✅ - 완료 (auto-dev · qa-tester 실증 검증, 코드 수정 없음)
  - ✅ 정확히 6명 시드(`getRoleDistribution(6)` = 이단1·이단대장1·목사님1·장로님1·권사님1·성도1)로 6개 역할을 전부 확보한 뒤 실제 게임 시작 → 각 역할 session_token으로 실브라우저 접속해 낮/밤 페이즈 종합 검증(Task 012의 밤 행동 패널 부분 검증을 게임 플레이 화면 전체로 확장)
  - ✅ 페이즈 배너·탭 구성(전체 채팅/비밀 채널/1:1) 3종의 개수·라벨·순서·생존 현황 사이드바·역할 카드 모달 레이아웃이 6개 역할 모두 동일(DOM 구조 비교, 내용만 멤버십별로 분기 — 예: 권사님·성도는 비밀 채널에서 "개인 기도 메모" 플레이스홀더, 이단은 이단 채팅, 당회는 당회 채팅)
  - ✅ 메인 화면 어디에도 역할별 색상 테마·배지·아이콘 노출 없음(중립 스타일 유지, 스크린샷 비교로 확인)
  - ✅ 밤 행동 패널(`ActionPanel`)이 권한자(이단 대장·목사님·권사님)·비권한자(이단·장로님·성도) 모두 DOM 구조 동일(선택→확정 2단계 UI 포함, `disabled` 속성만 차이) — Task 012-1(선택→확정 하드 락)이 무차별 UI를 깨지 않았음을 회귀 확인(권사님의 실제 보호 행동이 `game_night_actions`에 정상 기록됨)
  - ✅ 비밀 채널 멤버십 격리 서버 측 재확인(이단 팀 메시지가 같은 시각 당회 채널에 노출되지 않음)
  - ✅ 콘솔 에러·4xx/5xx 없음
  - 📝 **결론**: 기존 구현(`ActionPanel.tsx`/`RoleCard.tsx`/`SecretChannelTab.tsx`/`PlayerCard.tsx`)이 이전 태스크(006/010/012)부터 지켜온 "컴포넌트가 role을 참조하지 않는다" 원칙이 실제 런타임에서도 위반 없이 유지됨을 확인 — 코드 변경 없이 검증만으로 완료

  ### 테스트 체크리스트
  - [x] 비밀 채널 탭이 모든 역할에게 동일한 위치·라벨로 노출되는가 (내용만 분기)
  - [x] 밤 행동 패널이 권한 유무와 무관하게 동일한 외형인가
  - [x] 역할별 색상/배지/아이콘이 메인 화면에 노출되지 않는가
  - [x] 역할 카드 모달이 모든 역할에서 동일한 구조인가
  - [x] 옆 사람 화면을 봤을 때 역할을 식별할 단서가 없는가

- **Task 018: 카카오톡 인앱 브라우저 자동 리다이렉트** ✅ - 완료 (auto-dev · 브랜치 auto/kakao-inapp-redirect)
  - ✅ 배경: 카카오톡으로 공유된 초대 링크(진행자 대시보드 QR코드가 인코딩하는 `${origin}/game` URL 포함)를 탭하면 카카오톡 인앱 브라우저(webview)로 열리는데, 인앱 브라우저는 localStorage 등 일부 브라우저 동작이 불안정해 세션 토큰에 의존하는 이 게임과 충돌할 수 있음. F022 스펙 반영.
  - ✅ 신규 `lib/game/hooks/useKakaoInAppRedirect.ts` — 판정 로직을 용도별로 분리: **`isKakaoInAppBrowser()`**(순수 함수, 호출 시점마다 `navigator.userAgent`를 `/kakaotalk/i`로 실시간 재검사, React state 비의존)는 재접속 게이트처럼 리마운트에도 매번 정확해야 하는 차단 로직에 쓰고, **`useKakaoInAppRedirect()`**(state+effect, 마운트 후에만 true로 전환)는 하이드레이션 안전이 필요한 화면 렌더 분기(입장 폼 vs "브라우저로 이동 중입니다..." 문구)에만 쓴다. 매칭 시 `window.location.href`를 `` `kakaotalk://web/openExternal?url=${encodeURIComponent(현재 location.href)}` ``로 설정 — 카카오톡 자체가 제공하는 공식 스킴(오픈소스 라이브러리 `open-external-browser`가 동일 방식 사용, iOS/Android OS 분기 불필요), 신규 npm 의존성 없이 자체 구현.
  - ✅ `app/game/page.tsx`(입장 허브, `/game` — 카카오 공유 링크·QR코드가 실제로 가리키는 유일한 경로): 화면 렌더는 훅의 state로, **재접속 게이트(`useEffect`의 `router.replace` 차단 조건)는 `isKakaoInAppBrowser()`를 직접 호출**하도록 배선 — 훅의 state에 의존시키면 Server Action 응답 이후 재렌더/리마운트 시 한 프레임 새로 `router.replace`가 먼저 커밋되는 경쟁 상태가 생김(qa-tester 1차 검증으로 실증).
  - ✅ **설계 시행착오 기록**: 최초 구현은 `useState(false)`+effect 단일 방식으로 화면과 게이트를 모두 처리했으나 qa-tester 1차 검증에서 재접속 게이트 경쟁 상태(세션 있는 재접속 사용자가 카카오 웹뷰에서 그대로 `/game/waiting`으로 새는 버그)를 발견 → 매 렌더 동기 재계산 방식으로 1차 수정했으나 이번엔 하이드레이션 불일치(SSR은 항상 false인데 클라이언트 첫 렌더가 곧바로 true를 그림) 콘솔 에러가 새로 생김을 2차 검증에서 발견 → 최종적으로 "차단 로직(동기 순수 함수)"과 "화면 렌더(하이드레이션 안전 훅)"를 분리해 양쪽 요구사항을 동시에 만족시킴(3차 검증에서 5개 항목 전부 통과).
  - ✅ 재귀/루프 위험 없음 — 리다이렉트 성공 후 열리는 외부 브라우저의 UA에는 KAKAOTALK 문자열이 없으므로 재실행돼도 조건이 거짓.
  - ✅ 루트 레이아웃(`app/layout.tsx`)이나 `proxy.ts`/미들웨어는 건드리지 않음 — 문제가 실제로 발생하는 곳은 `/game` 하나뿐이고, 외부 브라우저를 여는 액션 자체는 클라이언트 커스텀 스킴 트리거가 필요해 서버 미들웨어로는 대신할 수 없음.
  - ✅ 안드로이드 `intent://` 이중 트리거, 클립보드 복사 안내 배너 등 추가 방어 로직은 넣지 않음 — 카카오톡 인앱 브라우저 자체에 내장된 "다른 브라우저로 열기" 메뉴가 이미 안전망 역할을 하므로, 이 프로젝트 규모에서는 과설계로 판단해 보류(스킴 실패 시에도 사용자가 완전히 막히지 않음).
  - ✅ DB 마이그레이션 없음(순수 클라이언트 브라우저 감지·리다이렉트).
  - 📝 **참고(회귀 아님, 자동화 환경 제약)**: 헤드리스 브라우저에서는 `kakaotalk://` 스킴 시도 시 "user gesture is required" 브라우저 경고가 남는다 — 실제 카카오톡 앱/모바일 브라우저에서는 발생하지 않는 자동화 테스트 환경 특유의 제약으로 확인됨(qa-tester 3차 검증에서 세션 유무 무관 동일 발생, 하이드레이션 문제와 무관함을 교차 확인).

  ### 테스트 체크리스트 (qa-tester 3라운드 검증, 최종 5/5 PASS)
  - [x] 카카오톡 인앱 브라우저 User-Agent(예: `... KAKAOTALK ...` 포함)로 `/game` 접속 시 `kakaotalk://web/openExternal?url=...`로 리다이렉트가 시도되는가 _(CDP 네비게이션 이벤트로 실제 스킴 요청 발생 확인)_
  - [x] 일반 User-Agent(카카오톡 아님)로 `/game` 접속 시 리다이렉트 시도 없이 입장 허브가 정상 렌더링되는가(회귀 방지)
  - [x] 유효 세션 + 카카오 UA로 접속 시 재접속 게이트가 `/game/waiting`으로 새지 않고 "브라우저로 이동 중입니다..." 상태를 유지하는가 _(`getPlayerBySession` 응답 인위 지연 3회 반복 재현, 새는 프레임 없음 확인)_
  - [x] 카카오 UA 접속 시 React hydration mismatch 콘솔 에러가 없는가 _(2차 QA에서 발견된 회귀, 3차 재설계로 해소 확인)_
  - [x] 일반 UA 콘솔 에러 0건

- **Task 019: 관리자 패널 (PIN 관리 + 데이터 초기화)** ✅ - 완료 (auto-dev · 브랜치 auto/admin-panel)
  - ✅ 배경: 진행자보다 상위 운영자를 위한 도구 부재 — `admin_pin`은 방 생성 시 1회 정해지고 변경·조회 UI가 전무(자동 생성 PIN은 아무도 못 봄), 종료(ended)된 방이 영구 누적(삭제 로직 없음). 별도 관리자 시크릿으로 진입하는 관리자 패널로 해결. F023·F024 반영.
  - ✅ **인증(F023)**: 진행자 PIN과 분리된 `ADMIN_SECRET` 환경변수(서버 전용). `lib/game/actions.ts` 비공개 헬퍼 `isAdminSecretValid(secret)` — **미설정 시 무조건 false**(fail-safe) 먼저 체크 후, `crypto` `sha256`+`timingSafeEqual` **상수시간 비교**(타이밍 사이드채널 방어, code-reviewer 반영). 시크릿은 DB·클라이언트·반환값 어디에도 노출 안 됨.
  - ✅ **진입(F023)**: `app/game/page.tsx`(입장 허브)에 "관리자로 입장" `Dialog`(시크릿 `<Input type="password">`) 추가 → `verifyAdminSecret` 성공 시 `sessionStorage["game_admin_secret"]` 저장 → `/game/manage` 이동. 진행자 `game_admin_ctx`와 동일 신뢰 모델(탭 종료 시 소멸, 매 액션 서버 재검증).
  - ✅ **관리자 패널 페이지(F024)**: 신규 `app/game/manage/page.tsx`(client) — 시크릿 없으면 `/game` 리다이렉트. 섹션: 데이터 현황 / 진행자 PIN 확인·변경(`maxLength=4`·`inputMode=numeric`) / 현재 게임만 초기화(confirm) / 전체 데이터 완전 삭제(2단계 "삭제" 입력 확인) / 종료된 방 정리. sonner 토스트 + 성공 시 현황 재조회, `min-h-11` 유지.
  - ✅ **신규 Server Action(모두 `isAdminSecretValid` 게이트)**: `verifyAdminSecret` / `getAdminOverview`(활성 방 status·adminPin·참가자 수·created_at + 전체/종료 방 수·각 테이블 행 수) / `changeAdminPin`(4자리 숫자 검증 후 UPDATE) / `softResetActiveGame`(공유 헬퍼 `resetRoomToWaiting` 재사용 — 기록 삭제·참가자 유지) / `hardResetAllData`(**삭제 전 활성 방에 GAME_RESET broadcast** → game_rooms 전체 DELETE `.not("id","is",null)` → 자식 CASCADE → 새 waiting 방+새 PIN 반환) / `purgeEndedRooms`(ended 방 DELETE→CASCADE, 삭제 개수).
  - ✅ **admin_pin 노출은 관리자 게이트 뒤에서만**: `getAdminOverview`만 현재 PIN 반환. 기존 `getRoomState`/`getRoomPlayers`의 admin_pin 미포함 원칙 유지(미변경).
  - ✅ **`resetGame` 회귀 없음**: 본문을 `resetRoomToWaiting(supabase, roomId)` 헬퍼로 추출하고 `resetGame`은 PIN 게이트 후 이 헬퍼에 위임 — 시그니처·반환 타입·try/catch 안전망·외부 동작 완전 동일(진행자 대시보드 리셋 그대로).
  - ✅ **범위 준수**: 미들웨어(`proxy.ts`)·루트 레이아웃·DB 스키마·신규 npm 의존성 변경 없음. 진행자 PIN 게이트 액션 시그니처 변경 없음.
  - ✅ **환경변수·문서**: `.env.example`에 `ADMIN_SECRET=` 템플릿(빈 값), `docs/deployment.md`에 필요 환경변수·"≥20자 무작위 문자열(`openssl rand -base64 24`)" 가이드·"하드 리셋/종료방 정리는 되돌릴 수 없고 진행 중 접속자가 즉시 정리됨" 운영 주의 추가.

  ### 테스트 체크리스트 (qa-tester 10/10 PASS)
  - [x] ADMIN_SECRET 설정 후 입장 허브 "관리자로 입장" → 틀린 시크릿 거부, 맞는 시크릿 → /game/manage 진입. 미설정 시 fail-safe 잠금(정적 확인) _(sessionStorage 없이 직접 접근 시 /game 리다이렉트도 확인)_
  - [x] 패널의 "현재 PIN"이 SQL의 game_rooms.admin_pin과 일치하는가
  - [x] PIN 변경 후 새 PIN으로 진행자 입장 성공·옛 PIN 거부, 4자리 아닌 입력 거부되는가
  - [x] 현재 게임만 초기화 시 votes/messages/night_actions 0행, 참가자 레코드 유지(role=null·is_alive=true), room status=waiting인가
  - [x] 전체 데이터 완전 삭제 시 정확히 새 waiting 방 1개+새 PIN, 자식 테이블 전부 0행인가 _(2단계 "삭제" 확인 잠금 동작 포함)_
  - [x] 종료된 방 정리 시 ended 방·자식 CASCADE 삭제되고 활성 방은 무사, 삭제 개수 정확한가
  - [x] 데이터 현황 통계(방/종료방/각 테이블 행 수)가 SQL과 일치하는가
  - [x] lint/typecheck 통과, 콘솔 에러 없음, 관리자 액션 반환값에 시크릿·admin_pin이 의도 외로 새지 않는가 _(네트워크 응답 바디 직접 검사)_

- **Task 020: 게임 운영 개선 5건 (시스템 메시지·진행자 역할 표시·채팅 스크롤·팀원 명단·투표 미마감 경고)** ✅ - 완료 (auto-dev · 브랜치 auto/game-ops-improvements)
  - ✅ 배경: 실제 플레이 중 발견된 게임 운영 개선 5건을 하나의 태스크로 묶음. 이 중 팀원 명단(F025)·투표 미마감 경고(F026)는 신규 기능이고, 나머지 3건은 기존 기능(F013 등)의 버그 수정/미구현 완성. **범위 밖(하지 않음)**: DB 스키마·마이그레이션 변경 없음, 미들웨어·루트 레이아웃 변경 없음, 신규 npm 의존성 없음, `getRoomPlayers`/`getRoomState`의 role·admin_pin 미포함 원칙 유지(role은 신규 진행자 전용 액션에서만), 페이즈 전환 서버 로직(startPhaseTransition/commitPhaseTransition) 미변경.
  - ✅ **code-reviewer 반영**: 높음 1건(ChatPanel이 이미 채워진 비밀/귓속말 탭을 처음 열 때 하단 자동 스크롤이 안 되던 회귀 → `isFirstRunRef`로 첫 마운트 시 무조건 하단 스크롤), 중간 1건(팀원 명단이 실시간 탈락에 미반영 → 기존 `PLAYER_ELIMINATED` 핸들러에서 `teammates`도 함께 patch), 낮음 2건(시스템 메시지 Input `maxLength=500`, `rolesById` 재조회를 게임 시작 1회+recoveryKey로 최소화·리셋 시 초기화) 모두 반영.
  - ✅ **qa-tester 5/5 PASS**: 7탭(진행자+참가자6) 동시 실시간 검증 — 시스템 메시지 낮·밤 전파, 게임 시작 시 역할 자동 표시(스크린 탭 미노출), 버튼 클릭 시 window 스크롤 유지·탭 첫 오픈 시 최신으로 스크롤, 팀원 명단 교차 유출 없음·실시간 탈락 취소선 즉시 반영, 투표 미마감 경고/마감 후 바로 전환/밤→낮 무경고. 콘솔·네트워크 에러 0, 무차별 UI 회귀 없음.
  - **① 시스템 메시지 발송(기존 F013 미구현 완성)**: 진행자 대시보드 "전송" 버튼이 하드코딩 `disabled`(`app/game/admin/page.tsx:857-864`, "데모, 실제 발송 로직 없음")이고 `sendSystemMessage` 서버 액션이 없어 **작동 자체가 안 됨**(낮 페이즈 문제 아님 — system 메시지 렌더는 낮/밤 모두 이미 정상). 신규 `sendSystemMessage(roomId, pin, content)` Server Action 추가(verifyAdminPin 게이트 → 트림·빈값 거부 → `resolveElimination`의 검증된 패턴 재사용: `game_messages`에 `player_id:null, channel:"system"` insert → `ChatMessagePayload`(senderNickname:"시스템")로 `broadcastToRoom(...CHAT_MESSAGE...)`). admin 버튼의 `disabled` 제거 + `handleSendSystemMessage` 연결(성공 시 입력 초기화·토스트).
  - **② 진행자 대시보드 역할 표시(기존 F013 버그)**: `getRoomPlayers`가 role 미조회(무차별 UI 원칙)라 admin `toGamePlayer`가 role을 null 하드코딩(`admin/page.tsx:74-84`) → 제어 탭 역할 컬럼이 항상 "-". 신규 `getAdminRoster(roomId, pin)` Server Action(verifyAdminPin 게이트 → game_players의 id/nickname/role/is_alive 반환, 진행자 PIN 게이트라 role 노출 안전 — 기존 `getNightActionStatus` 선례). admin에 `rolesById` state 추가, `[adminCtx, status, recoveryKey]` effect로 조회(게임 시작=status→day 시 자동 갱신), 제어 탭 표의 역할 셀을 `rolesById[player.id]`로 렌더. **스크린 탭엔 역할 미노출 유지**. ROADMAP Task 009-1 백로그 항목 해소.
  - **③ 채팅 스크롤 버그(순수 UX 수정)**: `ChatPanel`의 `scrollIntoView({block:"end"})`(`components/game/ChatPanel.tsx:36-38`)가 매 렌더 실행되며 window(문서) 스크롤까지 끌어당겨, play 화면에서 버튼 클릭(리렌더) 시 화면이 맨 위로 튐. 수정: 내부 ScrollArea viewport만 직접 스크롤(`viewport.scrollTop=scrollHeight`, window 미개입) + 새 메시지가 실제로 늘었을 때만 + 사용자가 하단 근처일 때만 자동 스크롤(과거 대화 읽는 중엔 안 끌어내림). 3개 탭이 공유하는 ChatPanel 한 곳 수정으로 전부 해결.
  - **④ 팀원 명단 표시(F025 신규)**: 비밀 채널 소속 참가자에게 같은 팀 멤버 명단 표시. 신규 `getTeammates(token)` Server Action(getSenderContext로 본인 role 확인 → isHeretic이면 이단 팀, isCouncil이면 당회, 그 외 none → 같은 방 해당 팀 role만 조회해 `{membership, teammates:[{id,nickname,role,isAlive}]}` 반환, 본인 포함, **요청자 자신의 팀만** 반환해 교차 유출 없음). play 페이지가 sessionToken으로 조회(마운트·recoveryKey)해 `SecretChannelTab`에 prop 전달. `SecretChannelTab`은 membership이 heretic/council이고 명단 있으면 채팅 목록 위에 "우리 팀: 닉네임(역할)…"(탈락자 구분) 렌더, 비소속은 개인 플레이스홀더 그대로 — **탭 제목·설명·레이아웃은 전원 동일 유지(무차별 UI: 내용만 분기)**. `ROLE_LABELS` 재사용.
  - **⑤ 투표 미마감 밤 전환 경고(F026 신규, 클라이언트 전용)**: `handleCloseVoting`가 ok:true(탈락 확정)·`handleResolveTie` 성공 시 `votingResolvedThisPhase` 플래그 true 설정, 새 낮 시작(tally 리셋 effect `admin/page.tsx:179-186`)에서 false 리셋. `handleRequestTransition`에서 `next==="night" && !votingResolvedThisPhase`이면 확인 Dialog("이번 낮 투표를 마감하지 않았습니다. 탈락 처리 없이 밤으로 넘어갈까요?")를 먼저 띄우고 확정 시에만 startPhaseTransition. **서버 변경 없음**(기존 tie-resolution Dialog 재사용).

  ### 테스트 체크리스트 (qa-tester 5/5 PASS)
  - [x] 진행자가 시스템 메시지를 입력·전송하면 전 참가자 "전체" 탭에 낮·밤 모두 표시되고 빈 입력은 거부되는가 _(system 메시지는 기존 컨벤션대로 중앙 pill로 렌더 — 텍스트 프리픽스 아님)_
  - [x] 게임 시작 후 진행자 [제어] 탭에 각 참가자 역할이 실제 배정값으로 표시되고(자동 갱신), [스크린] 탭엔 역할이 노출되지 않는가
  - [x] play 화면에서 아래로 스크롤한 상태로 투표·전송 등 버튼을 눌러도 화면이 맨 위로 튀지 않고 스크롤 위치가 유지되는가(채팅 하단에 있을 때 새 메시지 자동 하단 이동은 유지) _(비밀/귓속말 탭 첫 오픈 시 최신으로 스크롤도 확인)_
  - [x] 이단 팀·당회 소속 참가자의 비밀 채널 탭에 같은 팀 멤버 명단이 표시되고, 성도·권사님은 개인 플레이스홀더만 보이며, 다른 팀 명단은 노출되지 않는가 _(팀원 실시간 탈락 취소선 즉시 반영 확인)_
  - [x] 낮에 투표를 마감하지 않고 밤 전환 시 확인 팝업이 뜨고, 투표 마감(또는 동률 처리) 후 전환 시엔 팝업 없이 바로 전환되며, 밤→낮 전환엔 경고가 없는가
  - [x] lint/typecheck 통과, 콘솔 에러 없음, 무차별 UI 회귀 없음(비밀 채널 탭 제목·구조 전원 동일)

---

### Phase 5: 현장 피드백 반영 · 게임 운영 개선 2차

> 진행자가 오늘 교회에서 실제로 게임을 운영하며 발견한 현장 피드백 4건(PRD F009 수정 · F007/F016 수정 · F027 신규 · F028 신규)을 반영한다. Task 020과 같은 성격(실사용 중 발견한 개선의 묶음)이며, 시스템 축(참가자 플레이 UX vs 서버 로직·진행자 도구)으로 2개 태스크로 분할한다. **공통 전제:** 모든 변경이 기존 스키마로 구현 가능해 **DB 마이그레이션·신규 npm 의존성이 전혀 필요 없다**(`game_votes`는 이미 `voter_id` 저장, `role`은 `heretic_leader`를 허용하는 text CHECK 컬럼, 모든 노출은 service_role 서버 액션이 정제한 Broadcast/PIN 게이트 조회로만 흐른다). 기존 보안 경계(anon은 `game_votes`·비밀 채널 직접 SELECT 불가) 유지. (설계 원칙: Phase 3 상단 "실시간·재접속 설계 원칙" 준수 — 스냅샷+Broadcast 델타, 비밀 컬럼 anon 미노출)

- **Task 021: 낮 투표 공개화 + 밤 공개 채팅/귓속말 개방** ✅ - 완료 (auto-dev · 브랜치 auto/vote-public-night-chat · PRD: F009, F007, F016)
  - 배경: 실사용에서 ① 비밀투표라 누가 왜 그 표를 던졌는지 토론 근거가 약했고 ② 밤에는 역할 보유자(이단/당회)만 채팅이 열려 밤에 조용한 참가자가 곧 성도로 의심받는 부작용이 있었다. 참가자 게임 플레이 화면(투표·채팅) 축의 개방성 개선을 한 태스크로 묶는다.
  - ✅ **완료 요약**: 3개 서브항목(본인 투표 허용·실시간 공개 투표·밤 public/dm 개방) 모두 구현. DB 마이그레이션·신규 의존성 없이 기존 스키마(`game_votes.voter_id`)·기존 부품(Dialog·Broadcast)만 사용. lint/typecheck 통과, code-reviewer 정적 리뷰 무결(높음/중간 0건), qa-tester 동적 검증 **8/8 pass**(6명 참가자+진행자 실 DB 실시간 구동, 콘솔·네트워크 에러 0). 밤 행동 대상 자신 제외(`aliveOthers`)·비밀 채널 밤 전용 격리·anon 직접 SELECT 차단 경계 모두 회귀 없이 유지 확인.
  - **① 본인 투표 허용 (F009-a)**
    - `lib/game/actions.ts` `castVote`에서 `targetId === voter.id` 자기투표 차단 제거(UUID 형식 검사·1인 1표·중복 방지는 유지)
    - `app/game/play/page.tsx` 투표 대상 목록을 `aliveOthers`(자신 제외) 대신 자신 포함 생존자 전원(`players.filter(p => p.isAlive)`를 `toGamePlayer` 매핑한 신규 목록, 예: `aliveVoteTargets`)으로 렌더
    - **밤 행동 패널(`ActionPanel`)은 계속 `aliveOthers`(자신 제외) 사용** — 밤 대상 규칙은 절대 변경하지 않음
  - **② 실시간 공개 투표 (F009-b)**
    - `lib/game/realtime.ts` `VoteUpdatePayload`에 `voters: Record<string, string[]>`(대상 id → 투표자 **id** 배열) 추가. 닉네임이 아닌 id만 실어 페이로드 경량화(클라이언트가 보유한 `players`로 id→닉네임 매핑)
    - `lib/game/actions.ts` `computeTally`가 `voters` 매핑도 반환하도록 확장(이미 `voter_id, target_id`를 조회 중 → 추가 쿼리 불필요). `VoteState`/`getVoteState`에도 `voters` 포함해 새로고침·지각 접속 시 스냅샷 복원
    - `castVote`의 `VoteUpdatePayload` Broadcast가 `voters`를 함께 송출. 기존 "투표 비밀 보장"/"개별 투표자→대상 매핑은 Broadcast하지 않는다" 주석을 "낮 투표는 공개"로 갱신
    - `lib/game/hooks/useGameVotes.ts`가 `voters`를 상태로 보관(스냅샷 + VOTE_UPDATE 델타 병합, 기존 `tally` 처리와 동일 경로)
    - **UI 팝업** — `app/game/play/page.tsx` 투표 카드에서 각 대상 행의 이름/득표 클릭 시 shadcn `Dialog`(또는 `Popover`)로 "이 사람에게 투표한 사람" 닉네임 목록 표시. 득표 0은 "아직 없음", 자신에게 온 표도 동일 확인 가능
    - 보안 경계 유지: 마이그레이션 0003의 anon SELECT 차단은 그대로 두고(직접 조회 계속 불가) 오직 서버가 정제한 Broadcast로만 공개
  - **③ 밤 공개 채팅 + 1:1 귓속말 개방 (F007, F016)**
    - `lib/game/actions.ts` `sendMessage`의 페이즈 게이팅: `public`·`dm`을 낮·밤 모두 허용(예: `const isPlayPhase = room.status === "day" || room.status === "night";` 후 `if ((channel === "public" || channel === "dm") && !isPlayPhase) return error;`). `heretic`/`council`은 `NIGHT_ONLY_CHANNELS` 그대로 밤 전용 유지. `DAY_ONLY_CHANNELS` 상수 제거 또는 의미에 맞게 정리
    - `app/game/play/page.tsx`: 전체(public) 탭 `ChatPanel disabled`와 1:1(dm) 탭 `DirectMessageTab disabled`에서 `status === "night"` 조건 제거 → `disabled={!selfAlive}`만 유지. 비밀 채널 탭은 `status === "day"` 조건(밤 전용) 유지
    - `getMessages`는 public/dm 열람에 페이즈 제약이 없어 별도 수정 불필요(확인만)
  - **범위 밖(하지 않음)**: DB 스키마·마이그레이션 변경, 밤 행동 대상 규칙(자신 제외) 변경, 비밀 채널(heretic/council)의 밤 전용 게이팅 변경, 신규 npm 의존성

  ### 테스트 체크리스트 (qa-tester 8/8 PASS)
  - [x] 낮에 자기 자신에게 투표할 수 있고(자기투표 정상 집계), 밤 행동 패널 대상에는 자신이 여전히 제외되는가
  - [x] 다른 탭에서 대상 이름/득표를 클릭하면 그 대상에게 투표한 사람들의 닉네임 목록이 팝업으로 실시간 표시되는가(재투표/변경 즉시 반영)
  - [x] 득표 0인 대상 클릭 시 "아직 없음"이 표시되고, 자신에게 온 표도 동일하게 확인되는가
  - [x] 새로고침·지각 접속 시 `getVoteState` 스냅샷으로 투표자 명단(voters)이 복원되는가
  - [x] 밤 페이즈에서 성도(역할 없음) 탭이 전체 채팅·1:1 귓속말을 전송/수신할 수 있는가
  - [x] 밤 페이즈에서도 비밀 채널(이단/당회)은 여전히 소속 멤버에게만 열리고 public/dm 개방이 채널 격리를 깨지 않는가
  - [x] 탈락자는 낮·밤 모두 투표/채팅 입력이 비활성인가(무차별 UI·관전 모드 회귀 없음)
  - [x] anon(브라우저)이 `game_votes`·비밀 채널을 직접 SELECT하지 못함을 재확인(보안 경계 유지)
  - [x] lint/typecheck 통과, 콘솔·네트워크 에러 0건

- **Task 022: 이단 대장 역할 승계 + 진행자 전체 대화 로그 열람** ✅ - 완료 (auto-dev · 브랜치 auto/heretic-succession-admin-log · PRD: F027, F028)
  - 배경: 실사용에서 ① 이단 대장이 탈락하면 이단이 남아 있어도 밤 처리 능력이 완전히 소멸해 게임 밸런스가 무너졌고 ② 진행자가 대화 흐름을 전혀 볼 수 없어 운영 판단 근거가 부족했다. 서버 사망 처리 로직·진행자 도구 축을 한 태스크로 묶는다.
  - ✅ **완료 요약**: 2개 축(이단 대장 승계·진행자 전체 대화 로그) 모두 구현. DB 마이그레이션·신규 의존성 없이 기존 스키마(`game_players.role` text CHECK)·기존 부품(개인 인박스 HMAC·Broadcast·PIN 게이트)만 사용. lint/typecheck·프로덕션 빌드 통과, code-reviewer 정적 리뷰(높음/중간 지적 전부 반영: 스크롤 점프 회귀·승격 TOCTOU·로그 무제한 조회), qa-tester 동적 검증 **9/9 pass**(6명 참가자+진행자 실 DB 다중 탭 실시간 구동, 승계·권한 이관·전멸 케이스·개인 알림 격리·전체 로그 초기 로드+델타·보안 경계·콘솔/네트워크 에러 0 실측).
  - ⚠️ **후속 백로그**(이번 범위 밖·기능 무영향, qa-tester 관찰): ① 진행자 [제어] 탭 역할 표(`rolesById`)가 승계 직후 즉시 갱신되지 않음(밤 행동 체크리스트는 정확히 반영) — PLAYER_ELIMINATED 시 roster 재조회로 개선 가능. ② 승격자 비밀 채널 "우리 팀" 라벨(`getTeammates`)이 승계 후 즉시 갱신되지 않음(밤 행동 패널 자체는 정상 활성). 둘 다 사소한 UI 지연이며 승계 기능·보안 경계에는 영향 없음.
  - **① 이단 대장 밤 처리 역할 승계 (F027)**
    - 승계 로직을 `lib/game/actions.ts` `resolveElimination` 내부에 추가 — 모든 사망 경로(투표/밤/수동/강퇴)가 이 choke point를 통과하므로 한 곳만 고치면 전부 커버
    - 사망 행 조회의 `.select("id, nickname")`에 **`role` 추가** → 죽은 플레이어가 `heretic_leader`인지 판별
    - `heretic_leader`가 죽었고 방에 **살아있는 `heretic`가 1명 이상** 있으면 그중 **랜덤 1명**의 `role`을 `heretic_leader`로 UPDATE(승격, 공정성). 남은 이단이 없으면(전멸) 승계 없음
    - 승계는 승리 조건 평가(`evaluateWinner`) 이전, 사망 UPDATE 직후에 배치(대장이 죽어도 이단이 남으면 게임은 계속되므로 순서 영향 없음). 밤 처리 권한은 "살아있는 플레이어의 현재 `role`"(`NIGHT_ACTION_ROLES` + `ROLE_TO_ACTION_TYPE`)에서 파생되므로 `role` UPDATE만으로 능력이 이관됨
    - **승격자 개인 알림** — `lib/game/inbox.ts`의 개인 인박스 토픽으로 시스템성 메시지 Broadcast("이단 대장이 탈락하여 당신이 밤 처리 역할을 이어받았습니다"). 공개 채널에는 승계 사실 미노출(무차별 UI 유지)
    - **클라이언트 role 갱신 보장** — 승격자의 `app/game/play/page.tsx`는 `role`을 `getResumeState`(`useGameResume`)에서 받는다. 밤 능력 활성(`canAct = canPerformNightAction(role, ...)`)을 위해 승격 후 role 재조회가 필요. 페이즈 전환(`PHASE_CHANGED`) 시 resume를 재조회하면 다음 밤 진입에 반영됨 — `useGameResume`(`lib/game/hooks/useGameResume.ts`)가 `PHASE_CHANGED`(또는 개인 인박스 알림 수신) 시 확실히 재조회하는지 확인하고, 아니면 그 트리거 추가
  - **② 진행자 전체 대화 로그 열람 (F028)**
    - **초기 로드** — `lib/game/actions.ts`에 PIN 게이트 Server Action `getAdminChatLog(roomId, pin)` 신설(`getAdminRoster`·`sendSystemMessage`와 동일한 `verifyAdminPin` 패턴). 해당 방의 **모든 채널**(public/heretic/council/dm/system) 메시지를 `created_at` 순으로 반환(발신자 닉네임·channel·recipient 닉네임 포함)
    - **실시간 델타 — 진행자 전용 관리 토픽**: 진행자는 개인 인박스 토픽 소속이 아니므로 비밀/귓속말 실시간 수신 경로가 없다. 인박스 패턴을 재사용해 방별 토픽 신설
      - `lib/game/inbox.ts`에 `computeAdminInboxToken(roomId)`(방별 HMAC, 시크릿 없이 역산 불가) + `lib/game/realtime.ts`에 `adminChannel(roomId, token)` 헬퍼 추가(채널명 노출돼도 추측 구독 불가)
      - PIN 게이트 액션 `getAdminInboxTopic(roomId, pin)`으로 진행자가 토픽명 수신 후 구독
      - `lib/game/actions.ts` `fanOutMessage`에 **모든 채널 메시지를 관리자 토픽으로도 1부 추가 Broadcast**하는 분기 추가(기존 public/heretic/council/dm fan-out 유지, 말미에 admin 토픽 전송 추가). `sendSystemMessage`·`resolveElimination`의 시스템 메시지도 관리자 토픽에 실리도록 경로 확인
    - **UI** — `app/game/admin/page.tsx` [제어] 탭에 "전체 대화 로그" 패널 추가: 채널 태그(`[공개]`/`[이단]`/`[당회]`/`[귓속말]`/`[시스템]`) 붙인 메시지 리스트. 마운트 시 `getAdminChatLog`로 초기 로드 후 관리자 토픽 구독으로 델타 병합(기존 `roomChannel` 구독 useEffect 인근에 채널 추가 또는 별도 useEffect). 기존 `ChatBubble`/`ScrollArea` 스타일 재사용. **[스크린] 탭에는 노출하지 않음**(진행자 개인 폰 전용)
  - **범위 밖(하지 않음)**: DB 스키마·마이그레이션 변경, `getRoomPlayers`/`getRoomState`의 role·admin_pin 미포함 원칙 변경, 페이즈 전환 서버 로직 변경, 신규 npm 의존성

  ### 테스트 체크리스트 (qa-tester 9/9 PASS)
  - [x] 이단 대장을 투표/밤/수동/강퇴 중 하나로 탈락시켰을 때(이단 잔존 상태) 남은 이단 중 1명이 새 이단 대장으로 승격되는가(SQL role 확인)
  - [x] 승격된 이단 탭에서 다음 밤에 밤 처리(kill) 행동 패널이 활성화되고 실제 처리가 `game_night_actions`에 기록되는가
  - [x] 이단이 전멸한 상태에서 이단 대장이 탈락하면 승계가 일어나지 않는가
  - [x] 승격자에게만 개인 알림이 도착하고 공개 채널·다른 참가자 화면에는 승계 사실이 어떤 형태로도 노출되지 않는가(무차별 UI 유지)
  - [x] 진행자 [제어] 탭 "전체 대화 로그"에 공개·이단·당회·귓속말·시스템 메시지가 모두 채널 태그와 함께 초기 로드되는가
  - [x] 새 메시지(각 채널)가 진행자 관리 토픽으로 실시간 델타 병합되어 표시되는가
  - [x] [스크린] 탭에는 대화 로그·역할이 노출되지 않는가
  - [x] 관리자 토픽은 PIN 게이트로만 토픽명을 받고, 토큰 없이는 비밀/귓속말 메시지를 구독할 수 없는가(보안 경계)
  - [x] lint/typecheck 통과, 콘솔·네트워크 에러 0건
