"use client";

// 대기실 (F003 실시간 목록 · F004 역할 배분 대기)
// 참가자 전용 화면 — 강퇴/게임 시작 등 진행자 전용 기능은 노출하지 않는다.
// 실시간 참가자 목록은 서버가 정제된 페이로드만 Broadcast로 송출하는 채널(room:{roomId})을
// 구독해 받는다. Postgres Changes는 사용하지 않는다(anon에게 role/session_token까지
// 전체 행이 노출되는 것이 실측으로 확인됨).
import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { PlayerCard } from "@/components/game/PlayerCard";
import { getRoomPlayers, leaveGame, type RoomPlayer } from "@/lib/game/actions";
import { MIN_PLAYERS } from "@/lib/game/constants";
import {
  GAME_EVENTS,
  roomChannel,
  type PlayerJoinedPayload,
  type PlayerLeftPayload,
} from "@/lib/game/realtime";
import { useGameSession } from "@/lib/game/hooks/useGameSession";
import { createClient } from "@/lib/supabase/client";
import type { GamePlayer } from "@/lib/game/types";

/** RoomPlayer(role 없음)를 PlayerCard가 기대하는 GamePlayer 형태로 변환한다.
 * 대기실은 역할 배분 전이라 role은 항상 null이고, roomId/lastSeenAt/sessionToken은
 * PlayerCard가 사용하지 않으므로 빈 값으로 채운다. */
function toGamePlayer(player: RoomPlayer, roomId: string): GamePlayer {
  return {
    id: player.id,
    roomId,
    nickname: player.nickname,
    role: null,
    isAlive: player.isAlive,
    lastSeenAt: null,
    sessionToken: "",
  };
}

export default function GameWaitingPage() {
  const router = useRouter();
  const { player, loading, sessionToken, clearSession } = useGameSession();
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [isLeaving, startLeaving] = useTransition();

  // 대기실에서 스스로 나가기(F021) — 본인 세션으로 leaveGame 호출 후 세션을 정리하고 입장 화면으로.
  const handleLeave = useCallback(() => {
    if (!sessionToken) return;
    if (!window.confirm("대기실에서 나가시겠습니까?")) return;
    setLeaveError(null);
    startLeaving(async () => {
      const result = await leaveGame(sessionToken);
      if (result.ok) {
        clearSession();
        router.replace("/game");
      } else if (result.error.includes("시작")) {
        // 나가려는 사이 게임이 시작된 경우 — 게임 화면으로 이어붙인다.
        router.replace("/game/play");
      } else {
        // 그 외 일시적 오류는 대기실에 머무르며 사유를 안내한다.
        setLeaveError(result.error);
      }
    });
  }, [sessionToken, clearSession, router]);

  // 세션/상태 기반 라우팅:
  // - 세션이 없으면 입장 화면으로
  // - 이미 게임이 시작된 뒤(대기 상태가 아님) 복귀했으면 게임 화면으로 이어붙인다.
  useEffect(() => {
    if (loading) return;
    if (!player) {
      router.replace("/game");
    } else if (player.roomStatus !== "waiting") {
      router.replace("/game/play");
    }
  }, [loading, player, router]);

  // 초기 참가자 목록 로드 — broadcast로 먼저 들어온 참가자를 덮어쓰지 않도록 병합한다.
  useEffect(() => {
    if (!player) return;

    let cancelled = false;
    getRoomPlayers(player.roomId)
      .then((initialPlayers) => {
        if (cancelled) return;
        setPlayers((prev) => {
          const byId = new Map(prev.map((p) => [p.id, p]));
          initialPlayers.forEach((p) => byId.set(p.id, p));
          return Array.from(byId.values());
        });
      })
      .catch(() => {
        if (!cancelled) setLoadError("참가자 목록을 불러오지 못했습니다");
      });

    return () => {
      cancelled = true;
    };
  }, [player]);

  const handleGameStarted = useCallback(() => {
    router.push("/game/play");
  }, [router]);

  // 실시간 구독 — 새 참가자 입장 / 게임 시작
  useEffect(() => {
    if (!player) return;

    const supabase = createClient();
    const channel = supabase
      .channel(roomChannel(player.roomId))
      .on("broadcast", { event: GAME_EVENTS.PLAYER_JOINED }, ({ payload }) => {
        const joined = payload as PlayerJoinedPayload;
        setPlayers((prev) => {
          if (prev.some((p) => p.id === joined.id)) return prev;
          return [...prev, joined];
        });
      })
      .on("broadcast", { event: GAME_EVENTS.GAME_STARTED }, () => {
        handleGameStarted();
      })
      .on("broadcast", { event: GAME_EVENTS.PLAYER_LEFT }, ({ payload }) => {
        const { playerId } = payload as PlayerLeftPayload;
        setPlayers((prev) => prev.filter((p) => p.id !== playerId));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [player, handleGameStarted]);

  if (loading || !player) {
    return null;
  }

  return (
    <section className="flex flex-col gap-6" data-route="game-waiting">
      <div className="flex flex-col gap-2 text-center">
        <h1 className="text-2xl font-bold">대기실</h1>
        <p className="text-muted-foreground">
          참가자들이 모두 모이면 진행자가 게임을 시작합니다.
        </p>
        <p className="text-sm font-medium">
          현재 인원 {players.length} / 최소 {MIN_PLAYERS}명
        </p>
        {loadError && <p className="text-sm text-destructive">{loadError}</p>}
      </div>

      <div className="flex flex-col gap-3">
        {players.map((roomPlayer) => (
          <PlayerCard
            key={roomPlayer.id}
            player={toGamePlayer(roomPlayer, player.roomId)}
            showAliveStatus={false}
          />
        ))}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        참가자를 기다리는 중입니다...
      </p>

      <div className="flex flex-col items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleLeave}
          disabled={isLeaving}
        >
          나가기
        </Button>
        {leaveError && <p className="text-sm text-destructive">{leaveError}</p>}
      </div>
    </section>
  );
}
