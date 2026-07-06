-- Task 011 보안 수정: game_votes의 anon 직접 조회 차단(비밀 투표)
--
-- 기존 "game_votes anon select"(using true) 정책은 RLS 행 정책이라 컬럼을 막지 못해,
-- anon(브라우저 공개 키)이 voter_id/target_id를 직접 조회하면 개별 투표(누가 누구에게)가
-- 그대로 노출된다(admin_pin과 동일한 유형의 결함, 0002에서 이미 겪음).
--
-- 투표 집계는 서버가 service_role Server Action(computeTally/getVoteState)으로만 제공하므로
-- anon의 game_votes 직접 SELECT 권한 자체가 불필요하다. game_players/game_night_actions와
-- 동일하게 anon을 완전히 차단한다(서버계층 모델 일치).

drop policy if exists "game_votes anon select" on public.game_votes;

revoke select on public.game_votes from anon, authenticated;
