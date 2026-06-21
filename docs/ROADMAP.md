# 교회 테마 마피아 게임 개발 로드맵

모바일 브라우저 하나로 10-20명이 즉시 참여하는 교회 버전 실시간 마피아 게임

## 개요

교회 마피아 게임은 교회 레크리에이션 행사에서 참가자들이 각자의 스마트폰으로 URL에 접속해 앱 설치 없이 즐기는 실시간 멀티플레이 웹 게임입니다.

- **닉네임 즉시 참가**: 회원가입 없이 닉네임만 입력하면 바로 참여
- **교회 테마 역할**: 성도·담임목사·중보기도자·이단세력·이단교주로 구성된 선/악 대결
- **이중 채팅 채널**: 전체 채팅(낮 토론)과 이단 전용 비밀 채팅(밤 작전) 동시 운영
- **진행자 대시보드**: 스크린용 공개 현황판과 진행자 전용 제어판 분리 운영

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

### Phase 1: 애플리케이션 골격 구축

- **Task 001: 게임 라우트 구조 및 빈 페이지 생성** - 우선순위
  - `app/game/layout.tsx` — 게임 영역 공통 레이아웃 생성
  - `app/game/page.tsx` — 입장 허브 빈 페이지 (F001, F002)
  - `app/game/waiting/page.tsx` — 대기실 빈 페이지 (F003, F004)
  - `app/game/play/page.tsx` — 게임 플레이 빈 페이지 (F005~F011, F014)
  - `app/game/admin/page.tsx` — 진행자 대시보드 빈 페이지 (F004, F006, F009, F011~F014)
  - 각 페이지에 제목과 라우트 확인용 최소 마크업 삽입

- **Task 002: 게임 타입 정의 및 상수 설계**
  - `lib/game/types.ts` — 핵심 TypeScript 타입 정의
    - `GameRoom`, `GamePlayer`, `GameMessage`, `GameVote`, `GameNightAction`
    - `PlayerRole`: `'saint' | 'heretic' | 'heretic_leader' | 'pastor' | 'prayer_warrior'`
    - `GameStatus`: `'waiting' | 'day' | 'night' | 'ended'`
    - `ChatChannel`: `'public' | 'heretic' | 'system'`
    - `ActionType`: `'kill' | 'investigate' | 'protect'`
  - `lib/game/constants.ts` — 역할 한글 표시명, 팀 분류, 인원별 역할 배분표
  - `lib/game/utils.ts` — 역할 배분 계산 함수, 승리 조건 체크 함수 시그니처

- **Task 003: Supabase DB 스키마 마이그레이션**
  - `supabase/migrations/xxx_game_schema.sql` 작성 및 적용
  - 5개 테이블 생성: `game_rooms`, `game_players`, `game_messages`, `game_votes`, `game_night_actions`
  - UNIQUE 제약 추가: `game_votes(room_id, phase_number, voter_id)`, `game_night_actions(room_id, phase_number, actor_id)`
  - RLS 활성화 및 기본 정책 설정
    - `game_messages`: `channel = 'heretic'`인 행은 이단 역할 플레이어만 SELECT 가능
    - `game_players`: `role` 컬럼은 본인 session_token 또는 진행자 PIN 확인 후 조회
  - `npx supabase gen types typescript` 로 `lib/types/database.types.ts` 재생성

---

### Phase 2: UI/UX 완성 (더미 데이터 활용)

- **Task 004: 게임 전용 공통 컴포넌트 구축**
  - shadcn/ui 추가 컴포넌트 설치
    ```bash
    npx shadcn@latest add dialog tabs avatar scroll-area sonner separator
    ```
  - 게임 공통 컴포넌트 구현 (`components/game/`)
    - `PlayerCard.tsx` — 닉네임 + 생존/탈락 배지 카드
    - `RoleCard.tsx` — 역할 공개 카드 (이름, 설명, 팀 색상)
    - `PhaseBanner.tsx` — 낮/밤 페이즈 + 라운드 번호 배너
    - `ChatBubble.tsx` — 메시지 말풍선 (본인/타인/시스템 구분)
    - `VoteButton.tsx` — 투표 대상 선택 버튼
    - `ActionPanel.tsx` — 밤 행동 패널 래퍼
  - `lib/game/dummy.ts` — 더미 데이터 (참가자 목록, 채팅 메시지, 투표 현황)

