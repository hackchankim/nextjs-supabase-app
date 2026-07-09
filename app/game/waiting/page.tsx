"use client";

// 대기실 (F003 실시간 목록 · F004 역할 배분 대기)
// 참가자 전용 화면 — 강퇴/게임 시작 등 진행자 전용 기능은 노출하지 않는다.
// 실시간 참가자 목록은 서버가 정제된 페이로드만 Broadcast로 송출하는 채널(room:{roomId})을
// 구독해 받는다. Postgres Changes는 사용하지 않는다(anon에게 role/session_token까지
// 전체 행이 노출되는 것이 실측으로 확인됨).
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
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
import { useGamePresence } from "@/lib/game/hooks/useGamePresence";
import { useGameSession } from "@/lib/game/hooks/useGameSession";
import { useNetworkRecovery } from "@/lib/game/hooks/useNetworkRecovery";
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
  // 참가자 목록 최초 로드 완료 여부 — true가 되면 이후 재조회(recoveryKey 변경)는
  // 병합이 아닌 전체 교체로 처리한다(아래 참가자 목록 로드 effect 참고).
  const didInitialFetchRef = useRef(false);
  // 전체 교체(재조회) 중 PLAYER_JOINED/PLAYER_LEFT가 도착했는지 추적한다(코드 리뷰 반영) —
  // fetch가 진행되는 사이 delta가 먼저 반영된 뒤 뒤늦게 도착한 stale 스냅샷이 그 상태를
  // 덮어쓰는 레이스를 막기 위함. 최초 마운트의 병합 경로는 이 레이스에 안전하므로(union만
  // 하고 제거는 하지 않음) 대상이 아니다 — 전체 교체 분기에서만 사용한다.
  const playersSnapshotStaleRef = useRef(false);

  // 오프라인/백그라운드 복귀 감지(Task 015) — recoveryKey를 아래 스냅샷 재조회·채널 재구독에
  // 흘려보내 이탈 중 놓친 참가자 입장/게임 시작 이벤트를 복원한다.
  const { recoveryKey } = useNetworkRecovery();

  // 접속 상태(F020) — 본인을 Presence에 track하고(진행자 화면에 온라인으로 보이도록)
  // 동시에 다른 참가자의 온라인 여부를 읽어 카드에 배지로 표시한다.
  const onlineIds = useGamePresence(player?.roomId ?? null, player?.id ?? null, recoveryKey);

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
  // 단, 네트워크 복구로 인한 재조회(recoveryKey 변경)는 서버 목록을 그대로 신뢰해야 한다 —
  // 이탈 중 놓친 PLAYER_LEFT(퇴장/강퇴)까지 정확히 반영하려면 병합이 아닌 전체 교체가 필요하다.
  // 전체 교체 분기는 fetch 진행 중 도착한 delta(playersSnapshotStaleRef)가 있으면 stale
  // 스냅샷을 적용하지 않고 1회 재조회한다(재시도는 무한 루프 방지를 위해 최대 1회).
  useEffect(() => {
    if (!player) return;

    let cancelled = false;
    let retried = false;
    const isRecoveryRefetch = didInitialFetchRef.current;
    if (isRecoveryRefetch) {
      playersSnapshotStaleRef.current = false;
    }

    const load = () => {
      getRoomPlayers(player.roomId)
        .then((initialPlayers) => {
          if (cancelled) return;
          if (isRecoveryRefetch) {
            if (playersSnapshotStaleRef.current && !retried) {
              retried = true;
              playersSnapshotStaleRef.current = false;
              load();
              return;
            }
            playersSnapshotStaleRef.current = false;

            // 본인이 오프라인/백그라운드 상태였던 사이 진행자에 의해 강퇴됐다면 서버 목록에
            // 본인이 더 이상 없다 — PLAYER_LEFT broadcast의 self-check와 동일하게 처리한다
            // (그 broadcast 자체를 놓쳤을 가능성이 높으므로 재조회 결과로 직접 판단해야 한다).
            const stillPresent = initialPlayers.some((p) => p.id === player.id);
            if (!stillPresent) {
              window.alert("진행자에 의해 대기실에서 내보내졌습니다.");
              clearSession();
              router.replace("/game");
              return;
            }

            setPlayers(initialPlayers);
          } else {
            setPlayers((prev) => {
              const byId = new Map(prev.map((p) => [p.id, p]));
              initialPlayers.forEach((p) => byId.set(p.id, p));
              return Array.from(byId.values());
            });
          }
          didInitialFetchRef.current = true;
        })
        .catch(() => {
          if (!cancelled) setLoadError("참가자 목록을 불러오지 못했습니다");
        });
    };
    load();

    return () => {
      cancelled = true;
    };
  }, [player, recoveryKey, clearSession, router]);

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
        playersSnapshotStaleRef.current = true;
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
        playersSnapshotStaleRef.current = true;
        const { playerId } = payload as PlayerLeftPayload;
        // 본인이 진행자에 의해 강퇴된 경우 — 남은 session_token은 이미 삭제된 레코드를
        // 가리키므로 즉시 세션을 정리하고 입장 화면으로 돌려보낸다(play 화면의 자기 탈락
        // 처리와 동일한 self-check). 그렇지 않으면 강퇴 후에도 화면에 머무르게 된다.
        if (playerId === player.id) {
          window.alert("진행자에 의해 대기실에서 내보내졌습니다.");
          clearSession();
          router.replace("/game");
          return;
        }
        setPlayers((prev) => prev.filter((p) => p.id !== playerId));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [player, handleGameStarted, clearSession, router, recoveryKey]);

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
            isOnline={onlineIds.has(roomPlayer.id)}
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
          className="min-h-11"
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
