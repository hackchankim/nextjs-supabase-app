-- 교회 마피아 게임 — DB 스키마 (초안, 아직 적용 안 됨)
-- ⚠️ 이 파일은 auto-dev가 작성한 초안이며, 실제 Supabase 프로젝트에는 아직 적용하지 않았다.
--    적용 여부와 RLS 모델은 docs/decisions/PENDING-game-db-migration.md 의 결정을 따른다.
--
-- 참조: docs/PRD.md 데이터 모델 · docs/ROADMAP.md Phase 1 Task 003

-- ── 1. game_rooms (게임 방) ─────────────────────────────────
create table if not exists public.game_rooms (
  id            uuid primary key default gen_random_uuid(),
  status        text not null default 'waiting'
                  check (status in ('waiting', 'day', 'night', 'ended')),
  phase_number  integer not null default 0,
  admin_pin     text not null,
  winner        text check (winner in ('saints', 'heretics')),
  transition_to text check (transition_to in ('day', 'night')),
  transition_at timestamptz,
  created_at    timestamptz not null default now()
);

-- ── 2. game_players (참가자) ───────────────────────────────
create table if not exists public.game_players (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid not null references public.game_rooms(id) on delete cascade,
  nickname      text not null,
  role          text check (role in ('saint','heretic','heretic_leader','pastor','elder','deaconess')),
  is_alive      boolean not null default true,
  last_seen_at  timestamptz,
  session_token text not null unique,
  created_at    timestamptz not null default now(),
  unique (room_id, nickname) -- 방 내 닉네임 중복 방지 (F001)
);
create index if not exists game_players_room_id_idx on public.game_players(room_id);

-- ── 3. game_messages (채팅) ────────────────────────────────
create table if not exists public.game_messages (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references public.game_rooms(id) on delete cascade,
  player_id    uuid references public.game_players(id) on delete set null, -- null = 시스템 메시지
  recipient_id uuid references public.game_players(id) on delete cascade,  -- channel='dm'일 때만
  content      text not null,
  channel      text not null
                 check (channel in ('public', 'heretic', 'council', 'dm', 'system')),
  created_at   timestamptz not null default now()
);
create index if not exists game_messages_room_id_idx on public.game_messages(room_id);

-- ── 4. game_votes (낮 투표) ────────────────────────────────
create table if not exists public.game_votes (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references public.game_rooms(id) on delete cascade,
  phase_number integer not null,
  voter_id     uuid not null references public.game_players(id) on delete cascade,
  target_id    uuid not null references public.game_players(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (room_id, phase_number, voter_id) -- 1인 1표
);

-- ── 5. game_night_actions (밤 행동) ────────────────────────
create table if not exists public.game_night_actions (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references public.game_rooms(id) on delete cascade,
  phase_number integer not null,
  actor_id     uuid not null references public.game_players(id) on delete cascade,
  target_id    uuid not null references public.game_players(id) on delete cascade,
  action_type  text not null check (action_type in ('kill', 'investigate', 'protect')),
  created_at   timestamptz not null default now(),
  unique (room_id, phase_number, actor_id)
);

-- ── Realtime 발행 (채팅·목록·상태 실시간 동기화) ─────────────
-- alter publication supabase_realtime add table
--   public.game_rooms, public.game_players, public.game_messages, public.game_votes;

-- ── RLS (⚠️ 결정 필요) ─────────────────────────────────────
-- 이 게임은 Supabase 인증이 아니라 익명 session_token 기반이라, 행 단위 정책이
-- 요청자의 역할/신원을 어떻게 판별할지 결정이 필요하다(auth.uid() 사용 불가).
-- 후보:
--   (A) 비밀 채널 열람 제어를 Server Action/RPC 계층에서 수행(RLS는 기본 차단 + service_role 경유)
--   (B) session_token을 요청 컨텍스트로 전달하는 SECURITY DEFINER RPC + 화이트리스트 정책
--   (C) 초기엔 RLS를 열어두고(개발용) Phase 3 채팅 구현 시 정책 확정
-- 결정 전까지 RLS/정책은 적용하지 않는다. → docs/decisions/PENDING-game-db-migration.md
