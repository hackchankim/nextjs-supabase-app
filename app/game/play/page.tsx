"use client";

// 게임 플레이 (F005~F011, F014~F017) — 역할 무차별 UI
// 밤 행동 패널의 라벨/문구/외형은 역할과 무관하게 항상 동일해야 한다 (actionLabel="밤 행동" 고정).
// 채팅은 useGameChat(Task 010)으로 실데이터에 연결한다 — 비밀 채널 탭은 역할과 무관하게
// 전원 동일하게 렌더되며, 실제 열람/전송 자격은 서버(actions.ts)가 최종 검증한다.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Users, Vote } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActionPanel } from "@/components/game/ActionPanel";
import { ChatPanel } from "@/components/game/ChatPanel";
import { DirectMessageTab } from "@/components/game/DirectMessageTab";
import { PhaseBanner } from "@/components/game/PhaseBanner";
import { RoleCard } from "@/components/game/RoleCard";
import { SecretChannelTab } from "@/components/game/SecretChannelTab";
import { VoteButton } from "@/components/game/VoteButton";
import {
  getGameResult,
  getMyRole,
  getRoomPlayers,
  type GameResultPlayer,
  type RoomPlayer,
} from "@/lib/game/actions";
import { useGameChat } from "@/lib/game/hooks/useGameChat";
import { useGameNight } from "@/lib/game/hooks/useGameNight";
import { useGamePhase } from "@/lib/game/hooks/useGamePhase";
import { useGamePresence } from "@/lib/game/hooks/useGamePresence";
import { useGameSession } from "@/lib/game/hooks/useGameSession";
import { useGameVotes } from "@/lib/game/hooks/useGameVotes";
import {
  GAME_EVENTS,
  roomChannel,
  type ChatMessagePayload,
  type GameEndedPayload,
  type PlayerEliminatedPayload,
} from "@/lib/game/realtime";
import { ROLE_LABELS, WINNER_LABELS } from "@/lib/game/constants";
import type { ChatChannel, GameMessage, GamePlayer, PlayerRole, Winner } from "@/lib/game/types";
import { canPerformNightAction, isCouncil, isHeretic } from "@/lib/game/utils";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type SecretMembership = "heretic" | "council" | "none";

/**
 * RoomPlayer(role 없음)를 ActionPanel/VoteButton/DirectMessageTab이 기대하는
 * GamePlayer 형태로 변환한다. 이 화면에서 남의 role은 어떤 경로로도 조회하지
 * 않으므로 항상 null로 채운다 — lastSeenAt/sessionToken도 각 컴포넌트가
 * 사용하지 않으므로 빈 값으로 채운다.
 */
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

/** Broadcast/스냅샷으로 받은 ChatMessagePayload(role 없음)를 채팅 UI가 기대하는 GameMessage로 변환한다. */
function toGameMessage(payload: ChatMessagePayload, roomId: string): GameMessage {
  return {
    id: payload.id,
    roomId,
    playerId: payload.senderId,
    recipientId: payload.recipientId,
    content: payload.text,
    channel: payload.channel,
    createdAt: payload.createdAt,
    senderNickname: payload.senderNickname,
  };
}

