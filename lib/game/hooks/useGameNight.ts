"use client";

// 밤 행동 실데이터 훅 — submitNightAction(Server Action)을 래핑하고, 공개 room 채널의
// NIGHT_ACTION_UPDATE Broadcast로 완료 집계(completedCount/total)를 유지한다.
//
// NIGHT_ACTION_UPDATE 페이로드에는 순수 집계만 담기고 누가 무엇을 했는지는 절대
// 포함되지 않는다 — 목사님 본인의 조사 결과(investigation)는 submitNightAction의
// 성공 응답에만 담겨 오며, 이 훅은 그 값을 sonner toast로 본인에게만 표시한다
// (다른 참가자·진행자 화면에는 노출되지 않는다).
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { submitNightAction as submitNightActionAction } from "@/lib/game/actions";
import {
  GAME_EVENTS,
  roomChannel,
  type NightActionUpdatePayload,
} from "@/lib/game/realtime";
import { createClient } from "@/lib/supabase/client";

interface UseGameNightOptions {
  roomId: string;
  sessionToken: string;
  /** (선택) 네트워크 복구 신호(useNetworkRecovery). 값이 바뀌면 채널을 재구독한다 —
   *  오프라인/백그라운드 중 놓친 NIGHT_ACTION_UPDATE를 복원하기 위함. */
  recoveryKey?: number;
}

interface UseGameNightResult {
  /** 이번 phase에 밤 행동을 마친 권한자 수 (진행자 등 필요한 화면에서만 사용) */
  completedCount: number;
  /** 이번 phase의 생존 밤 권한자 총원 */
  total: number;
  submitNightAction: (targetId: string) => ReturnType<typeof submitNightActionAction>;
}

/**
 * 밤 행동을 제출하고 완료 집계를 구독하는 훅. useGameVotes와 동일한 패턴 —
 * 공개 room 채널을 구독해 델타만 반영하고 cleanup에서 반드시 removeChannel한다.
 */
export function useGameNight({
  roomId,
  sessionToken,
  recoveryKey,
}: UseGameNightOptions): UseGameNightResult {
  const [completedCount, setCompletedCount] = useState(0);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (!roomId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(roomChannel(roomId))
      .on("broadcast", { event: GAME_EVENTS.NIGHT_ACTION_UPDATE }, ({ payload }) => {
        const update = payload as NightActionUpdatePayload;
        setCompletedCount(update.completedCount);
        setTotal(update.total);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, recoveryKey]);

  const submitNightAction = useCallback(
    async (targetId: string) => {
      const result = await submitNightActionAction(sessionToken, targetId);
      if (result.ok && result.investigation) {
        // 목사님 본인에게만 표시 — 서버 응답 밖(DB/Broadcast)에는 절대 남지 않는다.
        toast.success(
          result.investigation === "heretic" ? "조사 결과: 이단입니다" : "조사 결과: 성도입니다",
        );
      }
      return result;
    },
    [sessionToken],
  );

  return { completedCount, total, submitNightAction };
}
