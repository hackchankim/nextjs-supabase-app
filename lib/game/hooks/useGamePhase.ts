"use client";

// 페이즈 전환 실데이터 훅 — 마운트 시 getRoomState 스냅샷 + 공개 room 채널의
// GAME_STARTED/PHASE_TRANSITION_SCHEDULED/PHASE_TRANSITION_CANCELLED/PHASE_CHANGED/
// GAME_ENDED/GAME_RESET Broadcast로 상태를 유지한다. game_rooms.status/phase_number/
// transition_*/winner는 모두 공개 정보라(role 아님) 인증 없이 조회·구독할 수 있다
// (무차별 UI 원칙에 위배되지 않는다).
//
// transition_at이 지나면 이 훅을 사용하는 모든 클라이언트가 commitPhaseTransition(roomId)을
// 자동 호출한다. 서버가 조건부 UPDATE(.not("transition_to","is",null))로 경합을 제거하므로
// 여러 클라이언트가 동시에 호출해도 실제 전환·부작용(시스템 메시지·PHASE_CHANGED)은 단
// 한 번만 일어난다(멱등) — 클라이언트 쪽에서 "누가 호출할지" 조율할 필요가 없다.
import { useEffect, useRef, useState } from "react";

import { commitPhaseTransition, getRoomState } from "@/lib/game/actions";
import {
  GAME_EVENTS,
  roomChannel,
  type GameEndedPayload,
  type GameStartedPayload,
  type PhaseChangedPayload,
  type PhaseTransitionScheduledPayload,
} from "@/lib/game/realtime";
import type { GameStatus, Winner } from "@/lib/game/types";
import { createClient } from "@/lib/supabase/client";

interface UseGamePhaseOptions {
  roomId: string;
  /**
   * 이미 알고 있는 초기 status 힌트(예: getPlayerBySession의 roomStatus) — getRoomState
   * 스냅샷이 도착하기 전 잠깐 동안 기본값("waiting")으로 페이즈 분기가 잘못 렌더되는 것을
   * 막기 위한 용도. 스냅샷이 도착하면 즉시 서버 값으로 덮어써진다(신뢰 원천은 항상 서버).
   */
  initialStatus?: GameStatus;
  /** GAME_RESET 수신 시 호출되는 콜백 (예: 대기실로 라우팅) — 생략 가능 */
  onReset?: () => void;
}

interface UseGamePhaseResult {
  status: GameStatus;
  phaseNumber: number;
  /** 전환 예정 상태 (카운트다운 중에만 값 존재) */
  transitionTo: GameStatus | null;
  /** 전환 완료 예정 시각 (ISO 문자열) */
  transitionAt: string | null;
  winner: Winner | null;
  /** 초기 스냅샷 로딩 중 여부 */
  loading: boolean;
}

export function useGamePhase({
  roomId,
  initialStatus,
  onReset,
}: UseGamePhaseOptions): UseGamePhaseResult {
  const [status, setStatus] = useState<GameStatus>(initialStatus ?? "waiting");
  const [phaseNumber, setPhaseNumber] = useState(0);
  const [transitionTo, setTransitionTo] = useState<GameStatus | null>(null);
  const [transitionAt, setTransitionAt] = useState<string | null>(null);
  const [winner, setWinner] = useState<Winner | null>(null);
  const [loading, setLoading] = useState(true);

  // onReset을 최신값으로 유지 — 구독 effect의 의존성에 넣어 매 렌더 재구독하지 않기 위함.
  const onResetRef = useRef(onReset);
  onResetRef.current = onReset;

  // initialStatus는 player 로드 시점(비동기)에 뒤늦게 확정될 수 있으므로(useGameSession),
  // 값이 도착하는 즉시 한 번 더 반영한다 — getRoomState 스냅샷이 도착하기 전까지의 임시값이다.
  useEffect(() => {
    if (initialStatus) setStatus(initialStatus);
  }, [initialStatus]);

  // 초기 스냅샷 로드
  useEffect(() => {
    if (!roomId) return;
    let cancelled = false;
    setLoading(true);

    getRoomState(roomId)
      .then((state) => {
        if (cancelled || !state) return;
        setStatus(state.status);
        setPhaseNumber(state.phaseNumber);
        setTransitionTo(state.transitionTo);
        setTransitionAt(state.transitionAt);
        setWinner(state.winner);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // 공개 room 채널 구독 — 델타만 반영한다.
  useEffect(() => {
    if (!roomId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(roomChannel(roomId))
      .on("broadcast", { event: GAME_EVENTS.GAME_STARTED }, ({ payload }) => {
        // waiting → day(1라운드) 전환 — 진행자가 게임을 시작한 시점을 실시간으로 반영한다.
        const update = payload as GameStartedPayload;
        setStatus(update.status);
        setPhaseNumber(update.phaseNumber);
      })
      .on("broadcast", { event: GAME_EVENTS.PHASE_TRANSITION_SCHEDULED }, ({ payload }) => {
        const update = payload as PhaseTransitionScheduledPayload;
        setTransitionTo(update.transitionTo);
        setTransitionAt(update.transitionAt);
      })
      .on("broadcast", { event: GAME_EVENTS.PHASE_TRANSITION_CANCELLED }, () => {
        setTransitionTo(null);
        setTransitionAt(null);
      })
      .on("broadcast", { event: GAME_EVENTS.PHASE_CHANGED }, ({ payload }) => {
        const update = payload as PhaseChangedPayload;
        setStatus(update.status);
        setPhaseNumber(update.phaseNumber);
        setTransitionTo(null);
        setTransitionAt(null);
      })
      .on("broadcast", { event: GAME_EVENTS.GAME_ENDED }, ({ payload }) => {
        // 결과(전원 역할 공개)는 각 화면이 별도로 getGameResult를 호출해 로드한다 —
        // 이 훅은 재접속 라우팅 판단에 필요한 status/winner만 최신으로 반영한다.
        const { winner: finishedWinner } = payload as GameEndedPayload;
        setStatus("ended");
        setWinner(finishedWinner);
        setTransitionTo(null);
        setTransitionAt(null);
      })
      .on("broadcast", { event: GAME_EVENTS.GAME_RESET }, () => {
        setStatus("waiting");
        setPhaseNumber(0);
        setTransitionTo(null);
        setTransitionAt(null);
        setWinner(null);
        onResetRef.current?.();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  // transition_at 경과 시 자동으로 확정을 시도한다 — 서버가 멱등이므로 여러 클라이언트가
  // 동시에 호출해도 안전하다(첫 호출만 실제 부작용을 낸다).
  useEffect(() => {
    if (!roomId || !transitionAt) return;

    const remainingMs = Date.parse(transitionAt) - Date.now();

    if (remainingMs <= 0) {
      void commitPhaseTransition(roomId);
      return;
    }

    const timer = setTimeout(() => {
      void commitPhaseTransition(roomId);
    }, remainingMs);

    return () => clearTimeout(timer);
  }, [roomId, transitionAt]);

  return { status, phaseNumber, transitionTo, transitionAt, winner, loading };
}
