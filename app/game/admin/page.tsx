"use client";

// 진행자 대시보드 (F004, F006, F009, F011~F014, F017~F020)
//
// 참가자 화면(입장/대기실/게임플레이)과 달리 이 페이지는 진행자 전용이므로
// 무차별 UI 원칙이 적용되지 않는다.
// - [스크린] 탭: 참가자도 함께 볼 수 있는 공개 화면(빔프로젝터)이다.
//   PlayerCard를 그대로 재사용하면 role을 props로 받지 않으므로 역할 노출 없이 안전하다.
// - [제어] 탭: 진행자만 보는 화면이므로 역할을 표로 노출하는 것이 스펙상 정상 동작이다.
//
// Task 009~012에서 참가자 목록·게임 시작·투표·밤 행동을 실데이터로 연결했고,
// Task 013에서 페이즈 전환(예약/취소/자동 확정)·수동 탈락 처리·게임 리셋을 useGamePhase +
// 해당 Server Action들로 연결해 더미 상태를 모두 제거했다. 시스템 메시지 발송/강제 게임 종료는
// 이 태스크 범위 밖이다(전자는 미구현, 후자는 승리 조건 자동 판정으로 대체).
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PhaseBanner } from "@/components/game/PhaseBanner";
import { PlayerCard } from "@/components/game/PlayerCard";
import {
  cancelPhaseTransition,
  closeVoting,
  getNightActionStatus,
  getRoomPlayers,
  manualEliminate,
  resetGame,
  resolveNight,
  resolveVoteElimination,
  startGame,
  startPhaseTransition,
  type NightActorStatus,
  type RoomPlayer,
} from "@/lib/game/actions";
import { useGamePhase } from "@/lib/game/hooks/useGamePhase";
import { ROLE_LABELS, MIN_PLAYERS, WINNER_LABELS } from "@/lib/game/constants";
import {
  GAME_EVENTS,
  roomChannel,
  type PlayerEliminatedPayload,
  type PlayerJoinedPayload,
  type VoteUpdatePayload,
} from "@/lib/game/realtime";
import type { GamePlayer } from "@/lib/game/types";
import { createClient } from "@/lib/supabase/client";

/** sessionStorage에 저장된 진행자 인증 컨텍스트 (verifyAdminPin 성공 시 game/page.tsx가 저장) */
interface AdminCtx {
  roomId: string;
  pin: string;
}

const ADMIN_CTX_KEY = "game_admin_ctx";

/** RoomPlayer(role 없음)를 기존 데모 UI가 기대하는 GamePlayer 형태로 변환한다.
 * 게임 시작 전에는 role이 없으므로 항상 null로 채운다. */
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