export default function GamePlayPage() {
  const router = useRouter();
  const { player, loading, sessionToken } = useGameSession();

  // 접속 상태(F020) — 게임 중에도 본인을 Presence에 track해 진행자 화면에 온라인으로 보이게 한다.
  // 이 화면은 다른 참가자의 배지를 렌더하지 않으므로 반환값은 사용하지 않는다(track 목적).
  useGamePresence(player?.roomId ?? null, player?.id ?? null);

  // 본인 role — 밤 행동 가능 여부·비밀 채널 소속 계산에만 쓰인다. 남의 role은 절대 조회하지 않는다.
  const [role, setRole] = useState<PlayerRole | null>(null);
  const [players, setPlayers] = useState<RoomPlayer[]>([]);
  const [nightActionTargetId, setNightActionTargetId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"public" | "secret" | "dm">("public");
  // winner는 게임 종료 상태 그 자체(한 번 확정되면 되돌리지 않는다) — 투표 패널을 감추는 근거.
  // 종료 오버레이의 여닫기는 별도 상태(resultOpen)로 분리해, 닫아도 winner가 유지되도록 한다.
  const [winner, setWinner] = useState<Winner | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  // 게임 종료 후 전원 역할 공개 그리드 데이터 — status='ended' 확정 후에만 getGameResult로 채워진다.
  const [resultPlayers, setResultPlayers] = useState<GameResultPlayer[]>([]);
  // 본인 탈락 여부 — useGameSession의 player.isAlive는 마운트 시 1회만 세팅되므로,
  // PLAYER_ELIMINATED로 본인이 탈락하면 이 플래그로 즉시 입력을 비활성화한다.
  const [selfEliminated, setSelfEliminated] = useState(false);

  // 페이즈 실데이터 — 마운트 시 getRoomState 스냅샷 + PHASE_TRANSITION_*/PHASE_CHANGED/GAME_RESET
  // Broadcast로 실시간 동기화된다(player.roomStatus는 마운트 시 1회 스냅샷이라 더 이상 화면
  // 렌더링에 쓰지 않는다 — 초기 라우팅 가드에만 사용).
  const { status, phaseNumber, transitionTo, transitionAt } = useGamePhase({
    roomId: player?.roomId ?? "",
    initialStatus: player?.roomStatus,
    onReset: () => router.replace("/game/waiting"),
  });

  // 세션 기반 라우팅 가드 — 세션 없으면 입장 화면, 아직 대기 중이면 대기실로.
  useEffect(() => {
    if (loading) return;
    if (!player) {
      router.replace("/game");
    } else if (player.roomStatus === "waiting") {
      router.replace("/game/waiting");
    }
  }, [loading, player, router]);

  // 본인 role 조회 (getMyRole은 세션 토큰으로 본인 1건만 반환한다)
  useEffect(() => {
    if (!sessionToken) return;
    let cancelled = false;
    getMyRole(sessionToken).then((result) => {
      if (!cancelled && result) setRole(result.role);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionToken]);

  // 참가자 목록 — 생존 현황 칩·DM 대상·투표/밤 행동 대상 (role/session_token 미포함)
  useEffect(() => {
    if (!player) return;
    let cancelled = false;
    getRoomPlayers(player.roomId).then((result) => {
      if (!cancelled) setPlayers(result);
    });
    return () => {
      cancelled = true;
    };
  }, [player]);

  // 비밀 채널 소속 — 본인 role로만 계산한다. 탭 자체는 소속과 무관하게 항상 노출된다(무차별 UI).
  const membership: SecretMembership = isHeretic(role)
    ? "heretic"
    : isCouncil(role)
      ? "council"
      : "none";

  // 현재 활성 탭에 대응하는 실제 채팅 채널 — 비활성 탭에 도착한 메시지 토스트 알림 판단에 쓰인다.
  const activeChannel: ChatChannel | null =
    activeTab === "public" ? "public" : activeTab === "dm" ? "dm" : membership === "none" ? null : membership;

  const { messagesByChannel, sendMessage } = useGameChat({
    roomId: player?.roomId ?? "",
    sessionToken: sessionToken ?? "",
    activeChannel,
  });

  const handleSend = async (channel: ChatChannel, text: string, recipientId?: string) => {
    const result = await sendMessage(channel, text, recipientId);
    if (!result.ok) {
      toast.error(result.error);
    }
  };

  // 낮 투표 실데이터 — 초기 스냅샷 + VOTE_UPDATE 델타(집계만, 개별 투표자→대상 매핑 없음)
  const { tally, myVote, castVote } = useGameVotes({
    roomId: player?.roomId ?? "",
    sessionToken: sessionToken ?? "",
  });

  const handleVote = async (targetId: string) => {
    const result = await castVote(targetId);
    if (!result.ok) {
      toast.error(result.error);
    }
  };

  // 밤 행동 실데이터 — 조사 결과(있다면)는 훅 내부에서 본인에게만 toast로 표시된다.
  const { submitNightAction } = useGameNight({
    roomId: player?.roomId ?? "",
    sessionToken: sessionToken ?? "",
  });

  const handleNightAction = async (targetId: string) => {
    const result = await submitNightAction(targetId);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    setNightActionTargetId(targetId);
  };

  // 탈락/종료 구독 — 채팅·투표와는 별도 채널 인스턴스로 간단히 구독한다.
  useEffect(() => {
    if (!player) return;

    const supabase = createClient();
    const channel = supabase
      .channel(roomChannel(player.roomId))
      .on("broadcast", { event: GAME_EVENTS.PLAYER_ELIMINATED }, ({ payload }) => {
        const { playerId } = payload as PlayerEliminatedPayload;
        setPlayers((prev) =>
          prev.map((p) => (p.id === playerId ? { ...p, isAlive: false } : p)),
        );
        if (playerId === player.id) {
          setSelfEliminated(true);
        }
      })
      .on("broadcast", { event: GAME_EVENTS.GAME_ENDED }, ({ payload }) => {
        const { winner: finishedWinner } = payload as GameEndedPayload;
        setWinner(finishedWinner);
        setResultOpen(true);
        // 종료 후에만 역할이 공개되므로(getGameResult의 status==='ended' 가드) 여기서
        // 전원의 역할·생존 여부를 불러와 결과 오버레이 그리드를 채운다.
        getGameResult(player.roomId).then((result) => {
          if (result) setResultPlayers(result.players);
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [player]);

  // 재접속 안전망 — 이탈 중 게임이 이미 종료된 경우 GAME_ENDED broadcast를 놓치므로,
  // useGamePhase의 초기 스냅샷이 status='ended'로 도착하면 여기서도 결과를 불러온다.
  // getGameResult는 순수 조회라 위 GAME_ENDED 핸들러와 중복 호출돼도 안전하다(멱등).
  useEffect(() => {
    if (!player || status !== "ended") return;
    let cancelled = false;
    getGameResult(player.roomId).then((result) => {
      if (cancelled || !result) return;
      setWinner(result.winner);
      setResultPlayers(result.players);
      setResultOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [player, status]);

  if (loading || !player) {
    return null;
  }

  const roomId = player.roomId;
  // 본인 생존 여부 — 세션의 초기값과 실시간 탈락(PLAYER_ELIMINATED)을 함께 반영한다.
  const selfAlive = player.isAlive && !selfEliminated;

  // 생존자 목록(자신 제외) — 낮 투표/밤 행동 공통 대상
  const aliveOthers = players
    .filter((p) => p.isAlive && p.id !== player.id)
    .map((p) => toGamePlayer(p, roomId));

  // 밤 행동 가능 여부 — 외형은 절대 분기하지 않고, 오직 canAct(boolean)로만 활성화 여부 결정.
  // 탈락자는 어떤 역할이든 행동 불가(canPerformNightAction이 isAlive까지 검사).
  const canAct = canPerformNightAction(role, selfAlive);

  const aliveCount = players.filter((p) => p.isAlive).length;

  // 시스템 메시지는 전체 채팅 안에 섞여 표시된다(ChatBubble이 channel='system'을 다른 스타일로 렌더).
  const publicMessages = [...messagesByChannel.public, ...messagesByChannel.system]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((m) => toGameMessage(m, roomId));
  const secretMessages =
    membership === "none" ? [] : messagesByChannel[membership].map((m) => toGameMessage(m, roomId));
  const dmMessages = messagesByChannel.dm.map((m) => toGameMessage(m, roomId));

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4" data-route="game-play">
      <div className="text-center">
        <h1 className="text-2xl font-bold">게임 플레이</h1>
      </div>

      {/* 내 역할 보기 — 버튼 문구는 역할과 무관하게 항상 동일 */}
      <Dialog>
        <DialogTrigger asChild>
          <Button type="button" variant="secondary">
            내 역할 보기
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>내 역할</DialogTitle>
          </DialogHeader>
          {role && <RoleCard role={role} />}
        </DialogContent>
      </Dialog>

      {/* 페이즈 배너 — 실시간 status/phaseNumber, 전환 예약 중이면 카운트다운 표시 */}
      <PhaseBanner
        status={status}
        phaseNumber={phaseNumber}
        transitionTo={transitionTo}
        transitionAt={transitionAt}
      />

      {/* 생존 현황 — 개별 역할은 노출하지 않고 콤팩트 참가자 칩만 표시 */}
      <div className="flex flex-col gap-2 rounded-lg border p-3">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Users className="h-4 w-4" aria-hidden="true" /> 생존 현황
          </h2>
          <span className="text-sm font-medium">
            {aliveCount} / {players.length}명 생존
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {players.map((p) => (
            <span
              key={p.id}
              className={cn(
                "rounded-full border px-2.5 py-1 text-xs",
                p.isAlive ? "bg-background" : "text-muted-foreground line-through opacity-60",
              )}
            >
              {p.nickname}
            </span>
          ))}
        </div>
      </div>

      {/* 채팅 — 전체 / 비밀 채널 / 1:1, 트리거 라벨은 역할과 무관하게 항상 동일 */}
      <div className="flex flex-col gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
          <MessageSquare className="h-4 w-4" aria-hidden="true" /> 채팅
        </h2>
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "public" | "secret" | "dm")}
        >
          <TabsList>
            <TabsTrigger value="public">전체</TabsTrigger>
            <TabsTrigger value="secret">비밀 채널</TabsTrigger>
            <TabsTrigger value="dm">1:1</TabsTrigger>
          </TabsList>

          <TabsContent value="public">
            <ChatPanel
              messages={publicMessages}
              currentPlayerId={player.id}
              disabled={status === "night" || !selfAlive}
              onSend={(text) => void handleSend("public", text)}
            />
          </TabsContent>

          <TabsContent value="secret">
            <SecretChannelTab
              membership={membership}
              messages={secretMessages}
              currentPlayerId={player.id}
              disabled={status === "day" || !selfAlive}
              onSend={(text) => {
                if (membership === "none") return;
                void handleSend(membership, text);
              }}
            />
          </TabsContent>

          <TabsContent value="dm">
            <DirectMessageTab
              players={players.map((p) => toGamePlayer(p, roomId))}
              currentPlayerId={player.id}
              messages={dmMessages}
              disabled={status === "night" || !selfAlive}
              onSend={(text, recipientId) => void handleSend("dm", text, recipientId)}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* 하단 행동 패널 — 페이즈로만 분기, 역할에 따른 외형 분기 절대 금지
          투표(Task 011)·밤 행동(Task 012) 모두 실데이터로 연결되었다. ActionPanel의 라벨은
          "밤 행동"으로 고정이며 canAct(boolean)만으로 활성화 여부를 결정한다(역할별 분기 없음).
          게임이 종료(winner)되면 두 패널 모두 감춰 종료 후 조작 가능한 것처럼 보이지 않게 한다. */}
      {winner ? null : status === "day" ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Vote className="h-4 w-4" aria-hidden="true" /> 투표
            </CardTitle>
            <CardDescription>
              이단으로 의심되는 사람을 지목하세요. 낮 동안 언제든 바꿀 수 있습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {aliveOthers.map((target) => (
              <div key={target.id} className="flex items-center gap-2">
                <div className="flex-1">
                  <VoteButton
                    target={target}
                    isSelected={myVote === target.id}
                    onVote={handleVote}
                    disabled={!selfAlive}
                  />
                </div>
                <span className="w-10 shrink-0 text-right text-sm text-muted-foreground">
                  {tally[target.id] ?? 0}표
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <>
          <ActionPanel
            targets={aliveOthers}
            canAct={canAct}
            actionLabel="밤 행동"
            onAction={(targetId) => void handleNightAction(targetId)}
          />
          {nightActionTargetId && (
            <p className="text-center text-sm text-muted-foreground">
              선택됨: {players.find((p) => p.id === nightActionTargetId)?.nickname}
            </p>
          )}
        </>
      )}

      {/* 게임 종료 오버레이 — 승리 팀 발표 + 전원 역할 공개(getGameResult, status='ended' 가드
          통과 후에만 role이 채워진다). 닫아도 winner는 유지되어 투표/밤 행동 패널은 다시
          나타나지 않는다(종료 상태 고정) — resultOpen은 오버레이 여닫기만 담당한다. */}
      {winner && (
        <>
          <Dialog open={resultOpen} onOpenChange={setResultOpen}>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>게임 종료 — {WINNER_LABELS[winner]}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2 py-2">
                {resultPlayers.map((resultPlayer) => (
                  <div
                    key={resultPlayer.id}
                    className={cn(
                      "rounded-md border p-2 text-center text-sm",
                      !resultPlayer.isAlive && "opacity-60",
                    )}
                  >
                    <p className="font-medium">{resultPlayer.nickname}</p>
                    <p className="text-muted-foreground">
                      {resultPlayer.role ? ROLE_LABELS[resultPlayer.role] : "-"}
                    </p>
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
          <p className="text-center text-lg font-semibold text-muted-foreground">
            게임이 종료되었습니다 — {WINNER_LABELS[winner]}
          </p>
        </>
      )}
    </section>
  );
}