- **Task 005: 입장 허브 & 대기실 페이지 UI 구현**
  - 입장 허브 페이지 (`app/game/page.tsx`)
    - 교회 테마 게임 로고 및 제목
    - 닉네임 입력 폼 (Input + Button)
    - "진행자로 입장" 링크 → PIN 입력 Dialog 모달
  - 대기실 페이지 (`app/game/waiting/page.tsx`)
    - 더미 참가자 목록 (PlayerCard 컴포넌트 사용)
    - 현재 인원 / 최소 인원 표시
    - [게임 시작] 버튼 (더미 데이터로 조건부 노출)
    - 대기 중 안내 메시지

- **Task 006: 게임 플레이 페이지 UI 구현**
  - 역할 카드 모달 (Dialog) — 애니메이션 공개 + 탭하면 닫힘
  - 상단: PhaseBanner (낮/밤 + 라운드)
  - 좌측/하단: 생존 현황 플레이어 목록 (PlayerCard)
  - 중앙: 채팅 탭 UI
    - [전체 채팅] 탭 — ScrollArea + ChatBubble + 입력창
    - [이단 채팅] 탭 — 동일 구조, 이단 색상 테마
  - 하단: 행동 패널 (페이즈·역할별 4가지 UI 분기)
    - 낮 투표: 살아있는 플레이어 VoteButton 목록
    - 밤 이단: 제거 대상 선택 패널
    - 밤 담임목사: 조사 대상 선택 패널
    - 밤 중보기도자: 보호 대상 선택 패널
    - 밤 성도: "기도하며 기다리세요" 대기 화면
  - 게임 종료 결과 오버레이 (승리 팀 발표)

- **Task 007: 진행자 대시보드 UI 구현**
  - Tabs 컴포넌트로 2개 탭 분리
  - [스크린 탭] — 빔프로젝터 공개 화면
    - 닉네임 + 생존/탈락만 표시 (역할 비공개)
    - 현재 페이즈 + 라운드 배너
    - 실시간 투표 집계 Progress 바
  - [제어 탭] — 진행자 개인 폰용
    - 닉네임 + 역할 + 생존 여부 전체 표 (더미 데이터)
    - 수동 탈락 처리 버튼
    - 페이즈 전환 버튼 (낮 → 밤 / 밤 → 낮)
    - 투표 마감 버튼
    - 밤 행동 완료 현황 체크 리스트
    - 시스템 메시지 발송 입력창
    - 게임 종료 / 리셋 버튼
  - 모바일 최적화 레이아웃 검증

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
    - 10명: 이단2 + 이단교주1 + 담임목사1 + 중보기도자1 + 성도5
    - 15명: 이단3 + 이단교주1 + 담임목사1 + 중보기도자1 + 성도9
    - 20명: 이단4 + 이단교주1 + 담임목사1 + 중보기도자1 + 성도13
    - game_players 역할 일괄 UPDATE (무작위 셔플 후 배분)
    - game_rooms status → `'day'`, phase_number → `1`
  - game_rooms status 변경 이벤트 구독 → 전원 game/play로 자동 이동

  ### 테스트 체크리스트
  - [ ] 새 참가자 입장 시 대기실 목록에 실시간 추가되는가
  - [ ] 10명 참가 후 게임 시작 시 역할이 올바른 비율로 배분되는가
  - [ ] 게임 시작 후 모든 참가자 화면이 게임 플레이 페이지로 이동하는가
  - [ ] 진행자만 [게임 시작] 버튼이 보이는가

