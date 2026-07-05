-- 보안 수정 (Phase 3 Task 008) · 프로덕션 적용됨(2026-07-04)
-- game_rooms.admin_pin 컬럼이 anon(브라우저)에 노출되던 결함 차단.
--
-- 배경: Task 003의 RLS 행 정책(anon select using(true))은 행만 필터링하고 컬럼은 못 막는다.
--   또한 Supabase 기본 설정상 anon/authenticated에 game_rooms 테이블 전체 SELECT 권한이 있어,
--   참가자가 브라우저 anon 키로 select('admin_pin')을 직접 호출하면 진행자 PIN이 노출되어
--   verifyAdminPin 검증을 우회할 수 있었다.
--
-- 조치: 테이블 전체 SELECT 권한을 회수하고, admin_pin을 제외한 컬럼에만 SELECT를 재부여한다.
--   admin_pin은 이제 service_role(Server Action)로만 접근 가능하다.
--   ⚠️ 이후 anon/authenticated는 game_rooms를 select('*')로 조회할 수 없다.
--      공개 게임 상태는 컬럼을 명시해 조회해야 한다:
--      .select('id,status,phase_number,winner,transition_to,transition_at,created_at')

revoke select on public.game_rooms from anon, authenticated;

grant select (id, status, phase_number, winner, transition_to, transition_at, created_at)
  on public.game_rooms to anon, authenticated;
