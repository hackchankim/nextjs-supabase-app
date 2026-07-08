"use client";

// 낮 투표 실데이터 훅 — 초기 스냅샷(getVoteState Server Action) + 공개 room 채널의
// VOTE_UPDATE Broadcast 델타로 집계를 유지한다.
//
// VOTE_UPDATE 페이로드에는 대상별 집계(tally)만 담기고 "누가 누구에게 투표했는지"는
// 절대 포함되지 않는다 — 본인 투표(myVote)는 castVote 성공 응답 시점에만 로컬로 반영한다
// (다른 참가자의 투표 대상은 이 훅으로 알 수 없다 — 투표 비밀 보장).
import { useCallback, useEffect, useRef, useState } from "react";

import { castVote as castVoteAction, getVoteState } from "@/lib/game/actions";
import { GAME_EVENTS, roomChannel, type VoteUpdatePayload } from "@/lib/game/realtime";
import { createClient } from "@/lib/supabase/client";

interface UseGameVotesOptions {
  roomId: string;
  sessionToken: string;
  /** (선택) 네트워크 복구 신호(useNetworkRecovery). 값이 바뀌면 집계 스냅샷을 재조회하고
   *  채널을 재구독한다 — 오프라인/백그라운드 중 놓친 VOTE_UPDATE를 복원하기 위함. */
  recoveryKey?: number;
}

interface UseGameVotesResult {
  /** 대상 참가자 id → 득표 수 */
  tally: Record<string, number>;
  /** 본인이 이번 페이즈에 투표한 대상 id (미투표면 null) */
  myVote: string | null;
  /** 이번 페이즈에 투표를 마친 고유 투표자 수 */
  voterCount: number;
  /** 현재 생존자 수 */
  aliveCount: number;
  /** 초기 스냅샷 로딩 중 여부 */
  loading: boolean;
  castVote: (targetId: string) => ReturnType<typeof castVoteAction>;
}

export function useGameVotes({
  roomId,
  sessionToken,
  recoveryKey,
}: UseGameVotesOptions): UseGameVotesResult {
  const [tally, setTally] = useState<Record<string, number>>({});
  const [myVote, setMyVote] = useState<string | null>(null);
  const [voterCount, setVoterCount] = useState(0);
  const [aliveCount, setAliveCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // 스냅샷 재조회 중 VOTE_UPDATE가 도착했는지 추적한다(코드 리뷰 반영) — fetch가 진행되는
  // 사이 집계 delta가 먼저 반영된 뒤 뒤늦게 도착한 stale 스냅샷이 그 상태를 덮어쓰는 레이스를
  // 막기 위함. 아래 스냅샷 로드 effect에서 이 플래그를 보고 필요하면 한 번만 재조회한다
  // (myVote는 VOTE_UPDATE로 갱신되지 않으므로 이 레이스와 무관하다).
  const voteSnapshotStaleRef = useRef(false);

  // 초기 스냅샷 로드 — 집계 + 본인 투표
  useEffect(() => {
    let cancelled = false;
    let retried = false;
    voteSnapshotStaleRef.current = false;
    setLoading(true);

    const load = () => {
      getVoteState(sessionToken)
        .then((state) => {
          if (cancelled || !state) return;
          if (voteSnapshotStaleRef.current && !retried) {
            retried = true;
            voteSnapshotStaleRef.current = false;
            load();
            return;
          }
          voteSnapshotStaleRef.current = false;
          setTally(state.tally);
          setMyVote(state.myVote);
          setVoterCount(state.voterCount);
          setAliveCount(state.aliveCount);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [sessionToken, recoveryKey]);

  // 공개 room 채널 구독 — VOTE_UPDATE 델타로 집계만 갱신한다 (myVote는 여기서 갱신되지 않는다).
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(roomChannel(roomId))
      .on("broadcast", { event: GAME_EVENTS.VOTE_UPDATE }, ({ payload }) => {
        voteSnapshotStaleRef.current = true;
        const update = payload as VoteUpdatePayload;
        setTally(update.tally);
        setVoterCount(update.voterCount);
        setAliveCount(update.aliveCount);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, recoveryKey]);

  const castVote = useCallback(
    async (targetId: string) => {
      const result = await castVoteAction(sessionToken, targetId);
      if (result.ok) {
        // 본인 투표는 broadcast로 돌아오지 않으므로(투표 비밀 보장) 성공 시 로컬로 반영한다.
        setMyVote(targetId);
      }
      return result;
    },
    [sessionToken],
  );

  return { tally, myVote, voterCount, aliveCount, loading, castVote };
}
