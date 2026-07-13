"use client";

// 세션 재접속·이어하기(Task 013-2) — 이탈 후 복귀한 참가자의 복원 스냅샷을 담당하는 공용 훅.
//
// 재접속의 실시간 델타(채팅/투표/밤/페이즈)는 각 화면의 스냅샷+구독 훅(useGameChat·useGameVotes·
// useGameNight·useGamePhase)이 마운트 시 서버 스냅샷을 재조회해 이미 자연스럽게 복원한다
// (Phase 3 "실시간·재접속 설계 원칙"). 이 훅은 그와 별개로 흩어져 있던 "내 역할·내 생존 여부·
// 현재 status/phase"의 1회성 복원 조회를 getResumeState 한 번으로 통합해, 재접속 시 역할 카드/
// 관전 모드 판정을 단일 소스에서 얻게 한다.
import { useEffect, useState } from "react";

import { getResumeState, type ResumeState } from "@/lib/game/actions";

interface UseGameResumeResult {
  /** 재접속 스냅샷(본인 role/생존 + 방 status/phase). 세션이 없거나 무효하면 null */
  resume: ResumeState | null;
  /** 스냅샷 조회 진행 중 여부 */
  loading: boolean;
}

/**
 * 세션 토큰으로 재접속 스냅샷을 조회한다.
 * @param sessionToken localStorage에 저장된 본인 세션 토큰(없으면 no-op)
 * @param recoveryKey (선택) 네트워크 복구 신호(useNetworkRecovery). 값이 바뀌면 스냅샷을
 *   다시 조회한다 — 오프라인/백그라운드 중 놓친 본인 생존 여부 변경을 복원하기 위함.
 * @param phaseKey (선택) 페이즈 변화 신호(예: `${status}:${phaseNumber}`). 값이 바뀌면
 *   스냅샷을 다시 조회한다 — 이단 대장 역할 승계(Task 022 · F027)로 본인 role이 바뀐 경우,
 *   다음 페이즈 진입 시 role을 갱신해 밤 행동 패널이 활성화되도록 하기 위함.
 */
export function useGameResume(
  sessionToken: string | null,
  recoveryKey?: number,
  phaseKey?: string | number,
): UseGameResumeResult {
  const [resume, setResume] = useState<ResumeState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!sessionToken) {
      setResume(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getResumeState(sessionToken)
      .then((result) => {
        if (!cancelled) setResume(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionToken, recoveryKey, phaseKey]);

  return { resume, loading };
}