- **Task 010: 채팅 시스템 구현**
  - `lib/game/hooks/useGameChat.ts` — 채팅 상태 + Realtime 구독 훅
  - 메시지 전송 Server Action: game_messages INSERT (channel 구분)
  - Supabase Realtime 구독
    - `channel = 'public'` 메시지: 전원 수신
    - `channel = 'heretic'` 메시지: RLS로 이단 역할만 수신
    - `channel = 'system'` 메시지: 전원 수신 (다른 스타일)
  - 낮 페이즈: 전체 채팅 입력창 활성 / 밤 페이즈: 비활성
  - 이단 채팅 탭: 이단·이단교주 역할에게만 탭 노출, 밤에만 입력 활성
  - Sonner 토스트로 새 메시지 알림 (채팅 탭이 숨겨진 경우)

  ### 테스트 체크리스트
  - [ ] 낮 페이즈에 전체 채팅 메시지가 모든 참가자에게 실시간 수신되는가
  - [ ] 이단 채팅 탭이 성도 역할에게는 보이지 않는가
  - [ ] 이단 채팅 메시지가 성도 역할의 DB 직접 조회에서도 차단되는가
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
  - 진행자 대시보드 실시간 투표 집계 표시

  ### 테스트 체크리스트
  - [ ] 투표 후 다른 참가자로 변경 투표가 가능한가 (1인 1표 유지)
  - [ ] 진행자 화면에 실시간 투표 집계가 표시되는가
  - [ ] 투표 마감 후 최다 득표자가 탈락 처리되는가
  - [ ] 탈락 처리 후 해당 플레이어의 투표 버튼이 비활성화되는가
  - [ ] 동률 시 진행자 수동 선택 모달이 표시되는가

- **Task 012: 밤 행동 시스템 구현**
  - 밤 행동 Server Action: game_night_actions UPSERT
  - 역할별 행동 UI 연결
    - 이단/이단교주: 제거 대상 선택 → `action_type: 'kill'`
    - 담임목사: 조사 대상 선택 → `action_type: 'investigate'`
    - 중보기도자: 보호 대상 선택 → `action_type: 'protect'`
  - 담임목사 조사 결과 처리
    - 이단교주 조사 시 "성도입니다" 반환 (위장 기능)
    - 결과를 Sonner 토스트로 해당 플레이어에게만 표시
  - 진행자 밤 행동 완료 현황 표시 (누가 완료했는지 체크)
  - 밤 결과 처리 Server Action (진행자 "아침으로" 버튼)
    - 보호 대상과 제거 대상이 겹치면 제거 무효
    - 제거 대상 is_alive → false
    - 시스템 메시지 발송 ("밤 사이 ○○님이 이단 세력에 의해 제거되었습니다")
    - 승리 조건 체크 실행

  ### 테스트 체크리스트
  - [ ] 이단 팀의 제거 행동이 game_night_actions에 저장되는가
  - [ ] 중보기도자 보호 대상과 이단 제거 대상이 같을 때 제거가 무효화되는가
  - [ ] 담임목사가 이단교주를 조사할 때 "성도입니다"로 반환되는가
  - [ ] 조사 결과가 담임목사에게만 표시되는가
  - [ ] 밤 행동 완료 후 진행자 대시보드에 완료 현황이 표시되는가

- **Task 013: 페이즈 전환 및 승리 조건 구현**
  - 페이즈 전환 Server Action (`lib/game/actions.ts`)
    - game_rooms status 업데이트 (`day ↔ night`)
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
  - [ ] 진행자가 페이즈 전환 시 모든 참가자 화면이 동시에 갱신되는가
  - [ ] 이단 전원 탈락 시 선 팀 승리 화면이 표시되는가
  - [ ] 생존 이단 수 ≥ 생존 성도 수 조건 충족 시 악 팀 승리 화면이 표시되는가
  - [ ] 게임 종료 화면에서 모든 역할이 공개되는가
  - [ ] 게임 리셋 후 대기실에서 새 게임을 시작할 수 있는가

- **Task 014: 전체 플로우 통합 테스트**
  - Playwright MCP를 사용한 E2E 테스트 시나리오 실행
  - 전체 게임 플로우 검증 (입장 → 대기 → 역할 확인 → 낮 → 밤 → 승리)
  - 동시 접속 10명 시나리오 실시간 동기화 검증
  - 엣지 케이스 처리 확인

  ### 테스트 체크리스트
  - [ ] 참가자 10명 + 진행자 1명 전체 플로우 실행 가능한가
  - [ ] 채팅 메시지가 모든 클라이언트에 500ms 이내 전달되는가
  - [ ] 브라우저 탭 전환 후 돌아왔을 때 Realtime 재연결이 되는가
  - [ ] 탈락자가 투표/행동 패널을 사용할 수 없는가
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
