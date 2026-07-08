"use client";

// 참가자 온라인/오프라인 접속 상태(F020) — Supabase Realtime Presence 훅.
//
// 접속 상태는 "연결이 살아 있는가"라는 실시간 신호이므로 DB 폴링(last_seen_at 하트비트)보다
// Realtime Presence가 본질적으로 더 정확하고 저비용이다(끊김 즉시 leave 이벤트). 따라서 이 훅을
// 온라인 판정의 단일 소스로 삼는다. Presence 채널에는 비밀 컬럼이 없으므로(playerId만) anon으로도
// 안전하게 구독/track할 수 있고, RLS가 필요 없다(공개 Broadcast 채널과 동일).
import { useEffect, useState } from "react";

import { presenceChannel } from "@/lib/game/realtime";
import { createClient } from "@/lib/supabase/client";

/**
 * 방의 온라인 참가자 id 집합을 반환한다.
 *
 * @param roomId 대상 방 id (없으면 no-op)
 * @param selfPlayerId 본인 참가자 id. 넘기면 본인을 Presence에 track한다(참가자 화면).
 *   null/undefined면 track하지 않고 읽기만 한다(진행자 대시보드 — 진행자는 참가자 레코드가 없다).
 * @param recoveryKey (선택) 네트워크 복구 신호(useNetworkRecovery). 값이 바뀌면 채널을
 *   재구독해 본인 track을 다시 수행한다 — 백그라운드 복귀 후 presence leave/미갱신 방지.
 * @returns 온라인 상태인 참가자 id들의 Set (Presence key = playerId)
 */
export function useGamePresence(
  roomId: string | null,
  selfPlayerId?: string | null,
  recoveryKey?: number,
): Set<string> {
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!roomId) {
      setOnlineIds(new Set());
      return;
    }

    const supabase = createClient();
    // Presence key를 playerId로 지정해 presenceState()의 키가 곧 참가자 id가 되게 한다.
    const channel = supabase.channel(presenceChannel(roomId), {
      config: { presence: { key: selfPlayerId ?? "" } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        // presenceState()의 키 = track할 때 넘긴 presence key(=playerId). track하지 않은
        // 진행자 자신은 빈 key로 참여하므로 집합에 포함되지 않는다(""는 제외).
        const state = channel.presenceState();
        const ids = Object.keys(state).filter((id) => id.length > 0);
        setOnlineIds(new Set(ids));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED" && selfPlayerId) {
          void channel.track({ playerId: selfPlayerId });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, selfPlayerId, recoveryKey]);

  return onlineIds;
}
