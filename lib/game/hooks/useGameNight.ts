"use client";

// 밤 행동 실데이터 훅 — submitNightAction(Server Action)을 래핑하고, 공개 room 채널의
// NIGHT_ACTION_UPDATE Broadcast로 완료 집계(completedCount/total)를 유지한다.
// 초기 스냅샷(getMyNightActionStatus)으로 본인 확정 상태(locked/lockedTargetId/investigation)를
// 복원한다 — 같은 밤 안에서는 대상을 바꿔 재제출할 수 없으므로(Task 012-1) 이 훅이 단일 소스다.
//
// NIGHT_ACTION_UPDATE 페이로드에는 순수 집계만 담기고 누가 무엇을 했는지는 절대
// 포함되지 않는다 — 목사님 본인의 조사 결과(investigation)는 submitNightAction/
// getMyNightActionStatus의 응답에만 담겨 오며, 이 훅은 그 값을 sonner toast로 본인에게만
// 표시한다(다른 참가자·진행자 화면에는 노출되지 않는다).
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import {
  getMyNightActionStatus,
  submitNightAction as submitNightActionAction,
} from "@/lib/game/actions";
import {
  GAME_EVENTS,
  roomChannel,
  type NightActionUpdatePayload,
} from "@/lib/game/realtime";
import { createClient } from "@/lib/supabase/client";

interface UseGameNightOptions {
  roomId: string;
  sessionToken: string;
  /** 현재 phase 번호 — 밤이 바뀔 때마다 본인 확정 상태를 리셋/재조회하기 위한 키.
   *  useGamePhase의 초기 스냅샷 로딩 중(0으로 초기화된 임시값)에는 null을 넘겨 이 훅의
   *  리셋/재조회 effect를 지연시켜야 한다(재접속 시 0→실제값 전환에 의한 순간 깜빡임 방지). */
  phaseNumber: number | null;
  /** (선택) 네트워크 복구 신호(useNetworkRecovery). 값이 바뀌면 채널을 재구독한다 —
   *  오프라인/백그라운드 중 놓친 NIGHT_ACTION_UPDATE를 복원하기 위함. */
  recoveryKey?: number;
}

interface UseGameNightResult {
  /** 이번 phase에 밤 행동을 마친 권한자 수 (진행자 등 필요한 화면에서만 사용) */
  completedCount: number;
  /** 이번 phase의 생존 밤 권한자 총원 */
  total: number;
  /** 이번 phase에 본인 밤 행동을 확정했는지 여부 — true면 대상을 바꿔 재제출할 수 없다 */
  locked: boolean;
  /** 확정한 대상 id (미확정이면 null) */
  lockedTargetId: string | null;
  /** 목사님(pastor)의 조사 결과 — investigate 확정 시에만 채워진다 */
  investigation: "heretic" | "saint" | null;
  submitNightAction: (targetId: string) => ReturnType<typeof submitNightActionAction>;
}

/**
 * 밤 행동을 제출하고 완료 집계를 구독하는 훅. useGameVotes와 동일한 패턴 —
 * 공개 room 채널을 구독해 델타만 반영하고 cleanup에서 반드시 removeChannel한다.
 * 본인 확정 상태(locked)는 getVoteState 스냅샷 패턴을 그대로 따라 getMyNightActionStatus로
 * 초기 로드하되, myVote와 달리 phaseNumber가 바뀔 때(다음 밤 진입)마다 즉시 동기 리셋한다.
 */
export function useGameNight({
  roomId,
  sessionToken,
  phaseNumber,
  recoveryKey,
}: UseGameNightOptions): UseGameNightResult {
  const [completedCount, setCompletedCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockedTargetId, setLockedTargetId] = useState<string | null>(null);
  const [investigation, setInvestigation] = useState<"heretic" | "saint" | null>(null);

  // submitNightAction 호출 시점 이후 phaseNumber가 바뀌었는지(다음 밤으로 넘어갔는지) 판별하기
  // 위한 최신값 ref — 확정 요청이 서버 응답을 기다리는 사이 phase 리셋 effect가 먼저 실행되면,
  // 뒤늦게 도착한 콜백이 이전 밤의 targetId로 이번 밤의 locked 상태를 덮어쓰는 경합을 막는다.
  const phaseNumberRef = useRef(phaseNumber);
  useEffect(() => {
    phaseNumberRef.current = phaseNumber;
  }, [phaseNumber]);

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

  // 본인 확정 상태 스냅샷 — 밤(phaseNumber)이 바뀔 때마다 이전 밤의 잠금/조사 결과가 한 프레임도
  // 남지 않도록 즉시 동기 리셋한 뒤 서버에서 이번 phase 상태를 재조회한다(재접속 복원 포함).
  // phaseNumber가 null(useGamePhase 스냅샷 로딩 중의 임시 0을 아직 실제값으로 확정하지 못한 상태)
  // 이면 리셋·재조회 자체를 건너뛴다 — 재접속 시 0→실제값 전환에서 이미 복원된 잠금 상태가
  // 한 번 더 해제되었다가 재확정되는 깜빡임을 막기 위함.
  useEffect(() => {
    if (phaseNumber === null) return;

    let cancelled = false;
    setLocked(false);
    setLockedTargetId(null);
    setInvestigation(null);

    getMyNightActionStatus(sessionToken).then((status) => {
      if (cancelled || !status) return;
      setLocked(status.locked);
      setLockedTargetId(status.targetId);
      setInvestigation(status.investigation ?? null);
    });

    return () => {
      cancelled = true;
    };
  }, [sessionToken, phaseNumber, recoveryKey]);

  const submitNightAction = useCallback(
    async (targetId: string) => {
      // 확정 요청 시점의 phase를 캡처해둔다 — 응답이 도착했을 때 phaseNumberRef.current(최신값)와
      // 다르면 이미 다음 밤으로 넘어간 뒤이므로 로컬 상태 반영을 건너뛴다(위 phase 리셋 effect가
      // 이미 이번 밤 기준으로 재조회를 마쳤을 것이므로, stale 응답이 그 결과를 덮어쓰지 않게 한다).
      const capturedPhase = phaseNumberRef.current;
      const result = await submitNightActionAction(sessionToken, targetId);
      if (result.ok) {
        if (result.investigation) {
          // 목사님 본인에게만 표시 — 서버 응답 밖(DB/Broadcast)에는 절대 남지 않는다.
          toast.success(
            result.investigation === "heretic" ? "조사 결과: 이단입니다" : "조사 결과: 성도입니다",
          );
        }
        if (phaseNumberRef.current === capturedPhase) {
          setLocked(true);
          setLockedTargetId(targetId);
          setInvestigation(result.investigation ?? null);
        }
      }
      return result;
    },
    [sessionToken],
  );

  return { completedCount, total, locked, lockedTargetId, investigation, submitNightAction };
}