export default function GameAdminPage() {
  const router = useRouter();
  const [adminCtx, setAdminCtx] = useState<AdminCtx | null>(null);
  const [ctxChecked, setCtxChecked] = useState(false);

  // 실데이터 참가자 목록
  const [players, setPlayers] = useState<GamePlayer[]>([]);
  const [startError, setStartError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const [systemMessage, setSystemMessage] = useState("");

  // 페이즈 전환 제어 — 게임 시작(Task 013)
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);
  const [isEliminating, setIsEliminating] = useState<string | null>(null);
  const [eliminateError, setEliminateError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // 밤 행동 완료 현황(Task 012) — getNightActionStatus 실데이터 + NIGHT_ACTION_UPDATE 구독 시 재조회.
  const [nightActors, setNightActors] = useState<NightActorStatus[]>([]);
  const [nightStatusError, setNightStatusError] = useState<string | null>(null);
  const [isResolvingNight, setIsResolvingNight] = useState(false);
  const [nightResolveError, setNightResolveError] = useState<string | null>(null);
  // 한 번 밤 결과를 처리하면 같은 밤에는 재처리를 막는다(중복 시스템 메시지 방지) —
  // 여전히 클라이언트 가드다(resolveNight 자체는 서버 phase 마커로 멱등화되어 있지 않다).
  // status가 "night"으로 바뀌면(PHASE_CHANGED, 아래 effect) 다음 밤을 위해 초기화된다.
  const [nightResolved, setNightResolved] = useState(false);

  // 낮 투표 실데이터 — 초기 스냅샷 조회 수단이 없어(진행자는 세션 토큰이 없다) 0에서 시작해
  // VOTE_UPDATE Broadcast로만 채운다(참가자 목록의 PLAYER_JOINED 초기 로드와 달리 실시간 갱신 전용).
  const [tally, setTally] = useState<Record<string, number>>({});
  const [voterCount, setVoterCount] = useState(0);
  const [closeError, setCloseError] = useState<string | null>(null);
  const [isClosingVote, setIsClosingVote] = useState(false);
  const [tieCandidates, setTieCandidates] = useState<
    { id: string; nickname: string; count: number }[] | null
  >(null);

  // 페이즈 실데이터(Task 013) — 마운트 시 getRoomState 스냅샷 + PHASE_TRANSITION_*/
  // PHASE_CHANGED/GAME_ENDED/GAME_RESET Broadcast로 실시간 동기화된다. winner도 이 훅이
  // GAME_ENDED로 갱신하므로 별도의 winner state를 두지 않는다.
  const { status, phaseNumber, transitionTo, transitionAt, winner } = useGamePhase({
    roomId: adminCtx?.roomId ?? "",
    onReset: () => {
      setPlayers((prev) => prev.map((player) => ({ ...player, isAlive: true, role: null })));
      setTally({});
      setVoterCount(0);
      setCloseError(null);
      setStartError(null);
      setTieCandidates(null);
      setNightActors([]);
      setNightResolved(false);
      setNightStatusError(null);
      setTransitionError(null);
      setEliminateError(null);
    },
  });

  // 밤 결과 처리는 phase당 한 번만 허용하는 클라 가드다 — 새 밤이 시작(PHASE_CHANGED로
  // status가 night으로 바뀜)되면 다음 밤을 다시 처리할 수 있도록 초기화한다.
  useEffect(() => {
    if (status === "night") setNightResolved(false);
  }, [status]);

  // 투표 집계는 phase 스코프라 새 낮이 시작되면 이전 라운드 값이 남아 있으면 안 된다.
  useEffect(() => {
    if (status === "day") {
      setTally({});
      setVoterCount(0);
      setCloseError(null);
      setTieCandidates(null);
    }
  }, [status]);

  // sessionStorage에서 진행자 인증 컨텍스트 복원 — 없으면 입장 화면으로 되돌린다.
  useEffect(() => {
    const raw = window.sessionStorage.getItem(ADMIN_CTX_KEY);
    if (raw) {
      try {
        setAdminCtx(JSON.parse(raw) as AdminCtx);
      } catch {
        setAdminCtx(null);
      }
    }
    setCtxChecked(true);
  }, []);

  useEffect(() => {
    if (ctxChecked && !adminCtx) {
      router.replace("/game");
    }
  }, [ctxChecked, adminCtx, router]);

  // 초기 참가자 목록 로드
  useEffect(() => {
    if (!adminCtx) return;

    let cancelled = false;
    getRoomPlayers(adminCtx.roomId)
      .then((initialPlayers) => {
        if (cancelled) return;
        const mapped = initialPlayers.map((p) => toGamePlayer(p, adminCtx.roomId));
        // broadcast로 먼저 들어온 참가자를 덮어쓰지 않도록 병합한다.
        setPlayers((prev) => {
          const byId = new Map(prev.map((p) => [p.id, p]));
          mapped.forEach((p) => byId.set(p.id, p));
          return Array.from(byId.values());
        });
        setOnlineIds((prev) => {
          const next = new Set(prev);
          mapped.forEach((p) => next.add(p.id));
          return next;
        });
      })
      .catch(() => {
        if (!cancelled) setStartError("참가자 목록을 불러오지 못했습니다");
      });

    return () => {
      cancelled = true;
    };
  }, [adminCtx]);

  // 밤 행동 완료 현황을 다시 불러온다(PIN 게이트) — 초기 로드 및 NIGHT_ACTION_UPDATE 수신 시 호출한다.
  const loadNightStatus = useCallback(async () => {
    if (!adminCtx) return;
    const result = await getNightActionStatus(adminCtx.roomId, adminCtx.pin);
    if (result.ok) {
      setNightActors(result.actors);
      setNightStatusError(null);
    } else {
      setNightStatusError(result.error);
    }
  }, [adminCtx]);

  useEffect(() => {
    void loadNightStatus();
  }, [loadNightStatus]);

  // 실시간 구독 — 새 참가자 입장 (대기실과 동일한 공개 채널/이벤트)
  useEffect(() => {
    if (!adminCtx) return;

    const supabase = createClient();
    const channel = supabase
      .channel(roomChannel(adminCtx.roomId))
      .on("broadcast", { event: GAME_EVENTS.PLAYER_JOINED }, ({ payload }) => {
        const joined = payload as PlayerJoinedPayload;
        setPlayers((prev) => {
          if (prev.some((p) => p.id === joined.id)) return prev;
          return [...prev, toGamePlayer(joined, adminCtx.roomId)];
        });
        setOnlineIds((prev) => new Set(prev).add(joined.id));
      })
      .on("broadcast", { event: GAME_EVENTS.VOTE_UPDATE }, ({ payload }) => {
        const update = payload as VoteUpdatePayload;
        setTally(update.tally);
        setVoterCount(update.voterCount);
      })
      .on("broadcast", { event: GAME_EVENTS.PLAYER_ELIMINATED }, ({ payload }) => {
        const { playerId } = payload as PlayerEliminatedPayload;
        setPlayers((prev) =>
          prev.map((p) => (p.id === playerId ? { ...p, isAlive: false } : p)),
        );
      })
      .on("broadcast", { event: GAME_EVENTS.NIGHT_ACTION_UPDATE }, () => {
        // 집계값 자체는 페이로드로 오지만(무차별), 진행자 화면은 역할별 완료 여부(체크리스트)가
        // 필요하므로 PIN 게이트를 통해 재조회한다.
        void loadNightStatus();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [adminCtx, loadNightStatus]);

  const aliveCount = players.filter((player) => player.isAlive).length;
  const voteProgress = aliveCount > 0 ? (voterCount / aliveCount) * 100 : 0;
  // 조기 종료는 생존자 전원이 투표를 마쳤을 때만 허용한다(F018).
  const canCloseEarly = aliveCount > 0 && voterCount === aliveCount;

  // 게임 시작 가능 여부는 실제 game_rooms.status(useGamePhase)로 판단한다 —
  // 별도의 로컬 "시작됨" 플래그를 두지 않아 새로고침/재접속 후에도 항상 정확하다.
  const canStartGame = players.length >= MIN_PLAYERS && status === "waiting";

  const handleStartGame = useCallback(async () => {
    if (!adminCtx) return;
    setStartError(null);
    setIsStarting(true);
    try {
      const result = await startGame(adminCtx.roomId, adminCtx.pin);
      if (!result.ok) {
        setStartError(result.error);
      }
    } catch {
      setStartError("게임 시작에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsStarting(false);
    }
  }, [adminCtx]);

  /**
   * 투표를 마감한다 — 동률이면 tieCandidates를 채워 선택 Dialog를 띄우고,
   * 단독 최다 득표면 서버가 즉시 탈락 처리한다(결과는 PLAYER_ELIMINATED/GAME_ENDED
   * Broadcast로 화면에 반영되므로 여기서는 로컬 상태를 직접 건드리지 않는다).
   */
  const handleCloseVoting = useCallback(async () => {
    if (!adminCtx) return;
    setCloseError(null);
    setIsClosingVote(true);
    try {
      const result = await closeVoting(adminCtx.roomId, adminCtx.pin);
      if (result.ok) {
        setTieCandidates(null);
      } else if ("tie" in result) {
        setTieCandidates(result.candidates);
      } else {
        setCloseError(result.error);
      }
    } catch {
      setCloseError("투표 마감에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsClosingVote(false);
    }
  }, [adminCtx]);

  /** 동률 후보 중 한 명을 선택해 탈락을 확정한다. */
  const handleResolveTie = useCallback(
    async (targetId: string) => {
      if (!adminCtx) return;
      setCloseError(null);
      setIsClosingVote(true);
      try {
        const result = await resolveVoteElimination(adminCtx.roomId, adminCtx.pin, targetId);
        if (result.ok) {
          setTieCandidates(null);
        } else {
          setCloseError(result.error);
        }
      } catch {
        setCloseError("탈락 확정에 실패했습니다. 다시 시도해주세요.");
      } finally {
        setIsClosingVote(false);
      }
    },
    [adminCtx],
  );

  /**
   * 밤 결과를 처리한다 — kill 대상이 protect로 상쇄되지 않으면 탈락 처리(PLAYER_ELIMINATED
   * Broadcast로 화면에 반영), 아니면 무효 처리 시스템 메시지만 남는다. 밤→낮 전환은
   * 이 액션의 책임이 아니다(Task 013 소관) — status는 night로 유지된다.
   */
  const handleResolveNight = useCallback(async () => {
    if (!adminCtx) return;
    setNightResolveError(null);
    setIsResolvingNight(true);
    try {
      const result = await resolveNight(adminCtx.roomId, adminCtx.pin);
      if (result.ok) {
        setNightResolved(true);
        toast.success(
          result.eliminatedId ? "밤 사이 한 명이 제거되었습니다" : "밤 사이 아무도 제거되지 않았습니다",
        );
      } else {
        setNightResolveError(result.error);
      }
    } catch {
      setNightResolveError("밤 결과 처리에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsResolvingNight(false);
    }
  }, [adminCtx]);

  /**
   * 수동 탈락 처리(이견 처리용) — 생존자에 대해서만 의미가 있다. 실제 결과는
   * PLAYER_ELIMINATED Broadcast로 players 상태에 반영되므로 여기서는 로컬 상태를
   * 직접 건드리지 않는다(resolveElimination의 is_alive=true 가드로 멱등하다).
   */
  const handleManualEliminate = useCallback(
    async (playerId: string) => {
      if (!adminCtx) return;
      setEliminateError(null);
      setIsEliminating(playerId);
      try {
        const result = await manualEliminate(adminCtx.roomId, adminCtx.pin, playerId);
        if (!result.ok) {
          setEliminateError(result.error);
        }
      } catch {
        setEliminateError("탈락 처리에 실패했습니다. 다시 시도해주세요.");
      } finally {
        setIsEliminating(null);
      }
    },
    [adminCtx],
  );

  // 강퇴 — 탈락 처리 + 접속 상태 오프라인 처리 (데모, Task 013-1 소관)
  function handleKick(playerId: string) {
    setPlayers((prev) =>
      prev.map((player) =>
        player.id === playerId ? { ...player, isAlive: false } : player,
      ),
    );
    setOnlineIds((prev) => {
      const next = new Set(prev);
      next.delete(playerId);
      return next;
    });
  }

  /** 페이즈 전환을 예약한다 — 현재 상태의 반대로 10초 카운트다운을 시작한다. */
  const handleRequestTransition = useCallback(async () => {
    if (!adminCtx) return;
    if (status !== "day" && status !== "night") return;
    const next = status === "day" ? "night" : "day";
    setTransitionError(null);
    setIsTransitioning(true);
    try {
      const result = await startPhaseTransition(adminCtx.roomId, adminCtx.pin, next);
      if (!result.ok) {
        setTransitionError(result.error);
      }
    } catch {
      setTransitionError("전환 예약에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setIsTransitioning(false);
    }
  }, [adminCtx, status]);

  /** 예약된 페이즈 전환을 취소한다. */
  const handleCancelTransition = useCallback(async () => {
    if (!adminCtx) return;
    setTransitionError(null);
    try {
      const result = await cancelPhaseTransition(adminCtx.roomId, adminCtx.pin);
      if (!result.ok) {
        setTransitionError(result.error);
      }
    } catch {
      setTransitionError("전환 취소에 실패했습니다. 다시 시도해주세요.");
    }
  }, [adminCtx]);

  /** 게임을 초기화한다 — 되돌릴 수 없으므로 확인 절차를 거친다. */
  const handleResetGame = useCallback(() => {
    if (!adminCtx) return;
    if (
      !window.confirm(
        "정말로 게임을 초기화하시겠습니까? 투표·채팅·역할 등 모든 진행 상황이 삭제됩니다.",
      )
    ) {
      return;
    }
    setResetError(null);
    setIsResetting(true);
    resetGame(adminCtx.roomId, adminCtx.pin)
      .then((result) => {
        if (!result.ok) setResetError(result.error);
      })
      .catch(() => setResetError("게임 초기화에 실패했습니다. 다시 시도해주세요."))
      .finally(() => setIsResetting(false));
  }, [adminCtx]);

  if (!ctxChecked || !adminCtx) {
    return null;
  }

  return (
    <section className="mx-auto flex w-full max-w-4xl flex-col gap-4" data-route="game-admin">
      <div className="text-center">
        <h1 className="text-2xl font-bold">진행자 대시보드</h1>
        <p className="text-muted-foreground">
          스크린 화면은 참가자에게 공유하고, 제어판으로 게임을 진행하세요.
        </p>
      </div>

      {/* 게임 종료 배너 — 승리 팀 텍스트까지만(전원 역할 공개 그리드는 참가자 결과 화면에만 존재) */}
      {winner && (
        <div className="rounded-lg border bg-muted p-3 text-center text-lg font-bold">
          {WINNER_LABELS[winner]}
        </div>
      )}

      <Tabs defaultValue="screen">
        <TabsList>
          <TabsTrigger value="screen">스크린</TabsTrigger>
          <TabsTrigger value="control">제어</TabsTrigger>
        </TabsList>

        {/* 스크린 탭 — 참가자도 함께 보는 공개 화면(빔프로젝터). 역할 노출 금지 */}
        <TabsContent value="screen" className="flex flex-col gap-4">
          <PhaseBanner
            status={status}
            phaseNumber={phaseNumber}
            transitionTo={transitionTo}
            transitionAt={transitionAt}
          />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {players.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))}
          </div>

          <div className="flex flex-col gap-1.5 rounded-lg border p-4">
            <span className="text-sm font-medium text-muted-foreground">투표 현황</span>
            <Progress value={voteProgress} />
            <span className="text-sm text-muted-foreground">
              {voterCount}/{aliveCount}명 투표 완료
            </span>
            <div className="mt-2 flex flex-col gap-1.5">
              {players
                .filter((player) => player.isAlive)
                .map((player) => (
                  <div key={player.id} className="flex items-center gap-2">
                    <span className="w-20 shrink-0 truncate text-sm">{player.nickname}</span>
                    <Progress
                      value={aliveCount > 0 ? ((tally[player.id] ?? 0) / aliveCount) * 100 : 0}
                      className="flex-1"
                    />
                    <span className="w-8 shrink-0 text-right text-sm text-muted-foreground">
                      {tally[player.id] ?? 0}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </TabsContent>

        {/* 제어 탭 — 진행자 전용 화면. 역할을 표로 노출하는 것이 스펙상 정상 동작 */}
        <TabsContent value="control" className="flex flex-col gap-6">
          {/* 참가자 관리 표 (닉네임 / 역할 / 생존 여부 / 접속 상태 + 탈락 처리/강퇴) */}
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left">
                <tr>
                  <th className="p-2 font-medium" scope="col">닉네임</th>
                  <th className="p-2 font-medium" scope="col">역할</th>
                  <th className="p-2 font-medium" scope="col">생존</th>
                  <th className="p-2 font-medium" scope="col">접속</th>
                  <th className="p-2 font-medium text-right" scope="col">관리</th>
                </tr>
              </thead>
              <tbody>
                {players.map((player) => (
                  <tr key={player.id} className="border-t">
                    <td className="p-2">{player.nickname}</td>
                    <td className="p-2">{player.role ? ROLE_LABELS[player.role] : "-"}</td>
                    <td className="p-2">
                      <Badge variant={player.isAlive ? "secondary" : "outline"}>
                        {player.isAlive ? "생존" : "탈락"}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <Badge variant="outline" className="gap-1.5">
                        <span
                          className="h-1.5 w-1.5 shrink-0 rounded-full bg-current"
                          aria-hidden="true"
                        />
                        {onlineIds.has(player.id) ? "온라인" : "오프라인"}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={
                            !player.isAlive ||
                            isEliminating === player.id ||
                            (status !== "day" && status !== "night")
                          }
                          onClick={() => void handleManualEliminate(player.id)}
                        >
                          탈락 처리
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => handleKick(player.id)}
                        >
                          강퇴
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {eliminateError && <p className="text-destructive text-sm">{eliminateError}</p>}

          {/* 게임 시작 제어 — 최소 인원 미달 시 버튼을 노출하지 않는다 */}
          <div className="flex flex-col gap-2 rounded-lg border p-4">
            <span className="text-sm font-medium text-muted-foreground">
              현재 인원 {players.length} / 최소 {MIN_PLAYERS}명
            </span>
            {canStartGame ? (
              <Button
                type="button"
                size="lg"
                onClick={() => void handleStartGame()}
                disabled={isStarting}
              >
                게임 시작
              </Button>
            ) : status !== "waiting" ? (
              <p className="text-sm text-muted-foreground">게임이 시작되었습니다.</p>
            ) : (
              <p className="text-sm text-muted-foreground">
                참가자가 더 모이면 게임을 시작할 수 있습니다.
              </p>
            )}
            {startError && <p className="text-destructive text-sm">{startError}</p>}
          </div>

          {/* 페이즈 전환 제어 — 낮/밤 상태에서만 의미가 있다(대기/종료 중에는 숨긴다) */}
          {(status === "day" || status === "night") && (
            <div className="flex flex-col gap-2 rounded-lg border p-4">
              <span className="text-sm font-medium text-muted-foreground">페이즈 전환</span>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  onClick={() => void handleRequestTransition()}
                  disabled={!!transitionTo || isTransitioning || winner !== null}
                >
                  {status === "day" ? "밤으로 전환" : "낮으로 전환"}
                </Button>
                {transitionTo && (
                  <>
                    <span className="text-sm text-muted-foreground">전환 대기 중...</span>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleCancelTransition()}
                    >
                      전환 취소
                    </Button>
                  </>
                )}
              </div>
              {transitionError && <p className="text-destructive text-sm">{transitionError}</p>}
            </div>
          )}

          {/* 투표 마감 제어 */}
          <div className="flex flex-col gap-2 rounded-lg border p-4">
            <span className="text-sm font-medium text-muted-foreground">투표 진행률</span>
            <Progress value={voteProgress} />
            <span className="text-sm text-muted-foreground">
              {voterCount}/{aliveCount}명 투표 완료
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => void handleCloseVoting()}
                disabled={isClosingVote || winner !== null}
              >
                투표 마감
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleCloseVoting()}
                disabled={isClosingVote || !canCloseEarly || winner !== null}
              >
                투표 조기 종료
              </Button>
            </div>
            {closeError && <p className="text-destructive text-sm">{closeError}</p>}
          </div>

          {/* 밤 행동 완료 체크리스트 (이단 대장 · 목사님 · 권사님) — getNightActionStatus 실데이터 */}
          <div className="flex flex-col gap-2 rounded-lg border p-4">
            <span className="text-sm font-medium text-muted-foreground">
              밤 행동 완료 체크리스트
            </span>
            {nightActors.length === 0 ? (
              <p className="text-sm text-muted-foreground">밤 행동 권한자가 없습니다.</p>
            ) : (
              nightActors.map((actor) => (
                <div key={actor.id} className="flex items-center gap-2 text-sm">
                  <Badge variant={actor.acted ? "secondary" : "outline"}>
                    {actor.acted ? "완료" : "대기"}
                  </Badge>
                  {actor.nickname} ({ROLE_LABELS[actor.role]})
                </div>
              ))
            )}
            {nightStatusError && (
              <p className="text-destructive text-sm">{nightStatusError}</p>
            )}
            <Button
              type="button"
              onClick={() => void handleResolveNight()}
              disabled={isResolvingNight || winner !== null || nightResolved}
            >
              밤 결과 처리
            </Button>
            {nightResolveError && (
              <p className="text-destructive text-sm">{nightResolveError}</p>
            )}
          </div>

          {/* 시스템 메시지 발송 (데모, 실제 발송 로직 없음) */}
          <div className="flex flex-col gap-2 rounded-lg border p-4">
            <span className="text-sm font-medium text-muted-foreground">시스템 메시지</span>
            <div className="flex gap-2">
              <Input
                value={systemMessage}
                onChange={(event) => setSystemMessage(event.target.value)}
                placeholder="전체 참가자에게 보낼 메시지를 입력하세요"
              />
              <Button type="button" disabled title="이후 태스크에서 Server Action으로 구현 예정">
                전송
              </Button>
            </div>
          </div>

          {/* 게임 종료/초기화 — 강제 종료는 범위 밖(승리 조건 자동 판정), 리셋은 실제 동작 */}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="destructive"
                disabled
                title="승리 조건 충족 시 자동으로 종료됩니다"
              >
                게임 종료
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleResetGame}
                disabled={isResetting}
              >
                게임 리셋
              </Button>
            </div>
            {resetError && <p className="text-destructive text-sm">{resetError}</p>}
          </div>
        </TabsContent>
      </Tabs>

      {/* 동률 발생 시 진행자가 탈락자를 직접 선택하는 Dialog */}
      <Dialog open={tieCandidates !== null} onOpenChange={(open) => !open && setTieCandidates(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>동률 발생 — 탈락자를 선택하세요</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {tieCandidates?.map((candidate) => (
              <Button
                key={candidate.id}
                type="button"
                variant="outline"
                className="justify-between"
                onClick={() => void handleResolveTie(candidate.id)}
                disabled={isClosingVote}
              >
                <span>{candidate.nickname}</span>
                <span className="text-muted-foreground">{candidate.count}표</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
