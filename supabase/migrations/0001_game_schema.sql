-- 교회 마피아 게임 — DB 스키마 (Phase 1 Task 003) · 프로덕션 적용됨(2026-07-04)
-- RLS 모델(결정: docs/decisions): 서버 계층 제어.
--   비밀 데이터(역할/토큰/비밀채널/밤행동)는 anon SELECT 차단 → Server Action(service_role)으로만 접근.
--   모든 쓰기도 Server Action 경유(service_role이 RLS 우회).

-- 1. game_rooms
create table if not exists public.game_rooms (
  id            uuid primary key default gen_random_uuid(),
  status        text not null default 'waiting' check (status in ('waiting','day','night','ended')),
  phase_number  integer not null default 0,
  admin_pin     text not null,
  winner        text check (winner in ('saints','heretics')),
  transition_to text check (transition_to in ('day','night')),
  transition_at timestamptz,
  created_at    timestamptz not null default now()
);

-- 2. game_players
create table if not exists public.game_players (
  id            uuid primary key default gen_random_uuid(),
  room_id       uuid not null references public.game_rooms(id) on delete cascade,
  nickname      text not null,
  role          text check (role in ('saint','heretic','heretic_leader','pastor','elder','deaconess')),
  is_alive      boolean not null default true,
  last_seen_at  timestamptz,
  session_token text not null unique,
  created_at    timestamptz not null default now(),
  unique (room_id, nickname)
);
create index if not exists game_players_room_id_idx on public.game_players(room_id);

-- 3. game_messages
create table if not exists public.game_messages (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references public.game_rooms(id) on delete cascade,
  player_id    uuid references public.game_players(id) on delete set null,
  recipient_id uuid references public.game_players(id) on delete cascade,
  content      text not null,
  channel      text not null check (channel in ('public','heretic','council','dm','system')),
  created_at   timestamptz not null default now()
);
create index if not exists game_messages_room_id_idx on public.game_messages(room_id);

-- 4. game_votes
create table if not exists public.game_votes (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references public.game_rooms(id) on delete cascade,
  phase_number integer not null,
  voter_id     uuid not null references public.game_players(id) on delete cascade,
  target_id    uuid not null references public.game_players(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (room_id, phase_number, voter_id)
);

-- 5. game_night_actions
create table if not exists public.game_night_actions (
  id           uuid primary key default gen_random_uuid(),
  room_id      uuid not null references public.game_rooms(id) on delete cascade,
  phase_number integer not null,
  actor_id     uuid not null references public.game_players(id) on delete cascade,
  target_id    uuid not null references public.game_players(id) on delete cascade,
  action_type  text not null check (action_type in ('kill','investigate','protect')),
  created_at   timestamptz not null default now(),
  unique (room_id, phase_number, actor_id)
);

-- ── RLS: 서버 계층 제어 모델 ────────────────────────────────
alter table public.game_rooms         enable row level security;
alter table public.game_players       enable row level security;
alter table public.game_messages      enable row level security;
alter table public.game_votes         enable row level security;
alter table public.game_night_actions enable row level security;

-- 공개 읽기(anon): 게임 상태
create policy "game_rooms anon select" on public.game_rooms
  for select to anon, authenticated using (true);

-- 공개 읽기(anon): 전체/시스템 채팅만 (비밀 채널은 차단 → Server Action 경유)
create policy "game_messages public select" on public.game_messages
  for select to anon, authenticated using (channel in ('public','system'));

-- 공개 읽기(anon): 투표 집계
create policy "game_votes anon select" on public.game_votes
  for select to anon, authenticated using (true);

-- game_players / game_night_actions / 비밀 채널 메시지 / 모든 쓰기:
--   anon 정책 없음 = 차단. Server Action(service_role)이 RLS를 우회해 처리한다.
--   (Phase 3에서 대기실 참가자 목록은 role/token을 뺀 Server Action으로 제공)
