"use client";

import { useCallback, useEffect, useState } from "react";

import { getPlayerBySession, type SessionPlayer } from "@/lib/game/actions";

/** localStorage에 세션 토큰을 저장하는 키 */
const SESSION_STORAGE_KEY = "game_session_token";

interface UseGameSessionResult {
  /** 세션 토큰으로 복원된 참가자 정보. 세션이 없거나 무효하면 null */
  player: SessionPlayer | null;
  /** 세션 복원(검증) 진행 중 여부 */
  loading: boolean;
  /** 세션 토큰을 저장한다 */
  setSession: (token: string) => void;
  /** 세션 토큰을 제거한다 */
  clearSession: () => void;
}

/**
 * localStorage에 저장된 세션 토큰으로 참가자 세션을 복원/관리하는 훅.
 * mount 시 저장된 토큰이 있으면 Server Action(getPlayerBySession)으로 검증한다.
 */
export function useGameSession(): UseGameSessionResult {
  const [player, setPlayer] = useState<SessionPlayer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = window.localStorage.getItem(SESSION_STORAGE_KEY);

    if (!token) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    getPlayerBySession(token)
      .then((result) => {
        if (cancelled) return;

        if (result) {
          setPlayer(result);
        } else {
          // 유효하지 않은 토큰은 정리한다
          window.localStorage.removeItem(SESSION_STORAGE_KEY);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const setSession = useCallback((token: string) => {
    window.localStorage.setItem(SESSION_STORAGE_KEY, token);
  }, []);

  const clearSession = useCallback(() => {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    setPlayer(null);
  }, []);

  return { player, loading, setSession, clearSession };
}
